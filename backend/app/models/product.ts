import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Product extends BaseModel {
    @column({ isPrimary: true })
    declare id: number

    @column()
    declare name: string

    @column()
    declare price: number

    @column()
    declare downloadSpeed: number

    @column()
    declare uploadSpeed: number

    @column()
    declare description: string | null

    @column()
    declare category: 'pppoe' | 'hotspot'

    @column()
    declare activePeriod: number | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime | null
}
