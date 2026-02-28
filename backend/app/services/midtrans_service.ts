import env from '#start/env'
// @ts-ignore
import midtransClient from 'midtrans-client'
import Invoice from '#models/invoice'
import logger from '@adonisjs/core/services/logger'
import CustomerService from '#services/customer_service'

export default class MidtransService {
    private static snap = new midtransClient.Snap({
        isProduction: env.get('MIDTRANS_IS_PRODUCTION'),
        serverKey: env.get('MIDTRANS_SERVER_KEY'),
        clientKey: env.get('MIDTRANS_CLIENT_KEY'),
    })

    private static readonly MIDTRANS_FEE = 2000

    /**
     * Create a Snap transaction for an invoice
     */
    static async createTransaction(invoice: Invoice) {
        // Ensure customer and user are loaded
        const customer = invoice.customer || (await invoice.related('customer').query().preload('user').first())
        if (customer && !customer.user) {
            await customer.load('user')
        }

        const baseAmount = Math.round(invoice.totalAmount)
        const totalAmount = baseAmount + this.MIDTRANS_FEE

        const parameter = {
            transaction_details: {
                order_id: `INV-${invoice.id}-${Date.now()}`,
                gross_amount: totalAmount,
            },
            customer_details: {
                first_name: customer?.fullName,
                email: customer?.user?.email || 'customer@example.com',
                phone: customer?.phone,
            },
            item_details: [
                {
                    id: `INV-${invoice.id}`,
                    price: baseAmount,
                    quantity: 1,
                    name: `Tagihan Homenet - ${invoice.month}`,
                },
                {
                    id: 'FEE-MIDTRANS',
                    price: this.MIDTRANS_FEE,
                    quantity: 1,
                    name: 'Biaya Layanan Online',
                },
            ],
            callbacks: {
                finish: 'https://homenet.own-server.web.id/customer/dashboard',
                error: 'https://homenet.own-server.web.id/customer/dashboard',
                pending: 'https://homenet.own-server.web.id/customer/dashboard',
            }
        }

        try {
            const transaction = await this.snap.createTransaction(parameter)

            // Save order ID to invoice for reference
            invoice.midtransOrderId = parameter.transaction_details.order_id
            invoice.midtransSnapToken = transaction.token
            invoice.paymentType = 'midtrans'
            await invoice.save()

            return transaction
        } catch (error) {
            logger.error('Failed to create Midtrans transaction: ' + error.message)
            throw error
        }
    }

    /**
     * Verify Midtrans notification
     */
    static async handleNotification(notification: any) {
        try {
            const statusResponse = await this.snap.transaction.notification(notification)

            const orderId = statusResponse.order_id
            const transactionStatus = statusResponse.transaction_status
            const fraudStatus = statusResponse.fraud_status

            const invoice = await Invoice.findBy('midtrans_order_id', orderId)
            if (!invoice) {
                throw new Error('Invoice not found for order id: ' + orderId)
            }

            if (transactionStatus === 'capture') {
                if (fraudStatus === 'challenge') {
                    // TODO: handle fraud challenge
                } else if (fraudStatus === 'accept') {
                    await this.markAsPaid(invoice, statusResponse.payment_type)
                }
            } else if (transactionStatus === 'settlement') {
                await this.markAsPaid(invoice, statusResponse.payment_type)
            } else if (
                transactionStatus === 'cancel' ||
                transactionStatus === 'deny' ||
                transactionStatus === 'expire'
            ) {
                // TODO: handle failure
            } else if (transactionStatus === 'pending') {
                // TODO: handle pending
            }

            return statusResponse
        } catch (error) {
            logger.error('Error handling Midtrans notification: ' + error.message)
            throw error
        }
    }

    private static async markAsPaid(invoice: Invoice, method: string) {
        invoice.status = 'paid'
        invoice.paymentMethod = method
        invoice.paidAt = (await import('luxon')).DateTime.now()
        await invoice.save()

        // Restore customer service after payment (profile + reconnect)
        try {
            const customer = await invoice.related('customer').query().first()
            if (customer) {
                await CustomerService.restoreCustomerService(customer)
                logger.info(`[Payment] Service restored for customer ${customer.fullName} after invoice ${invoice.id} payment.`)
            }
        } catch (err: any) {
            logger.error(`[Payment] Failed to restore service after payment for invoice ${invoice.id}: ${err.message}`)
        }
    }
}
