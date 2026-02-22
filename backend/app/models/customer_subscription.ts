import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Customer from '#models/customer'
import Product from '#models/product'

export default class CustomerSubscription extends BaseModel {
    @column({ isPrimary: true })
    declare id: number

    @column()
    declare customerId: number

    @column()
    declare productId: number

    @column()
    declare status: 'active' | 'inactive'

    @belongsTo(() => Customer)
    declare customer: BelongsTo<typeof Customer>

    @belongsTo(() => Product)
    declare product: BelongsTo<typeof Product>

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime | null
}
