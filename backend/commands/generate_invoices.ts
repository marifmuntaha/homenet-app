import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import InvoiceService from '#services/invoice_service'

export default class GenerateInvoices extends BaseCommand {
  static commandName = 'invoices:generate'
  static description = 'Generate monthly invoices for all active customers'

  static options: CommandOptions = {
    startApp: true
  }

  @flags.string({ description: 'Month to generate invoices for (YYYY-MM)' })
  declare month: string

  async run() {
    this.logger.info(`Starting invoice generation for ${this.month || 'current month'}...`)

    try {
      const result = await InvoiceService.generateInvoices(this.month)
      this.logger.success(`Success! Generated: ${result.generatedCount}, Skipped: ${result.skippedCount} (Month: ${result.month})`)
    } catch (error: any) {
      this.logger.error(`Failed to generate invoices: ${error.message}`)
    }
  }
}