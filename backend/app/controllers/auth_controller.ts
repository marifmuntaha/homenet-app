import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import crypto from 'node:crypto'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import {
    registerValidator,
    loginValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    verifyOtpValidator,
} from '#validators/auth_validator'
import OtpCode from '#models/otp_code'
import WhatsappService from '#services/whatsapp_service'

export default class AuthController {
    /**
     * POST /auth/register
     */
    async register({ request, response }: HttpContext) {
        const data = await request.validateUsing(registerValidator)

        const existingUser = await User.findBy('email', data.email)
        if (existingUser) {
            return response.conflict({
                success: false,
                message: 'Email sudah terdaftar',
            })
        }

        const user = await User.create({
            name: data.name,
            email: data.email,
            phone: data.phone, // phone is now required based on validator
            role: User.ROLE_CUSTOMER,
            password: data.password,
        })

        // Generate 6 digit OTP
        const otpString = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = DateTime.now().plus({ minutes: 5 })

        await user.related('otpCodes').create({
            otpCode: otpString,
            expiresAt: expiresAt,
        })

        // Send the WhatsApp Notification
        const messageText = `Halo ${user.name},\nKode verifikasi OTP Homenet Anda adalah: *${otpString}*.\n\nBerlaku selama 5 menit. Tolong jangan berikan kode ini ke siapapun.`
        await WhatsappService.sendMessage(user.phone!, messageText)

        return response.created({
            success: true,
            message: 'Registrasi berhasil, kode OTP telah dikirim ke WhatsApp Anda',
            data: {
                requires_otp: true,
                email: user.email,
            },
        })
    }

    /**
     * POST /auth/verify-otp
     */
    async verifyOtp({ request, response }: HttpContext) {
        const data = await request.validateUsing(verifyOtpValidator)

        const user = await User.findBy('email', data.email)
        if (!user) {
            return response.notFound({ success: false, message: 'User tidak ditemukan' })
        }

        const otpRecord = await OtpCode.query()
            .where('user_id', user.id)
            .where('otp_code', data.otp_code)
            .first()

        if (!otpRecord) {
            return response.badRequest({ success: false, message: 'Kode OTP tidak valid' })
        }

        if (otpRecord.expiresAt < DateTime.now()) {
            await otpRecord.delete()
            return response.badRequest({ success: false, message: 'Kode OTP telah kedaluwarsa, silahkan minta kode baru' })
        }

        // OTP Valid. Mark phone as verified and login
        user.phoneVerifiedAt = DateTime.now()
        await user.save()

        // Delete all OTPs for this user
        await OtpCode.query().where('user_id', user.id).delete()

        // Create authentication token
        const token = await User.accessTokens.create(user)

        return response.ok({
            success: true,
            message: 'Nomor WhatsApp berhasil diverifikasi! Login sukses.',
            data: {
                user,
                token: token.value!.release(),
            },
        })
    }

    /**
     * POST /auth/resend-otp
     */
    async resendOtp({ request, response }: HttpContext) {
        const { email } = await request.validateUsing(
            vine.compile(
                vine.object({
                    email: vine.string().email().normalizeEmail(),
                })
            )
        )

        const user = await User.findBy('email', email)
        if (!user) {
            return response.notFound({ success: false, message: 'User tidak ditemukan' })
        }

        // Delete existing OTPs
        await OtpCode.query().where('user_id', user.id).delete()

        // Generate new 6 digit OTP
        const otpString = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = DateTime.now().plus({ minutes: 5 })

        await user.related('otpCodes').create({
            otpCode: otpString,
            expiresAt: expiresAt,
        })

        // Send the WhatsApp Notification
        const messageText = `Halo ${user.name},\nKode verifikasi OTP Homenet Anda yang baru adalah: *${otpString}*.\n\nBerlaku selama 5 menit.`
        await WhatsappService.sendMessage(user.phone!, messageText)

        return response.ok({
            success: true,
            message: 'Kode OTP baru telah dikirim ke WhatsApp Anda',
        })
    }

    /**
     * POST /auth/login
     */
    async login({ request, response }: HttpContext) {
        const data = await request.validateUsing(loginValidator)

        const user = await User.verifyCredentials(data.email, data.password)
        const token = await User.accessTokens.create(user)

        return response.ok({
            success: true,
            message: 'Login berhasil',
            data: {
                user,
                token: token.value!.release(),
            },
        })
    }

    /**
     * DELETE /auth/logout  (protected)
     */
    async logout({ auth, response }: HttpContext) {
        const user = auth.user!
        await User.accessTokens.delete(user, user.currentAccessToken.identifier)

        return response.ok({
            success: true,
            message: 'Logout berhasil',
        })
    }

    /**
     * GET /auth/me  (protected)
     */
    async me({ auth, response }: HttpContext) {
        return response.ok({
            success: true,
            data: auth.user,
        })
    }

    /**
     * POST /auth/forgot-password
     */
    async forgotPassword({ request, response }: HttpContext) {
        const data = await request.validateUsing(forgotPasswordValidator)

        const user = await User.findBy('email', data.email)

        // Jangan reveal apakah email ada atau tidak (keamanan)
        if (!user) {
            return response.ok({
                success: true,
                message: 'Jika email terdaftar, link reset password telah dikirim',
            })
        }

        // Hapus token lama untuk email ini
        await db.from('password_reset_tokens').where('email', data.email).delete()

        // Buat token baru
        const token = crypto.randomBytes(32).toString('hex')
        const mysqlFormat = 'yyyy-MM-dd HH:mm:ss'
        const expiresAt = DateTime.now().plus({ hours: 2 })

        await db.table('password_reset_tokens').insert({
            email: data.email,
            token: token,
            expires_at: expiresAt.toFormat(mysqlFormat),
            created_at: DateTime.now().toFormat(mysqlFormat),
        })

        // Di production: kirim email dengan link reset
        // Untuk sekarang, kembalikan token di response (development mode)
        return response.ok({
            success: true,
            message: 'Jika email terdaftar, link reset password telah dikirim',
            // DEVELOPMENT ONLY - hapus ini di production:
            dev_token: token,
        })
    }

    /**
     * POST /auth/reset-password
     */
    async resetPassword({ request, response }: HttpContext) {
        const data = await request.validateUsing(resetPasswordValidator)

        const resetRecord = await db
            .from('password_reset_tokens')
            .where('email', data.email)
            .where('token', data.token)
            .first()

        if (!resetRecord) {
            return response.unprocessableEntity({
                success: false,
                message: 'Token tidak valid',
            })
        }

        const expiresAt = DateTime.fromJSDate(new Date(resetRecord.expires_at))
        if (expiresAt < DateTime.now()) {
            await db.from('password_reset_tokens').where('token', data.token).delete()
            return response.unprocessableEntity({
                success: false,
                message: 'Token sudah kedaluwarsa',
            })
        }

        const user = await User.findBy('email', data.email)
        if (!user) {
            return response.unprocessableEntity({
                success: false,
                message: 'User tidak ditemukan',
            })
        }

        user.password = data.password
        await user.save()

        // Invalidate token setelah dipakai
        await db.from('password_reset_tokens').where('token', data.token).delete()

        return response.ok({
            success: true,
            message: 'Password berhasil direset',
        })
    }
}
