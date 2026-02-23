import CustomerSubscription from '#models/customer_subscription'
import Invoice from '#models/invoice'
import Customer from '#models/customer'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import MidtransService from '#services/midtrans_service'
import WhatsappService from '#services/whatsapp_service'
import CustomerService from '#services/customer_service'

export default class InvoiceService {
    /**
     * Generate invoices for a specific customer
     * This is used for both manual triggers and the automated anniversary flow
     */
    static async generateInvoiceForCustomer(customer: Customer, month?: string) {
        const generationMonth = month || DateTime.now().toFormat('yyyy-MM')

        // 1. Get active subscription
        const sub = await CustomerSubscription.query()
            .where('customerId', customer.id)
            .where('status', 'active')
            .preload('product')
            .first()

        if (!sub) {
            logger.info(`[Billing] No active subscription found for customer ${customer.id} (${customer.fullName})`)
            return { success: false, reason: 'no_active_subscription' }
        }

        // 2. Check for duplicate
        const existing = await Invoice.query()
            .where('customerId', customer.id)
            .where('month', generationMonth)
            .first()

        if (existing) {
            return { success: false, reason: 'already_exists', invoice: existing }
        }

        // 3. Calculate amounts
        const unpaidInvoices = await Invoice.query()
            .where('customerId', customer.id)
            .where('status', 'unpaid')
            .where('month', '<', generationMonth)

        const previousBalance = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
        const currentAmount = sub.product.price
        const totalAmount = Number(currentAmount) + previousBalance

        // 4. Create invoice (Due date 5 days from now)
        const dueDate = DateTime.now().plus({ days: 5 })

        const invoice = await Invoice.create({
            customerId: customer.id,
            month: generationMonth,
            amount: currentAmount,
            previousBalance: previousBalance,
            totalAmount: totalAmount,
            status: 'unpaid',
            dueDate: dueDate
        })

        // 5. Integrate Midtrans (Generate Snap Token)
        let paymentLink = null
        try {
            const transaction = await MidtransService.createTransaction(invoice)
            // The redirection URL for Snap popup can be constructed if needed, 
            // but usually we rely on the token in the frontend.
            // For WhatsApp, we can provide a direct payment link if we have one or just the dashboard link.
            paymentLink = transaction.redirect_url
        } catch (err: any) {
            logger.error(`[Billing] Failed to create Midtrans transaction for invoice ${invoice.id}: ${err.message}`)
        }

        // 6. Send WhatsApp Notification
        const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
        const totalStr = currencyFormatter.format(totalAmount)
        const dueDateStr = dueDate.toFormat('dd LLLL yyyy')

        // Construct message
        let waMessage = `*TAGIHAN INTERNET HOMENET*\n\n` +
            `Halo *${customer.fullName}*,\n` +
            `Tagihan internet Homenet Anda untuk periode *${generationMonth}* telah tersedia.\n\n` +
            `Detail:\n` +
            `- Biaya Paket: ${currencyFormatter.format(currentAmount)}\n` +
            `- Tunggakan: ${currencyFormatter.format(previousBalance)}\n` +
            `- *Total Bayar: ${totalStr}*\n` +
            `- Jatuh Tempo: ${dueDateStr}\n\n`

        if (paymentLink) {
            waMessage += `Silakan lakukan pembayaran online melalui link berikut:\n${paymentLink}\n\n`
        } else {
            waMessage += `Silakan login ke dashboard pelanggan untuk melakukan pembayaran.\n\n`
        }

        waMessage += `Terima kasih atas kepercayaan Anda.\n_Homenet Team_`

        await WhatsappService.sendMessage(customer.phone, waMessage)

        logger.info(`[Billing] Invoice ${invoice.id} generated and notification queued for ${customer.fullName}`)
        return { success: true, invoice }
    }

    /**
     * Find customers who are 3 days away from their registration anniversary
     */
    static async generateDueInvoices() {
        const targetDay = DateTime.now().plus({ days: 3 }).day
        const currentMonth = DateTime.now().toFormat('yyyy-MM')

        // Fetch all customers whose registration day matches (Day of createdAt)
        // We'll filter in JS to keep it simple across different DB dialects, 
        // though SQL extract(day from created_at) is more efficient.
        const customers = await Customer.query()

        let generatedCount = 0
        let skippedCount = 0

        for (const customer of customers) {
            if (customer.createdAt.day === targetDay) {
                const result = await this.generateInvoiceForCustomer(customer, currentMonth)
                if (result.success) {
                    generatedCount++
                } else if (result.reason === 'already_exists') {
                    skippedCount++
                }
            }
        }

        logger.info(`[Billing] Daily auto-generation complete. Created: ${generatedCount}, Skipped: ${skippedCount}`)
        return { generatedCount, skippedCount }
    }

    /**
     * Manual bulk generation for a given month
     * @param month Format YYYY-MM. Defaults to current month.
     */
    static async generateInvoices(month?: string) {
        const generationMonth = month || DateTime.now().toFormat('yyyy-MM')
        const customers = await Customer.all()

        let generatedCount = 0
        let skippedCount = 0

        for (const customer of customers) {
            const result = await this.generateInvoiceForCustomer(customer, generationMonth)
            if (result.success) {
                generatedCount++
            } else if (result.reason === 'already_exists') {
                skippedCount++
            }
        }

        return { generatedCount, skippedCount, month: generationMonth }
    }

    /**
     * Daily check: On anniversary date, isolate customers with unpaid invoices
     */
    static async checkAndIsolateOverdue() {
        const today = DateTime.now()
        const currentMonth = today.toFormat('yyyy-MM')
        const customers = await Customer.all()

        let isolatedCount = 0
        let skippedCount = 0

        for (const customer of customers) {
            // Only process customers whose anniversary is TODAY
            if (customer.createdAt.day !== today.day) continue

            // Check if they have an unpaid invoice for this billing period
            const unpaidInvoice = await Invoice.query()
                .where('customerId', customer.id)
                .where('month', currentMonth)
                .where('status', 'unpaid')
                .first()

            if (unpaidInvoice) {
                logger.info(`[Isolation] Customer ${customer.fullName} has unpaid invoice for ${currentMonth}. Isolating...`)
                await CustomerService.isolateCustomer(customer)
                isolatedCount++
            } else {
                skippedCount++
            }
        }

        logger.info(`[Isolation] Check complete. Isolated: ${isolatedCount}, Skipped (paid/no invoice): ${skippedCount}`)
        return { isolatedCount, skippedCount }
    }
}
