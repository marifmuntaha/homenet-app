import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class TestWa extends BaseCommand {
  static commandName = 'test:wa'
  static description = 'Test sending WhatsApp message'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Starting to send test WhatsApp message...')
    const WhatsappService = (await import('#services/whatsapp_service')).default

    // Test to the requested number
    const result = await WhatsappService.sendMessage('082229366506', 'Halo, ini adalah pesan percobaan dari sistem Homenet App!')

    if (result.success) {
      this.logger.success('Message sent successfully!')
      console.log(result.data)
    } else {
      this.logger.error('Failed to send message.')
      console.log(result.error)
    }
  }
}