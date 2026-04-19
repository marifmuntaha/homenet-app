import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Invoice from '#models/invoice'
import Customer from '#models/customer'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Write your database queries inside the run method
    const customers = await Customer.query().limit(50) // Fetch up to 50 customers

    if (customers.length === 0) {
      console.log('No customers found. Please run CustomerSeeder first if it exists, or create a customer manually before running this seeder.')
      return
    }

    console.log(`Generating dummy invoices for ${customers.length} customers over the last 15 months...`)

    const now = DateTime.now()
    let createdCount = 0

    // Loop for the last 15 months
    for (let i = 14; i >= 0; i--) {
      const date = now.minus({ months: i })
      const mStr = date.toFormat('MM-yyyy')

      // Pick a random subset of customers to simulate growing/fluctuating customer base
      const monthCustomers = customers.filter(() => Math.random() > 0.3) // ~70% active customers per month

      for (const customer of monthCustomers) {
        // Randomly determine if it's paid (mostly paid for older months)
        const isCurrentMonth = i === 0
        const isPaid = isCurrentMonth ? Math.random() > 0.6 : Math.random() > 0.05
        const status = isPaid ? 'paid' : 'unpaid'

        // Randomly determine payment type if paid
        const paymentType = isPaid ? (Math.random() > 0.5 ? 'midtrans' : 'cash') : null

        // Use customer's subcription price if possible, else random
        // If the user hasn't defined subcription prices directly, we'll use base amounts
        const baseAmounts = [150000, 200000, 250000, 350000]
        const amount = baseAmounts[Math.floor(Math.random() * baseAmounts.length)]

        // Generate realistic dates based on the target month
        const createdAt = date.set({ day: Math.floor(Math.random() * 5) + 1 }) // created early in the month
        const dueDate = createdAt.plus({ days: 10 })
        const paidAt = isPaid ? createdAt.plus({ days: Math.floor(Math.random() * 15) + 1 }) : null

        // Use firstOrCreate to respect the unique customer_id & month constraint
        await Invoice.firstOrCreate(
          { customerId: customer.id, month: mStr },
          {
            amount: amount,
            previousBalance: 0,
            discount: 0,
            totalAmount: amount,
            status: status,
            paymentType: paymentType,
            paymentMethod: paymentType === 'midtrans' ? 'qris' : 'cash',
            dueDate: dueDate,
            paidAt: paidAt,
            createdAt: createdAt,
            updatedAt: paidAt || createdAt
          }
        )
        createdCount++
      }
    }

    console.log(`Successfully generated/ensured ${createdCount} invoices.`)
  }
}