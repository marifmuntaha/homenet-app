import CustomerSubscription from '#models/customer_subscription'
import Invoice from '#models/invoice'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'

export default class InvoiceService {
    /**
     * Generate invoices for all active subscriptions for a given month.
     * @param month Format YYYY-MM. Defaults to current month.
     */
    static async generateInvoices(month?: string) {
        const generationMonth = month || DateTime.now().toFormat('yyyy-MM')

        // Find all active subscriptions
        const activeSubscriptions = await CustomerSubscription.query()
            .where('status', 'active')
            .preload('product')
            .preload('customer')

        let generatedCount = 0
        let skippedCount = 0

        for (const sub of activeSubscriptions) {
            // Check if invoice already exists for this customer and month
            const existing = await Invoice.query()
                .where('customerId', sub.customerId)
                .where('month', generationMonth)
                .first()

            if (existing) {
                skippedCount++
                continue
            }

            // Calculate previous unpaid balance
            const unpaidInvoices = await Invoice.query()
                .where('customerId', sub.customerId)
                .where('status', 'unpaid')
                .where('month', '<', generationMonth)

            const previousBalance = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
            const currentAmount = sub.product.price
            const totalAmount = Number(currentAmount) + previousBalance

            // Create due date (e.g., 5th of the generation month)
            const dueDate = DateTime.fromFormat(`${generationMonth}-05`, 'yyyy-MM-dd')

            await Invoice.create({
                customerId: sub.customerId,
                month: generationMonth,
                amount: currentAmount,
                previousBalance: previousBalance,
                totalAmount: totalAmount,
                status: 'unpaid',
                dueDate: dueDate
            })

            generatedCount++
        }

        logger.info(`[Billing] Generation for ${generationMonth} complete. Created: ${generatedCount}, Skipped: ${skippedCount}`)
        return { generatedCount, skippedCount, month: generationMonth }
    }
}
