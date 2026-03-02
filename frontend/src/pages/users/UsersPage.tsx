import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/axios'
import type { User, PaginatedResponse } from '../../types'
import UserModal from './UserModal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [meta, setMeta] = useState({ total: 0, per_page: 15, current_page: 1, last_page: 1, first_page: 1 })
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editUser, setEditUser] = useState<User | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchUsers = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await api.get<PaginatedResponse<User>>('/users', {
                params: { page, search, limit: 15 },
            })
            setUsers(res.data.data.data)
            setMeta(res.data.data.meta)
        } catch {
            // handle error
        } finally {
            setIsLoading(false)
        }
    }, [page, search])

    useEffect(() => {
        const debounce = setTimeout(fetchUsers, 300)
        return () => clearTimeout(debounce)
    }, [fetchUsers])

    const handleDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            await api.delete(`/users/${deleteTarget.id}`)
            setDeleteTarget(null)
            fetchUsers()
        } catch {
            // handle
        } finally {
            setIsDeleting(false)
        }
    }

    const handleModalClose = (refresh?: boolean) => {
        setModalOpen(false)
        setEditUser(null)
        if (refresh) fetchUsers()
    }

    const openCreate = () => { setEditUser(null); setModalOpen(true) }
    const openEdit = (user: User) => { setEditUser(user); setModalOpen(true) }

    const adminCount = users.filter(u => u.role === 1).length
    const customerCount = users.filter(u => u.role === 2).length

    return (
        <Layout title="User Management">
            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon stat-icon-purple">
                        <FontAwesomeIcon icon={['fas', 'users']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info">
                        <p>Total User</p>
                        <h3>{meta.total}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-amber">
                        <FontAwesomeIcon icon={['fas', 'crown']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info">
                        <p>Administrator</p>
                        <h3>{adminCount}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-green">
                        <FontAwesomeIcon icon={['fas', 'user-tie']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info">
                        <p>Customer</p>
                        <h3>{customerCount}</h3>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Daftar User</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="search-box">
                            <span className="search-icon">
                                <FontAwesomeIcon icon={['fas', 'magnifying-glass']} />
                            </span>
                            <input
                                className="form-input"
                                placeholder="Cari nama, email, HP..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                                style={{ paddingLeft: '38px' }}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={openCreate}>
                            <FontAwesomeIcon icon={['fas', 'plus']} /> Tambah User
                        </button>
                    </div>
                </div>

                <div className="table-wrapper">
                    {isLoading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px', borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }} />
                            <p>Memuat data...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <FontAwesomeIcon icon={['fas', 'user-slash']} />
                            </div>
                            <h3>Tidak ada user</h3>
                            <p>{search ? `Tidak ditemukan hasil untuk "${search}"` : 'Belum ada user yang terdaftar'}</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Nama</th>
                                    <th>Email</th>
                                    <th>No. HP</th>
                                    <th>HP Verified</th>
                                    <th>Role</th>
                                    <th>Bergabung</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user, i) => (
                                    <tr key={user.id}>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                            {(page - 1) * 15 + i + 1}
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
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user.name}</span>
                                            </div>
                                        </td>
                                        <td>{user.email}</td>
                                        <td>{user.phone ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                                        <td>
                                            <span className={`badge ${user.phone_verified_at ? 'badge-verified' : 'badge-unverified'}`}>
                                                {user.phone_verified_at ? <><FontAwesomeIcon icon={['fas', 'check']} /> Verified</> : <><FontAwesomeIcon icon={['fas', 'xmark']} /> Unverified</>}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${user.role === 1 ? 'badge-admin' : 'badge-customer'}`}>
                                                {user.role === 1 ? <><FontAwesomeIcon icon={['fas', 'crown']} /> Administrator</> : <><FontAwesomeIcon icon={['fas', 'user-tie']} /> Customer</>}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                            {new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(user)}>
                                                    <FontAwesomeIcon icon={['fas', 'pen-to-square']} /> Edit
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => setDeleteTarget(user)}
                                                >
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
                {!isLoading && users.length > 0 && (
                    <div className="pagination">
                        <span className="pagination-info">
                            Menampilkan {(page - 1) * 15 + 1}–{Math.min(page * 15, meta.total)} dari {meta.total} user
                        </span>
                        <div className="pagination-controls">
                            <button
                                className="page-btn"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >←</button>
                            {Array.from({ length: Math.min(meta.last_page, 5) }, (_, i) => {
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
                                disabled={page >= meta.last_page}
                                onClick={() => setPage(p => p + 1)}
                            >→</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <UserModal user={editUser} onClose={handleModalClose} />
            )}

            {/* Confirm Delete */}
            {deleteTarget && (
                <div className="confirm-overlay">
                    <div className="confirm-box">
                        <div className="confirm-icon">
                            <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} style={{ color: 'var(--danger)' }} />
                        </div>
                        <h3>Hapus User</h3>
                        <p>
                            Anda yakin ingin menghapus <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>?
                            Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="confirm-actions">
                            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                                Batal
                            </button>
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
