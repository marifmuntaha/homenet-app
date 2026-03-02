import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import CustomerOnt from '#models/customer_ont'
import Customer from '#models/customer'
import GenieAcsService from '#services/genie_acs_service'
import { createOntValidator, updateOntValidator, setWifiValidator } from '#validators/ont_validator'

export default class OntsController {
    private genie = new GenieAcsService()

    /* ─── CRUD ────────────────────────────────────────────────────────── */

    /**
     * GET /onts
     */
    async index({ request, response }: HttpContext) {
        const page = request.input('page', 1)
        const limit = request.input('limit', 15)
        const search = request.input('search', '')

        const query = CustomerOnt.query()
            .preload('customer', (q) => q.preload('user'))
            .orderBy('created_at', 'desc')

        if (search) {
            query.where((q) => {
                q.whereILike('ont_label', `%${search}%`)
                    .orWhereILike('serial_number', `%${search}%`)
                    .orWhereILike('genieacs_device_id', `%${search}%`)
            })
        }

        const onts = await query.paginate(page, limit)
        return response.ok({ success: true, data: onts })
    }

    /**
     * GET /onts/:id
     */
    async show({ params, response }: HttpContext) {
        const ont = await CustomerOnt.query()
            .where('id', params.id)
            .preload('customer', (q) => q.preload('user'))
            .firstOrFail()

        return response.ok({ success: true, data: ont })
    }

    /**
     * POST /onts
     * Input ONT baru: serial number + customer. Status awal = pending.
     */
    async store({ request, response }: HttpContext) {
        const data = await request.validateUsing(createOntValidator)

        const customer = await Customer.query()
            .where('id', data.customer_id)
            .preload('subscriptions', (q) => q.where('status', 'active').preload('product'))
            .firstOrFail()

        // Default WiFi SSID = pppoe_user jika tidak diisi
        const defaultSsid = data.wifi_ssid ?? (customer.pppoeUser ? `Homenet-${customer.pppoeUser}` : null)

        const ont = await CustomerOnt.create({
            customerId: data.customer_id,
            serialNumber: data.serial_number,
            ontLabel: data.ont_label ?? null,
            genieacsDeviceId: data.genieacs_device_id ?? null,
            wifiSsid: defaultSsid,
            wifiPassword: data.wifi_password ?? null,
            provisionStatus: 'pending',
        })

        const loaded = await CustomerOnt.query()
            .where('id', ont.id)
            .preload('customer', (q) => q.preload('user'))
            .firstOrFail()

        return response.created({
            success: true,
            message: 'ONT berhasil ditambahkan. Menunggu perangkat terhubung ke GenieACS.',
            data: loaded,
        })
    }

    /**
     * PUT /onts/:id
     */
    async update({ params, request, response }: HttpContext) {
        const ont = await CustomerOnt.findOrFail(params.id)
        const data = await request.validateUsing(updateOntValidator)

        ont.merge({
            customerId: data.customer_id ?? ont.customerId,
            serialNumber: data.serial_number ?? ont.serialNumber,
            ontLabel: data.ont_label !== undefined ? (data.ont_label ?? null) : ont.ontLabel,
            genieacsDeviceId: data.genieacs_device_id !== undefined ? (data.genieacs_device_id ?? null) : ont.genieacsDeviceId,
            wifiSsid: data.wifi_ssid !== undefined ? (data.wifi_ssid ?? null) : ont.wifiSsid,
            wifiPassword: data.wifi_password !== undefined ? (data.wifi_password ?? null) : ont.wifiPassword,
        })

        await ont.save()
        return response.ok({ success: true, message: 'ONT berhasil diperbarui', data: ont })
    }

    /**
     * DELETE /onts/:id
     */
    async destroy({ params, response }: HttpContext) {
        const ont = await CustomerOnt.findOrFail(params.id)
        await ont.delete()
        return response.ok({ success: true, message: 'ONT berhasil dihapus dari mapping' })
    }

    /* ─── GENIEACS ACTIONS ────────────────────────────────────────────── */

    /**
     * GET /onts/:id/info
     * Ambil info real-time dari GenieACS (hanya jika sudah provisioned)
     */
    async info({ params, response }: HttpContext) {
        const ont = await CustomerOnt.findOrFail(params.id)

        if (!ont.genieacsDeviceId) {
            return response.ok({
                success: true,
                data: {
                    ont_id: ont.id,
                    ont_label: ont.ontLabel,
                    serial_number: ont.serialNumber,
                    provision_status: ont.provisionStatus,
                    online: false,
                    error: 'Perangkat belum terhubung ke GenieACS',
                },
            })
        }

        const info = await this.genie.getOntInfo(ont.genieacsDeviceId)
        return response.ok({
            success: true,
            data: {
                ont_id: ont.id,
                ont_label: ont.ontLabel,
                serial_number: ont.serialNumber,
                genieacs_device_id: ont.genieacsDeviceId,
                provision_status: ont.provisionStatus,
                ...info,
            },
        })
    }

    /**
     * POST /onts/:id/reboot
     */
    async reboot({ params, response }: HttpContext) {
        const ont = await CustomerOnt.findOrFail(params.id)

        if (!ont.genieacsDeviceId) {
            return response.badRequest({ success: false, message: 'Perangkat belum terhubung ke GenieACS' })
        }

        const success = await this.genie.reboot(ont.genieacsDeviceId)
        if (!success) return response.internalServerError({ success: false, message: 'Gagal mengirim perintah reboot ke ONT' })

        return response.ok({ success: true, message: 'Perintah reboot berhasil dikirim ke ONT' })
    }

    /**
     * POST /onts/:id/set-wifi
     */
    async setWifi({ params, request, response }: HttpContext) {
        const ont = await CustomerOnt.findOrFail(params.id)
        const data = await request.validateUsing(setWifiValidator)

        if (!ont.genieacsDeviceId) {
            return response.badRequest({ success: false, message: 'Perangkat belum terhubung ke GenieACS' })
        }

        const success = await this.genie.setWifi(ont.genieacsDeviceId, data.ssid, data.password)

        if (!success) return response.internalServerError({ success: false, message: 'Gagal mengubah pengaturan WiFi ONT' })

        // Update default WiFi di DB juga
        ont.wifiSsid = data.ssid
        ont.wifiPassword = data.password
        await ont.save()

        return response.ok({ success: true, message: 'Pengaturan WiFi berhasil diubah. Perubahan akan aktif beberapa saat.' })
    }

    /**
     * POST /onts/:id/factory-reset
     */
    async factoryReset({ params, response }: HttpContext) {
        const ont = await CustomerOnt.findOrFail(params.id)

        if (!ont.genieacsDeviceId) {
            return response.badRequest({ success: false, message: 'Perangkat belum terhubung ke GenieACS' })
        }

        const success = await this.genie.factoryReset(ont.genieacsDeviceId)
        if (!success) return response.internalServerError({ success: false, message: 'Gagal mengirim perintah factory reset ke ONT' })

        // Reset provision_status ke pending setelah factory reset
        ont.provisionStatus = 'pending'
        ont.genieacsDeviceId = null
        ont.provisionedAt = null
        await ont.save()

        return response.ok({ success: true, message: 'Perintah factory reset berhasil dikirim. ONT akan kembali ke pengaturan pabrik.' })
    }

    /* ─── ZTP: PROVISIONING ENDPOINTS (PUBLIC) ────────────────────────── */

    /**
     * GET /onts/provision/:serial
     * PUBLIC — dipanggil oleh GenieACS Extension saat ONT pertama kali inform.
     * Return konfigurasi yang harus diset ke ONT.
     */
    async provision({ params, response }: HttpContext) {
        const serial = params.serial?.trim()

        if (!serial) {
            return response.ok({ found: false, reason: 'no_serial' })
        }

        const ont = await CustomerOnt.query()
            .whereILike('serial_number', serial)
            .preload('customer', (q) => {
                q.preload('subscriptions', (sq) => sq.where('status', 'active').preload('product'))
            })
            .first()

        if (!ont || !ont.customer) {
            return response.ok({ found: false, reason: 'not_registered' })
        }

        const customer = ont.customer
        const activeSub = customer.subscriptions?.[0]

        // WiFi SSID: prioritas dari ont.wifiSsid, fallback ke pppoe_user, fallback ke nama pelanggan
        const wifiSsid = ont.wifiSsid
            ?? (customer.pppoeUser ? `Homenet-${customer.pppoeUser}` : `Homenet-${customer.fullName.replace(/\s+/g, '')}`)
        const wifiPassword = ont.wifiPassword ?? customer.pppoePassword ?? null

        if (!wifiPassword) {
            return response.ok({ found: true, error: 'wifi_password_not_set' })
        }

        return response.ok({
            found: true,
            ont_id: ont.id,
            serial_number: serial,
            pppoe_user: customer.pppoeUser,
            pppoe_password: customer.pppoePassword,
            wifi_ssid: wifiSsid,
            wifi_password: wifiPassword,
            product: activeSub?.product?.name ?? null,
        })
    }

    /**
     * POST /onts/provision/:serial/done
     * PUBLIC — dipanggil oleh GenieACS Extension setelah provisioning berhasil.
     * Menyimpan genieacs_device_id dan menandai status = provisioned.
     */
    async provisionDone({ params, request, response }: HttpContext) {
        const serial = params.serial?.trim()
        const { genieacs_device_id, status } = request.only(['genieacs_device_id', 'status'])

        const ont = await CustomerOnt.query()
            .whereILike('serial_number', serial)
            .first()

        if (!ont) {
            return response.ok({ success: false, reason: 'not_found' })
        }

        ont.genieacsDeviceId = genieacs_device_id ?? ont.genieacsDeviceId
        ont.provisionStatus = (status === 'failed') ? 'failed' : 'provisioned'
        ont.provisionedAt = DateTime.now()
        await ont.save()

        return response.ok({ success: true, ont_id: ont.id })
    }

    /**
     * POST /onts/:id/sync-provision
     * Sinkronisasi provisioning: cari device di GenieACS by serial number,
     * lalu push SetParameterValues task (PPPoE + WiFi) via NBI API.
     * Tidak memerlukan extension atau provisioning script.
     */
    async syncProvision({ params, response }: HttpContext) {
        const ont = await CustomerOnt.query()
            .where('id', params.id)
            .preload('customer')
            .firstOrFail()

        if (!ont.serialNumber) {
            return response.badRequest({ success: false, message: 'Serial number ONT belum diisi' })
        }

        const customer = ont.customer
        if (!customer?.pppoeUser) {
            return response.badRequest({ success: false, message: 'Data PPPoE pelanggan belum lengkap' })
        }

        // Cari device di GenieACS berdasarkan serial number
        const device = await this.genie.getDeviceBySerial(ont.serialNumber)

        if (!device) {
            return response.ok({
                success: false,
                message: `Device dengan serial "${ont.serialNumber}" belum terdaftar di GenieACS. Pastikan ONT sudah terhubung dan ACS URL sudah dikonfigurasi.`,
            })
        }

        // Push provisioning task ke GenieACS
        const wifiSsid = ont.wifiSsid ?? `Homenet-${customer.pppoeUser}`
        const wifiPassword = ont.wifiPassword ?? customer.pppoePassword

        const success = await this.genie.provisionOnt({
            deviceId: device._id,
            pppoeUser: customer.pppoeUser,
            pppoePassword: customer.pppoePassword,
            wifiSsid,
            wifiPassword,
        })

        if (!success) {
            return response.internalServerError({
                success: false,
                message: 'Gagal mengirim task ke GenieACS',
            })
        }

        // Update status dan device ID di DB
        ont.genieacsDeviceId = device._id
        ont.provisionStatus = 'provisioned'
        ont.provisionedAt = DateTime.now()
        await ont.save()

        return response.ok({
            success: true,
            message: `Provisioning task berhasil dikirim ke ONT "${ont.serialNumber}". PPPoE dan WiFi akan diterapkan pada inform berikutnya.`,
            data: {
                genieacs_device_id: device._id,
                last_inform: device._lastInform,
            },
        })
    }

    /**
     * GET /onts/discover
     * Ambil semua device dari GenieACS
     */
    async discover({ response }: HttpContext) {
        const [genieDevices, mappedOnts] = await Promise.all([
            this.genie.getDevices(),
            CustomerOnt.query().select('genieacs_device_id'),
        ])

        const mappedIds = new Set(mappedOnts.map((o) => o.genieacsDeviceId).filter(Boolean))

        const all = genieDevices.map((d) => ({
            device_id: d._id,
            serial_number: d._deviceId?._SerialNumber,
            product_class: d._deviceId?._ProductClass,
            manufacturer: d._deviceId?._Manufacturer,
            last_inform: d._lastInform,
            registered: d._registered,
            is_mapped: mappedIds.has(d._id),
        }))

        return response.ok({
            success: true,
            data: {
                all,
                unmapped: all.filter((d) => !d.is_mapped),
                total: all.length,
                total_unmapped: all.filter((d) => !d.is_mapped).length,
            },
        })
    }
}
