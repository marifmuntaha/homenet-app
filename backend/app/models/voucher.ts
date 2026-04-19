import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Product from '#models/product'
import Device from '#models/device'

export default class Voucher extends BaseModel {
    @column({ isPrimary: true })
    declare id: number

    @column()
    declare code: string

    @column()
    declare productId: number

    @column()
    declare deviceId: number

    @column()
    declare price: number

    @column()
    declare status: 'available' | 'used' | 'expired'

    @column()
    declare isUsed: boolean

    @column.dateTime()
    declare usedAt: DateTime | null

    @column.dateTime()
    declare validUntil: DateTime | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @belongsTo(() => Product)
    declare product: BelongsTo<typeof Product>

    @belongsTo(() => Device)
    declare device: BelongsTo<typeof Device>
}