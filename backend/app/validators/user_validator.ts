import vine from '@vinejs/vine'

export const createUserValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(2).maxLength(100),
        email: vine.string().email().normalizeEmail(),
        phone: vine.string().mobile().optional(),
        role: vine.number().in([1, 2]).optional(),
        password: vine.string().minLength(8).maxLength(128).confirmed(),
    })
)

export const updateUserValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(2).maxLength(100).optional(),
        email: vine.string().email().normalizeEmail().optional(),
        phone: vine.string().mobile().optional().nullable(),
        role: vine.number().in([1, 2]).optional(),
        password: vine.string().minLength(8).maxLength(128).confirmed().optional(),
    })
)
