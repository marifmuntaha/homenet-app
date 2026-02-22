import React, { useState, useEffect } from 'react'
import type { Product } from '../../types'
import api from '../../lib/axios'

interface ChangeProductModalProps {
    isOpen: boolean
    onClose: (shouldRefresh?: boolean) => void
    customerId: number | null
    currentProductId: number | null
}

export default function ChangeProductModal({ isOpen, onClose, customerId, currentProductId }: ChangeProductModalProps) {
    const [loading, setLoading] = useState(false)
    const [products, setProducts] = useState<Product[]>([])
    const [selectedProductId, setSelectedProductId] = useState<number | ''>('')
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen) {
            fetchProducts()
            setSelectedProductId(currentProductId || '')
        } else {
            setSelectedProductId('')
            setError('')
        }
    }, [isOpen, currentProductId])

    const fetchProducts = async () => {
        try {
            const res = await api.get<any>('/products')
            const payload = res.data
            const productList = payload?.data?.data || payload?.data || []
            setProducts(Array.isArray(productList) ? productList : [])
        } catch {
            // silent fail for fetch
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProductId) {
            setError('Silakan pilih produk baru')
            return
        }

        if (selectedProductId === currentProductId) {
            onClose() // nothing to change
            return
        }

        setLoading(true)
        setError('')
        try {
            await api.post(`/customers/${customerId}/change-product`, {
                productId: Number(selectedProductId)
            })
            onClose(true)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal mengubah produk')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: '450px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">📦 Ubah Produk Langganan</h3>
                    <button className="modal-close" onClick={() => onClose()}>
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && (
                            <div className="alert alert-error" style={{ marginBottom: 15 }}>
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <div
                            style={{
                                padding: '12px 16px',
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: '16px',
                                fontSize: '13px',
                                color: 'var(--text-muted)',
                                borderLeft: '3px solid var(--accent)',
                            }}
                        >
                            ℹ️ Mengubah produk akan mencatat history subscription dan memperbarui pengaturan (PPP Secret) di seluruh Mikrotik.
                        </div>

                        <div className="form-group">
                            <label className="form-label">Pilih Produk Baru *</label>
                            <select
                                className="form-select"
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                            >
                                <option value="">-- Pilih Paket --</option>
                                {(products || []).map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} - Rp{p.price.toLocaleString()}
                                        {p.id === currentProductId ? ' (Aktif Saat Ini)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={() => onClose()}>
                            Batal
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="spinner" /> Memproses...
                                </>
                            ) : (
                                '💾 Simpan Perubahan'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
