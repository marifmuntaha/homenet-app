import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Customer from '#models/customer'

export default class Invoice extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'customer_id' })
  declare customerId: number

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>

  @column()
  declare month: string

  @column()
  declare amount: number

  @column({ columnName: 'previous_balance' })
  declare previousBalance: number

  @column()
  declare discount: number

  @column({ columnName: 'total_amount' })
  declare totalAmount: number

  @column()
  declare status: 'unpaid' | 'paid' | 'cancelled'

  @column({ columnName: 'payment_type' })
  declare paymentType: 'cash' | 'midtrans' | null

  @column({ columnName: 'payment_method' })
  declare paymentMethod: string | null

  @column({ columnName: 'midtrans_snap_token' })
  declare midtransSnapToken: string | null

  @column({ columnName: 'midtrans_order_id' })
  declare midtransOrderId: string | null

  @column.dateTime({ columnName: 'due_date' })
  declare dueDate: DateTime

  @column.dateTime({ columnName: 'paid_at' })
  declare paidAt: DateTime | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime | null
}