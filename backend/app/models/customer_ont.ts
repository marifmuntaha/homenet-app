import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Customer from '#models/customer'

export default class CustomerOnt extends BaseModel {
    @column({ isPrimary: true })
    declare id: number

    @column({ columnName: 'customer_id' })
    declare customerId: number

    @belongsTo(() => Customer)
    declare customer: BelongsTo<typeof Customer>

    @column({ columnName: 'genieacs_device_id' })
    declare genieacsDeviceId: string | null

    @column({ columnName: 'serial_number' })
    declare serialNumber: string | null

    @column({ columnName: 'ont_label' })
    declare ontLabel: string | null

    @column({ columnName: 'wifi_ssid' })
    declare wifiSsid: string | null

    @column({ columnName: 'wifi_password' })
    declare wifiPassword: string | null

    @column({ columnName: 'provision_status' })
    declare provisionStatus: 'pending' | 'provisioned' | 'failed'

    @column.dateTime({ columnName: 'provisioned_at' })
    declare provisionedAt: DateTime | null

    @column.dateTime({ autoCreate: true, columnName: 'created_at' })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
    declare updatedAt: DateTime | null
}
