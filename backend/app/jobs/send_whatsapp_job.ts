import env from '#start/env'
import axios from 'axios'
import logger from '@adonisjs/core/services/logger'

export default class SendWhatsappJob {
    /**
     * Handle the Send Whatsapp Job
     */
    static async handle(payload: { phone: string, message: string }) {
        let { phone, message } = payload

        // Final guard normalization: strip non-digits and ensure 62 prefix
        phone = phone.replace(/\D/g, '')
        if (phone.startsWith('0')) {
            phone = '62' + phone.slice(1)
        } else if (phone.startsWith('8')) {
            phone = '62' + phone
        }

        const apiUrl = env.get('WHATSAPP_API_URL').replace(/\/$/, '')
        const username = env.get('WHATSAPP_USERNAME')
        const password = env.get('WHATSAPP_PASSWORD')
        const requestConfig = {
            auth: { username, password },
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000 // 15 seconds timeout
        }

        try {
            logger.info(`Sending typing indicator start to ${phone}...`)
            await axios.post(`${apiUrl}/send/chat-presence`, { phone: phone, action: 'start' }, requestConfig)

            const randomDelay = Math.floor(Math.random() * (10000 - 1000 + 1)) + 1000
            logger.info(`Waiting for ${randomDelay}ms before stopping typing indicator...`)
            await new Promise(resolve => setTimeout(resolve, randomDelay))

            logger.info(`Sending typing indicator stop to ${phone}...`)
            await axios.post(`${apiUrl}/send/chat-presence`, { phone: phone, action: 'stop' }, requestConfig)
        } catch (err: any) {
            logger.warn({ err: err.message }, `Failed to send chat presence for ${phone}, continuing to send message anyway...`)
        }

        const response = await axios.post(
            `${apiUrl}/send/message`,
            {
                phone: phone,
                message: message,
            },
            requestConfig
        )

        if (response.data && response.data.code === 'SUCCESS') {
            logger.info(`WhatsApp message successfully sent to ${phone}`)
            return { success: true, data: response.data }
        } else {
            logger.error({ data: response.data }, `Failed to send WhatsApp message to ${phone}`)
            // Throw an error so the DatabaseQueue will mark it as failed and retry
            throw new Error(`WhatsApp API Error: ${response.data?.message || 'Unknown error'}`)
        }
    }
}
