import logger from '@adonisjs/core/services/logger'
import DatabaseQueue from '#services/database_queue'

export default class WhatsappService {
    /**
     * Dispatch a WhatsApp message to the background queue
     * @param phone The recipient's phone number
     * @param message The message text to send
     */
    static async sendMessage(phone: string, message: string) {
        try {
            // Strip all non-numeric characters
            let normalizedPhone = phone.replace(/\D/g, '')

            // If it starts with 0, replace with 62
            if (normalizedPhone.startsWith('0')) {
                normalizedPhone = '62' + normalizedPhone.slice(1)
            }

            // If it starts with 8 (common in ID), prepend 62
            else if (normalizedPhone.startsWith('8')) {
                normalizedPhone = '62' + normalizedPhone
            }

            logger.info(`[WhatsappService] Normalizing phone: ${phone} -> ${normalizedPhone}`)

            // Push to custom queue 'whatsapp'
            logger.info(`[WhatsappService] Pushing to queue: whatsapp, payload: ${JSON.stringify({ phone: normalizedPhone, message })}`)
            const job = await DatabaseQueue.push('whatsapp', {
                phone: normalizedPhone,
                message: message
            })

            logger.info(`[WhatsappService] WhatsApp message to ${normalizedPhone} queued successfully. Job ID: ${job.id}`)
            return { success: true, queued: true, jobId: job.id }

        } catch (error: any) {
            logger.error({ err: error.message }, `Error queuing WhatsApp message to ${phone}`)
            return { success: false, queued: false, error: error.message }
        }
    }
}
