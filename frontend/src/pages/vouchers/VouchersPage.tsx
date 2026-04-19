import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/axios'
import type { Voucher, Product, Device, PaginatedResponse } from '../../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import VoucherBatchModal from './VoucherBatchModal'

export default function VouchersPage() {
    const [vouchers, setVouchers] = useState<Voucher[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [devices, setDevices] = useState<Device[]>([])
    const [meta, setMeta] = useState({ total: 0, per_page: 15, current_page: 1, last_page: 1, first_page: 1 })
    
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [status, setStatus] = useState('')
    const [productId, setProductId] = useState('')
    const [deviceId, setDeviceId] = useState('')
    
    const [isLoading, setIsLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Voucher | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    
    const [stats, setStats] = useState({ total: 0, available: 0, used: 0 })

    const fetchVouchers = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await api.get<PaginatedResponse<Voucher>>('/vouchers', {
                params: { page, search, status, productId, deviceId, limit: 15 },
            })
            setVouchers(res.data.data.data)
            setMeta(res.data.data.meta)
        } catch (err) {
            console.error('Fetch vouchers error:', err)
        } finally {
            setIsLoading(false)
        }
    }, [page, search, status, productId, deviceId])

    const fetchOptionsAndStats = async () => {
        try {
            const [prodRes, devRes, statRes] = await Promise.all([
                api.get<PaginatedResponse<Product>>('/products', { params: { limit: 100 } }),
                api.get<PaginatedResponse<Device>>('/devices', { params: { limit: 100 } }),
                api.get<{ data: { total: number, available: number, used: number } }>('/vouchers/stats')
            ])
            setProducts(prodRes.data.data.data.filter(p => p.category === 'hotspot'))
            setDevices(devRes.data.data.data)
            setStats(statRes.data.data)
        } catch (err) {
            console.error('Fetch options error:', err)
        }
    }

    useEffect(() => {
        fetchOptionsAndStats()
    }, [])

    useEffect(() => {
        const debounce = setTimeout(async () => {
            await fetchVouchers()
        }, 300)
        return () => clearTimeout(debounce)
    }, [fetchVouchers])

    const handleDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            await api.delete(`/vouchers/${deleteTarget.id}`)
            setDeleteTarget(null)
            fetchVouchers()
            fetchOptionsAndStats() // update stats
        } catch (err) {
            alert('Gagal menghapus voucher.')
        } finally {
            setIsDeleting(false)
        }
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
    }

    return (
        <Layout title="Voucher Hotspot">
            {/* Stats Cards */}
            <div className="stats-grid mb-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div className="stat-label" style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Total Voucher</div>
                    <div className="stat-value" style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>{stats.total}</div>
                </div>
                <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div className="stat-label" style={{ color: '#10b981', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Tersedia</div>
                    <div className="stat-value" style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>{stats.available}</div>
                </div>
                <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div className="stat-label" style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Terpakai</div>
                    <div className="stat-value" style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>{stats.used}</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header" style={{ flexDirection: 'column', gap: '20px', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="card-title">Manajemen Voucher</h2>
                        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                            <FontAwesomeIcon icon={['fas', 'plus']} /> Buat Batch Voucher
                        </button>
                    </div>
                    
                    <div className="filters-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div className="search-box" style={{ flex: 1, minWidth: '200px' }}>
                            <span className="search-icon">
                                <FontAwesomeIcon icon={['fas', 'magnifying-glass']} />
                            </span>
                            <input
                                className="form-input"
                                placeholder="Cari kode voucher..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                                style={{ paddingLeft: '38px' }}
                            />
                        </div>
                        
                        <select 
                            className="form-input" 
                            style={{ flex: 1, minWidth: '150px' }} 
                            value={productId} 
                            onChange={(e) => { setProductId(e.target.value); setPage(1) }}
                        >
                            <option value="">Semua Paket</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>

                        <select 
                            className="form-input" 
                            style={{ flex: 1, minWidth: '150px' }} 
                            value={deviceId} 
                            onChange={(e) => { setDeviceId(e.target.value); setPage(1) }}
                        >
                            <option value="">Semua Router</option>
                            {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>

                        <select 
                            className="form-input" 
                            style={{ flex: 1, minWidth: '150px' }} 
                            value={status} 
                            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
                        >
                            <option value="">Semua Status</option>
                            <option value="available">Tersedia</option>
                            <option value="used">Terpakai</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>
                </div>

                <div className="table-wrapper">
                    {isLoading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px', borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }} />
                            <p>Memuat voucher...</p>
                        </div>
                    ) : vouchers.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <FontAwesomeIcon icon={['fas', 'ticket']} />
                            </div>
                            <h3>Voucher Tidak Ditemukan</h3>
                            <p>Belum ada voucher yang sesuai dengan kriteria filter Anda.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Kode Voucher</th>
                                    <th>Paket</th>
                                    <th>Router</th>
                                    <th>Harga</th>
                                    <th>Status</th>
                                    <th>Dibuat</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vouchers.map((voucher) => (
                                    <tr key={voucher.id}>
                                        <td>
                                            <code style={{ 
                                                fontSize: '1.1rem', fontWeight: 800, color: '#6366f1', 
                                                letterSpacing: '1px', background: 'rgba(99, 102, 241, 0.05)',
                                                padding: '4px 8px', borderRadius: '4px'
                                            }}>
                                                {voucher.code}
                                            </code>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{voucher.product?.name}</div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '13px', color: '#64748b' }}>
                                                <FontAwesomeIcon icon={['fas', 'server']} style={{ marginRight: '6px' }} />
                                                {voucher.device?.name}
                                            </span>
                                        </td>
                                        <td>{formatCurrency(voucher.price)}</td>
                                        <td>
                                            <span className={`badge ${
                                                voucher.status === 'used' ? 'badge-danger' : 
                                                voucher.status === 'expired' ? 'badge-secondary' : 'badge-success'
                                            }`}>
                                                {voucher.status === 'available' ? 'Tersedia' : 
                                                 voucher.status === 'used' ? 'Terpakai' : 'Expired'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '12px', color: '#64748b' }}>
                                            {new Date(voucher.createdAt).toLocaleDateString('id-ID', {
                                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeleteTarget(voucher)}>
                                                <FontAwesomeIcon icon={['fas', 'trash']} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {!isLoading && vouchers.length > 0 && (
                    <div className="pagination">
                        <span className="pagination-info">
                            Menampilkan {(page - 1) * 15 + 1}–{Math.min(page * 15, meta.total)} dari {meta.total} voucher
                        </span>
                        <div className="pagination-controls">
                            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
                            <button className={`page-btn active`}>{page}</button>
                            <button className="page-btn" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>→</button>
                        </div>
                    </div>
                )}
            </div>

            {modalOpen && (
                <VoucherBatchModal 
                    onClose={(refresh) => {
                        setModalOpen(false)
                        if (refresh) {
                            fetchVouchers()
                            fetchOptionsAndStats()
                        }
                    }} 
                />
            )}

            {deleteTarget && (
                <div className="confirm-overlay">
                    <div className="confirm-box">
                        <h3>Hapus Voucher</h3>
                        <p>Apakah Anda yakin ingin menghapus voucher <strong>{deleteTarget.code}</strong>? Voucher juga akan dihapus dari Mikrotik.</p>
                        <div className="confirm-actions">
                            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Batal</button>
                            <button className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>
                                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    )
}
