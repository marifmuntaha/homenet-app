import { useState, useEffect } from 'react'
import api from '../../lib/axios'
import Layout from '../../components/Layout'
import MikrotikTrafficChart from '../../components/MikrotikTrafficChart'
import IncomeTrendChart from '../../components/IncomeTrendChart'
import type { Invoice } from '../../types'
import { NavLink } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faWifi, faUsersSlash, faFileInvoice, faMoneyBillWave, faCalendarAlt } from '@fortawesome/free-solid-svg-icons'
import Select from 'react-select'

interface DashboardStats {
    totalCustomers: number
    onlineCustomers: number
    unpaidInvoicesCount: number
    unpaidInvoicesAmount: number
    monthlyIncome: number
    yearlyIncome: number
    filteredInvoicesAmount: number
    filteredPaidAmount: number
    filteredPeriod: string
}

interface DashboardData {
    stats: DashboardStats
    incomeHistory: { month: string, cash: number, online: number }[]
    recentInvoices: Invoice[]
}

export default function AdminDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    // Filter states
    const currentYear = new Date().getFullYear()
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')
    const [selectedMonth, setSelectedMonth] = useState({ value: currentMonth, label: getMonthLabel(currentMonth) })
    const [selectedYear, setSelectedYear] = useState({ value: currentYear.toString(), label: currentYear.toString() })

    useEffect(() => {
        fetchDashboard()
    }, [selectedMonth, selectedYear])

    const fetchDashboard = async () => {
        setLoading(true)
        try {
            const res = await api.get<{ data: DashboardData }>('/admin/dashboard', {
                params: {
                    month: selectedMonth.value,
                    year: selectedYear.value
                }
            })
            setData(res.data.data)
        } catch (err) {
            console.error('Gagal mengambil data dashboard:', err)
        } finally {
            setLoading(false)
        }
    }

    function getMonthLabel(m: string) {
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        return months[parseInt(m) - 1]
    }

    const monthOptions = [
        { value: '01', label: 'Januari' },
        { value: '02', label: 'Februari' },
        { value: '03', label: 'Maret' },
        { value: '04', label: 'April' },
        { value: '05', label: 'Mei' },
        { value: '06', label: 'Juni' },
        { value: '07', label: 'Juli' },
        { value: '08', label: 'Agustus' },
        { value: '09', label: 'September' },
        { value: '10', label: 'Oktober' },
        { value: '11', label: 'November' },
        { value: '12', label: 'Desember' },
    ]

    const yearOptions = Array.from({ length: 5 }, (_, i) => ({
        value: (currentYear - i).toString(),
        label: (currentYear - i).toString()
    }))

    const customSelectStyles = {
        control: (base: any) => ({
            ...base,
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            minHeight: '40px',
            borderRadius: 'var(--radius-sm)'
        }),
        menu: (base: any) => ({
            ...base,
            background: 'var(--bg-card)',
            borderColor: 'var(--border)'
        }),
        option: (base: any, state: any) => ({
            ...base,
            background: state.isSelected ? 'var(--accent)' : state.isFocused ? 'var(--bg-hover)' : 'transparent',
            color: 'var(--text-primary)',
            cursor: 'pointer'
        }),
        singleValue: (base: any) => ({
            ...base,
            color: 'var(--text-primary)'
        })
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

    return (
        <Layout title="Dashboard Admin">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Overview</h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '160px' }}>
                        <Select
                            options={monthOptions}
                            value={selectedMonth}
                            onChange={(newValue: any) => setSelectedMonth(newValue)}
                            styles={customSelectStyles}
                            isSearchable={false}
                        />
                    </div>
                    <div style={{ width: '120px' }}>
                        <Select
                            options={yearOptions}
                            value={selectedYear}
                            onChange={(newValue: any) => setSelectedYear(newValue)}
                            styles={customSelectStyles}
                            isSearchable={false}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="stats-grid" style={{ marginBottom: '32px' }}>
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={`skel-stat-1-${idx}`} className="stat-card" style={{ gap: '16px' }}>
                            <div className="skeleton skeleton-stat-icon" />
                            <div style={{ flex: 1 }}>
                                <div className="skeleton skeleton-text" style={{ width: '40%' }} />
                                <div className="skeleton skeleton-title" style={{ width: '60%', margin: '4px 0 8px' }} />
                                <div className="skeleton skeleton-text" style={{ width: '30%', height: '10px' }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="stats-grid" style={{ marginBottom: '32px' }}>
                    <div className="stat-card">
                        <div className="stat-icon stat-icon-blue">
                            <FontAwesomeIcon icon={faUsers} className="fa-icon-stat" />
                        </div>
                        <div className="stat-info">
                            <p>Total Pelanggan</p>
                            <h3>{data?.stats.totalCustomers || 0}</h3>
                            <NavLink to="/customers" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>Kelola Pelanggan →</NavLink>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon stat-icon-green">
                            <FontAwesomeIcon icon={faWifi} className="fa-icon-stat" />
                        </div>
                        <div className="stat-info">
                            <p>Pelanggan Online</p>
                            <h3 style={{ color: 'var(--success)' }}>{data?.stats.onlineCustomers || 0}</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aktif di Mikrotik</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon stat-icon-amber">
                            <FontAwesomeIcon icon={faUsersSlash} className="fa-icon-stat" />
                        </div>
                        <div className="stat-info">
                            <p>Pelanggan Offline</p>
                            <h3 style={{ color: 'var(--warning)' }}>{(data?.stats.totalCustomers || 0) - (data?.stats.onlineCustomers || 0)}</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Non Aktif di Mikrotik</span>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="stats-grid" style={{ marginBottom: '32px' }}>
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={`skel-stat-2-${idx}`} className="stat-card" style={{ gap: '16px' }}>
                            <div className="skeleton skeleton-stat-icon" />
                            <div style={{ flex: 1 }}>
                                <div className="skeleton skeleton-text" style={{ width: '40%' }} />
                                <div className="skeleton skeleton-title" style={{ width: '60%', margin: '4px 0 8px' }} />
                                <div className="skeleton skeleton-text" style={{ width: '30%', height: '10px' }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="stats-grid" style={{ marginBottom: '32px' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent)' }}>
                            <FontAwesomeIcon icon={faFileInvoice} className="fa-icon-stat" />
                        </div>
                        <div className="stat-info">
                            <p>Jumlah Tagihan ({selectedMonth.label})</p>
                            <h3>{formatCurrency(data?.stats.filteredInvoicesAmount || 0)}</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bulan {selectedMonth.label} {selectedYear.value}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                            <FontAwesomeIcon icon={faMoneyBillWave} className="fa-icon-stat" />
                        </div>
                        <div className="stat-info">
                            <p>Jumlah Pembayaran ({selectedMonth.label})</p>
                            <h3 style={{ color: 'var(--success)' }}>{formatCurrency(data?.stats.filteredPaidAmount || 0)}</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lunas untuk bulan ini</span>
                        </div>
                    </div>
                    <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--bg-card), var(--bg-hover))' }}>
                        <div className="stat-icon" style={{ background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>
                            <FontAwesomeIcon icon={faCalendarAlt} className="fa-icon-stat" />
                        </div>
                        <div className="stat-info">
                            <p>Estimasi Pendapatan Lunas</p>
                            <h3>{formatCurrency(data?.stats.monthlyIncome || 0)}</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total bayar di {selectedMonth.label} {selectedYear.value}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="row align-items-stretch" style={{ marginBottom: '32px' }}>
                <div className="col-md-6 mb-4 mb-md-0">
                    <IncomeTrendChart data={data?.incomeHistory || []} />
                </div>
                <div className="col-md-6">
                    <MikrotikTrafficChart />
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
                            {loading ? (
                                Array.from({ length: 5 }).map((_, idx) => (
                                    <tr key={`skel-row-${idx}`}>
                                        <td><div className="skeleton skeleton-text" style={{ width: '80%', margin: 0 }} /></td>
                                        <td><div className="skeleton skeleton-text" style={{ width: '60%', margin: 0 }} /></td>
                                        <td><div className="skeleton skeleton-text" style={{ width: '70%', margin: 0 }} /></td>
                                        <td><div className="skeleton skeleton-text" style={{ width: '50%', margin: 0, borderRadius: '20px' }} /></td>
                                        <td><div className="skeleton skeleton-text" style={{ width: '100%', margin: 0 }} /></td>
                                    </tr>
                                ))
                            ) : data?.recentInvoices.map(invoice => (
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
                            {!loading && (!data?.recentInvoices || data.recentInvoices.length === 0) && (
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
        </Layout>
    )
}
