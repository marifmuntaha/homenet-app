import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vouchers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('code').unique().notNullable()
      table.integer('product_id').unsigned().references('products.id').onDelete('CASCADE')
      table.integer('device_id').unsigned().references('devices.id').onDelete('CASCADE')
      table.decimal('price', 12, 2).notNullable()
      table.string('status').defaultTo('available') // available, used, expired
      table.boolean('is_used').defaultTo(false)
      table.timestamp('used_at').nullable()
      table.timestamp('valid_until').nullable()
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}