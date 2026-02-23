import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'invoices'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.enum('payment_type', ['cash', 'midtrans']).nullable()
            table.string('payment_method').nullable()
            table.string('midtrans_snap_token').nullable()
            table.string('midtrans_order_id').unique().nullable()
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('payment_type')
            table.dropColumn('payment_method')
            table.dropColumn('midtrans_snap_token')
            table.dropColumn('midtrans_order_id')
        })
    }
}
