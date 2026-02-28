import { useState, useEffect } from 'react'
import api from '../../lib/axios'
import Layout from '../../components/Layout'
import MikrotikTrafficChart from '../../components/MikrotikTrafficChart'
import type { Invoice } from '../../types'
import { NavLink } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface DashboardStats {
    totalCustomers: number
    onlineCustomers: number
    unpaidInvoicesCount: number
    unpaidInvoicesAmount: number
}

interface DashboardData {
    stats: DashboardStats
    recentInvoices: Invoice[]
}

export default function AdminDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboard()
    }, [])

    const fetchDashboard = async () => {
        setLoading(true)
        try {
            const res = await api.get<{ data: DashboardData }>('/admin/dashboard')
            setData(res.data.data)
        } catch (err) {
            console.error('Gagal mengambil data dashboard:', err)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const formatMonth = (monthStr: string) => {
        if (!monthStr || !monthStr.includes('-')) return monthStr
        const [year, month] = monthStr.split('-')
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
        return `${months[parseInt(month) - 1]} ${year}`
    }

    if (loading) {
        return (
            <Layout title="Dashboard Admin">
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px', borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }} />
                    <p>Memuat statistik dashboard...</p>
                </div>
            </Layout>
        )
    }

    return (
        <Layout title="Dashboard Admin">
            <div className="stats-grid" style={{ marginBottom: '32px' }}>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-blue">
                        <FontAwesomeIcon icon={['fas', 'users']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info">
                        <p>Total Pelanggan</p>
                        <h3>{data?.stats.totalCustomers || 0}</h3>
                        <NavLink to="/customers" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>Kelola Pelanggan →</NavLink>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-green">
                        <FontAwesomeIcon icon={['fas', 'wifi']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info">
                        <p>Pelanggan Online</p>
                        <h3 style={{ color: 'var(--success)' }}>{data?.stats.onlineCustomers || 0}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aktif di Mikrotik</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-amber">
                        <FontAwesomeIcon icon={['fas', 'file-invoice-dollar']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info">
                        <p>Tagihan Tertunggak</p>
                        <h3 style={{ color: 'var(--warning)' }}>{data?.stats.unpaidInvoicesCount || 0}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatCurrency(data?.stats.unpaidInvoicesAmount || 0)}</span>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Tagihan Terbaru</h2>
                    <NavLink to="/invoices" className="btn btn-ghost btn-sm">Semua Tagihan →</NavLink>
                </div>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Pelanggan</th>
                                <th>Bulan</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Dibuat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.recentInvoices.map(invoice => (
                                <tr key={invoice.id}>
                                    <td>
                                        <span style={{ fontWeight: 500 }}>{invoice.customer?.fullName}</span>
                                    </td>
                                    <td>{formatMonth(invoice.month)}</td>
                                    <td>{formatCurrency(Number(invoice.totalAmount))}</td>
                                    <td>
                                        <span className={`badge badge-${invoice.status === 'paid' ? 'success' : 'danger'}`}>
                                            {invoice.status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        {new Date(invoice.createdAt).toLocaleDateString('id-ID')}
                                    </td>
                                </tr>
                            ))}
                            {(!data?.recentInvoices || data.recentInvoices.length === 0) && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                        Belum ada data tagihan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <MikrotikTrafficChart />
        </Layout>
    )
}
