import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'customer_subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('customer_id').unsigned().references('id').inTable('customers').onDelete('CASCADE').notNullable()
      table.integer('product_id').unsigned().references('id').inTable('products').onDelete('CASCADE').notNullable()

      table.enum('status', ['active', 'inactive']).defaultTo('inactive').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}