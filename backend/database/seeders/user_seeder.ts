import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
    async run() {
        await User.createMany([
            {
                name: 'Administrator',
                email: 'admin@homenet.id',
                password: 'katasandi1234',
                role: User.ROLE_ADMINISTRATOR,
            },
            {
                name: 'Customer',
                email: 'customer@homenet.id',
                password: 'katasandi1234',
                role: User.ROLE_CUSTOMER,
            },
        ])
    }
}
