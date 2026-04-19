import type { HttpContext } from '@adonisjs/core/http'
import Product from '#models/product'
import Device from '#models/device'
import Invoice from '#models/invoice'
import Voucher from '#models/voucher'
import crypto from 'node:crypto'
import { DateTime } from 'luxon'
import DatabaseQueue from '#services/database_queue'

export default class PublicVouchersController {
    /**
     * GET /public/voucher-products
     * List hotspot products for public sale
     */
    async products({ response }: HttpContext) {
        const products = await Product.query()
            .where('category', 'hotspot')
            .orderBy('price', 'asc')
        
        return response.ok({ success: true, data: products })
    }

    /**
     * GET /public/voucher-routers
     * List devices (routers) for public sale selection
     */
    async devices({ response }: HttpContext) {
        const devices = await Device.query().select('id', 'name')
        return response.ok({ success: true, data: devices })
    }

    /**
     * POST /public/buy-voucher
     * Create an invoice for public voucher purchase
     */
    async purchase({ request, response }: HttpContext) {
        const productId = request.input('productId')
        let deviceId = request.input('deviceId')
        const whatsapp = request.input('whatsapp')
        const fullname = request.input('fullname')

        if (!productId || !whatsapp || !fullname) {
            return response.badRequest({ success: false, message: 'Data tidak lengkap. Diperlukan produk, nama, dan nomor WhatsApp.' })
        }

        // Auto-select first device if not provided
        if (!deviceId) {
            const firstDevice = await Device.query().first()
            if (!firstDevice) {
                return response.badRequest({ success: false, message: 'Tidak ada router yang tersedia untuk menangani pesanan ini.' })
            }
            deviceId = firstDevice.id
        }

        try {
            const product = await Product.findOrFail(productId)
            
            if (product.category !== 'hotspot') {
                return response.badRequest({ success: false, message: 'Produk yang dipilih bukan paket hotspot.' })
            }

            // Create a "voucher" type invoice
            const invoice = await Invoice.create({
                type: 'voucher',
                productId: product.id,
                deviceId: deviceId,
                whatsappNumber: whatsapp,
                fullName: fullname,
                amount: product.price,
                totalAmount: product.price,
                status: 'unpaid',
                month: DateTime.now().toFormat('yyyy-MM'),
                dueDate: DateTime.now().plus({ days: 1 }),
                paymentToken: crypto.randomBytes(32).toString('hex')
            })

            return response.created({
                success: true,
                message: 'Pesanan voucher berhasil dibuat.',
                data: {
                    token: invoice.paymentToken,
                    amount: invoice.totalAmount,
                    product_name: product.name
                }
            })
        } catch (error: any) {
            return response.badRequest({ success: false, message: 'Gagal membuat pesanan: ' + error.message })
        }
    }

    /**
     * POST /public/hotspot/activate
     * Triggered by Mikrotik on first login
     */
    async activate({ request, response }: HttpContext) {
        const code = request.input('code')
        if (!code) return response.badRequest({ success: false, message: 'Code is required' })

        const voucher = await Voucher.query()
            .where('code', code)
            .where('isUsed', false)
            .preload('product')
            .first()

        if (!voucher) {
            return response.notFound({ success: false, message: 'Voucher not found or already activated' })
        }

        const product = voucher.product
        if (!product) return response.internalServerError({ success: false, message: 'Product configuration error' })

        const now = DateTime.now()
        const activePeriodDays = product.activePeriod || 1 // Default 1 day
        const validUntil = now.plus({ days: activePeriodDays })

        voucher.isUsed = true
        voucher.status = 'used'
        voucher.usedAt = now
        voucher.validUntil = validUntil
        await voucher.save()

        // Schedule deletion job
        const secondsUntilExpiry = validUntil.diff(now, 'seconds').seconds
        await DatabaseQueue.push('hotspot_expiry', { voucherId: voucher.id }, Math.max(0, Math.floor(secondsUntilExpiry)))

        // Schedule notification job (1 hour before expiry)
        const secondsUntilNotify = validUntil.minus({ hours: 1 }).diff(now, 'seconds').seconds
        if (secondsUntilNotify > 0) {
            await DatabaseQueue.push('hotspot_notify', { voucherId: voucher.id }, Math.floor(secondsUntilNotify))
        }

        return response.ok({ 
            success: true, 
            message: 'Voucher activated successfully',
            data: {
                validUntil: validUntil.toISO()
            }
        })
    }
}