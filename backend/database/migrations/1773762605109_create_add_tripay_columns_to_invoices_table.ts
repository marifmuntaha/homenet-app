import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('tripay_reference').nullable().after('payment_method')
      table.string('tripay_method').nullable().after('tripay_reference')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('tripay_reference', 'tripay_method')
    })
  }
}