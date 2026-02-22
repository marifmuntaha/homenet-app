import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('customer_id').unsigned().references('id').inTable('customers').onDelete('CASCADE').notNullable()
      table.string('month', 7).notNullable() // YYYY-MM

      table.decimal('amount', 12, 2).notNullable().defaultTo(0)
      table.decimal('previous_balance', 12, 2).notNullable().defaultTo(0)
      table.decimal('total_amount', 12, 2).notNullable().defaultTo(0)

      table.enum('status', ['unpaid', 'paid', 'cancelled']).defaultTo('unpaid').notNullable()

      table.timestamp('due_date').notNullable()
      table.timestamp('paid_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Ensure one invoice per customer per month
      table.unique(['customer_id', 'month'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}