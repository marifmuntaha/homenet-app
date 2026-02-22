import vine from '@vinejs/vine'

export const createDeviceValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(2).maxLength(100),
        host: vine.string().trim().maxLength(255),
        user: vine.string().trim().maxLength(100),
        password: vine.string().maxLength(255),
        port: vine.number().min(1).max(65535).optional(),
    })
)

export const updateDeviceValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(2).maxLength(100).optional(),
        host: vine.string().trim().maxLength(255).optional(),
        user: vine.string().trim().maxLength(100).optional(),
        password: vine.string().maxLength(255).optional(),
        port: vine.number().min(1).max(65535).optional(),
    })
)
