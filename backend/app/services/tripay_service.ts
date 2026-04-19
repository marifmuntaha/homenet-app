import env from '#start/env'
import axios from 'axios'
import crypto from 'node:crypto'
import Invoice from '#models/invoice'
import Customer from '#models/customer'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

export default class TripayService {
    private static readonly API_KEY = env.get('TRIPAY_API_KEY')
    private static readonly PRIVATE_KEY = env.get('TRIPAY_PRIVATE_KEY')
    private static readonly MERCHANT_CODE = env.get('TRIPAY_MERCHANT_CODE')
    private static readonly IS_PRODUCTION = env.get('TRIPAY_IS_PRODUCTION')

    private static readonly BASE_URL = TripayService.IS_PRODUCTION
        ? 'https://tripay.co.id/api'
        : 'https://tripay.co.id/api-sandbox'

    /**
     * Get active payment channels
     */
    static async getPaymentChannels() {
        try {
            const response = await axios.get(`${this.BASE_URL}/merchant/payment-channel`, {
                headers: {
                    Authorization: `Bearer ${this.API_KEY}`
                }
            })

            if (!response.data.success) {
                throw new Error(response.data.message || 'Tripay API Error')
            }

            return response.data.data
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message
            logger.error(`[Tripay] Failed to fetch channels: ${errorMsg}`)
            throw new Error(`Gagal mengambil channel pembayaran: ${errorMsg}`)
        }
    }

    /**
     * Create a Closed Payment transaction
     */
    static async createTransaction(invoice: Invoice, method: string) {
        let customerInstance: Customer | null = null
        
        if (invoice.customer) {
            customerInstance = invoice.customer
        } else if (invoice.customerId) {
            customerInstance = await invoice.related('customer').query().preload('user').first()
        }
        
        if (customerInstance && !customerInstance.user) {
            await customerInstance.load('user')
        }

        const amount = Math.round(invoice.totalAmount)
        const merchantRef = `INV-${invoice.id}-${Date.now()}`

        // Generate Signature: merchantCode + merchantRef + amount
        const signature = crypto
            .createHmac('sha256', this.PRIVATE_KEY)
            .update(this.MERCHANT_CODE + merchantRef + amount)
            .digest('hex')

        // Default item name for billing
        let itemName = `Tagihan Internet bulan ${DateTime.fromFormat(invoice.month, 'yyyy-MM').setLocale('id').toFormat('MMMM yyyy')}`
        
        // Custom item name for voucher
        if (invoice.type === 'voucher') {
            if (!invoice.product) {
                await invoice.load('product')
            }
            itemName = `Voucher Hotspot: ${invoice.product?.name || 'Paket Internet'}`
        }

        const payload = {
            method: method,
            merchant_ref: merchantRef,
            amount: amount,
            customer_name: customerInstance?.fullName || invoice.fullName || 'Pembeli Voucher',
            customer_email: customerInstance?.user?.email || (invoice.whatsappNumber ? `${invoice.whatsappNumber}@homenet.id` : 'pembeli@homenet.id'),
            customer_phone: customerInstance?.phone || invoice.whatsappNumber || '',
            order_items: [
                {
                    sku: `INV-${invoice.id}`,
                    name: itemName,
                    price: amount,
                    quantity: 1,
                }
            ],
            // expiry: 24 hours from now
            expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
            signature: signature
        }

        try {
            const response = await axios.post(`${this.BASE_URL}/transaction/create`, payload, {
                headers: {
                    Authorization: `Bearer ${this.API_KEY}`
                }
            })

            if (!response.data.success) {
                throw new Error(response.data.message || 'Tripay API Error')
            }

            const data = response.data.data

            // Save Tripay info to invoice
            invoice.tripayReference = data.reference
            invoice.tripayMethod = method
            invoice.tripayCheckoutUrl = data.checkout_url
            invoice.paymentType = 'tripay'
            invoice.paymentMethod = data.payment_name
            await invoice.save()

            return data
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message
            logger.error(`[Tripay] Failed to create transaction: ${errorMsg}`)
            throw new Error(`Gagal membuat transaksi Tripay: ${errorMsg}`)
        }
    }

    /**
     * Validate Webhook Signature
     */
    static validateSignature(rawPayload: string, callbackSignature: string): boolean {
        const signature = crypto
            .createHmac('sha256', this.PRIVATE_KEY)
            .update(rawPayload)
            .digest('hex')

        return signature === callbackSignature
    }
}
