import Voucher from '#models/voucher'
import Invoice from '#models/invoice'
import WhatsappService from '#services/whatsapp_service'
import logger from '@adonisjs/core/services/logger'

export default class VoucherExpiryNotifyJob {
    /**
     * Handle the Voucher Expiry Notification Job
     */
    static async handle(payload: { voucherId: number }) {
        const { voucherId } = payload
        const voucher = await Voucher.query()
            .where('id', voucherId)
            .preload('product')
            .first()

        if (!voucher) {
            logger.info(`[VoucherExpiryNotifyJob] Voucher ID ${voucherId} not found, skipping.`)
            return
        }

        // Find the invoice associated with this voucher to get the WhatsApp number
        const invoice = await Invoice.query()
            .where('productId', voucher.productId)
            .where('deviceId', voucher.deviceId)
            .where('type', 'voucher')
            .where('status', 'paid')
            .orderBy('createdAt', 'desc')
            .first()

        if (!invoice || !invoice.whatsappNumber) {
            logger.error(`[VoucherExpiryNotifyJob] No invoice/whatsapp number found for voucher ${voucher.code}. Skipping notification.`)
            return
        }

        const message = `Halo ${invoice.fullName || 'Pelanggan'},\n\nVoucher WiFi Anda (${voucher.code}) untuk paket ${voucher.product?.name} akan kadaluarsa dalam **1 jam**. \n\nPastikan Anda segera memperbarui atau membeli voucher baru untuk tetap terhubung. Terima kasih!`

        try {
            await WhatsappService.sendMessage(invoice.whatsappNumber, message)
            logger.info(`[VoucherExpiryNotifyJob] Expiry notification sent for voucher ${voucher.code} to ${invoice.whatsappNumber}`)
        } catch (error: any) {
            logger.error(`[VoucherExpiryNotifyJob] Failed to send notification for voucher ${voucher.code}: ${error.message}`)
            throw error // Retry
        }
    }
}
