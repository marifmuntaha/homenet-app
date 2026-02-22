import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import DatabaseQueue from '#services/database_queue'
import SendWhatsappJob from '#jobs/send_whatsapp_job'

export default class QueueWork extends BaseCommand {
  static commandName = 'queue:work'
  static description = 'Start processing jobs on a queue'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Queue worker started. Waiting for jobs...')

    // Infinite loop polling the database
    while (true) {
      try {
        const job = await DatabaseQueue.pop('whatsapp')

        if (job) {
          this.logger.info(`[Queue] Processing Job ID ${job.id} (Attempt ${job.attempts + 1}/${job.maxAttempts})`)

          try {
            // Right now we only have one type of job, but you can expand this to use dynamic job classes based on queue name
            await SendWhatsappJob.handle(job.payload)
            this.logger.success(`[Queue] Job ID ${job.id} processed successfully.`)
          } catch (jobError: any) {
            this.logger.error(`[Queue] Job ID ${job.id} failed: ${jobError.message}`)
            await DatabaseQueue.release(job, jobError)
          }
        }
      } catch (err: any) {
        this.logger.error(`[Queue] Error polling database: ${err.message}`)
      }

      // Wait 2 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }
}