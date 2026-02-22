import type { HttpContext } from '@adonisjs/core/http'
import Invoice from '#models/invoice'
import InvoiceService from '#services/invoice_service'
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
    async update({ params, request, response }: HttpContext) {
        const invoice = await Invoice.findOrFail(params.id)
        const data = request.only(['status', 'discount'])

        if (data.status) {
            invoice.status = data.status
            if (data.status === 'paid') {
                invoice.paidAt = DateTime.now()
            } else {
                invoice.paidAt = null
            }
        }

        if (data.discount !== undefined && invoice.status === 'unpaid') {
            invoice.discount = Number(data.discount)
        }

        // Recalculate total amount
        invoice.totalAmount = Number(invoice.amount) + Number(invoice.previousBalance) - Number(invoice.discount)

        await invoice.save()

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
}