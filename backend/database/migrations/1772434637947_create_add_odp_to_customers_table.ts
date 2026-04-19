import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'customers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('odp_id').unsigned().references('id').inTable('odps').onDelete('SET NULL').after('status')
      table.integer('odp_port').nullable().after('odp_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['odp_id'])
      table.dropColumn('odp_id')
      table.dropColumn('odp_port')
    })
  }
}