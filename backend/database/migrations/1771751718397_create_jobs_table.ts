import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'jobs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('queue').notNullable().index()
      table.json('payload').notNullable()
      table.smallint('attempts').unsigned().defaultTo(0).notNullable()
      table.smallint('max_attempts').unsigned().defaultTo(3).notNullable()
      table.text('error').nullable()
      table.timestamp('available_at').notNullable().index()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}