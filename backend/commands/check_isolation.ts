import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import InvoiceService from '#services/invoice_service'

export default class CheckIsolation extends BaseCommand {
    static commandName = 'invoices:check-isolation'
    static description = 'Check overdue invoices on anniversary date and isolate customers on Mikrotik'

    static options: CommandOptions = {
        startApp: true
    }

    async run() {
        this.logger.info('Running daily isolation check...')

        try {
            const result = await InvoiceService.checkAndIsolateOverdue()
            this.logger.success(`Done. Isolated: ${result.isolatedCount}, Skipped (paid/no invoice): ${result.skippedCount}`)
        } catch (error: any) {
            this.logger.error(`Failed to run isolation check: ${error.message}`)
            console.error(error)
        }
    }
}
