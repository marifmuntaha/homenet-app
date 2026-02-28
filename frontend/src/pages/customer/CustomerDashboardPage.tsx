import { useState, useEffect } from 'react'
import api from '../../lib/axios'
import Layout from '../../components/Layout'
import type { Invoice } from '../../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface DashboardData {
    customer: {
        fullName: string
        phone: string
        address: string
    }
    subscription: {
        product: {
            name: string
            price: number
            download_speed: number
            upload_speed: number
        }
    } | null
    recentInvoices: Invoice[]
    summary: {
        unpaidCount: number
        unpaidAmount: number
    }
    connection: {
        online: boolean
        ipAddress: string
        uptime: string
        service: string
        callerId: string
        isIsolated: boolean
        profile: string
    } | null
}

export default function CustomerDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboard()
    }, [])

    const fetchDashboard = async () => {
        try {
            const res = await api.get<{ data: DashboardData }>('/customer/dashboard')
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

    const handlePayOnline = async (inv: Invoice) => {
        try {
            const res = await api.post<{ success: boolean, data: { token: string } }>(`/invoices/${inv.id}/pay`)
            if (res.data.success && (window as any).snap) {
                (window as any).snap.pay(res.data.data.token, {
                    onSuccess: (result: any) => {
                        console.log('Payment success:', result)
                        fetchDashboard()
                    },
                    onPending: (result: any) => {
                        console.log('Payment pending:', result)
                        fetchDashboard()
                    },
                    onError: (result: any) => {
                        console.error('Payment error:', result)
                    },
                    onClose: () => {
                        console.log('Payment popup closed')
                    }
                })
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Gagal memulai pembayaran online')
        }
    }

    if (loading) {
        return (
            <Layout title="Dashboard Saya">
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px', borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }} />
                    <p>Memuat data...</p>
                </div>
            </Layout>
        )
    }

    if (!data) {
        return (
            <Layout title="Dashboard Saya">
                <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                    <h3>Data tidak ditemukan</h3>
                    <p>Silakan hubungi admin untuk aktivasi profil pelanggan Anda.</p>
                </div>
            </Layout>
        )
    }

    const isOnline = !!data.connection?.online
    const isIsolated = !!data.connection?.isIsolated
    const latestUnpaid = data.recentInvoices.find(inv => inv.status === 'unpaid')

    return (
        <Layout title="Dashboard Saya">
            {isIsolated && (
                <div className="alert alert-error" style={{ marginBottom: '24px', borderLeft: '4px solid var(--danger)' }}>
                    <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} style={{ fontSize: '20px' }} />
                    <div>
                        <strong style={{ display: 'block' }}>Layanan Terisolasi</strong>
                        <p style={{ margin: 0, fontSize: '0.875rem' }}>Akses internet Anda saat ini terbatas. Silakan selesaikan pembayaran tagihan untuk mengaktifkan kembali layanan.</p>
                    </div>
                </div>
            )}

            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', alignItems: 'start' }}>
                {/* CARD 1: INFORMASI PERANGKAT */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="card-title">Informasi Perangkat</h2>
                        <span className={`badge ${isOnline ? (isIsolated ? 'badge-danger' : 'badge-success') : 'badge-secondary'}`}>
                            {isOnline ? (isIsolated ? 'Terisolir' : 'Online') : 'Offline'}
                        </span>
                    </div>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Status Koneksi</span>
                                <strong style={{ color: isOnline ? (isIsolated ? 'var(--danger)' : 'var(--success)') : 'var(--text-muted)' }}>
                                    {isOnline ? 'Terhubung' : 'Terputus'}
                                </strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>IP Address</span>
                                <strong style={{ fontFamily: 'monospace' }}>{data.connection?.ipAddress || '-'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Paket Aktif</span>
                                <strong>{data.subscription?.product?.name || 'Belum ada paket'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Kecepatan</span>
                                <strong>{data.subscription?.product?.download_speed} Mbps</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD 2: INFORMASI PEMBAYARAN */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Informasi Pembayaran</h2>
                    </div>
                    <div style={{ padding: '20px' }}>
                        <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.875rem' }}>Total Tagihan Belum Dibayar</p>
                            <h2 style={{ fontSize: '2rem', color: data.summary.unpaidAmount > 0 ? 'var(--danger)' : 'var(--success)', marginBottom: '4px' }}>
                                {formatCurrency(data.summary.unpaidAmount)}
                            </h2>
                            <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{data.summary.unpaidCount} Tagihan</p>
                        </div>

                        {latestUnpaid ? (
                            <div style={{ background: 'var(--bg-subtle)', borderRadius: '12px', padding: '16px', marginTop: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.875rem' }}>
                                    <span>Tagihan Bulan {latestUnpaid.month}</span>
                                    <strong>{formatCurrency(latestUnpaid.totalAmount)}</strong>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '12px', fontWeight: 600 }}
                                    onClick={() => handlePayOnline(latestUnpaid)}
                                >
                                    <FontAwesomeIcon icon={['fas', 'credit-card']} /> Bayar Sekarang (Online)
                                </button>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
                                    Metode: Virtual Account, E-Wallet, Kartu Kredit
                                </p>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px', background: 'var(--success-light)', borderRadius: '12px', color: 'var(--success)' }}>
                                <FontAwesomeIcon icon={['fas', 'circle-check']} style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }} />
                                <strong>Semua tagihan sudah lunas</strong>
                            </div>
                        )}
                    </div>
                </div>

                {/* CARD 3: RIWAYAT PEMBAYARAN */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Riwayat Pembayaran</h2>
                    </div>
                    <div className="table-wrapper">
                        <table style={{ fontSize: '0.875rem' }}>
                            <thead>
                                <tr>
                                    <th>Bulan</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                            Belum ada riwayat pembayaran
                                        </td>
                                    </tr>
                                ) : (
                                    data.recentInvoices.map((inv) => (
                                        <tr key={inv.id}>
                                            <td style={{ fontWeight: 500 }}>{inv.month}</td>
                                            <td style={{ fontWeight: 600 }}>{formatCurrency(inv.totalAmount)}</td>
                                            <td>
                                                <span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-danger'}`}>
                                                    {inv.status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {data.recentInvoices.length > 0 && (
                        <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Menampilkan 5 transaksi terakhir</span>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    )
}
