import { useState, useEffect } from 'react'
import type { Invoice, PaginatedResponse } from '../../types'
import api from '../../lib/axios'
import Layout from '../../components/Layout'

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)

    // Pagination & Filters
    const [page, setPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [statusFilter, setStatusFilter] = useState('')
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
    const [monthFilter, setMonthFilter] = useState('')

    useEffect(() => {
        fetchInvoices()
    }, [page, statusFilter, yearFilter, monthFilter])

    const fetchInvoices = async () => {
        setLoading(true)
        try {
            const res = await api.get<PaginatedResponse<Invoice>>(`/invoices?page=${page}&status=${statusFilter}&year=${yearFilter}&month=${monthFilter}`)
            setInvoices(res.data.data?.data || [])
            // Handle both camelCase and snake_case for meta keys
            const meta = res.data.data?.meta as any
            setLastPage(meta?.lastPage || meta?.last_page || 1)
        } catch (err) {
            console.error('Gagal mengambil tagihan:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateMonthly = async () => {
        const month = prompt('Masukkan bulan (Format YYYY-MM, contoh: 2024-03). Kosongkan untuk bulan sekarang.')
        if (month === null) return

        setGenerating(true)
        try {
            const res = await api.post<{ message: string }>('/invoices', { month: month || undefined })
            alert(res.data.message)
            setPage(1)
            fetchInvoices()
        } catch (err: any) {
            alert(err.response?.data?.message || 'Gagal generate tagihan')
        } finally {
            setGenerating(false)
        }
    }

    const handleMarkAsPaid = async (id: number) => {
        if (!window.confirm('Tandai tagihan ini sebagai SUDAH DIBAYAR?')) return

        try {
            await api.put(`/invoices/${id}`, { status: 'paid' })
            fetchInvoices()
        } catch {
            alert('Gagal memperbarui status tagihan')
        }
    }

    const handleEditDiscount = async (inv: Invoice) => {
        const newDiscount = prompt(`Masukkan nominal diskon untuk ${inv.customer?.fullName}:`, inv.discount.toString())
        if (newDiscount === null) return

        const discountNum = Number(newDiscount)
        if (isNaN(discountNum)) {
            alert('Nominal diskon tidak valid')
            return
        }

        try {
            await api.put(`/invoices/${inv.id}`, { discount: discountNum })
            fetchInvoices()
        } catch {
            alert('Gagal memperbarui diskon')
        }
    }

    const handleSendWhatsApp = (inv: Invoice) => {
        if (!inv.customer?.phone) {
            alert('Nomor telepon pelanggan tidak tersedia')
            return
        }

        const phone = inv.customer.phone.replace(/[^0-9]/g, '')
        const formattedPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone

        const message = `Halo Bapak/Ibu *${inv.customer.fullName}*,

Berikut adalah informasi tagihan internet Anda untuk bulan *${inv.month}*:
- Total Tagihan: *${formatCurrency(inv.totalAmount)}*
- Jatuh Tempo: *${new Date(inv.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}*
- Status: *${inv.status === 'paid' ? 'LUNAS' : 'BELUM DIBAYAR'}*

Silakan melakukan pembayaran sebelum tanggal jatuh tempo. Terima kasih.
_Homenet Team_`

        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
        window.open(url, '_blank')
    }

    const handlePayOnline = async (inv: Invoice) => {
        try {
            const res = await api.post<{ success: boolean, data: { token: string } }>(`/invoices/${inv.id}/pay`)
            if (res.data.success && (window as any).snap) {
                (window as any).snap.pay(res.data.data.token, {
                    onSuccess: (result: any) => {
                        console.log('Payment success:', result)
                        fetchInvoices()
                    },
                    onPending: (result: any) => {
                        console.log('Payment pending:', result)
                        fetchInvoices()
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

    const handlePrint = (inv: Invoice) => {
        const printWindow = window.open('', '_blank')
        if (!printWindow) return

        const content = `
            <html>
            <head>
                <title>Invoice - ${inv.customer?.fullName}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; color: #333; }
                    .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; }
                    .header h1 { margin: 0; color: #6366f1; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                    .info-box h3 { border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 12px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { text-align: left; background: #f8f9fa; padding: 12px; border-bottom: 2px solid #ddd; }
                    td { padding: 12px; border-bottom: 1px solid #eee; }
                    .total-row td { font-weight: bold; font-size: 1.1em; border-top: 2px solid #333; }
                    .footer { margin-top: 60px; text-align: center; color: #666; font-size: 0.9em; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>HOMENET</h1>
                        <p>Internet Service Provider</p>
                    </div>
                    <div style="text-align: right">
                        <h2>INVOICE</h2>
                        <p>#INV-${inv.id}-${inv.month.replace('-', '')}</p>
                    </div>
                </div>

                <div class="info-grid">
                    <div class="info-box">
                        <h3>Tagihan Untuk:</h3>
                        <p><strong>${inv.customer?.fullName}</strong></p>
                        <p>${inv.customer?.phone}</p>
                        <p>${inv.customer?.address || ''}</p>
                    </div>
                    <div class="info-box" style="text-align: right">
                        <h3>Detail Tagihan:</h3>
                        <p>Bulan: ${inv.month}</p>
                        <p>Jatuh Tempo: ${new Date(inv.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p>Status: <strong>${inv.status.toUpperCase()}</strong></p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Deskripsi</th>
                            <th style="text-align: right">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Layanan Internet - Bulan ${inv.month}</td>
                            <td style="text-align: right">${formatCurrency(inv.amount)}</td>
                        </tr>
                        <tr>
                            <td>Tunggakan Sebelumnya</td>
                            <td style="text-align: right">${formatCurrency(inv.previousBalance)}</td>
                        </tr>
                        <tr>
                            <td>Diskon</td>
                            <td style="text-align: right; color: green">-${formatCurrency(inv.discount)}</td>
                        </tr>
                        <tr class="total-row">
                            <td>TOTAL PEMBAYARAN</td>
                            <td style="text-align: right">${formatCurrency(inv.totalAmount)}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="footer">
                    <p>Terima kasih atas kepercayaan Anda menggunakan layanan kami.</p>
                    <p>Homenet Management</p>
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `
        printWindow.document.write(content)
        printWindow.document.close()
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return <span className="badge badge-success">Sudah Bayar</span>
            case 'unpaid':
                return <span className="badge badge-danger">Belum Bayar</span>
            case 'cancelled':
                return <span className="badge badge-secondary">Dibatalkan</span>
            default:
                return <span className="badge">{status}</span>
        }
    }

    // Summary Calculations (current view)
    const unpaidTotal = invoices.filter(i => i.status === 'unpaid').reduce((acc, curr) => acc + Number(curr.totalAmount), 0)
    const paidTotal = invoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + Number(curr.totalAmount), 0)
    const discountTotal = invoices.reduce((acc, curr) => acc + Number(curr.discount), 0)

    return (
        <Layout title="Manajemen Tagihan">
            {/* Summary Stats */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-amber">⏳</div>
                    <div className="stat-info">
                        <p>Total Belum Bayar</p>
                        <h3>{formatCurrency(unpaidTotal)}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Halaman ini</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-green">✅</div>
                    <div className="stat-info">
                        <p>Total Sudah Bayar</p>
                        <h3>{formatCurrency(paidTotal)}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Halaman ini</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-blue">💸</div>
                    <div className="stat-info">
                        <p>Total Diskon</p>
                        <h3>{formatCurrency(discountTotal)}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Halaman ini</span>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Daftar Tagihan Pelanggan</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                            className="form-input"
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value)
                                setPage(1)
                            }}
                            style={{ width: 'auto' }}
                        >
                            <option value="">Semua Status</option>
                            <option value="unpaid">Belum Bayar</option>
                            <option value="paid">Sudah Bayar</option>
                            <option value="cancelled">Dibatalkan</option>
                        </select>

                        <select
                            className="form-input"
                            value={yearFilter}
                            onChange={(e) => {
                                setYearFilter(e.target.value)
                                setPage(1)
                            }}
                            style={{ width: 'auto' }}
                        >
                            <option value="">Semua Tahun</option>
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y.toString()}>{y}</option>
                            ))}
                        </select>

                        <select
                            className="form-input"
                            value={monthFilter}
                            onChange={(e) => {
                                setMonthFilter(e.target.value)
                                setPage(1)
                            }}
                            style={{ width: 'auto' }}
                        >
                            <option value="">Semua Bulan</option>
                            {[
                                { v: '01', l: 'Januari' },
                                { v: '02', l: 'Februari' },
                                { v: '03', l: 'Maret' },
                                { v: '04', l: 'April' },
                                { v: '05', l: 'Mei' },
                                { v: '06', l: 'Juni' },
                                { v: '07', l: 'Juli' },
                                { v: '08', l: 'Agustus' },
                                { v: '09', l: 'September' },
                                { v: '10', l: 'Oktober' },
                                { v: '11', l: 'November' },
                                { v: '12', l: 'Desember' },
                            ].map(m => (
                                <option key={m.v} value={m.v}>{m.l}</option>
                            ))}
                        </select>
                        <button
                            className="btn btn-primary"
                            onClick={handleGenerateMonthly}
                            disabled={generating}
                        >
                            {generating ? '⏳ Generating...' : '⚡ Generate Bulanan'}
                        </button>
                    </div>
                </div>

                <div className="table-wrapper">
                    {loading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px', borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }} />
                            <p>Memuat data tagihan...</p>
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">🧾</div>
                            <h3>Tidak ada tagihan</h3>
                            <p>Belum ada data tagihan yang ditemukan.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Pelanggan</th>
                                    <th>Bulan</th>
                                    <th>Tagihan Pokok</th>
                                    <th>Tunggakan</th>
                                    <th>Diskon</th>
                                    <th>Total Tagihan</th>
                                    <th>Jatuh Tempo</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.customer?.fullName}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inv.customer?.phone}</div>
                                        </td>
                                        <td>{inv.month}</td>
                                        <td>{formatCurrency(inv.amount)}</td>
                                        <td style={{ color: Number(inv.previousBalance) > 0 ? 'var(--danger)' : 'inherit' }}>
                                            {formatCurrency(inv.previousBalance)}
                                        </td>
                                        <td style={{ color: Number(inv.discount) > 0 ? 'var(--success)' : 'inherit' }}>
                                            {formatCurrency(inv.discount)}
                                        </td>
                                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(inv.totalAmount)}</td>
                                        <td>{new Date(inv.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                        <td>{getStatusBadge(inv.status)}</td>
                                        <td>
                                            <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                                {inv.status === 'unpaid' && (
                                                    <>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => handleEditDiscount(inv)}
                                                            title="Ubah Diskon"
                                                        >
                                                            💸
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => handleSendWhatsApp(inv)}
                                                            title="Kirim ke WhatsApp"
                                                            style={{ color: '#25D366' }}
                                                        >
                                                            💬
                                                        </button>
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() => handleMarkAsPaid(inv.id)}
                                                            title="Konfirmasi Bayar Cash"
                                                        >
                                                            💰 Cash
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => handlePrint(inv)}
                                                    title="Cetak Invoice"
                                                >
                                                    🖨️
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
                {!loading && lastPage > 1 && (
                    <div className="pagination">
                        <span className="pagination-info">Halaman {page} dari {lastPage}</span>
                        <div className="pagination-controls">
                            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
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
                            <button className="page-btn" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>→</button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}
