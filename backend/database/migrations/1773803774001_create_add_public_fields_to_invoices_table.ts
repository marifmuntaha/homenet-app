import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('customer_id').unsigned().nullable().alter()
      table.enum('type', ['billing', 'voucher']).defaultTo('billing').after('customer_id')
      table.string('whatsapp_number', 20).nullable().after('payment_token')
      table.integer('product_id').unsigned().nullable().references('products.id').after('whatsapp_number')
      table.integer('device_id').unsigned().nullable().references('devices.id').after('product_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Note: Reverting nullable to Not Null might fail if there are null rows
      table.integer('customer_id').unsigned().notNullable().alter()
      table.dropColumn('type')
      table.dropColumn('whatsapp_number')
      table.dropColumn('product_id')
      table.dropColumn('device_id')
    })
  }
}