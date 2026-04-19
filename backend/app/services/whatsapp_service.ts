import env from '#start/env'
import axios, { type AxiosRequestConfig } from 'axios'
import logger from '@adonisjs/core/services/logger'
import DatabaseQueue from '#services/database_queue'

/**
 * WhatsApp Service — aligned with GoWhatsApp API v8.3.1
 *
 * Supports multi-device via X-Device-Id header and provides
 * methods for queuing messages as well as direct API calls.
 */
export default class WhatsappService {

    // ─── Helpers ──────────────────────────────────────────────

    /**
     * Build the base Axios config with auth, timeout, and optional X-Device-Id header.
     */
    private static getRequestConfig(contentType: string = 'application/json'): AxiosRequestConfig {
        const headers: Record<string, string> = { 'Content-Type': contentType }

        const deviceId = env.get('WHATSAPP_DEVICE_ID', '')
        if (deviceId) {
            headers['X-Device-Id'] = deviceId
        }

        return {
            auth: {
                username: env.get('WHATSAPP_USERNAME'),
                password: env.get('WHATSAPP_PASSWORD'),
            },
            headers,
            timeout: 15_000,
        }
    }

    /**
     * Return the base URL (trailing slash stripped).
     */
    private static getApiUrl(): string {
        return env.get('WHATSAPP_API_URL').replace(/\/$/, '')
    }

    /**
     * Normalize an Indonesian phone number:
     *  - strip non-digits
     *  - replace leading 0 → 62
     *  - prepend 62 when it starts with 8
     *  - append @s.whatsapp.net if missing
     */
    static normalizePhone(phone: string): string {
        let normalized = phone.replace(/\D/g, '')

        if (normalized.startsWith('0')) {
            normalized = '62' + normalized.slice(1)
        } else if (normalized.startsWith('8')) {
            normalized = '62' + normalized
        }

        // The API v8 expects JID format: <number>@s.whatsapp.net
        if (!normalized.includes('@')) {
            normalized = `${normalized}@s.whatsapp.net`
        }

        return normalized
    }

    // ─── Queue-based sending (existing behaviour) ─────────────

    /**
     * Dispatch a WhatsApp text message to the background queue.
     * @param phone  The recipient's phone number
     * @param message The message text to send
     */
    static async sendMessage(phone: string, message: string) {
        try {
            const normalizedPhone = this.normalizePhone(phone)

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

    // ─── Direct API calls (v8.3.1) ────────────────────────────

    /**
     * Send a text message directly (bypasses queue).
     */
    static async sendMessageDirect(phone: string, message: string, options?: {
        replyMessageId?: string
        isForwarded?: boolean
        duration?: number
        mentions?: string[]
    }) {
        const apiUrl = this.getApiUrl()
        const config = this.getRequestConfig()
        const normalizedPhone = this.normalizePhone(phone)

        const body: Record<string, any> = {
            phone: normalizedPhone,
            message,
        }

        if (options?.replyMessageId) body.reply_message_id = options.replyMessageId
        if (options?.isForwarded) body.is_forwarded = options.isForwarded
        if (options?.duration) body.duration = options.duration
        if (options?.mentions) body.mentions = options.mentions

        const response = await axios.post(`${apiUrl}/send/message`, body, config)
        return response.data
    }

    /**
     * Send chat presence (typing indicator).
     * @param phone  Recipient phone
     * @param action 'start' | 'stop'
     */
    static async sendChatPresence(phone: string, action: 'start' | 'stop') {
        const apiUrl = this.getApiUrl()
        const config = this.getRequestConfig()
        const normalizedPhone = this.normalizePhone(phone)

        const response = await axios.post(`${apiUrl}/send/chat-presence`, {
            phone: normalizedPhone,
            action,
        }, config)
        return response.data
    }

    /**
     * Send an image message.
     */
    static async sendImage(phone: string, imageUrl: string, options?: {
        caption?: string
        viewOnce?: boolean
        compress?: boolean
        duration?: number
        isForwarded?: boolean
    }) {
        const apiUrl = this.getApiUrl()
        const config = this.getRequestConfig()
        const normalizedPhone = this.normalizePhone(phone)

        const body: Record<string, any> = {
            phone: normalizedPhone,
            image_url: imageUrl,
        }

        if (options?.caption) body.caption = options.caption
        if (options?.viewOnce !== undefined) body.view_once = options.viewOnce
        if (options?.compress !== undefined) body.compress = options.compress
        if (options?.duration) body.duration = options.duration
        if (options?.isForwarded) body.is_forwarded = options.isForwarded

        const response = await axios.post(`${apiUrl}/send/image`, body, config)
        return response.data
    }

    /**
     * Send a file/document message.
     */
    static async sendFile(phone: string, fileBuffer: Buffer, filename: string, options?: {
        caption?: string
        isForwarded?: boolean
        duration?: number
    }) {
        const apiUrl = this.getApiUrl()
        const normalizedPhone = this.normalizePhone(phone)

        const FormData = (await import('form-data')).default
        const form = new FormData()
        form.append('phone', normalizedPhone)
        form.append('file', fileBuffer, filename)
        if (options?.caption) form.append('caption', options.caption)
        if (options?.isForwarded) form.append('is_forwarded', String(options.isForwarded))
        if (options?.duration) form.append('duration', String(options.duration))

        const config = this.getRequestConfig()
        config.headers = {
            ...config.headers,
            ...form.getHeaders(),
        }

        const response = await axios.post(`${apiUrl}/send/file`, form, config)
        return response.data
    }

    /**
     * Send a contact card.
     */
    static async sendContact(phone: string, contactName: string, contactPhone: string, options?: {
        isForwarded?: boolean
        duration?: number
    }) {
        const apiUrl = this.getApiUrl()
        const config = this.getRequestConfig()
        const normalizedPhone = this.normalizePhone(phone)

        const body: Record<string, any> = {
            phone: normalizedPhone,
            contact_name: contactName,
            contact_phone: contactPhone,
        }

        if (options?.isForwarded) body.is_forwarded = options.isForwarded
        if (options?.duration) body.duration = options.duration

        const response = await axios.post(`${apiUrl}/send/contact`, body, config)
        return response.data
    }

    /**
     * Send a link with preview.
     */
    static async sendLink(phone: string, link: string, options?: {
        caption?: string
        isForwarded?: boolean
        duration?: number
    }) {
        const apiUrl = this.getApiUrl()
        const config = this.getRequestConfig()
        const normalizedPhone = this.normalizePhone(phone)

        const body: Record<string, any> = {
            phone: normalizedPhone,
            link,
        }

        if (options?.caption) body.caption = options.caption
        if (options?.isForwarded) body.is_forwarded = options.isForwarded
        if (options?.duration) body.duration = options.duration

        const response = await axios.post(`${apiUrl}/send/link`, body, config)
        return response.data
    }

    /**
     * Send a location.
     */
    static async sendLocation(phone: string, latitude: string, longitude: string, options?: {
        isForwarded?: boolean
        duration?: number
    }) {
        const apiUrl = this.getApiUrl()
        const config = this.getRequestConfig()
        const normalizedPhone = this.normalizePhone(phone)

        const body: Record<string, any> = {
            phone: normalizedPhone,
            latitude,
            longitude,
        }

        if (options?.isForwarded) body.is_forwarded = options.isForwarded
        if (options?.duration) body.duration = options.duration

        const response = await axios.post(`${apiUrl}/send/location`, body, config)
        return response.data
    }

    // ─── App / Device management ──────────────────────────────

    /**
     * Check connection status of the current device.
     */
    static async getStatus() {
        const apiUrl = this.getApiUrl()
        const config = this.getRequestConfig()

        const response = await axios.get(`${apiUrl}/app/status`, config)
        return response.data
    }

    /**
     * Get list of connected devices.
     */
    static async getDevices() {
        const apiUrl = this.getApiUrl()
        const config = this.getRequestConfig()

        const response = await axios.get(`${apiUrl}/app/devices`, config)
        return response.data
    }

    /**
     * Reconnect to WhatsApp server.
     */
    static async reconnect() {
        const apiUrl = this.getApiUrl()
        const config = this.getRequestConfig()

        const response = await axios.get(`${apiUrl}/app/reconnect`, config)
        return response.data
    }

    // ─── User info ────────────────────────────────────────────

    /**
     * Check whether a phone number is registered on WhatsApp.
     */
    static async checkUser(phone: string) {
        const apiUrl = this.getApiUrl()
        const config = this.getRequestConfig()
        const normalizedPhone = this.normalizePhone(phone)

        const response = await axios.get(`${apiUrl}/user/check`, {
            ...config,
            params: { phone: normalizedPhone.replace('@s.whatsapp.net', '') },
        })
        return response.data
    }

    /**
     * Get user info.
     */
    static async getUserInfo(phone: string) {
        const apiUrl = this.getApiUrl()
        const config = this.getRequestConfig()
        const normalizedPhone = this.normalizePhone(phone)

        const response = await axios.get(`${apiUrl}/user/info`, {
            ...config,
            params: { phone: normalizedPhone },
        })
        return response.data
    }

    /**
     * Get user avatar / profile picture.
     */
    static async getUserAvatar(phone: string, isPreview: boolean = true) {
        const apiUrl = this.getApiUrl()
        const config = this.getRequestConfig()
        const normalizedPhone = this.normalizePhone(phone)

        const response = await axios.get(`${apiUrl}/user/avatar`, {
            ...config,
            params: { phone: normalizedPhone, is_preview: isPreview },
        })
        return response.data
    }

    // ─── Message manipulation ─────────────────────────────────

    /**
     * Revoke (delete for everyone) a sent message.
     */
    static async revokeMessage(messageId: string, phone: string) {
        const apiUrl = this.getApiUrl()
        const config = this.getRequestConfig()
        const normalizedPhone = this.normalizePhone(phone)

        const response = await axios.post(`${apiUrl}/message/${messageId}/revoke`, {
            phone: normalizedPhone,
        }, config)
        return response.data
    }

    /**
     * React to a message with an emoji.
     */
    static async reactMessage(messageId: string, phone: string, emoji: string) {
        const apiUrl = this.getApiUrl()
        const config = this.getRequestConfig()
        const normalizedPhone = this.normalizePhone(phone)

        const response = await axios.post(`${apiUrl}/message/${messageId}/reaction`, {
            phone: normalizedPhone,
            emoji,
        }, config)
        return response.data
    }
}
