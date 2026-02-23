import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import InvoiceService from '#services/invoice_service'

export default class AutoGenerateInvoices extends BaseCommand {
    static commandName = 'invoices:auto-generate'
    static description = 'Main check for anniversary billing (3 days before registration)'

    static options: CommandOptions = {
        startApp: true
    }

    async run() {
        this.logger.info('Running daily anniversary billing check...')

        try {
            const result = await InvoiceService.generateDueInvoices()
            this.logger.success(`Check complete. Generated: ${result.generatedCount}, Skipped/Duplicate: ${result.skippedCount}`)
        } catch (error: any) {
            this.logger.error(`Failed to run auto-generation: ${error.message}`)
            console.error(error)
        }
    }
}
