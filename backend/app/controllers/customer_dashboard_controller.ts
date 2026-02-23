import type { HttpContext } from '@adonisjs/core/http'
import Customer from '#models/customer'
import Invoice from '#models/invoice'
import Device from '#models/device'
import MikrotikService from '#services/mikrotik_service'

export default class CustomerDashboardController {
    async index({ auth, response }: HttpContext) {
        const user = auth.user!

        // Find the customer associated with this user
        const customer = await Customer.query()
            .where('user_id', user.id)
            .preload('subscriptions', (query) => {
                query.preload('product')
            })
            .first()

        if (!customer) {
            return response.notFound({
                success: false,
                message: 'Profil pelanggan tidak ditemukan',
            })
        }

        // Get recent invoices
        const invoices = await Invoice.query()
            .where('customer_id', customer.id)
            .orderBy('month', 'desc')
            .limit(10)

        // Calculate unpaid summary
        const unpaidInvoices = await Invoice.query()
            .where('customer_id', customer.id)
            .where('status', 'unpaid')

        const unpaidAmount = unpaidInvoices.reduce((acc, curr) => acc + Number(curr.totalAmount), 0)

        // Real-time Mikrotik Info
        let connectionInfo = null
        if (customer.pppoeUser) {
            const devices = await Device.all()
            const targetUser = customer.pppoeUser?.trim()

            for (const device of devices) {
                const svc = MikrotikService.fromDevice(device)
                try {
                    // Fetch all active connections instead of filtering by name (more robust)
                    const connections = await svc.getActivePPPConnectionDetail('')
                    if (Array.isArray(connections)) {
                        // Try exact match first, then case-insensitive
                        const detail = connections.find(c => c.name === targetUser) ||
                            connections.find(c => c.name.toLowerCase() === targetUser?.toLowerCase())

                        if (detail) {
                            connectionInfo = {
                                online: true,
                                ipAddress: detail['address'],
                                uptime: detail['uptime'],
                                service: detail['service'],
                                callerId: detail['caller-id'],
                                isIsolated: detail['profile']?.toLowerCase().includes('isolir') ||
                                    detail['profile']?.toLowerCase().includes('isolate'),
                                profile: detail['profile']
                            }
                            break // Found on this device
                        }
                    }
                } catch (err) {
                    console.error(`Error fetching mikrotik info from ${device.name}:`, err)
                }
            }
        }

        return response.ok({
            success: true,
            data: {
                customer: {
                    id: customer.id,
                    fullName: customer.fullName,
                    phone: customer.phone,
                    address: customer.address,
                },
                subscription: customer.subscriptions[0] || null,
                recentInvoices: invoices,
                summary: {
                    unpaidCount: unpaidInvoices.length,
                    unpaidAmount: unpaidAmount,
                },
                connection: connectionInfo,
                _debug: {
                    pppoeUser: customer.pppoeUser,
                    hasConnectionInfo: !!connectionInfo
                }
            },
        })
    }
}
