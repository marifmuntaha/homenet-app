import { useState, useEffect } from 'react'
import api from '../../lib/axios'
import OdpModal, { type Odp } from './OdpModal'
import Layout from '../../components/Layout'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function OdpsPage() {
    const [odps, setOdps] = useState<Odp[]>([])
    const [loading, setLoading] = useState(true)

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedOdp, setSelectedOdp] = useState<Odp | null>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    useEffect(() => {
        fetchOdps()
    }, [])

    const fetchOdps = async () => {
        setLoading(true)
        try {
            const res = await api.get<{ data: Odp[] }>('/odps')
            setOdps(res.data.data)
        } catch {
            // failed
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (odp: Odp) => {
        if (!window.confirm(`Yakin ingin menghapus ODP ${odp.name}?`)) return

        setDeletingId(odp.id)
        try {
            await api.delete(`/odps/${odp.id}`)
            fetchOdps()
        } catch (err: any) {
            alert(err.response?.data?.message || 'Gagal menghapus ODP.')
        } finally {
            setDeletingId(null)
        }
    }

    const openAddModal = () => {
        setSelectedOdp(null)
        setIsModalOpen(true)
    }

    const openEditModal = (odp: Odp) => {
        setSelectedOdp(odp)
        setIsModalOpen(true)
    }

    const handleModalClose = (shouldRefresh?: boolean) => {
        setIsModalOpen(false)
        if (shouldRefresh) fetchOdps()
    }

    return (
        <Layout title="Master Data ODP">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Daftar ODP (Optical Distribution Point)</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button className="btn btn-primary" onClick={openAddModal}>
                            <FontAwesomeIcon icon={['fas', 'plus']} /> Tambah ODP
                        </button>
                    </div>
                </div>

                <div className="table-wrapper">
                    {loading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px', borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }} />
                            <p>Memuat data ODP...</p>
                        </div>
                    ) : odps.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <FontAwesomeIcon icon={['fas', 'sitemap']} />
                            </div>
                            <h3>Tidak ada ODP</h3>
                            <p>Belum ada ODP yang terdaftar. Silakan tambah data baru.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Parent / Root ODP</th>
                                    <th>Nama ODP</th>
                                    <th>Deskripsi</th>
                                    <th>Lokasi (Maps)</th>
                                    <th style={{ textAlign: 'right' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {odps.map((o, index) => (
                                    <tr key={o.id}>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{index + 1}</td>
                                        <td>
                                            {o.parent ? (
                                                <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                                    <FontAwesomeIcon icon={['fas', 'level-up-alt']} style={{ transform: 'rotate(90deg)', marginRight: 4 }} />
                                                    {o.parent.name}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>[Root]</span>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.name}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{o.description || '—'}</td>
                                        <td>
                                            {o.latitude && o.longitude ? (
                                                <a
                                                    href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}
                                                >
                                                    <FontAwesomeIcon icon={['fas', 'map-location-dot']} /> Buka di Maps
                                                </a>
                                            ) : (
                                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Tdk diatur</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => openEditModal(o)}
                                                >
                                                    <FontAwesomeIcon icon={['fas', 'pen-to-square']} /> Edit
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleDelete(o)}
                                                    disabled={deletingId === o.id}
                                                >
                                                    {deletingId === o.id ? <span className="spinner" /> : <><FontAwesomeIcon icon={['fas', 'trash']} /> Hapus</>}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <OdpModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                odp={selectedOdp}
                allOdps={odps}
            />
        </Layout>
    )
}
