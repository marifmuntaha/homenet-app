import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'customers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .enum('status', ['daftar', 'pemasangan', 'aktif', 'isolir', 'non aktif'])
        .defaultTo('daftar')
        .notNullable()
        .after('user_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('status')
    })
  }
}