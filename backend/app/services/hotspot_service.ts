import Product from '#models/product'
import Voucher from '#models/voucher'
import Device from '#models/device'
import MikrotikService from '#services/mikrotik_service'
import { DateTime } from 'luxon'

export default class HotspotService {
    /**
     * Generate random voucher codes
     */
    private generateCode(length: number = 6): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1 for readability
        let result = ''
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }

    /**
     * Create batch of vouchers
     */
    async generateBatch(productId: number, deviceId: number, count: number) {
        const product = await Product.findOrFail(productId)
        const device = await Device.findOrFail(deviceId)
        const mikrotik = MikrotikService.fromDevice(device)

        const vouchers: Voucher[] = []
        const syncResults: { code: string; success: boolean }[] = []

        for (let i = 0; i < count; i++) {
            let code = this.generateCode()
            
            // Ensure unique code
            let exists = await Voucher.findBy('code', code)
            while (exists) {
                code = this.generateCode()
                exists = await Voucher.findBy('code', code)
            }

            // Mikrotik script to notify backend on first login
            const onLoginScript = `/tool fetch http-method=post url="https://backend-dev.own-server.web.id/public/hotspot/activate" http-data="code=$user" keep-result=no`

            const success = await mikrotik.createHotspotUser(
                code, 
                code, // Password same as user for simplicity, or can be empty
                product.name,
                `Voucher ${product.name} generated at ${DateTime.now().toFormat('yyyy-MM-dd HH:mm')}`,
                onLoginScript
            )

            if (success) {
                const voucher = await Voucher.create({
                    code,
                    productId: product.id,
                    deviceId: device.id,
                    price: product.price,
                    status: 'available',
                    isUsed: false
                })
                vouchers.push(voucher)
            }
            
            syncResults.push({ code, success })
        }

        return {
            vouchers,
            syncResults
        }
    }
}
