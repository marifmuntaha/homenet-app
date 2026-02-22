import axios, { type AxiosError } from 'axios'

export interface MikrotikStatus {
    online: boolean
    identity?: string
    version?: string
    response_ms?: number
    error?: string
}

export interface MikrotikSystemResource {
    online: boolean
    data?: {
        'cpu-load': number
        'free-memory': number
        'total-memory': number
        uptime: string
        version: string
        'board-name': string
    }
    error?: string
}

export default class MikrotikService {
    private baseUrl: string
    private auth: { username: string; password: string }
    private timeout: number

    constructor(host: string, port: number, user: string, password: string, timeout = 5000) {
        this.baseUrl = `http://${host}:${port}/rest`
        this.auth = { username: user, password }
        this.timeout = timeout
    }

    /**
     * Check if device is online by hitting /rest/system/identity
     * Returns status with response time
     */
    async checkStatus(): Promise<MikrotikStatus> {
        const start = Date.now()
        try {
            const res = await axios.get(`${this.baseUrl}/system/identity`, {
                auth: this.auth,
                timeout: this.timeout,
                validateStatus: (status) => status === 200 || status === 401,
            })

            const responseMs = Date.now() - start

            if (res.status === 401) {
                return {
                    online: true,
                    identity: 'Auth Error',
                    response_ms: responseMs,
                    error: 'Unauthorized: wrong username or password',
                }
            }

            return {
                online: true,
                identity: res.data?.name ?? res.data?.ret,
                response_ms: responseMs,
            }
        } catch (err) {
            const axiosErr = err as AxiosError
            const responseMs = Date.now() - start
            return {
                online: false,
                response_ms: responseMs,
                error: axiosErr.code === 'ECONNREFUSED'
                    ? 'Connection refused'
                    : axiosErr.code === 'ETIMEDOUT' || axiosErr.code === 'ECONNABORTED'
                        ? 'Connection timed out'
                        : (axiosErr.message ?? 'Unknown error'),
            }
        }
    }

    /**
     * Get system resource info (CPU, memory, uptime, etc)
     */
    async getSystemResource(): Promise<MikrotikSystemResource> {
        try {
            const res = await axios.get(`${this.baseUrl}/system/resource`, {
                auth: this.auth,
                timeout: this.timeout,
            })

            return {
                online: true,
                data: res.data,
            }
        } catch (err) {
            const axiosErr = err as AxiosError
            return {
                online: false,
                error: axiosErr.message ?? 'Unknown error',
            }
        }
    }

    /**
     * Static factory – create from device record fields
     */
    static fromDevice(device: { host: string; port: number; user: string; password: string }): MikrotikService {
        return new MikrotikService(device.host, device.port, device.user, device.password)
    }

    /* ─── PPP PROFILE METHODS ─────────────────────────────────────── */

    /**
     * Format speed limit for Mikrotik (e.g. "10M/5M")
     */
    private formatRateLimit(downloadMbps: number, uploadMbps: number): string {
        return `${uploadMbps}M/${downloadMbps}M` // Mikrotik rx/tx = upload/download
    }

    /**
     * Find PPP profile by name
     */
    async findPPPProfile(name: string): Promise<any> {
        try {
            const res = await axios.get(`${this.baseUrl}/ppp/profile?name=${name}`, {
                auth: this.auth,
                timeout: this.timeout,
            })
            if (Array.isArray(res.data) && res.data.length > 0) {
                return res.data[0]
            }
            return null
        } catch {
            return null
        }
    }

    /**
     * Create new PPP profile
     */
    async createPPPProfile(name: string, downloadMbps: number, uploadMbps: number): Promise<boolean> {
        try {
            await axios.put(`${this.baseUrl}/ppp/profile`, {
                name,
                'rate-limit': this.formatRateLimit(downloadMbps, uploadMbps)
            }, {
                auth: this.auth,
                timeout: this.timeout,
            })
            return true
        } catch {
            return false
        }
    }

    /**
     * Update existing PPP profile
     */
    async updatePPPProfile(name: string, downloadMbps: number, uploadMbps: number): Promise<boolean> {
        try {
            const profile = await this.findPPPProfile(name)
            if (!profile || !profile['.id']) {
                return await this.createPPPProfile(name, downloadMbps, uploadMbps)
            }

            await axios.patch(`${this.baseUrl}/ppp/profile/${profile['.id']}`, {
                'rate-limit': this.formatRateLimit(downloadMbps, uploadMbps)
            }, {
                auth: this.auth,
                timeout: this.timeout,
            })
            return true
        } catch {
            return false
        }
    }

    /**
     * Delete PPP profile
     */
    async deletePPPProfile(name: string): Promise<boolean> {
        try {
            const profile = await this.findPPPProfile(name)
            if (!profile || !profile['.id']) return true // Already gone

            await axios.delete(`${this.baseUrl}/ppp/profile/${profile['.id']}`, {
                auth: this.auth,
                timeout: this.timeout,
            })
            return true
        } catch {
            return false
        }
    }

    /* ─── PPP SECRET METHODS (FOR CUSTOMERS) ─────────────────────── */

    /**
     * Find PPP secret by name
     */
    async findPPPSecret(name: string): Promise<any> {
        try {
            const res = await axios.get(`${this.baseUrl}/ppp/secret?name=${name}`, {
                auth: this.auth,
                timeout: this.timeout,
            })
            if (Array.isArray(res.data) && res.data.length > 0) {
                return res.data[0]
            }
            return null
        } catch {
            return null
        }
    }

    /**
     * Get active PPP connections (online users)
     * Returns array of active usernames
     */
    async getActivePPPConnections(): Promise<string[]> {
        try {
            const res = await axios.get(`${this.baseUrl}/ppp/active`, {
                auth: this.auth,
                timeout: this.timeout,
            })
            if (Array.isArray(res.data)) {
                return res.data.map((conn: any) => conn.name)
            }
            return []
        } catch {
            return []
        }
    }

    /**
     * Create new PPP secret for customer PPPoE connection
     */
    async createPPPSecret(name: string, password?: string, profileName?: string): Promise<boolean> {
        try {
            const payload: any = { name, service: 'pppoe' }
            if (password) payload.password = password
            if (profileName) payload.profile = profileName

            await axios.put(`${this.baseUrl}/ppp/secret`, payload, {
                auth: this.auth,
                timeout: this.timeout,
            })
            return true
        } catch {
            return false
        }
    }

    /**
     * Update existing PPP secret
     */
    async updatePPPSecret(name: string, password?: string, profileName?: string): Promise<boolean> {
        try {
            const secret = await this.findPPPSecret(name)
            if (!secret || !secret['.id']) {
                return await this.createPPPSecret(name, password, profileName)
            }

            const payload: any = {}
            if (password) payload.password = password
            if (profileName) payload.profile = profileName
            // If nothing to change but it exists, consider it success
            if (Object.keys(payload).length === 0) return true

            await axios.patch(`${this.baseUrl}/ppp/secret/${secret['.id']}`, payload, {
                auth: this.auth,
                timeout: this.timeout,
            })
            return true
        } catch {
            return false
        }
    }

    /**
     * Delete PPP secret
     */
    async deletePPPSecret(name: string): Promise<boolean> {
        try {
            const secret = await this.findPPPSecret(name)
            if (!secret || !secret['.id']) return true // Already gone

            await axios.delete(`${this.baseUrl}/ppp/secret/${secret['.id']}`, {
                auth: this.auth,
                timeout: this.timeout,
            })
            return true
        } catch {
            return false
        }
    }
}

