import { useState, useEffect } from 'react'
import api from '../../lib/axios'
import Layout from '../../components/Layout'
import type { Invoice } from '../../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface PaymentChannel {
    code: string
    name: string
    active: boolean
    icon_url: string
    total_fee: { flat: number }
}

interface PaymentInstruction {
    title: string
    steps: string[]
}

interface TripayPaymentData {
    reference: string
    merchant_ref: string
    payment_method: string
    payment_name: string
    customer_name: string
    customer_email: string
    customer_phone: string
    callback_url: string
    return_url: string
    amount: number
    fee_merchant: number
    fee_customer: number
    total_fee: number
    amount_received: number
    pay_code: string
    pay_url: string
    checkout_url: string
    status: string
    expired_time: number
    order_items: any[]
    instructions: PaymentInstruction[]
    qr_url?: string
}

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
    const [channels, setChannels] = useState<PaymentChannel[]>([])
    const [showPayModal, setShowPayModal] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
    const [fetchingChannels, setFetchingChannels] = useState(false)
    const [paymentDetail, setPaymentDetail] = useState<TripayPaymentData | null>(null)
    const [activeInstructionTab, setActiveInstructionTab] = useState(0)

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

    const handlePayOnline = async (methodCode: string) => {
        if (!selectedInvoice) return
        try {
            const res = await api.post<{ success: boolean, data: TripayPaymentData }>(
                `/invoices/${selectedInvoice.id}/pay-tripay`, 
                { method: methodCode }
            )
            if (res.data.success) {
                setPaymentDetail(res.data.data)
                setActiveInstructionTab(0)
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Gagal memulai pembayaran online')
        }
    }

    const fetchChannels = async () => {
        setFetchingChannels(true)
        try {
            const res = await api.get<{ success: boolean, data: PaymentChannel[] }>('/tripay/channels')
            setChannels(res.data.data.filter(c => c.active))
            setShowPayModal(true)
        } catch (err) {
            console.error('Gagal mengambil channel pembayaran:', err)
            alert('Gagal mengambil metode pembayaran')
        } finally {
            setFetchingChannels(false)
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
                                    disabled={fetchingChannels}
                                    style={{ width: '100%', padding: '12px', fontWeight: 600 }}
                                    onClick={() => {
                                        setSelectedInvoice(latestUnpaid)
                                        fetchChannels()
                                    }}
                                >
                                    <FontAwesomeIcon icon={['fas', fetchingChannels ? 'spinner' : 'credit-card']} spin={fetchingChannels} /> {fetchingChannels ? 'Memuat...' : 'Bayar Sekarang (Online)'}
                                </button>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
                                    Metode: Virtual Account, E-Wallet, QRIS
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

            {/* PAYMENT METHOD MODAL */}
            {showPayModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000, padding: '20px'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>{paymentDetail ? 'Detail Pembayaran' : 'Pilih Metode Pembayaran'}</h3>
                            <button className="btn btn-icon" onClick={() => {
                                setShowPayModal(false)
                                setPaymentDetail(null)
                            }}>
                                <FontAwesomeIcon icon={['fas', 'times']} />
                            </button>
                        </div>
                        <div style={{ padding: '16px', overflowY: 'auto' }}>
                            {!paymentDetail ? (
                                <>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                        Silakan pilih salah satu metode pembayaran di bawah ini.
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {channels.map((channel) => (
                                            <button
                                                key={channel.code}
                                                onClick={() => handlePayOnline(channel.code)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '16px', padding: '12px',
                                                    border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-card)',
                                                    width: '100%', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                                                    color: 'var(--text)'
                                                }}
                                                className="channel-item"
                                            >
                                                <img src={channel.icon_url} alt={channel.name} style={{ width: '40px', height: 'auto', objectFit: 'contain' }} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600 }}>{channel.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        Biaya: + {formatCurrency(channel.total_fee.flat)}
                                                    </div>
                                                </div>
                                                <FontAwesomeIcon icon={['fas', 'chevron-right']} style={{ color: 'var(--border)' }} />
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ textAlign: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Pembayaran</div>
                                        <h2 style={{ fontSize: '1.75rem', color: 'var(--accent)', margin: 0 }}>{formatCurrency(paymentDetail.amount)}</h2>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '4px' }}>
                                            Bayar sebelum: {new Date(paymentDetail.expired_time * 1000).toLocaleString('id-ID')}
                                        </div>
                                    </div>

                                    <div style={{ background: 'var(--bg-subtle)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                                        {paymentDetail.qr_url ? (
                                            <div style={{ textAlign: 'center' }}>
                                                <img src={paymentDetail.qr_url} alt="QR Code" style={{ width: '200px', height: '200px', margin: '0 auto 12px' }} />
                                                <p style={{ fontWeight: 600, margin: 0 }}>Scan QRIS untuk membayar</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Nomor Virtual Account ({paymentDetail.payment_name})</div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                                    <h3 style={{ fontSize: '1.5rem', letterSpacing: '2px', color: 'var(--text)', margin: 0 }}>{paymentDetail.pay_code}</h3>
                                                    <button 
                                                        className="btn btn-icon btn-sm" 
                                                        title="Copy"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(paymentDetail.pay_code)
                                                            alert('Nomor VA berhasil disalin')
                                                        }}
                                                    >
                                                        <FontAwesomeIcon icon={['fas', 'copy']} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div>
                                        <h4 style={{ marginBottom: '12px', textAlign: 'center' }}>Instruksi Pembayaran</h4>
                                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border)', justifyContent: 'center' }}>
                                            {paymentDetail.instructions.map((ins, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setActiveInstructionTab(idx)}
                                                    style={{
                                                        padding: '8px 16px', borderRadius: '20px', fontSize: '0.8125rem',
                                                        whiteSpace: 'nowrap', cursor: 'pointer', border: 'none',
                                                        background: activeInstructionTab === idx ? 'var(--accent)' : 'var(--bg-subtle)',
                                                        color: activeInstructionTab === idx ? '#fff' : 'var(--text)',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {ins.title}
                                                </button>
                                            ))}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
                                            <ol style={{ paddingLeft: '20px', margin: 0 }}>
                                                {paymentDetail.instructions[activeInstructionTab].steps.map((step, sIdx) => (
                                                    <li key={sIdx} dangerouslySetInnerHTML={{ __html: step }}></li>
                                                ))}
                                            </ol>
                                        </div>
                                    </div>

                                    <button 
                                        className="btn btn-primary" 
                                        style={{ marginTop: '12px', width: '100%' }}
                                        onClick={() => {
                                            setShowPayModal(false)
                                            setPaymentDetail(null)
                                        }}
                                    >
                                        Selesai
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    )
}
