import vine from '@vinejs/vine'

export const createProductValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(2).maxLength(100),
        price: vine.number().min(0),
        downloadSpeed: vine.number().min(1),
        uploadSpeed: vine.number().min(1),
        description: vine.string().maxLength(500).optional().nullable(),
        category: vine.enum(['pppoe', 'hotspot']).optional(),
        activePeriod: vine.number().min(0).optional().nullable(),
    })
)

export const updateProductValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(2).maxLength(100).optional(),
        price: vine.number().min(0).optional(),
        downloadSpeed: vine.number().min(1).optional(),
        uploadSpeed: vine.number().min(1).optional(),
        description: vine.string().maxLength(500).optional().nullable(),
        category: vine.enum(['pppoe', 'hotspot']).optional(),
        activePeriod: vine.number().min(0).optional().nullable(),
    })
)
