import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import Customer from '#models/customer'
import Invoice from '#models/invoice'
import Device from '#models/device'
import MikrotikService from '#services/mikrotik_service'

export default class AdminDashboardController {
    async index({ response }: HttpContext) {
        // 1. Basic Stats
        const totalCustomers = await Customer.query().count('* as total')

        const unpaidInvoices = await Invoice.query().where('status', 'unpaid')
        const unpaidAmount = unpaidInvoices.reduce((acc, curr) => acc + Number(curr.totalAmount), 0)

        // 2. Real-time Online Stats
        const devices = await Device.all()
        const activeUsersSet = new Set<string>()

        await Promise.allSettled(
            devices.map(async (device) => {
                try {
                    const svc = MikrotikService.fromDevice(device)
                    const activeOnDevice = await svc.getActivePPPConnections()
                    for (const user of activeOnDevice) {
                        activeUsersSet.add(user)
                    }
                } catch {
                    // ignore
                }
            })
        )

        // 3. Income Stats
        const now = DateTime.now()
        const startOfMonth = now.startOf('month').toSQL()
        const startOfYear = now.startOf('year').toSQL()

        const monthlyPaidInvoices = await Invoice.query()
            .where('status', 'paid')
            .where('paid_at', '>=', startOfMonth!)

        const yearlyPaidInvoices = await Invoice.query()
            .where('status', 'paid')
            .where('paid_at', '>=', startOfYear!)

        const monthlyIncome = monthlyPaidInvoices.reduce((acc, curr) => acc + Number(curr.totalAmount), 0)
        const yearlyIncome = yearlyPaidInvoices.reduce((acc, curr) => acc + Number(curr.totalAmount), 0)

        // 4. Recent Invoices
        const recentInvoices = await Invoice.query()
            .preload('customer')
            .orderBy('created_at', 'desc')
            .limit(5)

        return response.ok({
            success: true,
            data: {
                stats: {
                    totalCustomers: Number(totalCustomers[0].$extras.total),
                    onlineCustomers: activeUsersSet.size,
                    unpaidInvoicesCount: unpaidInvoices.length,
                    unpaidInvoicesAmount: unpaidAmount,
                    monthlyIncome,
                    yearlyIncome
                },
                recentInvoices
            }
        })
    }
}
