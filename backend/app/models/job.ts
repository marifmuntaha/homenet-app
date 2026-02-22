import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Job extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare queue: string

  @column()
  declare payload: any

  @column()
  declare attempts: number

  @column()
  declare maxAttempts: number

  @column()
  declare error: string | null

  @column.dateTime()
  declare availableAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}