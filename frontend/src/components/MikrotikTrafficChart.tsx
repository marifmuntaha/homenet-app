import { useState, useEffect, useRef, useCallback } from 'react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import api from '../lib/axios'

interface Device {
    id: number
    name: string
    host: string
}

interface Interface {
    name: string
    type: string
    running: boolean
}

interface TrafficPoint {
    time: string
    download: number // bps
    upload: number   // bps
}

interface RawTraffic {
    rxBytes: number
    txBytes: number
    timestamp: number
}

const formatBps = (bps: number): string => {
    if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`
    if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} Kbps`
    return `${Math.round(bps)} bps`
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px',
                padding: '10px 14px', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,.2)'
            }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
                {payload.map((p: any) => (
                    <p key={p.name} style={{ color: p.color, margin: '2px 0' }}>
                        {p.name === 'download' ? '⬇ Download' : '⬆ Upload'}: <strong>{formatBps(p.value)}</strong>
                    </p>
                ))}
            </div>
        )
    }
    return null
}

const MAX_POINTS = 30
const POLL_INTERVAL = 2000 // ms

export default function MikrotikTrafficChart() {
    const [devices, setDevices] = useState<Device[]>([])
    const [selectedDevice, setSelectedDevice] = useState<string>('')
    const [interfaces, setInterfaces] = useState<Interface[]>([])
    const [selectedInterface, setSelectedInterface] = useState<string>('')
    const [data, setData] = useState<TrafficPoint[]>([])
    const [isPolling, setIsPolling] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    // Store previous bytes for bps calculation
    const prevRef = useRef<RawTraffic | null>(null)

    // Load devices on mount
    useEffect(() => {
        api.get<any>('/devices').then(res => {
            // Handle paginated response: { data: { data: [...] } }
            const raw = res.data?.data
            const devs: Device[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
            setDevices(devs)
            if (devs.length > 0) setSelectedDevice(String(devs[0].id))
        }).catch(() => setError('Gagal memuat perangkat'))
    }, [])

    // Load interfaces when device changes
    useEffect(() => {
        if (!selectedDevice) return
        setInterfaces([])
        setSelectedInterface('')
        setData([])
        prevRef.current = null
        api.get<any>(`/devices/${selectedDevice}/interfaces`).then(res => {
            const ifaces: Interface[] = res.data?.data ?? []
            // Show all interfaces, prefer running ones first
            const sorted = [...ifaces].sort((a, b) => (b.running ? 1 : 0) - (a.running ? 1 : 0))
            setInterfaces(sorted)
            if (sorted.length > 0) setSelectedInterface(sorted[0].name)
        }).catch(() => setInterfaces([]))
    }, [selectedDevice])

    // Fetch one traffic snapshot and compute bps from delta
    const fetchTraffic = useCallback(async () => {
        if (!selectedDevice || !selectedInterface) return
        try {
            const res = await api.get<any>(
                `/devices/${selectedDevice}/traffic?interface=${encodeURIComponent(selectedInterface)}`
            )
            const raw: RawTraffic = {
                rxBytes: Number(res.data?.data?.rxBytes ?? 0),
                txBytes: Number(res.data?.data?.txBytes ?? 0),
                timestamp: Number(res.data?.data?.timestamp ?? Date.now()),
            }

            let downloadBps = 0
            let uploadBps = 0

            if (prevRef.current) {
                const prev = prevRef.current
                const deltaSec = (raw.timestamp - prev.timestamp) / 1000
                if (deltaSec > 0) {
                    const rxDelta = Math.max(0, raw.rxBytes - prev.rxBytes)
                    const txDelta = Math.max(0, raw.txBytes - prev.txBytes)
                    downloadBps = (rxDelta * 8) / deltaSec
                    uploadBps = (txDelta * 8) / deltaSec
                }
            }

            prevRef.current = raw

            // Only add point if we have a prev reference (skip FIrst point since we have no delta)
            if (downloadBps > 0 || uploadBps > 0 || (prevRef.current && data.length > 0)) {
                const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                setData(prev => {
                    // Skip the very first measurement (no delta available)
                    if (prev.length === 0 && downloadBps === 0 && uploadBps === 0) return prev
                    const next = [...prev, { time: now, download: downloadBps, upload: uploadBps }]
                    return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next
                })
            }

            setError(null)
        } catch (err: any) {
            setError(`Gagal mengambil data traffic: ${err.message}`)
        }
    }, [selectedDevice, selectedInterface, data.length])

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        prevRef.current = null

        if (isPolling && selectedInterface) {
            fetchTraffic() // Initial fetch to set prevRef
            intervalRef.current = setInterval(fetchTraffic, POLL_INTERVAL)
        }

        return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }, [isPolling, selectedInterface, selectedDevice]) // eslint-disable-line

    const currentDownload = data.length > 0 ? data[data.length - 1].download : 0
    const currentUpload = data.length > 0 ? data[data.length - 1].upload : 0

    return (
        <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 className="card-title">📊 Monitor Traffic Realtime</h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                        Data diambil dari Mikrotik · update setiap 2 detik
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Device Selector */}
                    <select
                        value={selectedDevice}
                        onChange={e => { setSelectedDevice(e.target.value); setIsPolling(false); setData([]); prevRef.current = null }}
                        className="input"
                        style={{ minWidth: 140, height: 36, padding: '0 10px', fontSize: '0.85rem' }}
                        disabled={isPolling}
                    >
                        {devices.length === 0 && <option>Memuat...</option>}
                        {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>

                    {/* Interface Selector */}
                    <select
                        value={selectedInterface}
                        onChange={e => { setSelectedInterface(e.target.value); setData([]); prevRef.current = null }}
                        className="input"
                        style={{ minWidth: 150, height: 36, padding: '0 10px', fontSize: '0.85rem' }}
                        disabled={isPolling || interfaces.length === 0}
                    >
                        {interfaces.length === 0
                            ? <option>Memuat interface...</option>
                            : interfaces.map(i => (
                                <option key={i.name} value={i.name}>
                                    {i.running ? '🟢' : '🔴'} {i.name} ({i.type})
                                </option>
                            ))
                        }
                    </select>

                    {/* Start/Stop */}
                    <button
                        className={`btn ${isPolling ? 'btn-danger' : 'btn-primary'} btn-sm`}
                        onClick={() => { setIsPolling(p => !p); if (isPolling) { setData([]); prevRef.current = null } }}
                        disabled={!selectedInterface}
                        style={{ height: 36, minWidth: 120 }}
                    >
                        {isPolling ? '⏹ Stop' : '▶ Mulai Monitor'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: '0.8rem', borderTop: '1px solid var(--border)' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Live Stats */}
            {isPolling && (
                <div style={{ display: 'flex', gap: 24, padding: '12px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>⬇ Download</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>
                            {formatBps(currentDownload)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>⬆ Upload</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
                            {formatBps(currentUpload)}
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                        Live · {selectedInterface}
                    </div>
                </div>
            )}

            {/* Chart */}
            <div style={{ padding: '16px', height: 300 }}>
                {data.length < 2 ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 8 }}>
                        <span style={{ fontSize: '2.5rem' }}>📈</span>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>
                            {isPolling
                                ? 'Mengumpulkan data, mohon tunggu...'
                                : 'Pilih perangkat & interface, lalu klik "▶ Mulai Monitor"'
                            }
                        </p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <defs>
                                <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="ulGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tickFormatter={v => formatBps(v)}
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                width={75}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                formatter={v => v === 'download' ? '⬇ Download' : '⬆ Upload'}
                            />
                            <Area
                                type="monotone"
                                dataKey="download"
                                stroke="#22c55e"
                                strokeWidth={2}
                                fill="url(#dlGrad)"
                                dot={false}
                                isAnimationActive={false}
                            />
                            <Area
                                type="monotone"
                                dataKey="upload"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                fill="url(#ulGrad)"
                                dot={false}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
}
