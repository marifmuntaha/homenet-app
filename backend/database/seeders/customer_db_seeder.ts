import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Customer from '#models/customer'
import { DateTime } from 'luxon'

export default class CustomerDbSeeder extends BaseSeeder {
  async run() {
    const names = [
      'Budi Santoso', 'Siti Aminah', 'Andi Hidayat', 'Rina Wati', 'Agus Setiawan',
      'Putri Ayu', 'Eko Prasetyo', 'Nurhayati', 'Irwan Syah', 'Ratna Sari',
      'Hendra Wijaya', 'Susi Susanti', 'Rudi Hermawan', 'Dewi Lestari', 'Joko Susilo',
      'Sri Rahayu', 'Ahmad Fauzi', 'Lina Marlina', 'Dedi Mulyadi', 'Yuli Yanti',
      'Arif Rahman', 'Nia Ramadhani', 'Ilham Saputra', 'Rini Puspita', 'Bagus Prakoso',
      'Fitriani', 'Candra Gunawan', 'Maya Indah', 'Deni Kurniawan', 'Anita Carolina',
      'Edi Suwito', 'Rika Amelia', 'Ferry Irawan', 'Tuti Mulyati', 'Dwi Santoso',
      'Siska Purbasari', 'Heri Kusnanto', 'Yati Suryati', 'Guntur Wibowo', 'Winda Asih',
      'Iwan Fals', 'Lilis Karlina', 'Dimas Kanjeng', 'Ratu Felisha', 'Kiki Amalia',
      'Reza Rahadian', 'Tora Sudiro', 'Dian Sastro', 'Nicholas Saputra', 'Tara Basro'
    ]

    console.log(`Generating ${names.length} dummy customers...`)

    let count = 0
    for (const name of names) {
      const email = name.toLowerCase().replace(/\s+/g, '.') + '@example.com'
      const phone = '08' + Math.floor(1000000000 + Math.random() * 9000000000)

      // firstOrCreate to avoid duplicates
      const user = await User.firstOrCreate({ email }, {
        name: name,
        email: email,
        phone: phone,
        password: 'password123', // Will be hashed automatically by model hook/AuthFinder
        role: User.ROLE_CUSTOMER,
        phoneVerifiedAt: DateTime.now()
      })

      // Generate a simple pppoe username based on name
      const pppoeUser = name.toLowerCase().split(' ')[0] + Math.floor(100 + Math.random() * 900)

      const addressStr = `Jl. Merdeka No. ${Math.floor(1 + Math.random() * 200)}, Jakarta`

      await Customer.firstOrCreate({ userId: user.id }, {
        userId: user.id,
        fullName: name,
        phone: phone,
        address: addressStr,
        pppoeUser: pppoeUser,
        pppoePassword: 'pppoepassword',
        latitude: -6.200000 + (Math.random() - 0.5) * 0.1,
        longitude: 106.816666 + (Math.random() - 0.5) * 0.1
      })

      count++
    }

    console.log(`Successfully generated ${count} customers and their user accounts.`)
  }
}