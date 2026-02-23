import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import User from '#models/user'

export default class AdminMiddleware {
    async handle(ctx: HttpContext, next: NextFn) {
        const user = ctx.auth.user

        if (!user || user.role !== User.ROLE_ADMINISTRATOR) {
            return ctx.response.forbidden({
                message: 'Akses ditolak. Hanya administrator yang dapat mengakses halaman ini.',
            })
        }

        return next()
    }
}
