import logger from '@adonisjs/core/services/logger'
import WhatsappService from '#services/whatsapp_service'

export default class SendWhatsappJob {
    /**
     * Handle the Send Whatsapp Job
     *
     * The payload phone is already normalized (with @s.whatsapp.net JID format)
     * by WhatsappService.sendMessage before being pushed to the queue.
     */
    static async handle(payload: { phone: string, message: string }) {
        const { phone, message } = payload

        // Send typing indicator for a natural feel
        try {
            logger.info(`Sending typing indicator start to ${phone}...`)
            await WhatsappService.sendChatPresence(phone, 'start')

            const randomDelay = Math.floor(Math.random() * (10000 - 1000 + 1)) + 1000
            logger.info(`Waiting for ${randomDelay}ms before stopping typing indicator...`)
            await new Promise(resolve => setTimeout(resolve, randomDelay))

            logger.info(`Sending typing indicator stop to ${phone}...`)
            await WhatsappService.sendChatPresence(phone, 'stop')
        } catch (err: any) {
            logger.warn({ err: err.message }, `Failed to send chat presence for ${phone}, continuing to send message anyway...`)
        }

        // Send the actual message via the centralised service
        const result = await WhatsappService.sendMessageDirect(phone, message)

        if (result && result.code === 'SUCCESS') {
            logger.info(`WhatsApp message successfully sent to ${phone}`)
            return { success: true, data: result }
        } else {
            logger.error({ data: result }, `Failed to send WhatsApp message to ${phone}`)
            // Throw an error so the DatabaseQueue will mark it as failed and retry
            throw new Error(`WhatsApp API Error: ${result?.message || 'Unknown error'}`)
        }
    }
}
