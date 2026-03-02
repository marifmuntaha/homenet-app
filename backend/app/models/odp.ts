import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class Odp extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'parent_id' })
  declare parentId: number | null

  @belongsTo(() => Odp, { foreignKey: 'parentId' })
  declare parent: BelongsTo<typeof Odp>

  @hasMany(() => Odp, { foreignKey: 'parentId' })
  declare children: HasMany<typeof Odp>

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare latitude: number | null

  @column()
  declare longitude: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}