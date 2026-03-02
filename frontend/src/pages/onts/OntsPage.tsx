import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/axios'
import type { CustomerOnt, OntInfo, PaginatedResponse } from '../../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import OntModal from './OntModal'
import OntDetailPanel from './OntDetailPanel'

function StatusBadge({ status }: { status: CustomerOnt['provisionStatus'] }) {
    const map = {
        pending: { color: '#d97706', bg: 'rgba(251,191,36,0.12)', label: 'Menunggu', icon: 'clock' as const },
        provisioned: { color: '#16a34a', bg: 'rgba(34,197,94,0.12)', label: 'Tersambung', icon: 'circle-check' as const },
        failed: { color: '#dc2626', bg: 'rgba(239,68,68,0.12)', label: 'Gagal', icon: 'circle-exclamation' as const },
    }
    const s = map[status]
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: s.bg, color: s.color,
            padding: '3px 10px', borderRadius: 20, fontSize: '12px', fontWeight: 600,
        }}>
            <FontAwesomeIcon icon={['fas', s.icon]} style={{ fontSize: 10 }} />
            {s.label}
        </span>
    )
}

export default function OntsPage() {
    const [onts, setOnts] = useState<CustomerOnt[]>([])
    const [meta, setMeta] = useState({ total: 0, per_page: 15, current_page: 1, last_page: 1, first_page: 1 })
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editOnt, setEditOnt] = useState<CustomerOnt | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<CustomerOnt | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [selectedOnt, setSelectedOnt] = useState<CustomerOnt | null>(null)
    const [ontInfo, setOntInfo] = useState<OntInfo | null>(null)
    const [infoLoading, setInfoLoading] = useState(false)

    const fetchOnts = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await api.get<PaginatedResponse<CustomerOnt>>('/onts', {
                params: { page, search, limit: 15 },
            })
            setOnts(res.data.data.data)
            setMeta(res.data.data.meta)
        } catch { /* silent */ }
        finally { setIsLoading(false) }
    }, [page, search])

    useEffect(() => {
        const t = setTimeout(fetchOnts, 300)
        return () => clearTimeout(t)
    }, [fetchOnts])

    const countByStatus = (status: CustomerOnt['provisionStatus']) => onts.filter(o => o.provisionStatus === status).length

    const handleSelectOnt = async (ont: CustomerOnt) => {
        setSelectedOnt(ont)
        setOntInfo(null)
        if (ont.provisionStatus === 'pending' || !ont.genieacsDeviceId) {
            setOntInfo({ online: false, error: 'Perangkat belum terhubung ke GenieACS' })
            return
        }
        setInfoLoading(true)
        try {
            const res = await api.get<{ success: boolean; data: OntInfo }>(`/onts/${ont.id}/info`)
            setOntInfo(res.data.data)
        } catch {
            setOntInfo({ online: false, error: 'Gagal mengambil info ONT' })
        } finally {
            setInfoLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            await api.delete(`/onts/${deleteTarget.id}`)
            setDeleteTarget(null)
            if (selectedOnt?.id === deleteTarget.id) { setSelectedOnt(null); setOntInfo(null) }
            fetchOnts()
        } catch { /* silent */ }
        finally { setIsDeleting(false) }
    }

    const handleModalClose = (refresh?: boolean) => {
        setModalOpen(false)
        setEditOnt(null)
        if (refresh) fetchOnts()
    }

    return (
        <Layout title="Manajemen ONT">
            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon stat-icon-purple">
                        <FontAwesomeIcon icon={['fas', 'router']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info"><p>Total ONT</p><h3>{meta.total}</h3></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-green">
                        <FontAwesomeIcon icon={['fas', 'circle-check']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info"><p>Tersambung</p><h3>{countByStatus('provisioned')}</h3></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.15)' }}>
                        <FontAwesomeIcon icon={['fas', 'clock']} className="fa-icon-stat" style={{ color: '#d97706' }} />
                    </div>
                    <div className="stat-info"><p>Menunggu</p><h3>{countByStatus('pending')}</h3></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>
                        <FontAwesomeIcon icon={['fas', 'circle-exclamation']} className="fa-icon-stat" style={{ color: '#dc2626' }} />
                    </div>
                    <div className="stat-info"><p>Gagal</p><h3>{countByStatus('failed')}</h3></div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedOnt ? '1fr 380px' : '1fr', gap: '20px', alignItems: 'start' }}>
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Daftar ONT Pelanggan</h2>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div className="search-box">
                                <span className="search-icon">
                                    <FontAwesomeIcon icon={['fas', 'magnifying-glass']} />
                                </span>
                                <input
                                    className="form-input"
                                    placeholder="Cari label, serial..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                                    style={{ paddingLeft: '38px' }}
                                />
                            </div>
                            <button className="btn btn-primary" onClick={() => { setEditOnt(null); setModalOpen(true) }}>
                                <FontAwesomeIcon icon={['fas', 'plus']} /> Daftarkan ONT
                            </button>
                        </div>
                    </div>

                    <div className="table-wrapper">
                        {isLoading ? (
                            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <div className="spinner" style={{ margin: '0 auto 12px', borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }} />
                                <p>Memuat data...</p>
                            </div>
                        ) : onts.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"><FontAwesomeIcon icon={['fas', 'router']} /></div>
                                <h3>Tidak ada ONT</h3>
                                <p>{search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada ONT terdaftar. Klik "Daftarkan ONT" untuk mulai.'}</p>
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Pelanggan</th>
                                        <th>Device / Serial</th>
                                        <th>Label</th>
                                        <th>Status</th>
                                        <th>Terdaftar</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {onts.map((ont, i) => (
                                        <tr
                                            key={ont.id}
                                            style={{ cursor: 'pointer', background: selectedOnt?.id === ont.id ? 'rgba(99,102,241,0.05)' : undefined }}
                                            onClick={() => handleSelectOnt(ont)}
                                        >
                                            <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{(page - 1) * 15 + i + 1}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: 8,
                                                        background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: 'white', fontSize: 13, flexShrink: 0,
                                                    }}>
                                                        <FontAwesomeIcon icon={['fas', 'user']} />
                                                    </div>
                                                    <div>
                                                        <span style={{ fontWeight: 500, display: 'block' }}>
                                                            {ont.customer?.fullName ?? `Customer #${ont.customerId}`}
                                                        </span>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                            {ont.customer?.pppoeUser ?? '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div>
                                                    <code style={{ fontSize: 12, background: 'var(--surface)', padding: '2px 6px', borderRadius: 4, color: 'var(--accent)', display: 'block', marginBottom: 2 }}>
                                                        {ont.serialNumber ?? '—'}
                                                    </code>
                                                    {ont.genieacsDeviceId && (
                                                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                            {ont.genieacsDeviceId.length > 30
                                                                ? ont.genieacsDeviceId.slice(0, 30) + '…'
                                                                : ont.genieacsDeviceId}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                {ont.ontLabel ?? <span style={{ fontStyle: 'italic' }}>—</span>}
                                            </td>
                                            <td><StatusBadge status={ont.provisionStatus} /></td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {new Date(ont.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div className="table-actions">
                                                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditOnt(ont); setModalOpen(true) }}>
                                                        <FontAwesomeIcon icon={['fas', 'pen-to-square']} /> Edit
                                                    </button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(ont)}>
                                                        <FontAwesomeIcon icon={['fas', 'trash']} /> Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {!isLoading && onts.length > 0 && (
                        <div className="pagination">
                            <span className="pagination-info">
                                {(page - 1) * 15 + 1}–{Math.min(page * 15, meta.total)} dari {meta.total} ONT
                                <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-muted)' }}>· Klik baris untuk detail</span>
                            </span>
                            <div className="pagination-controls">
                                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
                                {Array.from({ length: Math.min(meta.last_page, 5) }, (_, i) => (
                                    <button key={i + 1} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
                                ))}
                                <button className="page-btn" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>→</button>
                            </div>
                        </div>
                    )}
                </div>

                {selectedOnt && (
                    <OntDetailPanel
                        ont={selectedOnt}
                        info={ontInfo}
                        loading={infoLoading}
                        onClose={() => { setSelectedOnt(null); setOntInfo(null) }}
                        onRefresh={() => handleSelectOnt(selectedOnt)}
                        onInfoUpdate={(info) => setOntInfo(info)}
                    />
                )}
            </div>

            {modalOpen && <OntModal ont={editOnt} onClose={handleModalClose} />}

            {deleteTarget && (
                <div className="confirm-overlay">
                    <div className="confirm-box">
                        <div className="confirm-icon">
                            <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} style={{ color: 'var(--danger)' }} />
                        </div>
                        <h3>Hapus ONT</h3>
                        <p>Hapus <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.ontLabel ?? deleteTarget.serialNumber ?? 'ONT ini'}</strong>? Perangkat tidak akan terpengaruh.</p>
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
