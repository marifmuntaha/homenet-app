import Voucher from '#models/voucher'
import Device from '#models/device'
import MikrotikService from '#services/mikrotik_service'
import logger from '@adonisjs/core/services/logger'

export default class DeleteVoucherJob {
    /**
     * Handle the Delete Voucher Job
     */
    static async handle(payload: { voucherId: number }) {
        const { voucherId } = payload
        const voucher = await Voucher.find(voucherId)

        if (!voucher) {
            logger.info(`[DeleteVoucherJob] Voucher ID ${voucherId} not found, skipping.`)
            return
        }

        try {
            const device = await Device.find(voucher.deviceId)
            if (device) {
                const mikrotik = MikrotikService.fromDevice(device)
                await mikrotik.deleteHotspotUser(voucher.code)
                logger.info(`[DeleteVoucherJob] Deleted voucher ${voucher.code} from Mikrotik ${device.name}`)
            }

            // Mark/Delete in DB
            voucher.status = 'expired'
            await voucher.save()
            logger.info(`[DeleteVoucherJob] Voucher ${voucher.code} marked as expired in DB.`)

        } catch (error: any) {
            logger.error(`[DeleteVoucherJob] Failed to delete voucher ${voucher.code}: ${error.message}`)
            throw error // Retry
        }
    }
}
