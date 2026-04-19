import type { HttpContext } from '@adonisjs/core/http'
import Voucher from '#models/voucher'
import HotspotService from '#services/hotspot_service'
import MikrotikService from '#services/mikrotik_service'
import Device from '#models/device'

export default class VouchersController {
    private hotspotService = new HotspotService()

    /**
     * GET /vouchers
     * List all vouchers with filters
     */
    async index({ request, response }: HttpContext) {
        const page = request.input('page', 1)
        const limit = request.input('limit', 15)
        const productId = request.input('productId')
        const deviceId = request.input('deviceId')
        const status = request.input('status')
        const search = request.input('search')

        const query = Voucher.query()
            .preload('product')
            .preload('device')
            .orderBy('createdAt', 'desc')

        if (productId) query.where('productId', productId)
        if (deviceId) query.where('deviceId', deviceId)
        if (status) query.where('status', status)
        if (search) query.whereILike('code', `%${search}%`)

        const vouchers = await query.paginate(page, limit)

        return response.ok({
            success: true,
            data: vouchers
        })
    }

    /**
     * POST /vouchers/generate
     * Generate a batch of vouchers
     */
    async generate({ request, response }: HttpContext) {
        const productId = request.input('productId')
        const deviceId = request.input('deviceId')
        const count = request.input('count', 10)

        if (!productId || !deviceId) {
            return response.badRequest({
                success: false,
                message: 'Product ID and Device ID are required'
            })
        }

        try {
            const result = await this.hotspotService.generateBatch(productId, deviceId, count)
            return response.created({
                success: true,
                message: `Berhasil membuat ${result.vouchers.length} voucher`,
                data: result
            })
        } catch (error: any) {
            return response.internalServerError({
                success: false,
                message: error.message || 'Gagal membuat voucher'
            })
        }
    }

    /**
     * DELETE /vouchers/:id
     * Delete voucher from DB and Mikrotik
     */
    async destroy({ params, response }: HttpContext) {
        const voucher = await Voucher.findOrFail(params.id)
        
        // Try to delete from Mikrotik
        try {
            const device = await Device.findOrFail(voucher.deviceId)
            const mikrotik = MikrotikService.fromDevice(device)
            await mikrotik.deleteHotspotUser(voucher.code)
        } catch (error) {
            console.error('Failed to delete voucher from Mikrotik:', error)
        }

        await voucher.delete()

        return response.ok({
            success: true,
            message: 'Voucher berhasil dihapus'
        })
    }

    /**
     * GET /vouchers/stats
     */
    async stats({ response }: HttpContext) {
        const total = await Voucher.query().count('* as total')
        const available = await Voucher.query().where('status', 'available').count('* as total')
        const used = await Voucher.query().where('status', 'used').count('* as total')

        return response.ok({
            success: true,
            data: {
                total: Number(total[0].$extras.total),
                available: Number(available[0].$extras.total),
                used: Number(used[0].$extras.total)
            }
        })
    }
}