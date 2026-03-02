import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'customer_onts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // genieacs_device_id boleh null (device belum terhubung saat pertama kali input)
      table.string('genieacs_device_id', 500).nullable().alter()

      // Default WiFi yang akan diprovision ke ONT
      table.string('wifi_ssid', 32).nullable()
      table.string('wifi_password', 63).nullable()

      // Status provisioning
      table.enum('provision_status', ['pending', 'provisioned', 'failed']).defaultTo('pending')
      table.timestamp('provisioned_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('genieacs_device_id', 500).notNullable().alter()
      table.dropColumn('wifi_ssid')
      table.dropColumn('wifi_password')
      table.dropColumn('provision_status')
      table.dropColumn('provisioned_at')
    })
  }
}