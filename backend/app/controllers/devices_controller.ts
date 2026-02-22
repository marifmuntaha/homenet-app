import type { HttpContext } from '@adonisjs/core/http'
import Device from '#models/device'
import { createDeviceValidator, updateDeviceValidator } from '#validators/device_validator'
import MikrotikService from '#services/mikrotik_service'

export default class DevicesController {
    /**
     * GET /devices
     * List all devices with optional search
     */
    async index({ request, response }: HttpContext) {
        const page = request.input('page', 1)
        const limit = request.input('limit', 15)
        const search = request.input('search', '')

        const query = Device.query().orderBy('created_at', 'desc')

        if (search) {
            query.where((q) => {
                q.whereILike('name', `%${search}%`)
                    .orWhereILike('host', `%${search}%`)
                    .orWhereILike('user', `%${search}%`)
            })
        }

        const devices = await query.paginate(page, limit)

        return response.ok({
            success: true,
            data: devices,
        })
    }

    /**
     * GET /devices/:id
     * Show single device
     */
    async show({ params, response }: HttpContext) {
        const device = await Device.findOrFail(params.id)

        return response.ok({
            success: true,
            data: device,
        })
    }

    /**
     * POST /devices
     * Create a new device
     */
    async store({ request, response }: HttpContext) {
        const data = await request.validateUsing(createDeviceValidator)

        const device = await Device.create({
            name: data.name,
            host: data.host,
            user: data.user,
            password: data.password,
            port: data.port ?? 80,
        })

        return response.created({
            success: true,
            message: 'Device berhasil ditambahkan',
            data: device,
        })
    }

    /**
     * PUT /devices/:id
     * Update existing device
     */
    async update({ params, request, response }: HttpContext) {
        const device = await Device.findOrFail(params.id)
        const data = await request.validateUsing(updateDeviceValidator)

        device.merge({
            name: data.name ?? device.name,
            host: data.host ?? device.host,
            user: data.user ?? device.user,
            port: data.port ?? device.port,
        })

        if (data.password) {
            device.password = data.password
        }

        await device.save()

        return response.ok({
            success: true,
            message: 'Device berhasil diperbarui',
            data: device,
        })
    }

    /**
     * DELETE /devices/:id
     * Delete device
     */
    async destroy({ params, response }: HttpContext) {
        const device = await Device.findOrFail(params.id)
        await device.delete()

        return response.ok({
            success: true,
            message: 'Device berhasil dihapus',
        })
    }

    /**
     * GET /devices/:id/status
     * Check if a Mikrotik device is online/offline via REST API
     */
    async status({ params, response }: HttpContext) {
        const device = await Device.findOrFail(params.id)

        const svc = MikrotikService.fromDevice(device)
        const status = await svc.checkStatus()

        return response.ok({
            success: true,
            data: {
                device_id: device.id,
                online: status.online,
                identity: status.identity,
                response_ms: status.response_ms,
                error: status.error,
                checked_at: new Date().toISOString(),
            },
        })
    }

    /**
     * POST /devices/:id/test
     * Test full connection + get system resource info
     */
    async testConnection({ params, response }: HttpContext) {
        const device = await Device.findOrFail(params.id)

        const svc = MikrotikService.fromDevice(device)
        const [status, sysResource] = await Promise.all([
            svc.checkStatus(),
            svc.getSystemResource(),
        ])

        return response.ok({
            success: true,
            data: {
                device_id: device.id,
                device_name: device.name,
                online: status.online,
                identity: status.identity,
                response_ms: status.response_ms,
                error: status.error,
                system: sysResource.online ? sysResource.data : null,
                checked_at: new Date().toISOString(),
            },
        })
    }
}
