import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
    async run() {
        // Create Administrator
        await User.updateOrCreate(
            { email: 'admin@homenet.id' },
            {
                name: 'Administrator',
                password: 'katasandi1234',
                role: User.ROLE_ADMINISTRATOR,
            }
        )

        // Create Default Customer
        await User.updateOrCreate(
            { email: 'customer@homenet.id' },
            {
                name: 'Customer',
                password: 'katasandi1234',
                role: User.ROLE_CUSTOMER,
            }
        )
    }
}
