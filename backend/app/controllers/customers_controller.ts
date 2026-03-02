import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import Customer, { CustomerStatus } from '#models/customer'
import User from '#models/user'
import CustomerSubscription from '#models/customer_subscription'
import Product from '#models/product'
import Device from '#models/device'
import MikrotikService from '#services/mikrotik_service'
import WhatsappService from '#services/whatsapp_service'
import {
    createCustomerValidator,
    updateCustomerValidator,
    changeProductValidator
} from '#validators/customer_validator'

export default class CustomersController {
    /**
     * GET /customers
     * List all customers with their active subscription
     */
    async index({ request, response }: HttpContext) {
        const page = request.input('page', 1)
        const limit = request.input('limit', 15)
        const search = request.input('search', '')

        const query = Customer.query()
            .preload('user')
            .preload('subscriptions', (subsQuery) => {
                subsQuery.where('status', 'active').preload('product')
            })
            .orderBy('created_at', 'desc')

        if (search) {
            query.where((q) => {
                q.whereILike('full_name', `%${search}%`)
                    .orWhereILike('phone', `%${search}%`)
                    .orWhereILike('pppoe_user', `%${search}%`)
            })
        }

        const [customers, summary] = await Promise.all([
            query.paginate(page, limit),
            Customer.query().groupBy('status').select('status').count('* as count')
        ])

        const counts = {
            total: 0,
            daftar: 0,
            pemasangan: 0,
            aktif: 0,
            isolir: 0,
            'non aktif': 0
        }

        summary.forEach((item: any) => {
            const status = (item.status || item.$extras.status) as keyof typeof counts
            const count = Number(item.$extras.count)
            if (status in counts) {
                (counts[status] as number) = count
            }
            counts.total += count
        })

        return response.ok({
            success: true,
            data: customers,
            summary: counts
        })
    }
    /**
     * GET /customers/active-pppoe
     * Returns detailed info for usernames currently connected via PPPoE across all Mikrotik devices
     */
    async activePppoe({ response }: HttpContext) {
        const devices = await Device.all()
        const activeUsersData: Record<string, any> = {}

        await Promise.allSettled(
            devices.map(async (device) => {
                const svc = MikrotikService.fromDevice(device)
                try {
                    const res = await svc.getActivePPPConnectionDetail('') // Get all active
                    const connections = Array.isArray(res) ? res : []

                    for (const conn of connections) {
                        activeUsersData[conn.name] = {
                            online: true,
                            ipAddress: conn.address,
                            uptime: conn.uptime,
                            callerId: conn['caller-id'],
                            profile: conn.profile,
                            isIsolated: conn.profile?.toLowerCase().includes('isolir') ||
                                conn.profile?.toLowerCase().includes('isolate')
                        }
                    }
                } catch {
                    // Ignore device error
                }
            })
        )

        return response.ok({
            success: true,
            data: activeUsersData,
        })
    }
    /**
     * Utils: Sync PPP Secret to all Mikrotiks
     */
    private async syncPPPSecretToAllDevices(
        action: 'create' | 'update' | 'delete',
        pppoeUser: string,
        pppoePassword?: string,
        productName?: string
    ) {
        const devices = await Device.all()
        const results: Record<number, boolean> = {}

        await Promise.allSettled(
            devices.map(async (device) => {
                const svc = MikrotikService.fromDevice(device)
                let success = false
                try {
                    if (action === 'create') {
                        success = await svc.createPPPSecret(pppoeUser, pppoePassword, productName)
                        if (!success) {
                            success = await svc.updatePPPSecret(pppoeUser, pppoePassword, productName)
                        }
                    } else if (action === 'update') {
                        success = await svc.updatePPPSecret(pppoeUser, pppoePassword, productName)
                    } else if (action === 'delete') {
                        success = await svc.deletePPPSecret(pppoeUser)
                    }
                } catch {
                    success = false
                }
                results[device.id] = success
            })
        )

        return results
    }

    /**
     * POST /customers
     * Create a new Customer, associated User, Subscription, and PPP Secret
     */
    async store({ request, response }: HttpContext) {
        const data = await request.validateUsing(createCustomerValidator)

        // 1. Check if email/phone/pppoe unique
        const existingEmail = await User.findBy('email', data.email)
        if (existingEmail) return response.conflict({ success: false, message: 'Email sudah terdaftar' })

        if (data.pppoeUser) {
            const existingPppoe = await Customer.findBy('pppoeUser', data.pppoeUser)
            if (existingPppoe) return response.conflict({ success: false, message: 'PPPoE User sudah digunakan' })
        }

        const product = await Product.findOrFail(data.productId)

        // 2. Create User (Role: Customer/user)
        const user = await User.create({
            name: data.fullName,
            email: data.email,
            password: data.password,
            // role: 'user', // Basic role - jika role memakai int (id), silakan sesuaikan atau cukup andalkan default dari db
        })

        // 3. Create Customer
        const customer = await Customer.create({
            userId: user.id,
            fullName: data.fullName,
            phone: data.phone,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            pppoeUser: data.pppoeUser,
            pppoePassword: data.pppoePassword,
        })

        // 4. Create Active Subscription
        await CustomerSubscription.create({
            customerId: customer.id,
            productId: product.id,
            status: 'active',
        })

        // 5. Sync PPPoE to Mikrotik (if pppoeUser is set)
        let syncResults = {}
        if (customer.pppoeUser) {
            syncResults = await this.syncPPPSecretToAllDevices('create', customer.pppoeUser, customer.pppoePassword ?? undefined, product.name)
        }

        // 6. Send WhatsApp Welcome Message
        const welcomeMessage = `Halo Bapak/Ibu *${customer.fullName}*,

Terima kasih telah memilih layanan internet kami! 🙏

Pesanan Anda telah kami terima. Tim teknisi kami akan melakukan pemasangan perangkat internet di lokasi Anda dalam waktu *1-2 hari kerja*.

Mohon pastikan nomor ini aktif agar tim kami dapat menghubungi Anda untuk konfirmasi jadwal pemasangan.

Terima kasih,
*Homenet Team*`

        logger.info(`Dispatching WhatsApp message to ${customer.phone}`)
        const whatsappRes = await WhatsappService.sendMessage(customer.phone, welcomeMessage)
        logger.info(`WhatsApp dispatch result: ${JSON.stringify(whatsappRes)}`)

        await customer.load('subscriptions', (q) => q.preload('product'))

        return response.created({
            success: true,
            message: 'Pelanggan berhasil ditambahkan',
            data: customer,
            sync: syncResults,
        })
    }

    /**
     * PUT /customers/:id
     * Update customer details and PPP secret if changed
     */
    async update({ params, request, response }: HttpContext) {
        const customer = await Customer.findOrFail(params.id)
        const data = await request.validateUsing(updateCustomerValidator)

        if (data.pppoeUser && data.pppoeUser !== customer.pppoeUser) {
            const existingPppoe = await Customer.query()
                .where('pppoe_user', data.pppoeUser)
                .whereNot('id', customer.id)
                .first()
            if (existingPppoe) return response.conflict({ success: false, message: 'PPPoE User sudah digunakan' })
        }

        const oldPppoeUser = customer.pppoeUser
        const oldStatus = customer.status

        customer.merge(data as any)

        // logic: if status set to pemasangan and pppoe is empty, generate it
        if (customer.status === CustomerStatus.PEMASANGAN && !customer.pppoeUser) {
            await customer.generatePppoeCredentials()
        }

        // 1. Send WhatsApp Message if status changed to 'pemasangan'
        if (oldStatus !== customer.status && customer.status === CustomerStatus.PEMASANGAN) {
            const installMessage = `Halo Bapak/Ibu *${customer.fullName}*,

Kabar baik! Tim teknisi kami telah ditugaskan untuk melakukan pemasangan perangkat internet di lokasi Anda. 🛠️

*Penting:*
Mohon untuk tidak memberikan biaya apa pun kepada teknisi di lapangan. Semua biaya administrasi dan pemasangan hanya dilakukan melalui metode pembayaran resmi kami.

Tim kami akan segera menghubungi Anda untuk koordinasi waktu kedatangan.

Terima kasih,
*Homenet Team*`
            await WhatsappService.sendMessage(customer.phone, installMessage)
        }

        await customer.save()

        // Sync Mikrotik if PPPoE credentials changed
        let syncResults = {}
        // Need to know current product for Mikrotik config
        const activeSub = await CustomerSubscription.query()
            .where('customer_id', customer.id)
            .where('status', 'active')
            .preload('product')
            .first()

        const productName = activeSub ? activeSub.product.name : undefined

        if (oldPppoeUser && oldPppoeUser !== customer.pppoeUser) {
            // Jika ganti username PPPoE, hapus yang lama
            await this.syncPPPSecretToAllDevices('delete', oldPppoeUser)
        }

        if (customer.pppoeUser) {
            // Update / Create yang baru
            syncResults = await this.syncPPPSecretToAllDevices('update', customer.pppoeUser, customer.pppoePassword ?? undefined, productName)
        }

        return response.ok({
            success: true,
            message: 'Data pelanggan berhasil diperbarui',
            data: customer,
            sync: syncResults,
        })
    }

    /**
     * DELETE /customers/:id
     * Delete customer entirely
     */
    async destroy({ params, response }: HttpContext) {
        const customer = await Customer.findOrFail(params.id)

        let syncResults = {}
        if (customer.pppoeUser) {
            syncResults = await this.syncPPPSecretToAllDevices('delete', customer.pppoeUser)
        }

        // Will cascade delete subscriptions
        await customer.delete()

        // Optionally delete the User account too
        const user = await User.find(customer.userId)
        if (user) await user.delete()

        return response.ok({
            success: true,
            message: 'Pelanggan berhasil dihapus',
            sync: syncResults,
        })
    }

    /**
     * POST /customers/:id/change-product
     * Change ongoing subscription to a new product
     */
    async changeProduct({ params, request, response }: HttpContext) {
        const customer = await Customer.findOrFail(params.id)
        const data = await request.validateUsing(changeProductValidator)

        const newProduct = await Product.findOrFail(data.productId)

        // 1. Inactive all current subscriptions
        await CustomerSubscription.query()
            .where('customer_id', customer.id)
            .update({ status: 'inactive' })

        // 2. Create new active subscription
        await CustomerSubscription.create({
            customerId: customer.id,
            productId: newProduct.id,
            status: 'active',
        })

        // 3. Sync to Mikrotik router (change their profile)
        let syncResults = {}
        if (customer.pppoeUser) {
            syncResults = await this.syncPPPSecretToAllDevices('update', customer.pppoeUser, customer.pppoePassword ?? undefined, newProduct.name)
        }

        return response.ok({
            success: true,
            message: 'Produk/Langganan pelanggan berhasil diubah',
            sync: syncResults,
        })
    }
}
