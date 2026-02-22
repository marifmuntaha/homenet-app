import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { createUserValidator, updateUserValidator } from '#validators/user_validator'

export default class UsersController {
    /**
     * GET /users
     * List all users with optional search
     */
    async index({ request, response }: HttpContext) {
        const page = request.input('page', 1)
        const limit = request.input('limit', 15)
        const search = request.input('search', '')

        const query = User.query().orderBy('created_at', 'desc')

        if (search) {
            query.where((q) => {
                q.whereILike('name', `%${search}%`)
                    .orWhereILike('email', `%${search}%`)
                    .orWhereILike('phone', `%${search}%`)
            })
        }

        const users = await query.paginate(page, limit)

        return response.ok({
            success: true,
            data: users,
        })
    }

    /**
     * GET /users/:id
     * Show single user
     */
    async show({ params, response }: HttpContext) {
        const user = await User.findOrFail(params.id)

        return response.ok({
            success: true,
            data: user,
        })
    }

    /**
     * POST /users
     * Create a new user
     */
    async store({ request, response }: HttpContext) {
        const data = await request.validateUsing(createUserValidator)

        const existingUser = await User.findBy('email', data.email)
        if (existingUser) {
            return response.conflict({
                success: false,
                message: 'Email sudah digunakan',
            })
        }

        const user = await User.create({
            name: data.name,
            email: data.email,
            phone: data.phone ?? null,
            role: data.role ?? User.ROLE_CUSTOMER,
            password: data.password,
        })

        return response.created({
            success: true,
            message: 'User berhasil dibuat',
            data: user,
        })
    }

    /**
     * PUT /users/:id
     * Update existing user
     */
    async update({ params, request, response }: HttpContext) {
        const user = await User.findOrFail(params.id)
        const data = await request.validateUsing(updateUserValidator)

        if (data.email && data.email !== user.email) {
            const existingUser = await User.query()
                .where('email', data.email)
                .whereNot('id', user.id)
                .first()
            if (existingUser) {
                return response.conflict({
                    success: false,
                    message: 'Email sudah digunakan',
                })
            }
        }

        user.merge({
            name: data.name ?? user.name,
            email: data.email ?? user.email,
            phone: data.phone !== undefined ? data.phone : user.phone,
            role: data.role ?? user.role,
        })

        if (data.password) {
            user.password = data.password
        }

        await user.save()

        return response.ok({
            success: true,
            message: 'User berhasil diperbarui',
            data: user,
        })
    }

    /**
     * DELETE /users/:id
     * Delete user
     */
    async destroy({ params, response, auth }: HttpContext) {
        const user = await User.findOrFail(params.id)

        // Prevent self-deletion
        if (auth.user?.id === user.id) {
            return response.forbidden({
                success: false,
                message: 'Tidak dapat menghapus akun sendiri',
            })
        }

        await user.delete()

        return response.ok({
            success: true,
            message: 'User berhasil dihapus',
        })
    }
}
