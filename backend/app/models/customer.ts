import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import CustomerSubscription from '#models/customer_subscription'
import CustomerOnt from '#models/customer_ont'

export default class Customer extends BaseModel {
    @column({ isPrimary: true })
    declare id: number

    @column({ columnName: 'user_id' })
    declare userId: number

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

    @column({ columnName: 'pppoe_user' })
    declare pppoeUser: string | null

    @column({ columnName: 'pppoe_password', serializeAs: null })
    declare pppoePassword: string | null

    @hasMany(() => CustomerSubscription)
    declare subscriptions: HasMany<typeof CustomerSubscription>

    @hasMany(() => CustomerOnt)
    declare onts: HasMany<typeof CustomerOnt>

    @column.dateTime({ autoCreate: true, columnName: 'created_at' })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
    declare updatedAt: DateTime | null
}
