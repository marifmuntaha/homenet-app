import { useState } from 'react'
import api from '../../lib/axios'
import type { CustomerOnt, OntInfo } from '../../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface Props {
    ont: CustomerOnt
    info: OntInfo | null
    loading: boolean
    onClose: () => void
    onRefresh: () => void
    onInfoUpdate: (info: OntInfo) => void
}

export default function OntDetailPanel({ ont, info, loading, onClose, onRefresh }: Props) {
    const [tab, setTab] = useState<'info' | 'wifi'>('info')
    const [wifiForm, setWifiForm] = useState({ ssid: ont.wifiSsid ?? '', password: '' })
    const [wifiSaving, setWifiSaving] = useState(false)
    const [wifiMsg, setWifiMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [confirmAction, setConfirmAction] = useState<'reboot' | 'factory-reset' | null>(null)
    const [syncLoading, setSyncLoading] = useState(false)
    const [syncMsg, setSyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const handleSyncProvision = async () => {
        setSyncLoading(true)
        setSyncMsg(null)
        try {
            const res = await api.post<{ success: boolean; message: string }>(`/onts/${ont.id}/sync-provision`)
            setSyncMsg({
                type: res.data.success ? 'success' : 'error',
                text: res.data.message,
            })
            if (res.data.success) {
                // Refresh halaman setelah 2 detik agar status berubah
                setTimeout(() => onRefresh(), 2000)
            }
        } catch (err: any) {
            setSyncMsg({ type: 'error', text: err.response?.data?.message ?? 'Gagal menghubungi server' })
        } finally {
            setSyncLoading(false)
        }
    }

    const isPending = ont.provisionStatus === 'pending' || !ont.genieacsDeviceId

    const handleWifiSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setWifiSaving(true)
        setWifiMsg(null)
        try {
            await api.post(`/onts/${ont.id}/set-wifi`, { ssid: wifiForm.ssid, password: wifiForm.password })
            setWifiMsg({ type: 'success', text: 'Pengaturan WiFi berhasil dikirim. Perubahan aktif dalam beberapa menit.' })
            setWifiForm(f => ({ ...f, password: '' }))
        } catch (err: any) {
            setWifiMsg({ type: 'error', text: err.response?.data?.message ?? 'Gagal mengubah WiFi.' })
        } finally {
            setWifiSaving(false)
        }
    }

    const handleAction = async (action: 'reboot' | 'factory-reset') => {
        setActionLoading(action)
        setActionMsg(null)
        setConfirmAction(null)
        try {
            await api.post(`/onts/${ont.id}/${action}`)
            const msgs = {
                reboot: 'Perintah reboot berhasil dikirim. ONT akan restart.',
                'factory-reset': 'Factory reset berhasil dikirim. ONT kembali ke pengaturan pabrik.',
            }
            setActionMsg({ type: 'success', text: msgs[action] })
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.response?.data?.message ?? `Gagal mengirim perintah ${action}.` })
        } finally {
            setActionLoading(null)
        }
    }

    const formatUptime = (val?: string | number) => {
        if (val === undefined || val === null || val === '') return '—'
        const sec = typeof val === 'string' ? parseInt(val) : val
        if (isNaN(sec) || sec <= 0) return '—'
        const d = Math.floor(sec / 86400)
        const h = Math.floor((sec % 86400) / 3600)
        const m = Math.floor((sec % 3600) / 60)
        const parts = []
        if (d > 0) parts.push(`${d} hari`)
        if (h > 0) parts.push(`${h} jam`)
        parts.push(`${m} menit`)
        return parts.join(' ')
    }

    const getSignalQuality = (rxStr?: string): { label: string; color: string } | null => {
        if (!rxStr) return null
        const match = rxStr.match(/(-?\d+\.?\d*)/)
        if (!match) return null
        const val = parseFloat(match[1])
        if (val >= -25) return { label: 'Baik', color: '#16a34a' }
        if (val >= -30) return { label: 'Normal', color: '#d97706' }
        return { label: 'Lemah', color: '#dc2626' }
    }

    return (
        <div className="card" style={{ position: 'sticky', top: 80 }}>
            {/* Header */}
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                    <h2 className="card-title" style={{ fontSize: 15 }}>
                        <FontAwesomeIcon icon={['fas', 'router']} style={{ marginRight: 8, color: 'var(--accent)' }} />
                        {ont.ontLabel ?? ont.serialNumber ?? 'Detail ONT'}
                    </h2>
                    {ont.serialNumber && (
                        <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ont.serialNumber}</code>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {!isPending && (
                        <button className="btn btn-ghost btn-sm" onClick={onRefresh} disabled={loading} title="Refresh">
                            <FontAwesomeIcon icon={['fas', 'arrows-rotate']} className={loading ? 'fa-spin' : ''} />
                        </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>
                        <FontAwesomeIcon icon={['fas', 'xmark']} />
                    </button>
                </div>
            </div>

            {/* Status bar */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                {isPending ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'rgba(251,191,36,0.12)', color: '#d97706',
                            padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, width: 'fit-content'
                        }}>
                            <FontAwesomeIcon icon={['fas', 'clock']} />
                            Menunggu Koneksi
                        </span>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                            ONT belum terhubung ke GenieACS. Pasang perangkat dan arahkan ACS URL ke server GenieACS. Konfigurasi PPPoE & WiFi akan diterapkan otomatis.
                        </p>
                    </div>
                ) : loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                        <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }} />
                        Mengambil info ONT...
                    </div>
                ) : info?.online ? (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'rgba(34,197,94,0.15)', color: '#16a34a',
                        padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                        Online
                    </span>
                ) : (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'rgba(239,68,68,0.12)', color: '#dc2626',
                        padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                        Offline
                    </span>
                )}
            </div>

            {/* Pending info card */}
            {isPending ? (
                <div style={{ padding: 20 }}>
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                        <tbody>
                            {[
                                { label: 'Pelanggan', value: ont.customer?.fullName },
                                { label: 'PPPoE User', value: ont.customer?.pppoeUser, mono: true },
                                { label: 'WiFi SSID', value: ont.wifiSsid, mono: true },
                                { label: 'Terdaftar', value: new Date(ont.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) },
                            ].map(row => row.value ? (
                                <tr key={row.label} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '8px 0', color: 'var(--text-muted)', width: '40%' }}>{row.label}</td>
                                    <td style={{ padding: '8px 0', fontWeight: 500, fontFamily: row.mono ? 'monospace' : undefined, fontSize: row.mono ? 12 : undefined }}>
                                        {row.value}
                                    </td>
                                </tr>
                            ) : null)}
                        </tbody>
                    </table>

                    <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--surface)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>📡 Cara menghubungkan ONT:</strong>
                        <ol style={{ margin: 0, paddingLeft: 20 }}>
                            <li>Masuk ke web admin ONT</li>
                            <li>Set <strong>ACS URL</strong> ke server GenieACS</li>
                            <li>Aktifkan <strong>Periodic Inform</strong></li>
                            <li>Klik <strong>Terapkan</strong> di bawah setelah ONT terhubung ✓</li>
                        </ol>
                    </div>

                    {/* Sync Provision Button */}
                    <div style={{ marginTop: 16 }}>
                        {syncMsg && (
                            <div style={{
                                background: syncMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                border: `1px solid ${syncMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                borderRadius: 8, padding: '10px 12px',
                                color: syncMsg.type === 'success' ? '#16a34a' : '#dc2626',
                                fontSize: 12, marginBottom: 10, lineHeight: 1.5,
                            }}>
                                <FontAwesomeIcon icon={['fas', syncMsg.type === 'success' ? 'circle-check' : 'circle-exclamation']} style={{ marginRight: 6 }} />
                                {syncMsg.text}
                            </div>
                        )}
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            onClick={handleSyncProvision}
                            disabled={syncLoading}
                        >
                            {syncLoading
                                ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Mencari & Terapkan...</>
                                : <><FontAwesomeIcon icon={['fas', 'bolt']} /> Terapkan Provisioning</>
                            }
                        </button>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                            Cari ONT di GenieACS berdasarkan serial number → push PPPoE & WiFi
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                        {(['info', 'wifi'] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)} style={{
                                flex: 1, padding: '10px 0', border: 'none', background: 'none',
                                cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 400,
                                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                                transition: 'all 0.2s',
                            }}>
                                {t === 'info' ? '📊 Info' : '📶 WiFi'}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: '16px 20px' }}>
                        {tab === 'info' && (
                            <>
                                {info && (
                                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                                        <tbody>
                                            {[
                                                { label: 'Pelanggan', value: ont.customer?.fullName },
                                                { label: 'PPPoE User', value: ont.customer?.pppoeUser, mono: true },
                                                { label: 'IP WAN', value: info.wanIp, mono: true },
                                                { label: 'SSID WiFi', value: info.ssid, mono: true },
                                                { label: 'Firmware', value: info.softwareVersion },
                                                { label: 'Uptime', value: formatUptime(info.uptime) !== '—' ? formatUptime(info.uptime) : undefined },
                                                { label: 'Last Inform', value: info.lastInform ? new Date(info.lastInform).toLocaleString('id-ID') : undefined },
                                            ].map(row => row.value ? (
                                                <tr key={row.label} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '8px 0', color: 'var(--text-muted)', width: '40%' }}>{row.label}</td>
                                                    <td style={{ padding: '8px 0', fontWeight: 500, fontFamily: row.mono ? 'monospace' : undefined, fontSize: row.mono ? 12 : undefined }}>
                                                        {row.value}
                                                    </td>
                                                </tr>
                                            ) : null)}

                                            {/* Optical Signal (redaman) — selalu tampil */}
                                            <tr>
                                                <td colSpan={2} style={{ padding: '10px 0 4px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    📡 Sinyal Optik
                                                </td>
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '8px 0', color: 'var(--text-muted)' }}>Redaman Rx</td>
                                                <td style={{ padding: '8px 0', fontWeight: 500 }}>
                                                    {info.opticalRx ? (
                                                        <>
                                                            <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{info.opticalRx}</span>
                                                            {(() => {
                                                                const q = getSignalQuality(info.opticalRx)
                                                                return q ? (
                                                                    <span style={{ marginLeft: 8, fontSize: 11, color: q.color, fontWeight: 600, background: `${q.color}18`, padding: '1px 7px', borderRadius: 10 }}>
                                                                        {q.label}
                                                                    </span>
                                                                ) : null
                                                            })()}
                                                        </>
                                                    ) : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                                                </td>
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '8px 0', color: 'var(--text-muted)' }}>Daya Tx</td>
                                                <td style={{ padding: '8px 0', fontWeight: 500, fontFamily: info.opticalTx ? 'monospace' : undefined, fontSize: info.opticalTx ? 12 : undefined }}>
                                                    {info.opticalTx ?? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                                                </td>
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '8px 0', color: 'var(--text-muted)' }}>Suhu Modul</td>
                                                <td style={{ padding: '8px 0', fontWeight: 500, fontFamily: info.temperature ? 'monospace' : undefined, fontSize: info.temperature ? 12 : undefined }}>
                                                    {info.temperature ?? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                )}
                                {info?.error && <div style={{ color: '#dc2626', fontSize: 13, padding: '8px 0' }}>{info.error}</div>}

                                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aksi Remote</p>

                                    {actionMsg && (
                                        <div style={{
                                            background: actionMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                            border: `1px solid ${actionMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                            borderRadius: 8, padding: '8px 12px',
                                            color: actionMsg.type === 'success' ? '#16a34a' : '#dc2626',
                                            fontSize: 12, marginBottom: 8,
                                        }}>
                                            {actionMsg.text}
                                        </div>
                                    )}

                                    <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} disabled={actionLoading !== null} onClick={() => setConfirmAction('reboot')}>
                                        <FontAwesomeIcon icon={['fas', 'rotate-right']} style={{ width: 16 }} /> Reboot ONT
                                    </button>

                                    {/* Factory Reset — danger card button */}
                                    <button
                                        disabled={actionLoading !== null}
                                        onClick={() => setConfirmAction('factory-reset')}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(220,38,38,0.04) 100%)',
                                            border: '1px solid rgba(239,68,68,0.25)',
                                            borderRadius: 10, padding: '10px 14px',
                                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                                            width: '100%', textAlign: 'left',
                                            opacity: actionLoading ? 0.5 : 1,
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => {
                                            if (!actionLoading) {
                                                (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.08) 100%)'
                                                    ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.5)'
                                                    ; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(220,38,38,0.04) 100%)'
                                                ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.25)'
                                                ; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
                                        }}
                                    >
                                        {/* Icon badge */}
                                        <div style={{
                                            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                                            background: 'rgba(239,68,68,0.12)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} style={{ color: '#dc2626', fontSize: 15 }} />
                                        </div>
                                        {/* Text */}
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>Factory Reset</div>
                                            <div style={{ fontSize: 11, color: 'rgba(220,38,38,0.7)', marginTop: 1 }}>
                                                Hapus semua konfigurasi ONT
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </>
                        )}

                        {tab === 'wifi' && (
                            <form onSubmit={handleWifiSave}>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                                    Ubah WiFi 2.4GHz via TR-069 secara remote.
                                </p>

                                {wifiMsg && (
                                    <div style={{
                                        background: wifiMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                        border: `1px solid ${wifiMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                        borderRadius: 8, padding: '8px 12px',
                                        color: wifiMsg.type === 'success' ? '#16a34a' : '#dc2626',
                                        fontSize: 12, marginBottom: 12,
                                    }}>
                                        {wifiMsg.text}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12 }}>Nama WiFi (SSID)</label>
                                    <input className="form-input" value={wifiForm.ssid} onChange={(e) => setWifiForm(f => ({ ...f, ssid: e.target.value }))} placeholder="Nama WiFi baru" maxLength={32} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12 }}>Password WiFi (min 8 karakter)</label>
                                    <input className="form-input" type="password" value={wifiForm.password} onChange={(e) => setWifiForm(f => ({ ...f, password: e.target.value }))} placeholder="Password baru" minLength={8} maxLength={63} required />
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={wifiSaving}>
                                    {wifiSaving ? <><span className="spinner" /> Mengirim...</> : <><FontAwesomeIcon icon={['fas', 'wifi']} /> Terapkan Perubahan WiFi</>}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Confirm Dialog */}
                    {confirmAction && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit', zIndex: 10 }}>
                            <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, maxWidth: 280, textAlign: 'center' }}>
                                <FontAwesomeIcon icon={['fas', confirmAction === 'reboot' ? 'rotate-right' : 'triangle-exclamation']} style={{ fontSize: 32, color: confirmAction === 'reboot' ? 'var(--accent)' : '#dc2626', marginBottom: 12 }} />
                                <h4 style={{ marginBottom: 8 }}>{confirmAction === 'reboot' ? 'Reboot ONT?' : 'Factory Reset?'}</h4>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                                    {confirmAction === 'reboot'
                                        ? 'ONT akan restart dan koneksi pelanggan terputus sementara.'
                                        : 'Semua konfigurasi ONT akan kembali ke pabrik!'
                                    }
                                </p>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmAction(null)}>Batal</button>
                                    <button className={`btn btn-sm ${confirmAction === 'reboot' ? 'btn-primary' : 'btn-danger'}`} onClick={() => handleAction(confirmAction)} disabled={actionLoading !== null}>
                                        {actionLoading ? <span className="spinner" /> : 'Ya, Lanjutkan'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
