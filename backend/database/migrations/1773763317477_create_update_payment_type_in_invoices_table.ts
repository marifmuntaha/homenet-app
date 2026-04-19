import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Update payment_type enum to include 'tripay' and remove 'midtrans'
      table.enum('payment_type', ['cash', 'tripay']).nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Rollback to original enum
      table.enum('payment_type', ['cash', 'midtrans']).nullable().alter()
    })
  }
}