import { useState, useEffect } from 'react'
import type { Customer } from '../../types'
import api from '../../lib/axios'
import CustomerModal from './CustomerModal'
import ChangeProductModal from './ChangeProductModal'
import Layout from '../../components/Layout'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [activePppoes, setActivePppoes] = useState<Record<string, {
        online: boolean,
        ipAddress: string,
        uptime: string,
        callerId: string,
        isIsolated: boolean
    }>>({})
    const [loading, setLoading] = useState(true)

    // Pagination & Search
    const [page, setPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [search, setSearch] = useState('')

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

    const [isChangeProductOpen, setIsChangeProductOpen] = useState(false)
    const [changeCustomerInfo, setChangeCustomerInfo] = useState<{ id: number, productId: number | null }>({ id: 0, productId: null })

    const [deletingId, setDeletingId] = useState<number | null>(null)

    useEffect(() => {
        const delayDebounceTimeout = setTimeout(() => {
            fetchCustomers()
        }, 500)
        return () => clearTimeout(delayDebounceTimeout)
    }, [page, search])

    const fetchCustomers = async () => {
        setLoading(true)
        try {
            const [res, activeRes] = await Promise.allSettled([
                api.get<{ data: { data: Customer[], meta: { lastPage: number } } }>(`/customers?page=${page}&search=${search}`),
                api.get<{ data: Record<string, any> }>('/customers/active-pppoe')
            ])

            if (res.status === 'fulfilled') {
                setCustomers(res.value.data.data.data)
                setLastPage(res.value.data.data.meta.lastPage)
            }
            if (activeRes.status === 'fulfilled' && activeRes.value.data?.data) {
                setActivePppoes(activeRes.value.data.data)
            }
        } catch {
            // failed
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (customer: Customer) => {
        if (!window.confirm(`Yakin ingin menghapus pelanggan ${customer.fullName}? Akun login berserta langganan terkait dan PPPoE di Mikrotik akan dihapus! `)) return

        setDeletingId(customer.id)
        try {
            await api.delete(`/customers/${customer.id}`)
            fetchCustomers()
        } catch {
            alert('Gagal menghapus pelanggan.')
        } finally {
            setDeletingId(null)
        }
    }

    const openAddModal = () => {
        setSelectedCustomer(null)
        setIsModalOpen(true)
    }

    const openEditModal = (customer: Customer) => {
        setSelectedCustomer(customer)
        setIsModalOpen(true)
    }

    const openChangeProductDialog = (customer: Customer) => {
        const activeSub = customer.subscriptions?.find(s => s.status === 'active')
        setChangeCustomerInfo({ id: customer.id, productId: activeSub?.product_id || null })
        setIsChangeProductOpen(true)
    }

    const handleModalClose = (shouldRefresh?: boolean) => {
        setIsModalOpen(false)
        if (shouldRefresh) fetchCustomers()
    }

    const handleChangeProductClose = (shouldRefresh?: boolean) => {
        setIsChangeProductOpen(false)
        if (shouldRefresh) fetchCustomers()
    }

    return (
        <Layout title="Manajemen Pelanggan">
            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon stat-icon-blue">
                        <FontAwesomeIcon icon={['fas', 'users']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info">
                        <p>Total Pelanggan</p>
                        <h3>{lastPage > 0 ? customers.length + (page - 1) * 15 : 0}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-green">
                        <FontAwesomeIcon icon={['fas', 'box']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info">
                        <p>Pelanggan Berlangganan</p>
                        <h3>{customers.filter(c => c.subscriptions?.some(s => s.status === 'active')).length}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-amber">
                        <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info">
                        <p>Belum Aktif PPPoE</p>
                        <h3>{customers.filter(c => !c.pppoeUser).length}</h3>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Daftar Pelanggan</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="search-box">
                            <span className="search-icon">
                                <FontAwesomeIcon icon={['fas', 'magnifying-glass']} />
                            </span>
                            <input
                                className="form-input"
                                placeholder="Cari nama, telp, username PPPoE..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value)
                                    setPage(1)
                                }}
                                style={{ paddingLeft: '38px' }}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={openAddModal}>
                            <FontAwesomeIcon icon={['fas', 'user-plus']} /> Tambah Pelanggan
                        </button>
                    </div>
                </div>

                <div className="table-wrapper">
                    {loading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px', borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }} />
                            <p>Memuat data pelanggan...</p>
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <FontAwesomeIcon icon={['fas', 'user-group']} />
                            </div>
                            <h3>Tidak ada pelanggan</h3>
                            <p>{search ? `Tidak ditemukan hasil untuk "${search}"` : 'Belum ada pelanggan yang terdaftar'}</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Pelanggan</th>
                                    <th>Kontak</th>
                                    <th>Paket Aktif</th>
                                    <th>PPPoE User</th>
                                    <th style={{ textAlign: 'right' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((c, index) => {
                                    const activeSub = c.subscriptions?.find(s => s.status === 'active')

                                    return (
                                        <tr key={c.id}>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                                {(page - 1) * 15 + index + 1}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div
                                                        style={{
                                                            width: 34, height: 34, borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontWeight: 700, fontSize: 13, color: 'white', flexShrink: 0,
                                                        }}
                                                    >
                                                        {(c.fullName || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', display: 'block' }}>
                                                            {c.fullName || 'Unknown'}
                                                        </span>
                                                        {c.latitude && c.longitude ? (
                                                            <a
                                                                href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}
                                                            >
                                                                <FontAwesomeIcon icon={['fas', 'map-location-dot']} /> Buka di Maps
                                                            </a>
                                                        ) : (
                                                            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Lokasi tdk diatur</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{c.phone ? <span><FontAwesomeIcon icon={['fas', 'phone']} /> {c.phone}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                                            <td>
                                                {activeSub?.product ? (
                                                    <span className="badge badge-success" style={{ fontSize: '0.9rem' }}>
                                                        {activeSub.product.name}
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-danger">Belum Ditetapkan</span>
                                                )}
                                            </td>
                                            <td>
                                                {c.pppoeUser ? (
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                            <span
                                                                style={{
                                                                    width: 10,
                                                                    height: 10,
                                                                    borderRadius: '50%',
                                                                    backgroundColor: activePppoes[c.pppoeUser]
                                                                        ? (activePppoes[c.pppoeUser].isIsolated ? 'var(--danger)' : 'var(--success)')
                                                                        : 'var(--text-muted)',
                                                                    boxShadow: activePppoes[c.pppoeUser]
                                                                        ? `0 0 6px ${activePppoes[c.pppoeUser].isIsolated ? 'var(--danger)' : 'var(--success)'}`
                                                                        : 'none',
                                                                }}
                                                                title={activePppoes[c.pppoeUser]
                                                                    ? `${activePppoes[c.pppoeUser].isIsolated ? 'Terisolir' : 'Online'} (Uptime: ${activePppoes[c.pppoeUser].uptime})`
                                                                    : 'Offline'}
                                                            />
                                                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                                                                {c.pppoeUser}
                                                            </span>
                                                        </div>
                                                        {activePppoes[c.pppoeUser] && (
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column' }}>
                                                                <span>IP: {activePppoes[c.pppoeUser].ipAddress}</span>
                                                                <span>Up: {activePppoes[c.pppoeUser].uptime}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => openChangeProductDialog(c)}
                                                        title="Ganti Paket"
                                                    >
                                                        <FontAwesomeIcon icon={['fas', 'box']} /> Ubah Pkt
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => openEditModal(c)}
                                                    >
                                                        <FontAwesomeIcon icon={['fas', 'pen-to-square']} /> Edit
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleDelete(c)}
                                                        disabled={deletingId === c.id}
                                                    >
                                                        {deletingId === c.id ? <span className="spinner" /> : <FontAwesomeIcon icon={['fas', 'trash']} />}
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
                {!loading && lastPage > 0 && customers.length > 0 && (
                    <div className="pagination">
                        <span className="pagination-info">
                            Menampilkan halaman {page} dari {lastPage}
                        </span>
                        <div className="pagination-controls">
                            <button
                                className="page-btn"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >←</button>
                            {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => {
                                const p = i + 1
                                return (
                                    <button
                                        key={p}
                                        className={`page-btn ${page === p ? 'active' : ''}`}
                                        onClick={() => setPage(p)}
                                    >{p}</button>
                                )
                            })}
                            <button
                                className="page-btn"
                                disabled={page >= lastPage}
                                onClick={() => setPage(p => p + 1)}
                            >→</button>
                        </div>
                    </div>
                )}
            </div>

            <CustomerModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                customer={selectedCustomer}
            />

            <ChangeProductModal
                isOpen={isChangeProductOpen}
                onClose={handleChangeProductClose}
                customerId={changeCustomerInfo.id}
                currentProductId={changeCustomerInfo.productId}
            />
        </Layout>
    )
}
