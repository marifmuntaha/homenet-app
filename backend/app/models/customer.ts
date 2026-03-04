import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import CustomerSubscription from '#models/customer_subscription'
import CustomerOnt from '#models/customer_ont'
import Odp from '#models/odp'

export enum CustomerStatus {
    DAFTAR = 'daftar',
    PEMASANGAN = 'pemasangan',
    AKTIF = 'aktif',
    ISOLIR = 'isolir',
    NON_AKTIF = 'non aktif'
}

export default class Customer extends BaseModel {
    @column({ isPrimary: true })
    declare id: number

    @column({ columnName: 'user_id' })
    declare userId: number

    @column()
    declare status: CustomerStatus

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>

    @column({ columnName: 'full_name' })
    declare fullName: string

    @column()
    declare phone: string

    @column()
    declare address: string | null

    @column()
    declare latitude: number | null

    @column()
    declare longitude: number | null

    @column({ columnName: 'odp_id' })
    declare odpId: number | null

    @belongsTo(() => Odp)
    declare odp: BelongsTo<typeof Odp>

    @column({ columnName: 'odp_port' })
    declare odpPort: number | null

    @column({ columnName: 'pppoe_user' })
    declare pppoeUser: string | null

    @column({ columnName: 'pppoe_password', serializeAs: null })
    declare pppoePassword: string | null

    @hasMany(() => CustomerSubscription)
    declare subscriptions: HasMany<typeof CustomerSubscription>

    @hasMany(() => CustomerOnt)
    declare onts: HasMany<typeof CustomerOnt>

    /**
     * Generate unique PPPoE username and random password.
     * @param force - jika true, regenerate meski sudah ada (untuk tombol Generate)
     */
    async generatePppoeCredentials(force = false) {
        if (this.pppoeUser && !force) return

        const now = DateTime.now()
        const datePart = now.toFormat('ddHHmm')                                         // contoh: 041522
        const namePart = this.fullName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)
        const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26))     // A-Z

        this.pppoeUser = `${datePart}-${namePart}${randomChar}@homenet.id`
        this.pppoePassword = '1234'
    }

    @column.dateTime({ autoCreate: true, columnName: 'created_at' })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
    declare updatedAt: DateTime | null
}
