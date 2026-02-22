import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(2).maxLength(100),
        email: vine.string().email().normalizeEmail(),
        phone: vine.string().mobile(),
        password: vine.string().minLength(8).maxLength(128).confirmed(),
    })
)

export const loginValidator = vine.compile(
    vine.object({
        email: vine.string().email().normalizeEmail(),
        password: vine.string().minLength(1),
    })
)

export const forgotPasswordValidator = vine.compile(
    vine.object({
        email: vine.string().email().normalizeEmail(),
    })
)

export const resetPasswordValidator = vine.compile(
    vine.object({
        token: vine.string().minLength(1),
        email: vine.string().email().normalizeEmail(),
        password: vine.string().minLength(8).maxLength(128).confirmed(),
    })
)

export const verifyOtpValidator = vine.compile(
    vine.object({
        email: vine.string().email().normalizeEmail(),
        otp_code: vine.string().minLength(6).maxLength(6),
    })
)
