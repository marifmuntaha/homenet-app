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

    return (
        <Layout title="Manajemen Tagihan">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Daftar Tagihan Pelanggan</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                            <div className="spinner" style={{ margin: '0 auto 12px' }} />
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
                                            <div style={{ fontWeight: 500 }}>{inv.customer?.fullName}</div>
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
                                        <td style={{ fontWeight: 700 }}>{formatCurrency(inv.totalAmount)}</td>
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
                                                            💸 Diskon
                                                        </button>
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() => handleMarkAsPaid(inv.id)}
                                                        >
                                                            💰 Bayar
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => alert('Fitur cetak invoice akan segera hadir')}
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
                            <button className="page-btn active">{page}</button>
                            <button className="page-btn" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>→</button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}
