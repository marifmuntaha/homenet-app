import type { HttpContext } from '@adonisjs/core/http'
import Odp from '#models/odp'

export default class OdpsController {
    async index({ response }: HttpContext) {
        // Preload parent and check tree structure
        const odps = await Odp.query().preload('parent')
        return response.ok({ success: true, data: odps })
    }

    async store({ request, response }: HttpContext) {
        const payload = request.only(['parentId', 'name', 'description', 'latitude', 'longitude'])
        const odp = await Odp.create(payload)
        return response.created({ success: true, data: odp })
    }

    async update({ params, request, response }: HttpContext) {
        const odp = await Odp.findOrFail(params.id)
        const payload = request.only(['parentId', 'name', 'description', 'latitude', 'longitude'])

        // Prevent circular reference (a node cannot be its own parent)
        if (payload.parentId === odp.id) {
            return response.badRequest({ success: false, message: 'ODP tidak bisa menjadi parent bagi dirinya sendiri' })
        }

        await odp.merge(payload).save()
        return response.ok({ success: true, data: odp })
    }

    async destroy({ params, response }: HttpContext) {
        const odp = await Odp.findOrFail(params.id)

        // Check if it has children
        const childrenCount = await Odp.query().where('parentId', odp.id).count('* as total')
        if (Number(childrenCount[0].$extras.total) > 0) {
            return response.badRequest({
                success: false,
                message: 'Tidak dapat menghapus ODP ini karena masih memiliki child ODP. Hapus child terlebih dahulu atau ubah parentnya.'
            })
        }

        await odp.delete()
        return response.ok({ success: true, message: 'ODP berhasil dihapus' })
    }
}