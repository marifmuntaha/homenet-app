import vine from '@vinejs/vine'

/**
 * Validasi saat Customer dibuat pertama kali
 * Termasuk data User (untuk login) dan opsi Product yang dipilih
 */
export const createCustomerValidator = vine.compile(
    vine.object({
        // User login data
        email: vine.string().email().normalizeEmail(),
        password: vine.string().minLength(8),

        // Customer personal info
        fullName: vine.string().trim().minLength(2).maxLength(100),
        phone: vine.string().trim().minLength(9).maxLength(20),
        address: vine.string().maxLength(500).optional().nullable(),

        // GPS Coordinates
        latitude: vine.number().optional().nullable(),
        longitude: vine.number().optional().nullable(),

        // Mikrotik PPPoE (opisonal)
        pppoeUser: vine.string().trim().maxLength(100).optional().nullable(),
        pppoePassword: vine.string().maxLength(100).optional().nullable(),

        // Initial Subscription
        productId: vine.number().min(1),

        // ODP (optional)
        odpId: vine.number().optional().nullable(),
        odpPort: vine.number().optional().nullable(),
    })
)

/**
 * Validasi saat update data Customer basic (tanpa ganti produk/langganan)
 */
export const updateCustomerValidator = vine.compile(
    vine.object({
        fullName: vine.string().trim().minLength(2).maxLength(100).optional(),
        phone: vine.string().trim().minLength(9).maxLength(20).optional(),
        address: vine.string().maxLength(500).optional().nullable(),

        latitude: vine.number().optional().nullable(),
        longitude: vine.number().optional().nullable(),

        pppoeUser: vine.string().trim().maxLength(100).optional().nullable(),
        pppoePassword: vine.string().maxLength(100).optional().nullable(),
        status: vine.enum(['daftar', 'pemasangan', 'aktif', 'isolir', 'non aktif']).optional(),

        odpId: vine.number().optional().nullable(),
        odpPort: vine.number().optional().nullable(),
    })
)

/**
 * Validasi khusus saat ganti langganan
 */
export const changeProductValidator = vine.compile(
    vine.object({
        productId: vine.number().min(1),
    })
)
