import Customer from '#models/customer'
import CustomerSubscription from '#models/customer_subscription'
import Device from '#models/device'
import MikrotikService from '#services/mikrotik_service'
import logger from '@adonisjs/core/services/logger'

export const ISOLIR_PROFILE = 'isolir'

export default class CustomerService {
    /**
     * Isolate a customer on all Mikrotik devices:
     *  1. Change their PPP secret profile to `isolir`
     *  2. Remove their active session so they reconnect with the restricted profile
     */
    static async isolateCustomer(customer: Customer): Promise<void> {
        if (!customer.pppoeUser) {
            logger.warn(`[CustomerService] isolateCustomer: customer ${customer.id} has no pppoeUser, skipping.`)
            return
        }

        const devices = await Device.all()

        await Promise.allSettled(
            devices.map(async (device) => {
                const svc = MikrotikService.fromDevice(device)
                try {
                    // 1. Change profile to isolir (pass password to avoid losing it)
                    await svc.updatePPPSecret(customer.pppoeUser!, customer.pppoePassword ?? undefined, ISOLIR_PROFILE)
                    // 2. Kick the active connection so they reconnect with new profile
                    await svc.removeActivePPPConnection(customer.pppoeUser!)
                    logger.info(`[CustomerService] Isolated customer ${customer.fullName} on device ${device.host}`)
                } catch (err: any) {
                    logger.error(`[CustomerService] Failed to isolate ${customer.fullName} on ${device.host}: ${err.message}`)
                }
            })
        )
    }

    /**
     * Restore a customer's service on all Mikrotik devices after payment:
     *  1. Find their active subscription to get the product/profile name
     *  2. Change PPP secret profile back to the subscription's product name
     *  3. Remove active session to force reconnect with restored profile
     */
    static async restoreCustomerService(customer: Customer): Promise<void> {
        if (!customer.pppoeUser) {
            logger.warn(`[CustomerService] restoreCustomerService: customer ${customer.id} has no pppoeUser, skipping.`)
            return
        }

        // Get active subscription to know which profile to restore
        const sub = await CustomerSubscription.query()
            .where('customerId', customer.id)
            .where('status', 'active')
            .preload('product')
            .first()

        if (!sub) {
            logger.warn(`[CustomerService] restoreCustomerService: no active subscription for customer ${customer.id}, skipping.`)
            return
        }

        const profileName = sub.product.name
        const devices = await Device.all()

        await Promise.allSettled(
            devices.map(async (device) => {
                const svc = MikrotikService.fromDevice(device)
                try {
                    // 1. Restore profile + keep password
                    await svc.updatePPPSecret(customer.pppoeUser!, customer.pppoePassword ?? undefined, profileName)
                    // 2. Kick active connection so they reconnect with restored profile
                    await svc.removeActivePPPConnection(customer.pppoeUser!)
                    logger.info(`[CustomerService] Restored service for ${customer.fullName} (profile: ${profileName}) on ${device.host}`)
                } catch (err: any) {
                    logger.error(`[CustomerService] Failed to restore ${customer.fullName} on ${device.host}: ${err.message}`)
                }
            })
        )
    }
}
