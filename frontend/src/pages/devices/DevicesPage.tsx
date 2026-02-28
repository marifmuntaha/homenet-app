import { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/axios'
import type { Device, DeviceStatus, PaginatedResponse } from '../../types'
import DeviceModal from './DeviceModal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const STATUS_REFRESH_INTERVAL = 30_000 // 30 detik

export default function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([])
    const [meta, setMeta] = useState({ total: 0, per_page: 15, current_page: 1, last_page: 1, first_page: 1 })
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editDevice, setEditDevice] = useState<Device | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Device | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Status map: device_id → DeviceStatus
    const [statusMap, setStatusMap] = useState<Record<number, DeviceStatus & { loading?: boolean }>>({})
    const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const currentDevicesRef = useRef<Device[]>([])

    const fetchDevices = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await api.get<PaginatedResponse<Device>>('/devices', {
                params: { page, search, limit: 15 },
            })
            const list = res.data.data.data
            setDevices(list)
            setMeta(res.data.data.meta)
            currentDevicesRef.current = list
        } catch {
            // handle error
        } finally {
            setIsLoading(false)
        }
    }, [page, search])

    // Fetch status for a single device
    const fetchSingleStatus = useCallback(async (deviceId: number) => {
        setStatusMap(prev => ({ ...prev, [deviceId]: { ...prev[deviceId], loading: true, device_id: deviceId, online: false, checked_at: '' } }))
        try {
            const res = await api.get<{ success: boolean; data: DeviceStatus }>(`/devices/${deviceId}/status`)
            setStatusMap(prev => ({ ...prev, [deviceId]: { ...res.data.data, loading: false } }))
        } catch {
            setStatusMap(prev => ({
                ...prev,
                [deviceId]: { device_id: deviceId, online: false, error: 'Request failed', checked_at: new Date().toISOString(), loading: false }
            }))
        }
    }, [])

    // Fetch status for all devices concurrently
    const fetchAllStatus = useCallback(async (deviceList?: Device[]) => {
        const list = deviceList ?? currentDevicesRef.current
        if (list.length === 0) return
        await Promise.allSettled(list.map(d => fetchSingleStatus(d.id)))
    }, [fetchSingleStatus])

    useEffect(() => {
        const debounce = setTimeout(async () => {
            await fetchDevices()
        }, 300)
        return () => clearTimeout(debounce)
    }, [fetchDevices])

    // Auto-fetch status after devices load
    useEffect(() => {
        if (!isLoading && devices.length > 0) {
            fetchAllStatus(devices)
        }
    }, [isLoading, devices, fetchAllStatus])

    // Auto-refresh status every 30s
    useEffect(() => {
        if (statusIntervalRef.current) clearInterval(statusIntervalRef.current)
        statusIntervalRef.current = setInterval(() => {
            fetchAllStatus()
        }, STATUS_REFRESH_INTERVAL)
        return () => {
            if (statusIntervalRef.current) clearInterval(statusIntervalRef.current)
        }
    }, [fetchAllStatus])

    const handleDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            await api.delete(`/devices/${deleteTarget.id}`)
            setDeleteTarget(null)
            fetchDevices()
        } catch {
            // handle
        } finally {
            setIsDeleting(false)
        }
    }

    const handleModalClose = (refresh?: boolean) => {
        setModalOpen(false)
        setEditDevice(null)
        if (refresh) fetchDevices()
    }

    const openCreate = () => { setEditDevice(null); setModalOpen(true) }
    const openEdit = (device: Device) => { setEditDevice(device); setModalOpen(true) }

    const onlineCount = Object.values(statusMap).filter(s => s.online && !s.loading).length
    const offlineCount = Object.values(statusMap).filter(s => !s.online && !s.loading && s.checked_at).length

    return (
        <Layout title="Device Management">
            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon stat-icon-purple">
                        <FontAwesomeIcon icon={['fas', 'server']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info">
                        <p>Total Device</p>
                        <h3>{meta.total}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-green">
                        <FontAwesomeIcon icon={['fas', 'circle-check']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info">
                        <p>Online</p>
                        <h3>{onlineCount}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>
                        <FontAwesomeIcon icon={['fas', 'circle-xmark']} className="fa-icon-stat" style={{ color: 'var(--danger)' }} />
                    </div>
                    <div className="stat-info">
                        <p>Offline</p>
                        <h3>{offlineCount}</h3>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Daftar Device Mikrotik</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="search-box">
                            <span className="search-icon">
                                <FontAwesomeIcon icon={['fas', 'magnifying-glass']} />
                            </span>
                            <input
                                className="form-input"
                                placeholder="Cari nama, host, user..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                                style={{ paddingLeft: '38px' }}
                            />
                        </div>
                        <button
                            className="btn btn-ghost"
                            onClick={() => fetchAllStatus()}
                            title="Refresh semua status"
                        >
                            <FontAwesomeIcon icon={['fas', 'arrows-rotate']} /> Refresh Status
                        </button>
                        <button className="btn btn-primary" onClick={openCreate}>
                            <FontAwesomeIcon icon={['fas', 'plus']} /> Tambah Device
                        </button>
                    </div>
                </div>

                <div className="table-wrapper">
                    {isLoading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px', borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }} />
                            <p>Memuat data...</p>
                        </div>
                    ) : devices.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <FontAwesomeIcon icon={['fas', 'server']} />
                            </div>
                            <h3>Tidak ada device</h3>
                            <p>{search ? `Tidak ditemukan hasil untuk "${search}"` : 'Belum ada device yang terdaftar'}</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Nama</th>
                                    <th>Host</th>
                                    <th>User</th>
                                    <th>Port</th>
                                    <th>Status</th>
                                    <th>Ditambahkan</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map((device, i) => {
                                    const status = statusMap[device.id]
                                    return (
                                        <tr key={device.id}>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                                {(page - 1) * 15 + i + 1}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div
                                                        style={{
                                                            width: 34, height: 34, borderRadius: '8px',
                                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 14, flexShrink: 0,
                                                            color: 'white',
                                                        }}
                                                    >
                                                        <FontAwesomeIcon icon={['fas', 'server']} />
                                                    </div>
                                                    <div>
                                                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', display: 'block' }}>{device.name}</span>
                                                        {status?.identity && status.online && (
                                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{status.identity}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <code style={{ fontSize: '13px', background: 'var(--surface)', padding: '2px 8px', borderRadius: '4px', color: 'var(--accent)' }}>
                                                    {device.host}
                                                </code>
                                            </td>
                                            <td>{device.user}</td>
                                            <td>
                                                <span className="badge badge-verified">{device.port}</span>
                                            </td>
                                            <td>
                                                <StatusBadge status={status} onRefresh={() => fetchSingleStatus(device.id)} />
                                            </td>
                                            <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                                {new Date(device.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td>
                                                <div className="table-actions">
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(device)}>
                                                        <FontAwesomeIcon icon={['fas', 'pen-to-square']} /> Edit
                                                    </button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(device)}>
                                                        <FontAwesomeIcon icon={['fas', 'trash']} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {!isLoading && devices.length > 0 && (
                    <div className="pagination">
                        <span className="pagination-info">
                            Menampilkan {(page - 1) * 15 + 1}–{Math.min(page * 15, meta.total)} dari {meta.total} device
                            <span style={{ marginLeft: 12, fontSize: '12px', color: 'var(--text-muted)' }}>
                                · Status auto-refresh setiap 30 detik
                            </span>
                        </span>
                        <div className="pagination-controls">
                            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
                            {Array.from({ length: Math.min(meta.last_page, 5) }, (_, i) => {
                                const p = i + 1
                                return (
                                    <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                                )
                            })}
                            <button className="page-btn" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>→</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <DeviceModal device={editDevice} onClose={handleModalClose} />
            )}

            {/* Confirm Delete */}
            {deleteTarget && (
                <div className="confirm-overlay">
                    <div className="confirm-box">
                        <div className="confirm-icon">
                            <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} style={{ color: 'var(--danger)' }} />
                        </div>
                        <h3>Hapus Device</h3>
                        <p>
                            Anda yakin ingin menghapus <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>?
                            Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="confirm-actions">
                            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Batal</button>
                            <button className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>
                                {isDeleting ? <><span className="spinner" /> Menghapus...</> : <><FontAwesomeIcon icon={['fas', 'trash']} /> Ya, Hapus</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    )
}

/* ─── Status Badge Component ─────────────────────────────── */
interface StatusBadgeProps {
    status: (DeviceStatus & { loading?: boolean }) | undefined
    onRefresh: () => void
}

function StatusBadge({ status, onRefresh }: StatusBadgeProps) {
    if (!status || status.loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'var(--accent)', borderColor: 'var(--border)', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Checking...</span>
            </div>
        )
    }

    if (status.online) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'rgba(34,197,94,0.15)', color: '#16a34a',
                        padding: '2px 10px', borderRadius: 20, fontSize: '12px', fontWeight: 600,
                    }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                        Online
                    </span>
                    <button
                        onClick={onRefresh}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: 0 }}
                        title="Refresh status"
                    >🔄</button>
                </div>
                {status.response_ms !== undefined && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: 2 }}>
                        {status.response_ms}ms
                    </span>
                )}
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'rgba(239,68,68,0.12)', color: '#dc2626',
                    padding: '2px 10px', borderRadius: 20, fontSize: '12px', fontWeight: 600,
                }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                    Offline
                </span>
                <button
                    onClick={onRefresh}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: 0 }}
                    title="Refresh status"
                ><FontAwesomeIcon icon={['fas', 'arrows-rotate']} /></button>
            </div>
            {status.error && (
                <span style={{ fontSize: '11px', color: '#dc2626', paddingLeft: 2 }} title={status.error}>
                    {status.error.length > 28 ? status.error.slice(0, 28) + '…' : status.error}
                </span>
            )}
        </div>
    )
}
