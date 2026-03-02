import axios, { type AxiosError } from 'axios'
import env from '#start/env'

/* ─── Types ───────────────────────────────────────────────────── */

export interface OntInfo {
    online: boolean
    deviceId?: string
    serialNumber?: string
    productClass?: string
    softwareVersion?: string
    hardwareVersion?: string
    uptime?: number | string
    wanIp?: string
    ssid?: string
    lastInform?: string
    error?: string
}

export interface GenieDevice {
    _id: string
    _lastInform?: string
    _registered?: string
    _deviceId?: {
        _SerialNumber?: string
        _ProductClass?: string
        _Manufacturer?: string
        _OUI?: string
    }
    [key: string]: any
}

/* ─── TR-069 Parameter Paths for ZTE F663NV3A ─────────────────── */
const PARAMS = {
    // Device Info
    UPTIME: 'InternetGatewayDevice.DeviceInfo.UpTime',
    SOFTWARE_VERSION: 'InternetGatewayDevice.DeviceInfo.SoftwareVersion',
    HARDWARE_VERSION: 'InternetGatewayDevice.DeviceInfo.HardwareVersion',
    SERIAL_NUMBER: 'InternetGatewayDevice.DeviceInfo.SerialNumber',

    // WAN PPPoE
    WAN_IP: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress',
    PPPOE_USER: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
    PPPOE_PASS: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password',

    // WiFi 2.4GHz
    WIFI_SSID: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
    WIFI_PASS: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
    WIFI_ENABLE: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable',
}

/* ─── Helper: encode GenieACS device ID for URL ───────────────── */
function encodeDeviceId(deviceId: string): string {
    return encodeURIComponent(deviceId)
}

/* ─── Helper: extract parameter value from GenieACS device object ─ */
function extractParam(device: GenieDevice, paramPath: string): string | undefined {
    const parts = paramPath.split('.')
    let obj: any = device
    for (const part of parts) {
        if (obj == null || typeof obj !== 'object') return undefined
        obj = obj[part]
    }
    // GenieACS stores param values as { _value, _type, _timestamp }
    if (obj && typeof obj === 'object' && '_value' in obj) {
        return obj._value != null ? String(obj._value) : undefined
    }
    return undefined
}

/* ─── Main Service ────────────────────────────────────────────── */

export default class GenieAcsService {
    private baseUrl: string
    private auth: { username: string; password: string }
    private timeout: number

    constructor() {
        this.baseUrl = env.get('GENIEACS_NBI_URL', 'https://acs-nbi.own-server.web.id')
        this.auth = {
            username: env.get('GENIEACS_NBI_USER', 'admin'),
            password: env.get('GENIEACS_NBI_PASS', 'admin'),
        }
        this.timeout = 15000
    }

    /**
     * Ambil semua device dari GenieACS
     */
    async getDevices(query?: object): Promise<GenieDevice[]> {
        try {
            const params: any = {}
            if (query) params.query = JSON.stringify(query)
            const res = await axios.get(`${this.baseUrl}/devices`, {
                params,
                auth: this.auth,
                timeout: this.timeout,
            })
            return Array.isArray(res.data) ? res.data : []
        } catch (err) {
            console.error('GenieACS getDevices error:', (err as AxiosError).message)
            return []
        }
    }

    /**
     * Ambil 1 device berdasarkan ID dengan projection (parameter tertentu saja)
     */
    async getDevice(deviceId: string, projection?: string[]): Promise<GenieDevice | null> {
        try {
            const params: any = {
                query: JSON.stringify({ _id: deviceId }),
            }
            if (projection && projection.length > 0) {
                // Selalu sertakan _id, _lastInform, _deviceId
                const fields = ['_id', '_lastInform', '_deviceId', ...projection]
                params.projection = fields.join(',')
            }
            const res = await axios.get(`${this.baseUrl}/devices`, {
                params,
                auth: this.auth,
                timeout: this.timeout,
            })
            if (Array.isArray(res.data) && res.data.length > 0) {
                return res.data[0]
            }
            return null
        } catch (err) {
            console.error('GenieACS getDevice error:', (err as AxiosError).message)
            return null
        }
    }

    /**
     * Ambil info lengkap ONT: status online, SSID, IP WAN, uptime, dll
     */
    async getOntInfo(deviceId: string): Promise<OntInfo> {
        const projection = [
            PARAMS.UPTIME,
            PARAMS.SOFTWARE_VERSION,
            PARAMS.HARDWARE_VERSION,
            PARAMS.SERIAL_NUMBER,
            PARAMS.WAN_IP,
            PARAMS.WIFI_SSID,
        ]

        const device = await this.getDevice(deviceId, projection)

        if (!device) {
            return { online: false, error: 'Device tidak ditemukan di GenieACS' }
        }

        // Cek apakah ONT aktif - jika lastInform dalam 10 menit terakhir = online
        const lastInform = device._lastInform ? new Date(device._lastInform) : null
        const isOnline = lastInform
            ? Date.now() - lastInform.getTime() < 10 * 60 * 1000
            : false

        return {
            online: isOnline,
            deviceId: device._id,
            serialNumber: device._deviceId?._SerialNumber ?? extractParam(device, PARAMS.SERIAL_NUMBER),
            productClass: device._deviceId?._ProductClass,
            softwareVersion: extractParam(device, PARAMS.SOFTWARE_VERSION),
            hardwareVersion: extractParam(device, PARAMS.HARDWARE_VERSION),
            uptime: extractParam(device, PARAMS.UPTIME),
            wanIp: extractParam(device, PARAMS.WAN_IP),
            ssid: extractParam(device, PARAMS.WIFI_SSID),
            lastInform: device._lastInform,
        }
    }

    /**
     * Reboot ONT
     */
    async reboot(deviceId: string): Promise<boolean> {
        try {
            await axios.post(
                `${this.baseUrl}/devices/${encodeDeviceId(deviceId)}/tasks?timeout=30&connection_request`,
                { name: 'reboot' },
                {
                    auth: this.auth,
                    timeout: this.timeout,
                    headers: { 'Content-Type': 'application/json' },
                }
            )
            return true
        } catch (err) {
            console.error('GenieACS reboot error:', (err as AxiosError).message)
            return false
        }
    }

    /**
     * Set parameter values (generic)
     */
    async setParameterValues(
        deviceId: string,
        params: [string, string | boolean | number, string][]
    ): Promise<boolean> {
        try {
            await axios.post(
                `${this.baseUrl}/devices/${encodeDeviceId(deviceId)}/tasks?timeout=30&connection_request`,
                {
                    name: 'setParameterValues',
                    parameterValues: params,
                },
                {
                    auth: this.auth,
                    timeout: this.timeout,
                    headers: { 'Content-Type': 'application/json' },
                }
            )
            return true
        } catch (err) {
            console.error('GenieACS setParameterValues error:', (err as AxiosError).message)
            return false
        }
    }

    /**
     * Ubah SSID dan/atau password WiFi 2.4GHz
     */
    async setWifi(deviceId: string, ssid?: string, password?: string): Promise<boolean> {
        const params: [string, string, string][] = []
        if (ssid) params.push([PARAMS.WIFI_SSID, ssid, 'xsd:string'])
        if (password) params.push([PARAMS.WIFI_PASS, password, 'xsd:string'])
        if (params.length === 0) return true
        return this.setParameterValues(deviceId, params)
    }

    /**
     * Ubah PPPoE username dan password di ONT
     */
    async setPppoe(deviceId: string, username: string, password: string): Promise<boolean> {
        return this.setParameterValues(deviceId, [
            [PARAMS.PPPOE_USER, username, 'xsd:string'],
            [PARAMS.PPPOE_PASS, password, 'xsd:string'],
        ])
    }

    /**
     * Factory reset ONT
     */
    async factoryReset(deviceId: string): Promise<boolean> {
        try {
            await axios.post(
                `${this.baseUrl}/devices/${encodeDeviceId(deviceId)}/tasks?timeout=30&connection_request`,
                { name: 'factoryReset' },
                {
                    auth: this.auth,
                    timeout: this.timeout,
                    headers: { 'Content-Type': 'application/json' },
                }
            )
            return true
        } catch (err) {
            console.error('GenieACS factoryReset error:', (err as AxiosError).message)
            return false
        }
    }

    /**
     * Cari device di GenieACS berdasarkan serial number
     * Return device pertama yang cocok, atau null jika tidak ditemukan
     */
    async getDeviceBySerial(serialNumber: string): Promise<GenieDevice | null> {
        try {
            // Query GenieACS dengan filter serial number
            const query = {
                $or: [
                    { '_deviceId._SerialNumber': serialNumber },
                    { 'InternetGatewayDevice.DeviceInfo.SerialNumber._value': serialNumber },
                    { 'Device.DeviceInfo.SerialNumber._value': serialNumber },
                ],
            }
            const res = await axios.get(`${this.baseUrl}/devices`, {
                params: {
                    query: JSON.stringify(query),
                    projection: '_id,_lastInform,_registered,_deviceId',
                },
                auth: this.auth,
                timeout: this.timeout,
            })
            const list = Array.isArray(res.data) ? res.data : []
            return list.length > 0 ? list[0] : null
        } catch (err) {
            console.error('GenieACS getDeviceBySerial error:', (err as AxiosError).message)
            return null
        }
    }

    /**
     * Provision ONT: push SetParameterValues task langsung ke GenieACS via NBI.
     * Tidak memerlukan extension atau provisioning script.
     * Task akan dieksekusi pada inform berikutnya (atau segera jika device online).
     */
    async provisionOnt(options: {
        deviceId: string
        pppoeUser?: string | null
        pppoePassword?: string | null
        wifiSsid?: string | null
        wifiPassword?: string | null
    }): Promise<boolean> {
        const { deviceId, pppoeUser, pppoePassword, wifiSsid, wifiPassword } = options

        const paramValues: [string, string, string][] = []

        if (pppoeUser) paramValues.push([PARAMS.PPPOE_USER, pppoeUser, 'xsd:string'])
        if (pppoePassword) paramValues.push([PARAMS.PPPOE_PASS, pppoePassword, 'xsd:string'])
        if (wifiSsid) paramValues.push([PARAMS.WIFI_SSID, wifiSsid, 'xsd:string'])
        if (wifiPassword) {
            paramValues.push([PARAMS.WIFI_PASS, wifiPassword, 'xsd:string'])
            paramValues.push(['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BeaconType', '11i', 'xsd:string'])
            paramValues.push(['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.IEEE11iEncryptionModes', 'AESEncryption', 'xsd:string'])
            paramValues.push(['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.IEEE11iAuthenticationMode', 'PSKAuthentication', 'xsd:string'])
        }

        if (paramValues.length === 0) return true

        try {
            // Kirim task ke GenieACS — tanpa ?connection_request agar task diqueue
            // dan dieksekusi pada inform berikutnya (device tidak harus online sekarang)
            await axios.post(
                `${this.baseUrl}/devices/${encodeDeviceId(deviceId)}/tasks`,
                { name: 'setParameterValues', parameterValues: paramValues },
                {
                    auth: this.auth,
                    timeout: this.timeout,
                    headers: { 'Content-Type': 'application/json' },
                }
            )
            return true
        } catch (err) {
            console.error('GenieACS provisionOnt error:', (err as AxiosError).message)
            return false
        }
    }

    /**
     * Refresh object (paksa ONT kirim data terbaru ke ACS)
     */
    async refreshObject(deviceId: string, objectPath: string): Promise<boolean> {
        try {
            await axios.post(
                `${this.baseUrl}/devices/${encodeDeviceId(deviceId)}/tasks?timeout=30&connection_request`,
                { name: 'refreshObject', objectName: objectPath },
                {
                    auth: this.auth,
                    timeout: this.timeout,
                    headers: { 'Content-Type': 'application/json' },
                }
            )
            return true
        } catch (err) {
            console.error('GenieACS refreshObject error:', (err as AxiosError).message)
            return false
        }
    }
}
