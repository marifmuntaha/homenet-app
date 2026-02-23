import type { HttpContext } from '@adonisjs/core/http'
import Invoice from '#models/invoice'
import User from '#models/user'
import Customer from '#models/customer'
import InvoiceService from '#services/invoice_service'
import MidtransService from '#services/midtrans_service'
import CustomerService from '#services/customer_service'
import { DateTime } from 'luxon'

export default class InvoicesController {
    /**
     * List invoices
     */
    async index({ request, response }: HttpContext) {
        const page = request.input('page', 1)
        const limit = request.input('limit', 10)
        const status = request.input('status')
        const customerId = request.input('customer_id')
        const year = request.input('year')
        const monthFilter = request.input('month') // e.g., '03'

        const query = Invoice.query()
            .preload('customer')
            .orderBy('month', 'desc')
            .orderBy('id', 'desc')

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
     * Create Midtrans Payment
     */
    async createPayment({ auth, params, response }: HttpContext) {
        const user = auth.user!
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
            const transaction = await MidtransService.createTransaction(invoice)
            return response.ok({
                success: true,
                data: transaction
            })
        } catch (error: any) {
            console.error('Midtrans creation error:', error)
            return response.badRequest({
                success: false,
                message: 'Gagal membuat transaksi: ' + error.message
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
     * Midtrans Webhook
     */
    async webhook({ request, response }: HttpContext) {
        const payload = request.body()
        try {
            await MidtransService.handleNotification(payload)
            return response.ok({ success: true })
        } catch (error: any) {
            return response.badRequest({
                success: false,
                message: error.message
            })
        }
    }
}