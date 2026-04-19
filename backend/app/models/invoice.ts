import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Customer from '#models/customer'
import Product from '#models/product'
import Device from '#models/device'

export default class Invoice extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'customer_id' })
  declare customerId: number | null

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>

  @belongsTo(() => Product)
  declare product: BelongsTo<typeof Product>

  @belongsTo(() => Device)
  declare device: BelongsTo<typeof Device>

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
  declare paymentType: 'cash' | 'tripay' | null

  @column({ columnName: 'payment_method' })
  declare paymentMethod: string | null

  @column({ columnName: 'tripay_reference' })
  declare tripayReference: string | null

  @column({ columnName: 'tripay_method' })
  declare tripayMethod: string | null

  @column({ columnName: 'tripay_checkout_url' })
  declare tripayCheckoutUrl: string | null

  @column({ columnName: 'payment_token' })
  declare paymentToken: string | null

  @column()
  declare type: 'billing' | 'voucher'

  @column({ columnName: 'whatsapp_number' })
  declare whatsappNumber: string | null

  @column({ columnName: 'full_name' })
  declare fullName: string | null

  @column({ columnName: 'product_id' })
  declare productId: number | null

  @column({ columnName: 'device_id' })
  declare deviceId: number | null

  @column.dateTime({ columnName: 'due_date' })
  declare dueDate: DateTime

  @column.dateTime({ columnName: 'paid_at' })
  declare paidAt: DateTime | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime | null
}