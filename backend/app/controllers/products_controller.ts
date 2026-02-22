import type { HttpContext } from '@adonisjs/core/http'
import Product from '#models/product'
import Device from '#models/device'
import { createProductValidator, updateProductValidator } from '#validators/product_validator'
import MikrotikService from '#services/mikrotik_service'

export default class ProductsController {
    /**
     * GET /products
     * List all products with optional search
     */
    async index({ request, response }: HttpContext) {
        const page = request.input('page', 1)
        const limit = request.input('limit', 15)
        const search = request.input('search', '')

        const query = Product.query().orderBy('price', 'asc')

        if (search) {
            query.where((q) => {
                q.whereILike('name', `%${search}%`)
            })
        }

        const products = await query.paginate(page, limit)

        return response.ok({
            success: true,
            data: products,
        })
    }

    /**
     * Helper to sync a single product to all devices
     */
    private async syncToAllDevices(
        action: 'create' | 'update' | 'delete',
        name: string,
        downloadSpeed?: number,
        uploadSpeed?: number
    ) {
        const devices = await Device.all()
        const results: Record<number, boolean> = {}

        await Promise.allSettled(
            devices.map(async (device) => {
                const svc = MikrotikService.fromDevice(device)
                let success = false
                try {
                    if (action === 'create' && downloadSpeed && uploadSpeed) {
                        success = await svc.createPPPProfile(name, downloadSpeed, uploadSpeed)
                        if (!success) {
                            // fallback try update if already exists
                            success = await svc.updatePPPProfile(name, downloadSpeed, uploadSpeed)
                        }
                    } else if (action === 'update' && downloadSpeed && uploadSpeed) {
                        success = await svc.updatePPPProfile(name, downloadSpeed, uploadSpeed)
                    } else if (action === 'delete') {
                        success = await svc.deletePPPProfile(name)
                    }
                } catch {
                    success = false
                }
                results[device.id] = success
            })
        )

        return results
    }

    /**
     * POST /products
     * Create a new product and sync to all devices
     */
    async store({ request, response }: HttpContext) {
        const data = await request.validateUsing(createProductValidator)

        const existing = await Product.findBy('name', data.name)
        if (existing) {
            return response.conflict({
                success: false,
                message: 'Nama produk sudah digunakan',
            })
        }

        const product = await Product.create(data)

        // Sync to Mikrotik
        const syncResults = await this.syncToAllDevices('create', product.name, product.downloadSpeed, product.uploadSpeed)

        return response.created({
            success: true,
            message: 'Produk berhasil ditambahkan',
            data: product,
            sync: syncResults,
        })
    }

    /**
     * PUT /products/:id
     * Update existing product and sync to all devices
     */
    async update({ params, request, response }: HttpContext) {
        const product = await Product.findOrFail(params.id)
        const data = await request.validateUsing(updateProductValidator)

        if (data.name && data.name !== product.name) {
            const existing = await Product.query()
                .where('name', data.name)
                .whereNot('id', product.id)
                .first()
            if (existing) {
                return response.conflict({
                    success: false,
                    message: 'Nama produk sudah digunakan',
                })
            }
        }

        const oldName = product.name
        product.merge(data)
        await product.save()

        // Sync to Mikrotik
        let syncResults = {}
        if (oldName !== product.name) {
            // Name changed, delete old profile and create new one
            await this.syncToAllDevices('delete', oldName)
            syncResults = await this.syncToAllDevices('create', product.name, product.downloadSpeed, product.uploadSpeed)
        } else {
            // Just update existing profile
            syncResults = await this.syncToAllDevices('update', product.name, product.downloadSpeed, product.uploadSpeed)
        }

        return response.ok({
            success: true,
            message: 'Produk berhasil diperbarui',
            data: product,
            sync: syncResults,
        })
    }

    /**
     * DELETE /products/:id
     * Delete product and sync delete to all devices
     */
    async destroy({ params, response }: HttpContext) {
        const product = await Product.findOrFail(params.id)
        const syncResults = await this.syncToAllDevices('delete', product.name)
        await product.delete()

        return response.ok({
            success: true,
            message: 'Produk berhasil dihapus',
            sync: syncResults,
        })
    }

    /**
     * POST /products/:id/sync
     * Manually trigger sync for a product to all devices
     */
    async sync({ params, response }: HttpContext) {
        const product = await Product.findOrFail(params.id)
        const syncResults = await this.syncToAllDevices('update', product.name, product.downloadSpeed, product.uploadSpeed)

        const successCount = Object.values(syncResults).filter(Boolean).length
        const totalCount = Object.keys(syncResults).length

        return response.ok({
            success: true,
            message: `Berhasil sinkronisasi ke ${successCount} dari ${totalCount} device`,
            data: product,
            sync: syncResults,
        })
    }
}
