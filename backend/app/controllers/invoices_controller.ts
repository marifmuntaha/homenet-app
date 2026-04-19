import type { HttpContext } from '@adonisjs/core/http'
import WhatsappService from '#services/whatsapp_service'
import Invoice from '#models/invoice'
import User from '#models/user'
import Customer from '#models/customer'
import Voucher from '#models/voucher'
import InvoiceService from '#services/invoice_service'
import CustomerService from '#services/customer_service'
import TripayService from '#services/tripay_service'
import HotspotService from '#services/hotspot_service'
import { DateTime } from 'luxon'

export default class InvoicesController {
    /**
     * List invoices
     */
    async index({ request, response }: HttpContext) {
        // ... (existing index logic)
        const page = request.input('page', 1)
        const limit = request.input('limit', 10)
        const status = request.input('status')
        const customerId = request.input('customer_id')
        const search = request.input('search')
        const year = request.input('year')
        const monthFilter = request.input('month') // e.g., '03'

        const query = Invoice.query()
            .preload('customer')
            .orderBy('month', 'desc')
            .orderBy('id', 'desc')

        if (search) {
            query.whereHas('customer', (q) => {
                q.whereILike('full_name', `%${search}%`)
                    .orWhereILike('phone', `%${search}%`)
                    .orWhereILike('pppoe_user', `%${search}%`)
            })
        }

        if (status) {
            query.where('status', status)
        }

        if (customerId) {
            query.where('customerId', customerId)
        }

        if (year && monthFilter) {
            query.where('month', `${year}-${monthFilter}`)
        } else if (year) {
            query.where('month', 'like', `${year}-%`)
        } else if (monthFilter) {
            query.where('month', 'like', `%-${monthFilter}`)
        }

        const invoices = await query.paginate(page, limit)
        return response.ok({
            success: true,
            data: invoices
        })
    }

    /**
     * Manually trigger invoice generation
     */
    async store({ request, response }: HttpContext) {
        const month = request.input('month') // YYYY-MM

        try {
            const result = await InvoiceService.generateInvoices(month)
            return response.created({
                success: true,
                message: `Berhasil membuat ${result.generatedCount} tagihan baru untuk bulan ${result.month}.`,
                data: result
            })
        } catch (error: any) {
            return response.badRequest({
                success: false,
                message: 'Gagal membuat tagihan: ' + error.message
            })
        }
    }

    /**
     * Update invoice status (e.g. mark as paid)
     */
    async update({ auth, params, request, response }: HttpContext) {
        const invoice = await Invoice.findOrFail(params.id)
        const data = request.only(['status', 'discount', 'payment_type'])

        if (data.status) {
            // Security check: only admin can mark as paid (Cash payment)
            const user = auth.user!
            if (data.status === 'paid' && user.role !== User.ROLE_ADMINISTRATOR) {
                return response.forbidden({
                    success: false,
                    message: 'Hanya administrator yang dapat melakukan pembayaran tunai'
                })
            }

            invoice.status = data.status
            if (data.status === 'paid') {
                invoice.paidAt = DateTime.now()
                invoice.paymentType = data.payment_type || 'cash'
            } else {
                invoice.paidAt = null
                invoice.paymentType = null
            }
        }

        if (data.discount !== undefined && invoice.status === 'unpaid') {
            invoice.discount = Number(data.discount)
        }

        // Recalculate total amount
        invoice.totalAmount = Number(invoice.amount) + Number(invoice.previousBalance) - Number(invoice.discount)

        await invoice.save()

        // After cash payment: restore customer service in Mikrotik if marked as paid
        if (data.status === 'paid') {
            try {
                const customer = await Customer.find(invoice.customerId)
                if (customer) {
                    await CustomerService.restoreCustomerService(customer)
                }
            } catch (err: any) {
                // Log but don't fail the request
                console.error(`[Payment] Failed to restore service for invoice ${invoice.id}:`, err.message)
            }
        }

        return response.ok({
            success: true,
            message: 'Tagihan berhasil diperbarui',
            data: invoice
        })
    }

    /**
     * Delete/Cancel an invoice
     */
    async destroy({ params, response }: HttpContext) {
        const invoice = await Invoice.findOrFail(params.id)
        await invoice.delete()

        return response.ok({
            success: true,
            message: 'Tagihan berhasil dihapus'
        })
    }

    /**
     * Get Tripay Payment Channels
     */
    async getTripayChannels({ response }: HttpContext) {
        try {
            const channels = await TripayService.getPaymentChannels()
            return response.ok({
                success: true,
                data: channels
            })
        } catch (error: any) {
            return response.internalServerError({
                success: false,
                message: error.message
            })
        }
    }

    /**
     * Create Tripay Payment
     */
    async createTripayPayment({ auth, params, request, response }: HttpContext) {
        const user = auth.user!
        const method = request.input('method', 'BRIVA') // Default method

        const invoice = await Invoice.query()
            .where('id', params.id)
            .preload('customer')
            .firstOrFail()

        // Security check: only customer can initiate online payment
        if (user.role !== User.ROLE_CUSTOMER) {
            return response.forbidden({
                success: false,
                message: 'Administrator tidak diperbolehkan melakukan pembayaran online'
            })
        }

        // Security check: if user is customer, they can only pay their own invoice
        if (invoice.customer.userId !== user.id) {
            return response.forbidden({
                success: false,
                message: 'Anda tidak memiliki akses untuk membayar tagihan ini'
            })
        }

        if (invoice.status === 'paid') {
            return response.badRequest({
                success: false,
                message: 'Tagihan sudah dibayar'
            })
        }

        try {
            const data = await TripayService.createTransaction(invoice, method)
            return response.ok({
                success: true,
                data: data
            })
        } catch (error: any) {
            return response.badRequest({
                success: false,
                message: error.message
            })
        }
    }

    /**
     * POST /invoices/bulk-generate
     */
    async bulkGenerate({ request, response }: HttpContext) {
        const month = request.input('month')
        const result = await InvoiceService.generateInvoices(month)
        return response.ok({
            success: true,
            message: `Selesai. Terbuat: ${result.generatedCount}, Lewati: ${result.skippedCount}`,
            data: result
        })
    }

    /**
     * POST /customers/:id/generate-invoice
     */
    async generateForCustomer({ params, response }: HttpContext) {
        const customer = await Customer.findOrFail(params.id)
        const result = await InvoiceService.generateInvoiceForCustomer(customer)

        if (!result.success) {
            return response.badRequest({
                success: false,
                message: result.reason === 'already_exists' ? 'Tagihan bulan ini sudah ada' : 'Gagal membuat tagihan'
            })
        }

        return response.created({
            success: true,
            message: 'Tagihan berhasil dibuat',
            data: result.invoice
        })
    }

    /**
     * POST /customers/:id/restore-service
     * Manually restore a customer's PPPoE service (undo isolation)
     */
    async restoreService({ params, response }: HttpContext) {
        const customer = await Customer.findOrFail(params.id)
        try {
            await CustomerService.restoreCustomerService(customer)
            return response.ok({
                success: true,
                message: `Layanan untuk pelanggan ${customer.fullName} berhasil dipulihkan`
            })
        } catch (err: any) {
            return response.internalServerError({
                success: false,
                message: 'Gagal memulihkan layanan: ' + err.message
            })
        }
    }

    /**
     * Tripay Webhook
     */
    async tripayWebhook({ request, response }: HttpContext) {
        const rawBody = request.raw()
        const signature = request.header('X-Callback-Signature')

        if (!signature || !TripayService.validateSignature(rawBody || '', signature)) {
            return response.forbidden({ success: false, message: 'Invalid signature' })
        }

        const payload = JSON.parse(rawBody || '{}')

        const { merchant_ref, status } = payload

        if (status === 'PAID') {
            // Find invoice by Tripay reference OR merchant_ref (ID is inside merchant_ref)
            // merchant_ref format: INV-{id}-{timestamp}
            const invoiceId = merchant_ref.split('-')[1]
            const invoice = await Invoice.find(invoiceId)

            if (invoice && invoice.status !== 'paid') {
                invoice.status = 'paid'
                invoice.paidAt = DateTime.now()
                invoice.paymentMethod = payload.payment_method
                await invoice.save()

                if (invoice.type === 'voucher' && invoice.productId && invoice.deviceId) {
                    // Generate Voucher
                    const hotspotService = new HotspotService()
                    const result = await hotspotService.generateBatch(invoice.productId, invoice.deviceId, 1)
                    
                    if (result.vouchers.length > 0 && invoice.whatsappNumber) {
                        const voucher = result.vouchers[0]
                        const product = await invoice.related('product').query().first()
                        
                        const message = `Terima kasih! Pembayaran *${product?.name || 'Voucher'}* berhasil.\n\nKode Voucher Anda:\n*${voucher.code}*\n\nSilakan masukkan kode tersebut di halaman login Hotspot kami.\n_Homenet Team_`
                        await WhatsappService.sendMessage(invoice.whatsappNumber, message)
                    }
                } else if (invoice.type === 'billing') {
                    // Restore service for billing
                    try {
                        const customer = await invoice.related('customer').query().first()
                        if (customer) {
                            await CustomerService.restoreCustomerService(customer)
                        }
                    } catch (err: any) {
                        console.error('[Tripay Webhook] Restore service error:', err.message)
                    }
                }
            }
        }

        return response.ok({ success: true })
    }

    /**
     * GET /public/invoices/:token
     */
    async showPublic({ params, response }: HttpContext) {
        try {
            const invoice = await Invoice.query()
                .where('paymentToken', params.token)
                .preload('customer')
                .preload('product')
                .firstOrFail()
            
            let voucherCode: string | null = null
            if (invoice.type === 'voucher' && invoice.status === 'paid') {
                const voucher = await Voucher.query()
                    .where('productId', invoice.productId!)
                    .where('deviceId', invoice.deviceId!)
                    .where('createdAt', '>=', invoice.paidAt!.toSQL() ?? DateTime.now().toSQL())
                    .orderBy('createdAt', 'desc')
                    .first()
                if (voucher) {
                    voucherCode = voucher.code
                }
            }

            return response.ok({
                success: true,
                data: {
                    id: invoice.id,
                    type: invoice.type,
                    month: invoice.month,
                    amount: invoice.amount,
                    previous_balance: invoice.previousBalance,
                    total_amount: invoice.totalAmount,
                    status: invoice.status,
                    due_date: invoice.dueDate,
                    customer_name: invoice.fullName || invoice.customer?.fullName || 'Pembeli Voucher',
                    customer_email: invoice.customer?.user?.email || (invoice.whatsappNumber ? `${invoice.whatsappNumber}@homenet.id` : 'pembeli@homenet.id'),
                    customer_phone: invoice.customer?.phone || invoice.whatsappNumber || '',
                    product_name: invoice.product?.name,
                    voucher_code: voucherCode,
                    payment_token: invoice.paymentToken
                }
            })
        } catch (error) {
            return response.notFound({ success: false, message: 'Tagihan tidak ditemukan' })
        }
    }

    /**
     * POST /public/invoices/:token/pay
     */
    async createTripayPaymentPublic({ params, request, response }: HttpContext) {
        const method = request.input('method', 'BRIVA')

        try {
            const invoice = await Invoice.query()
                .where('paymentToken', params.token)
                .preload('customer')
                .firstOrFail()

            if (invoice.status === 'paid') {
                return response.badRequest({
                    success: false,
                    message: 'Tagihan sudah dibayar'
                })
            }

            const data = await TripayService.createTransaction(invoice, method)
            return response.ok({
                success: true,
                data: data
            })
        } catch (error: any) {
            return response.badRequest({
                success: false,
                message: error.message
            })
        }
    }

    /**
     * POST /invoices/:id/notify
     * Send WhatsApp notification via system
     */
    async notify({ params, response }: HttpContext) {
        const invoice = await Invoice.query()
            .where('id', params.id)
            .preload('customer')
            .firstOrFail()

        if (!invoice.customer.phone) {
            return response.badRequest({
                success: false,
                message: 'Pelanggan tidak memiliki nomor telepon'
            })
        }

        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        const [yr, mo] = invoice.month.split('-')
        const monthLabel = `${monthNames[parseInt(mo) - 1]} ${yr}`

        const formatIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
        const dueDateLabel = invoice.dueDate.setLocale('id').toFormat('dd MMMM yyyy')

        const messageText = `Halo Bapak/Ibu *${invoice.customer.fullName}*,\n\nTagihan internet untuk bulan *${monthLabel}*:\n- Total: *${formatIDR(invoice.totalAmount)}*\n- Jatuh Tempo: *${dueDateLabel}*\n\nMohon segera melakukan pembayaran.\n_Homenet Team_`

        try {
            await WhatsappService.sendMessage(invoice.customer.phone, messageText)
            return response.ok({
                success: true,
                message: 'Notifikasi WhatsApp telah dikirim ke sistem'
            })
        } catch (error: any) {
            return response.internalServerError({
                success: false,
                message: 'Gagal mengirim notifikasi: ' + error.message
            })
        }
    }
}