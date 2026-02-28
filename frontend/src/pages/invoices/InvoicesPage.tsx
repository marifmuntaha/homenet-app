import { useState, useEffect } from 'react'
import type { Invoice, PaginatedResponse } from '../../types'
import api from '../../lib/axios'
import Layout from '../../components/Layout'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Spinner, Badge, Table } from 'reactstrap'
import RSelect from '../../components/RSelect'

// ─── Filter Options ───────────────────────────────────────────────────────────
const statusOptions = [
    { value: '', label: 'Semua Status' },
    { value: 'unpaid', label: 'Belum Bayar' },
    { value: 'paid', label: 'Sudah Bayar' },
    { value: 'cancelled', label: 'Dibatalkan' },
]

const yearOptions = [
    { value: '', label: 'Semua Tahun' },
    ...([2024, 2025, 2026].map(y => ({ value: y.toString(), label: y.toString() }))),
]

const monthOptions = [
    { value: '', label: 'Semua Bulan' },
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
        paid: { color: 'success', label: 'Sudah Bayar' },
        unpaid: { color: 'danger', label: 'Belum Bayar' },
        cancelled: { color: 'secondary', label: 'Dibatalkan' },
    }
    const cfg = map[status] ?? { color: 'secondary', label: status }
    return <Badge color={cfg.color} pill style={{ fontSize: '0.72rem', padding: '4px 10px' }}>{cfg.label}</Badge>
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)

    const [page, setPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [statusFilter, setStatusFilter] = useState('')
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
    const [monthFilter, setMonthFilter] = useState('')

    useEffect(() => { fetchInvoices() }, [page, statusFilter, yearFilter, monthFilter])

    const fetchInvoices = async () => {
        setLoading(true)
        try {
            const res = await api.get<PaginatedResponse<Invoice>>(
                `/invoices?page=${page}&status=${statusFilter}&year=${yearFilter}&month=${monthFilter}`
            )
            setInvoices(res.data.data?.data || [])
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
        } catch { alert('Gagal memperbarui status tagihan') }
    }

    const handleEditDiscount = async (inv: Invoice) => {
        const newDiscount = prompt(`Masukkan nominal diskon untuk ${inv.customer?.fullName}:`, inv.discount.toString())
        if (newDiscount === null) return
        const discountNum = Number(newDiscount)
        if (isNaN(discountNum)) { alert('Nominal diskon tidak valid'); return }
        try {
            await api.put(`/invoices/${inv.id}`, { discount: discountNum })
            fetchInvoices()
        } catch { alert('Gagal memperbarui diskon') }
    }

    const handleSendWhatsApp = (inv: Invoice) => {
        if (!inv.customer?.phone) { alert('Nomor telepon pelanggan tidak tersedia'); return }
        const phone = inv.customer.phone.replace(/[^0-9]/g, '')
        const formattedPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone
        const message = `Halo Bapak/Ibu *${inv.customer.fullName}*,\n\nBerikut adalah informasi tagihan internet Anda untuk bulan *${inv.month}*:\n- Total Tagihan: *${formatCurrency(inv.totalAmount)}*\n- Jatuh Tempo: *${new Date(inv.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}*\n- Status: *${inv.status === 'paid' ? 'LUNAS' : 'BELUM DIBAYAR'}*\n\nSilakan melakukan pembayaran sebelum tanggal jatuh tempo. Terima kasih.\n_Homenet Team_`
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    const handlePrint = (inv: Invoice) => {
        const printWindow = window.open('', '_blank')
        if (!printWindow) return
        const content = `
            <html><head><title>Invoice - ${inv.customer?.fullName}</title>
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
            </style></head><body>
            <div class="header"><div><h1>HOMENET</h1><p>Internet Service Provider</p></div>
            <div style="text-align:right"><h2>INVOICE</h2><p>#INV-${inv.id}-${inv.month.replace('-', '')}</p></div></div>
            <div class="info-grid">
                <div class="info-box"><h3>Tagihan Untuk:</h3><p><strong>${inv.customer?.fullName}</strong></p><p>${inv.customer?.phone}</p><p>${inv.customer?.address || ''}</p></div>
                <div class="info-box" style="text-align:right"><h3>Detail Tagihan:</h3><p>Bulan: ${inv.month}</p><p>Jatuh Tempo: ${new Date(inv.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Status: <strong>${inv.status.toUpperCase()}</strong></p></div>
            </div>
            <table><thead><tr><th>Deskripsi</th><th style="text-align:right">Jumlah</th></tr></thead>
            <tbody>
                <tr><td>Layanan Internet - Bulan ${inv.month}</td><td style="text-align:right">${formatCurrency(inv.amount)}</td></tr>
                <tr><td>Tunggakan Sebelumnya</td><td style="text-align:right">${formatCurrency(inv.previousBalance)}</td></tr>
                <tr><td>Diskon</td><td style="text-align:right;color:green">-${formatCurrency(inv.discount)}</td></tr>
                <tr class="total-row"><td>TOTAL PEMBAYARAN</td><td style="text-align:right">${formatCurrency(inv.totalAmount)}</td></tr>
            </tbody></table>
            <div class="footer"><p>Terima kasih atas kepercayaan Anda menggunakan layanan kami.</p><p>Homenet Management</p></div>
            <script>window.onload = function() { window.print(); }<\/script>
            </body></html>`
        printWindow.document.write(content)
        printWindow.document.close()
    }

    // Summary
    const unpaidTotal = invoices.filter(i => i.status === 'unpaid').reduce((a, c) => a + Number(c.totalAmount), 0)
    const paidTotal = invoices.filter(i => i.status === 'paid').reduce((a, c) => a + Number(c.totalAmount), 0)
    const discountTotal = invoices.reduce((a, c) => a + Number(c.discount), 0)

    // Pagination range
    const pageRange = () => {
        const range: number[] = []
        const start = Math.max(1, page - 2)
        const end = Math.min(lastPage, start + 4)
        for (let i = start; i <= end; i++) range.push(i)
        return range
    }

    return (
        <Layout title="Manajemen Tagihan">

            {/* ── Summary Stats ─────────────────────────────── */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-amber">
                        <FontAwesomeIcon icon={['fas', 'clock']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info">
                        <p>Total Belum Bayar</p>
                        <h3>{formatCurrency(unpaidTotal)}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Halaman ini</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-green">
                        <FontAwesomeIcon icon={['fas', 'circle-check']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info">
                        <p>Total Sudah Bayar</p>
                        <h3>{formatCurrency(paidTotal)}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Halaman ini</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-blue">
                        <FontAwesomeIcon icon={['fas', 'tag']} className="fa-icon-stat" />
                    </div>
                    <div className="stat-info">
                        <p>Total Diskon</p>
                        <h3>{formatCurrency(discountTotal)}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Halaman ini</span>
                    </div>
                </div>
            </div>

            {/* ── Main Card ─────────────────────────────────── */}
            <div className="card">
                {/* Card Header with Filters */}
                <div className="card-header" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                        <h2 className="card-title">Daftar Tagihan Pelanggan</h2>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Kelola tagihan dan status pembayaran pelanggan
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' }}>
                        {/* Status Filter */}
                        <div style={{ minWidth: 155 }}>
                            <RSelect
                                options={statusOptions}
                                value={statusOptions.find(o => o.value === statusFilter) ?? statusOptions[0]}
                                onChange={(opt) => { setStatusFilter(opt?.value ?? ''); setPage(1) }}
                                placeholder="Semua Status"
                            />
                        </div>

                        {/* Year Filter */}
                        <div style={{ minWidth: 130 }}>
                            <RSelect
                                options={yearOptions}
                                value={yearOptions.find(o => o.value === yearFilter) ?? yearOptions[0]}
                                onChange={(opt) => { setYearFilter(opt?.value ?? ''); setPage(1) }}
                                placeholder="Semua Tahun"
                            />
                        </div>

                        {/* Month Filter */}
                        <div style={{ minWidth: 145 }}>
                            <RSelect
                                options={monthOptions}
                                value={monthOptions.find(o => o.value === monthFilter) ?? monthOptions[0]}
                                onChange={(opt) => { setMonthFilter(opt?.value ?? ''); setPage(1) }}
                                placeholder="Semua Bulan"
                            />
                        </div>

                        {/* Generate Button */}
                        <Button
                            color="primary"
                            onClick={handleGenerateMonthly}
                            disabled={generating}
                            style={{ height: 42, whiteSpace: 'nowrap' }}
                        >
                            {generating
                                ? <><Spinner size="sm" /> Generating...</>
                                : <><FontAwesomeIcon icon={['fas', 'bolt']} /> Generate Bulanan</>
                            }
                        </Button>
                    </div>
                </div>

                {/* Table Body */}
                <div className="table-wrapper">
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Spinner style={{ width: '2rem', height: '2rem', color: 'var(--accent)' }} />
                            <p style={{ marginTop: 12, marginBottom: 0 }}>Memuat data tagihan...</p>
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <FontAwesomeIcon icon={['fas', 'file-invoice-dollar']} />
                            </div>
                            <h3>Tidak ada tagihan</h3>
                            <p>Belum ada data tagihan yang ditemukan.</p>
                        </div>
                    ) : (
                        <Table hover responsive className="mb-0" style={{ color: 'var(--text-secondary)' }}>
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
                                    <th className="text-end">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.customer?.fullName}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{inv.customer?.phone}</div>
                                        </td>
                                        <td>{inv.month}</td>
                                        <td>{formatCurrency(inv.amount)}</td>
                                        <td style={{ color: Number(inv.previousBalance) > 0 ? 'var(--danger)' : 'inherit' }}>
                                            {formatCurrency(inv.previousBalance)}
                                        </td>
                                        <td style={{ color: Number(inv.discount) > 0 ? 'var(--success)' : 'inherit' }}>
                                            {formatCurrency(inv.discount)}
                                        </td>
                                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {formatCurrency(inv.totalAmount)}
                                        </td>
                                        <td>
                                            {new Date(inv.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td>{getStatusBadge(inv.status)}</td>
                                        <td>
                                            <div className="d-flex gap-1 justify-content-end flex-wrap">
                                                {inv.status === 'unpaid' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            color="secondary"
                                                            outline
                                                            onClick={() => handleEditDiscount(inv)}
                                                            title="Ubah Diskon"
                                                        >
                                                            <FontAwesomeIcon icon={['fas', 'tag']} />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            color="secondary"
                                                            outline
                                                            onClick={() => handleSendWhatsApp(inv)}
                                                            title="Kirim ke WhatsApp"
                                                            style={{ color: '#25D366', borderColor: '#25D366' }}
                                                        >
                                                            <FontAwesomeIcon icon={['fab', 'whatsapp']} />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            color="success"
                                                            outline
                                                            onClick={() => handleMarkAsPaid(inv.id)}
                                                            title="Konfirmasi Bayar Cash"
                                                        >
                                                            <FontAwesomeIcon icon={['fas', 'money-bill-wave']} /> Cash
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    size="sm"
                                                    color="secondary"
                                                    outline
                                                    onClick={() => handlePrint(inv)}
                                                    title="Cetak Invoice"
                                                >
                                                    <FontAwesomeIcon icon={['fas', 'print']} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </div>

                {/* ── Bootstrap Pagination ──────────────────── */}
                {!loading && lastPage > 1 && (
                    <div className="d-flex justify-content-between align-items-center px-3 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <small style={{ color: 'var(--text-muted)' }}>
                            Halaman <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> dari <strong style={{ color: 'var(--text-primary)' }}>{lastPage}</strong>
                        </small>
                        <nav>
                            <ul className="pagination pagination-sm mb-0" style={{ gap: 4 }}>
                                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                                        <FontAwesomeIcon icon={['fas', 'chevron-left']} />
                                    </button>
                                </li>
                                {pageRange().map(p => (
                                    <li key={p} className={`page-item ${page === p ? 'active' : ''}`}>
                                        <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                                    </li>
                                ))}
                                <li className={`page-item ${page >= lastPage ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(p => p + 1)} disabled={page >= lastPage}>
                                        <FontAwesomeIcon icon={['fas', 'chevron-right']} />
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>
        </Layout>
    )
}
