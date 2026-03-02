import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/axios'
import type { Product, PaginatedResponse, ProductSyncResult } from '../../types'
import ProductModal from './ProductModal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [meta, setMeta] = useState({ total: 0, per_page: 15, current_page: 1, last_page: 1, first_page: 1 })
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editProduct, setEditProduct] = useState<Product | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Status sinkronisasi terakhir yang dikerjakan manual
    const [syncingId, setSyncingId] = useState<number | null>(null)

    const fetchProducts = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await api.get<PaginatedResponse<Product>>('/products', {
                params: { page, search, limit: 15 },
            })
            setProducts(res.data.data.data)
            setMeta(res.data.data.meta)
        } catch {
            // handle error
        } finally {
            setIsLoading(false)
        }
    }, [page, search])

    useEffect(() => {
        const debounce = setTimeout(async () => {
            await fetchProducts()
        }, 300)
        return () => clearTimeout(debounce)
    }, [fetchProducts])

    const handleDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            // Ini akan memanggil backend yang juga menghapus dari mikrotik
            await api.delete(`/products/${deleteTarget.id}`)
            setDeleteTarget(null)
            fetchProducts()
        } catch {
            // handle err
        } finally {
            setIsDeleting(false)
        }
    }

    const handleSyncManual = async (product: Product) => {
        setSyncingId(product.id)
        try {
            const res = await api.post<{ success: boolean; message: string; sync: ProductSyncResult }>(`/products/${product.id}/sync`)
            const syncResults = res.data.sync
            const successCount = Object.values(syncResults).filter(Boolean).length
            const total = Object.keys(syncResults).length
            alert(`Sinkronisasi "${product.name}" selesai.\nBerhasil: ${successCount} dari ${total} router.`)
        } catch (err: unknown) {
            alert('Gagal melakukan sinkronisasi.')
        } finally {
            setSyncingId(null)
        }
    }

    const handleModalClose = (refresh?: boolean) => {
        setModalOpen(false)
        setEditProduct(null)
        if (refresh) fetchProducts()
    }

    const openCreate = () => { setEditProduct(null); setModalOpen(true) }
    const openEdit = (product: Product) => { setEditProduct(product); setModalOpen(true) }

    return (
        <Layout title="Product & Bandwidth">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Daftar Produk & Profil Internet</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="search-box">
                            <span className="search-icon">
                                <FontAwesomeIcon icon={['fas', 'magnifying-glass']} />
                            </span>
                            <input
                                className="form-input"
                                placeholder="Cari nama produk..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                                style={{ paddingLeft: '38px' }}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={openCreate}>
                            <FontAwesomeIcon icon={['fas', 'plus']} /> Tambah Produk
                        </button>
                    </div>
                </div>

                <div className="table-wrapper">
                    {isLoading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px', borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }} />
                            <p>Memuat data...</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <FontAwesomeIcon icon={['fas', 'box']} />
                            </div>
                            <h3>Tidak ada produk</h3>
                            <p>{search ? `Tidak ditemukan "${search}"` : 'Belum ada produk internet yang dibuat'}</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Nama Produk / Profil</th>
                                    <th>Kecepatan (DL/UL)</th>
                                    <th>Harga</th>
                                    <th>Router Sync</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product, i) => (
                                    <tr key={product.id}>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                            {(page - 1) * 15 + i + 1}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div
                                                    style={{
                                                        width: 34, height: 34, borderRadius: '8px',
                                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 14, flexShrink: 0, color: 'white',
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon={['fas', 'box']} />
                                                </div>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span className="badge badge-verified" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#0ea5e9' }}>
                                                    <FontAwesomeIcon icon={['fas', 'arrow-down']} /> {product.download_speed} Mbps
                                                </span>
                                                <span className="badge badge-verified" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#0ea5e9' }}>
                                                    <FontAwesomeIcon icon={['fas', 'arrow-up']} /> {product.upload_speed} Mbps
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 500 }}>
                                                Rp {product.price.toLocaleString('id-ID')}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleSyncManual(product)}
                                                disabled={syncingId === product.id}
                                                title="Paksa sinkronisasi PPP Profile ke semua router"
                                            >
                                                {syncingId === product.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <FontAwesomeIcon icon={['fas', 'arrows-rotate']} />} Force Sync
                                            </button>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(product)}>
                                                    <FontAwesomeIcon icon={['fas', 'pen-to-square']} /> Edit
                                                </button>
                                                <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(product)}>
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

                {/* Pagination */}
                {!isLoading && products.length > 0 && (
                    <div className="pagination">
                        <span className="pagination-info">
                            Menampilkan {(page - 1) * 15 + 1}–{Math.min(page * 15, meta.total)} dari {meta.total} produk
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
                <ProductModal product={editProduct} onClose={handleModalClose} />
            )}

            {/* Confirm Delete */}
            {deleteTarget && (
                <div className="confirm-overlay">
                    <div className="confirm-box">
                        <div className="confirm-icon">
                            <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} style={{ color: 'var(--danger)' }} />
                        </div>
                        <h3>Hapus Produk &amp; Profil Mikrotik</h3>
                        <p>
                            Anda yakin ingin menghapus <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>?
                            Ini juga akan <strong>menghapus PPP Profile</strong> di semua router Mikrotik.
                        </p>
                        <div className="confirm-actions">
                            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Batal</button>
                            <button className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>
                                {isDeleting ? <><span className="spinner" /> Menghapus...</> : 'Ya, Hapus Semua'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    )
}
