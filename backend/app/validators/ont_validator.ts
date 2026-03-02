import vine from '@vinejs/vine'

export const createOntValidator = vine.compile(
    vine.object({
        customer_id: vine.number().min(1),
        serial_number: vine.string().trim().maxLength(100),
        ont_label: vine.string().trim().maxLength(100).optional(),
        wifi_ssid: vine.string().trim().maxLength(32).optional(),
        wifi_password: vine.string().minLength(8).maxLength(63).optional(),
        genieacs_device_id: vine.string().trim().maxLength(500).optional(),
    })
)

export const updateOntValidator = vine.compile(
    vine.object({
        customer_id: vine.number().min(1).optional(),
        serial_number: vine.string().trim().maxLength(100).optional(),
        ont_label: vine.string().trim().maxLength(100).optional(),
        wifi_ssid: vine.string().trim().maxLength(32).optional(),
        wifi_password: vine.string().minLength(8).maxLength(63).optional(),
        genieacs_device_id: vine.string().trim().maxLength(500).optional(),
    })
)

export const setWifiValidator = vine.compile(
    vine.object({
        ssid: vine.string().trim().maxLength(32),
        password: vine.string().minLength(8).maxLength(63),
    })
)

export const setPppoeValidator = vine.compile(
    vine.object({
        pppoe_user: vine.string().trim().maxLength(100),
        pppoe_password: vine.string().maxLength(100),
    })
)
