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
    opticalRx?: string   // Redaman terima (dBm)
    opticalTx?: string   // Daya kirim (dBm)
    temperature?: string // Suhu modul optik (°C)
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

    // WAN PPPoE (WANConnectionDevice.3 = VLAN 102)
    // Berdasarkan temuan NBI: WAN2=TR069 (VLAN 101), maka WAN3=PPPOE (VLAN 102)
    WAN_IP: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.ExternalIPAddress',
    WAN_PPP_CONTAINER: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection',
    PPPOE_USER: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username',
    PPPOE_PASS: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Password',
    PPPOE_ENABLE: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Enable',
    PPPOE_CONN_TYPE: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.ConnectionType',
    PPPOE_CON_TRIGGER: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.ConnectionTrigger',
    PPPOE_NAT: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.NATEnabled',

    // WiFi 2.4GHz
    WIFI_SSID: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
    WIFI_PASS: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
    WIFI_ENABLE: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable',

    // Optical / GPON (ZTE V9 / X_CT-COM vendor extensions)
    // Mencakup variasi firmware F609 V9.0 (EPON/GPON)
    OPTICAL_RX_PATHS: [
        'InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.Stats.RxOpticalPower',
        'InternetGatewayDevice.WANDevice.1.WANGponInterfaceConfig.Stats.RxPower',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANEponLinkConfig.RxOpticalPower',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANEponLinkConfig.RxPower',
        'InternetGatewayDevice.WANDevice.1.WANPONInterfaceConfig.Stats.RxPower',
        'InternetGatewayDevice.X_ZTE_COM_Optical.RxPower',
        'InternetGatewayDevice.X_ZTE_COM_EponStats.RxPower',
        'InternetGatewayDevice.X_ZTE_COM_GponStats.RxPower',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.RXPower',
    ],
    OPTICAL_TX_PATHS: [
        'InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.Stats.TxOpticalPower',
        'InternetGatewayDevice.WANDevice.1.WANGponInterfaceConfig.Stats.TxPower',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANEponLinkConfig.TxOpticalPower',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANEponLinkConfig.TxPower',
        'InternetGatewayDevice.WANDevice.1.WANPONInterfaceConfig.Stats.TxPower',
        'InternetGatewayDevice.X_ZTE_COM_Optical.TxPower',
        'InternetGatewayDevice.X_ZTE_COM_EponStats.TxPower',
        'InternetGatewayDevice.X_ZTE_COM_GponStats.TxPower',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.TXPower',
    ],
    TEMP_PATHS: [
        'InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.Stats.OnuTemperature',
        'InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.Stats.Temperature',
        'InternetGatewayDevice.WANDevice.1.WANGponInterfaceConfig.Stats.OpticalTemperature',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANEponLinkConfig.OnuTemperature',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANEponLinkConfig.Temperature',
        'InternetGatewayDevice.WANDevice.1.WANPONInterfaceConfig.Stats.Temperature',
        'InternetGatewayDevice.X_ZTE_COM_Optical.Temperature',
        'InternetGatewayDevice.X_ZTE_COM_EponStats.Temperature',
        'InternetGatewayDevice.X_ZTE_COM_GponStats.Temperature',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.TransceiverTemperature',
    ],
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
        this.baseUrl = env.get('GENIEACS_NBI_URL', 'http://103.139.192.150:1457')
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
            ...PARAMS.OPTICAL_RX_PATHS,
            ...PARAMS.OPTICAL_TX_PATHS,
            ...PARAMS.TEMP_PATHS,
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

        // Format nilai optical power: GenieACS menyimpan dalam unit 0.001 dBm atau mW
        // ZTE F609/F660 biasanya return dalam 0.01 dBm (misal -2050 = -20.50 dBm)
        // Jika path X_CT-COM, nilainya sering dalam 0.1 uW (misal RX: 146 -> -18.3 dBm, TX: 17660 -> 2.4 dBm)
        const formatOptical = (raw?: string, isRx: boolean = false): string | undefined => {
            if (raw === undefined || raw === null || raw === '') return undefined
            const num = parseFloat(raw)
            if (isNaN(num)) return raw

            if (!raw.includes('.')) {
                // Heuristics unit 0.1 uW
                // Rx power dlm uW selalu positif. Tx power dlm uW > 5000.
                if ((isRx && num > 0) || (!isRx && num > 5000)) {
                    // Rumus uW -> dBm: 10 * log10( val / 10000 ) (karena val adalah 0.1 uW = 10^-4 mW)
                    return (10 * Math.log10(num / 10000)).toFixed(2) + ' dBm'
                }

                // Unit 0.01 dBm (e.g. -2150 -> -21.50)
                return (num / 100).toFixed(2) + ' dBm'
            }
            return num.toFixed(2) + ' dBm'
        }

        const formatTemp = (raw?: string): string | undefined => {
            if (raw === undefined || raw === null || raw === '') return undefined
            const num = parseFloat(raw)
            if (isNaN(num)) return raw

            if (!raw.includes('.')) {
                // Jika sangat besar (> 5000), ini format 1/256 °C (e.g. 12372 -> 48.3 °C) 
                if (num > 5000) return (num / 256).toFixed(1) + ' °C'
                // Jika > 500 asumsikan unit 0.01
                if (num > 500) return (num / 100).toFixed(1) + ' °C'
                // Jika > 100 asumsikan unit 0.1
                if (num > 100) return (num / 10).toFixed(1) + ' °C'
            }
            return num.toFixed(1) + ' °C'
        }

        // Helper untuk mencari nilai pertama yang ada dari daftar path
        const findFirst = (deviceObj: GenieDevice, paths: string[]): string | undefined => {
            for (const p of paths) {
                const val = extractParam(deviceObj, p)
                if (val !== undefined && val !== '') return val
            }
            return undefined
        }

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
            opticalRx: formatOptical(findFirst(device, PARAMS.OPTICAL_RX_PATHS), true),
            opticalTx: formatOptical(findFirst(device, PARAMS.OPTICAL_TX_PATHS), false),
            temperature: formatTemp(findFirst(device, PARAMS.TEMP_PATHS)),
        }
    }

    /**
     * AddObject — buat instance baru dari sebuah object di ONU
     * Contoh: path = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection'
     */
    async addObject(deviceId: string, objectPath: string): Promise<boolean> {
        try {
            await axios.post(
                `${this.baseUrl}/devices/${encodeDeviceId(deviceId)}/tasks`,
                { name: 'addObject', objectName: objectPath },
                {
                    auth: this.auth,
                    timeout: this.timeout,
                    headers: { 'Content-Type': 'application/json' },
                }
            )
            return true
        } catch (err) {
            console.error('GenieACS addObject error:', (err as AxiosError).message)
            return false
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
     * Provision ONT: push AddObject WANPPPConnection lalu SetParameterValues.
     * Urutan:
     *   1. AddObject → GenieACS buat WANPPPConnection.1 di ONT
     *   2. SetParameterValues → set Enable, ConnectionType, Username, Password
     *   3. SetParameterValues → set WiFi (opsional)
     *
     * Semua task dikirim ke antrian (tanpa connection_request),
     * dieksekusi berurutan saat ONT inform berikutnya.
     */
    async provisionOnt(options: {
        deviceId: string
        pppoeUser?: string | null
        pppoePassword?: string | null
        wifiSsid?: string | null
        wifiPassword?: string | null
    }): Promise<boolean> {
        const { deviceId, pppoeUser, pppoePassword, wifiSsid, wifiPassword } = options

        // Guard: deviceId wajib ada
        if (!deviceId) {
            console.error('GenieACS provisionOnt: deviceId is undefined/null, abort')
            return false
        }

        const tasksUrl = `${this.baseUrl}/devices/${encodeDeviceId(deviceId)}/tasks`
        console.log('GenieACS provisionOnt: using URL', tasksUrl)

        try {
            // ── Step 1: AddObject WANPPPConnection ────────────────────────────
            // Selalu kirim AddObject — GenieACS/ONT akan ignore jika sudah ada instance .1
            if (pppoeUser || pppoePassword) {
                await axios.post(
                    tasksUrl,
                    { name: 'addObject', objectName: PARAMS.WAN_PPP_CONTAINER },
                    { auth: this.auth, timeout: this.timeout, headers: { 'Content-Type': 'application/json' } }
                )
                console.log('GenieACS provisionOnt: addObject WANPPPConnection sent for', deviceId)
            }

            // ── Step 2: SetParameterValues PPPoE ──────────────────────────────
            if (pppoeUser && pppoePassword) {
                const pppoeParams: [string, string | boolean, string][] = [
                    [PARAMS.PPPOE_ENABLE, true, 'xsd:boolean'],
                    [PARAMS.PPPOE_CONN_TYPE, 'IP_Routed', 'xsd:string'],
                    [PARAMS.PPPOE_NAT, true, 'xsd:boolean'],
                    [PARAMS.PPPOE_USER, pppoeUser, 'xsd:string'],
                    [PARAMS.PPPOE_PASS, pppoePassword, 'xsd:string'],
                ]

                await axios.post(
                    tasksUrl,
                    { name: 'setParameterValues', parameterValues: pppoeParams },
                    { auth: this.auth, timeout: this.timeout, headers: { 'Content-Type': 'application/json' } }
                )
                console.log('GenieACS provisionOnt: setParameterValues PPPoE sent for', deviceId)
            }

            // ── Step 3: SetParameterValues WiFi ───────────────────────────────
            if (wifiSsid && wifiPassword) {
                const wifiParams: [string, string | boolean, string][] = [
                    [PARAMS.WIFI_ENABLE, true, 'xsd:boolean'],
                    [PARAMS.WIFI_SSID, wifiSsid, 'xsd:string'],
                    [PARAMS.WIFI_PASS, wifiPassword, 'xsd:string'],
                    ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BeaconType', '11i', 'xsd:string'],
                    ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.IEEE11iEncryptionModes', 'AESEncryption', 'xsd:string'],
                    ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.IEEE11iAuthenticationMode', 'PSKAuthentication', 'xsd:string'],
                ]
                await axios.post(
                    tasksUrl,
                    { name: 'setParameterValues', parameterValues: wifiParams },
                    { auth: this.auth, timeout: this.timeout, headers: { 'Content-Type': 'application/json' } }
                )
                console.log('GenieACS provisionOnt: setParameterValues WiFi sent for', deviceId)
            }

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
