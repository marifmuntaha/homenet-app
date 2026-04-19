import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import DatabaseQueue from '#services/database_queue'
import SendWhatsappJob from '#jobs/send_whatsapp_job'
import DeleteVoucherJob from '#jobs/delete_voucher_job'
import VoucherExpiryNotifyJob from '#jobs/voucher_expiry_notify_job'

export default class QueueWork extends BaseCommand {
  static commandName = 'queue:work'
  static description = 'Start processing jobs on multiple queues'

  static options: CommandOptions = {
    startApp: true,
  }

  // Mapping queue names to their job handlers
  private handlers: Record<string, any> = {
    'whatsapp': SendWhatsappJob,
    'hotspot_expiry': DeleteVoucherJob,
    'hotspot_notify': VoucherExpiryNotifyJob
  }

  async run() {
    this.logger.info(`Queue worker started. Monitoring: ${Object.keys(this.handlers).join(', ')}`)

    while (true) {
      let processedAny = false

      for (const queue of Object.keys(this.handlers)) {
        try {
          const job = await DatabaseQueue.pop(queue)

          if (job) {
            processedAny = true
            this.logger.info(`[Queue] Processing ${queue} Job ID ${job.id} (Attempt ${job.attempts + 1}/${job.maxAttempts})`)

            try {
              const Handler = this.handlers[queue]
              await Handler.handle(job.payload)
              this.logger.success(`[Queue] ${queue} Job ID ${job.id} processed successfully.`)
            } catch (jobError: any) {
              this.logger.error(`[Queue] ${queue} Job ID ${job.id} failed: ${jobError.message}`)
              await DatabaseQueue.release(job, jobError)
            }
          }
        } catch (err: any) {
          this.logger.error(`[Queue] Error polling ${queue}: ${err.message}`)
        }
      }

      // If no jobs were found in any queue, wait 2 seconds
      if (!processedAny) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }
  }
}