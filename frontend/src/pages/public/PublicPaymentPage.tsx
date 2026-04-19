import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../lib/axios'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Card, CardBody, Button, Spinner, CardTitle } from 'reactstrap'

interface PublicInvoice {
    id: number
    type: 'billing' | 'voucher'
    month: string
    amount: number
    previous_balance: number
    total_amount: number
    status: string
    due_date: string
    customer_name: string
    product_name?: string
    voucher_code?: string | null
    payment_token: string
}

interface TripayChannel {
    code: string
    name: string
    type: string
    fee_merchant: number
    fee_customer: number
    total_fee: number
    icon_url: string
    active: boolean
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

export default function PublicPaymentPage() {
    const { token } = useParams<{ token: string }>()
    const [invoice, setInvoice] = useState<PublicInvoice | null>(null)
    const [channels, setChannels] = useState<TripayChannel[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [paymentLoading, setPaymentLoading] = useState<string | null>(null)

    useEffect(() => {
        if (token) {
            fetchInvoice()
        }
    }, [token])

    useEffect(() => {
        if (invoice) {
            fetchChannels()
        }
    }, [invoice?.id])

    const fetchInvoice = async () => {
        try {
            const res = await api.get<{ data: PublicInvoice }>(`/public/invoices/${token}`)
            setInvoice(res.data.data)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal mengambil data tagihan')
        }
    }

    const fetchChannels = async () => {
        try {
            const res = await api.get<{ data: TripayChannel[] }>('/public/tripay/channels')
            let fetchedChannels = res.data.data.filter(c => c.active)

            // Filter for voucher type
            if (invoice?.type === 'voucher') {
                const allowedCodes = ['QRIS', 'QRIS2', 'DANA', 'SHOPEEPAY']
                fetchedChannels = fetchedChannels.filter(c => allowedCodes.includes(c.code))
            }

            setChannels(fetchedChannels)
        } catch (err) {
            console.error('Gagal mengambil channel pembayaran:', err)
        } finally {
            setLoading(false)
        }
    }

    const handlePay = async (method: string) => {
        setPaymentLoading(method)
        try {
            const res = await api.post<{ data: { checkout_url: string } }>(`/public/invoices/${token}/pay`, { method })
            window.location.href = res.data.data.checkout_url
        } catch (err: any) {
            alert(err.response?.data?.message || 'Gagal memproses pembayaran')
            setPaymentLoading(null)
        }
    }

    if (loading) {
        return (
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <div className="text-center">
                    <Spinner color="primary" />
                    <p className="mt-3 text-secondary">Memuat halaman pembayaran...</p>
                </div>
            </div>
        )
    }

    if (error || !invoice) {
        return (
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <Card style={{ maxWidth: '400px', width: '90%' }}>
                    <CardBody className="text-center py-5">
                        <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} className="text-danger mb-3" style={{ fontSize: '3rem' }} />
                        <CardTitle h4 className="text-primary mb-3">Terjadi Kesalahan</CardTitle>
                        <p className="text-secondary">{error || 'Tagihan tidak ditemukan'}</p>
                        <Button color="primary" onClick={() => window.location.reload()} className="mt-3">Coba Lagi</Button>
                    </CardBody>
                </Card>
            </div>
        )
    }

    if (invoice.status === 'paid') {
        return (
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <Card style={{ maxWidth: '450px', width: '90%', border: '1px solid var(--border)' }}>
                    <CardBody className="text-center py-5">
                        <div className="mb-4" style={{
                            width: '80px', height: '80px', background: 'var(--success-light)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', margin: '0 auto'
                        }}>
                            <FontAwesomeIcon icon={['fas', 'check']} className="text-success" style={{ fontSize: '2.5rem' }} />
                        </div>
                        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: 800 }}>
                            {invoice.type === 'voucher' ? 'Pembelian Berhasil!' : 'Tagihan Lunas'}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            {invoice.type === 'voucher' ? (
                                <>Pembayaran untuk paket <strong>{invoice.product_name}</strong> telah kami terima.</>
                            ) : (
                                <>Tagihan Anda untuk periode <strong>{invoice.month}</strong> sudah terbayar.</>
                            )}
                            <br />Terima kasih atas pembayaran Anda!
                        </p>

                        {invoice.type === 'voucher' && invoice.voucher_code && (
                            <div className="p-4 rounded mb-4 text-center" style={{ background: 'rgba(99, 102, 241, 0.05)', border: '2px dashed #6366f1' }}>
                                <small style={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 700, fontSize: '11px', letterSpacing: '1px' }}>Kode Voucher Anda</small>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#6366f1', letterSpacing: '4px', margin: '10px 0' }}>
                                    {invoice.voucher_code}
                                </div>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Simpan kode ini atau cek WhatsApp Anda.</p>
                            </div>
                        )}

                        <div className="p-3 rounded mb-4 text-start" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                            <div className="d-flex justify-content-between mb-2">
                                <span style={{ color: 'var(--text-muted)' }}>ID Transaksi:</span>
                                <strong style={{ color: 'var(--text-primary)' }}>#INV-{invoice.id}</strong>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span style={{ color: 'var(--text-muted)' }}>{invoice.type === 'voucher' ? 'WhatsApp:' : 'Pelanggan:'}</span>
                                <strong style={{ color: 'var(--text-primary)' }}>{invoice.customer_name}</strong>
                            </div>
                        </div>
                        <Button color="primary" onClick={() => window.location.href = invoice.type === 'voucher' ? '/buy-voucher' : '/'} style={{ padding: '0 2rem' }}>
                            {invoice.type === 'voucher' ? 'Beli Lagi' : 'Ke Dashboard'}
                        </Button>
                    </CardBody>
                </Card>
            </div>
        )
    }

    return (
        <div className="public-pay-page-wrapper" data-theme="light" style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <div className="public-pay-page" style={{
                minHeight: '100vh', padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>
                {/* Header / Logo */}
                <div className="text-center mb-2">
                    <div style={{
                        width: '64px', height: '64px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        borderRadius: '16px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)'
                    }}>
                        <FontAwesomeIcon icon={['fas', 'wifi']} style={{ color: 'white', fontSize: '2rem' }} />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.75px', color: '#1e293b', marginBottom: '0.25rem' }}>HOMENET</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.5px' }}>WiFi Murah Untuk Rumah Anda</p>
                </div>

                <Card style={{
                    maxWidth: '540px', width: '100%', border: 'none',
                    borderRadius: '24px', background: '#ffffff',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)'
                }}>
                    <CardBody className="p-4 p-md-5">
                        <div className="mb-4">
                            <h4 style={{ color: '#1e293b', fontWeight: 800, marginBottom: '0.25rem', fontSize: '1.25rem' }}>Detail Tagihan</h4>
                            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: 0 }}>Silakan periksa detail tagihan Anda sebelum membayar.</p>
                        </div>

                        <div className="p-4 mb-4" style={{ background: '#f1f5f9', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                            <div className="d-flex justify-content-between mb-4 pb-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <div>
                                    <small style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>
                                        {invoice.type === 'voucher' ? 'Pembeli' : 'Pelanggan'}
                                    </small>
                                    <strong style={{ fontSize: '1.125rem', color: '#0f172a' }}>{invoice.customer_name}</strong>
                                </div>
                                <div className="text-end">
                                    <small style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>Nomor Pesanan</small>
                                    <strong style={{ color: '#0f172a' }}>#INV-{invoice.id}</strong>
                                </div>
                            </div>

                            {invoice.type === 'voucher' ? (
                                <div className="mb-3 d-flex justify-content-between">
                                    <span style={{ color: '#475569', fontWeight: 500 }}>Paket WiFi</span>
                                    <strong style={{ color: '#0f172a' }}>{invoice.product_name}</strong>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-3 d-flex justify-content-between">
                                        <span style={{ color: '#475569', fontWeight: 500 }}>Bulan Layanan</span>
                                        <strong style={{ color: '#0f172a' }}>{invoice.month}</strong>
                                    </div>
                                    <div className="mb-3 d-flex justify-content-between">
                                        <span style={{ color: '#475569', fontWeight: 500 }}>Tagihan Pokok</span>
                                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(invoice.amount)}</span>
                                    </div>
                                    <div className="mb-4 d-flex justify-content-between">
                                        <span style={{ color: '#475569', fontWeight: 500 }}>Tunggakan</span>
                                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(invoice.previous_balance)}</span>
                                    </div>
                                </>
                            )}

                            <div className="pt-3 d-flex justify-content-between align-items-center" style={{ borderTop: '2px dashed #cbd5e1' }}>
                                <strong style={{ color: '#1e293b', fontSize: '1.1rem' }}>Total Bayar</strong>
                                <strong style={{ color: '#6366f1', fontSize: '1.5rem', fontWeight: 800 }}>{formatCurrency(invoice.total_amount)}</strong>
                            </div>
                        </div>

                        <div className="mb-4">
                            <h5 style={{ color: '#1e293b', fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem' }}>Metode Pembayaran</h5>
                            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Pilih metode yang paling nyaman bagi Anda.</p>
                        </div>

                        <div className="payment-channels-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {channels.map((channel) => (
                                <div
                                    key={channel.code}
                                    onClick={() => !paymentLoading && handlePay(channel.code)}
                                    style={{
                                        padding: '1.25rem 0.75rem', border: '2px solid #f1f5f9', borderRadius: '16px',
                                        cursor: paymentLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        background: '#ffffff', position: 'relative', overflow: 'hidden',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                                    }}
                                    className="channel-item"
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.borderColor = '#6366f1';
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(99, 102, 241, 0.1)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.borderColor = '#f1f5f9';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    {paymentLoading === channel.code && (
                                        <div style={{
                                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2
                                        }}>
                                            <Spinner size="sm" color="primary" />
                                        </div>
                                    )}
                                    <div className="mb-3" style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img src={channel.icon_url} alt={channel.name} style={{ maxHeight: '100%', maxWidth: '90px', objectFit: 'contain' }} />
                                    </div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>{channel.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{channel.type}</div>
                                    {channel.fee_customer > 0 && (
                                        <div style={{
                                            fontSize: '0.7rem', color: '#6366f1', marginTop: '10px',
                                            fontWeight: 600, background: 'rgba(99, 102, 241, 0.08)',
                                            padding: '2px 8px', borderRadius: '99px'
                                        }}>
                                            + {formatCurrency(channel.fee_customer)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 p-3" style={{
                            background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0',
                            display: 'flex', gap: '12px', alignItems: 'center'
                        }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <FontAwesomeIcon icon={['fas', 'lock']} style={{ color: '#6366f1', fontSize: '0.85rem' }} />
                            </div>
                            <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0, lineHeight: '1.4', fontWeight: 500 }}>
                                Pembayaran aman & instan. Tagihan akan otomatis ditandai sebagai lunas segera setelah transaksi berhasil.
                            </p>
                        </div>
                    </CardBody>
                </Card>

                <div className="mt-5 text-center">
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>
                        &copy; 2026 <strong>HOMENET</strong>. WiFi Murah Untuk Rumah Anda.
                    </p>
                </div>
            </div>

            <style>{`
                .public-pay-page-wrapper {
                    font-family: 'Inter', -apple-system, sans-serif;
                    -webkit-font-smoothing: antialiased;
                }
                .public-pay-page .channel-item:active {
                    transform: scale(0.97) !important;
                }
                @media (max-width: 480px) {
                    .payment-channels-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .public-pay-page {
                        padding: 1.5rem 0.75rem !important;
                    }
                    .public-pay-page .card-body {
                        padding: 1.5rem !important;
                    }
                }
            `}</style>
        </div>
    )
}
