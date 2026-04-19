import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('full_name').nullable().after('whatsapp_number')
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('full_name')
    })
  }
}