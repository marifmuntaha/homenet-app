import React, { useState, useEffect } from 'react'
import {
    Form, FormGroup, Label, Button, Alert, Spinner,
} from 'reactstrap'
import type { Product } from '../../types'
import api from '../../lib/axios'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import RSelect from '../../components/RSelect'

interface ChangeProductModalProps {
    isOpen: boolean
    onClose: (shouldRefresh?: boolean) => void
    customerId: number | null
    currentProductId: number | null
}

export default function ChangeProductModal({ isOpen, onClose, customerId, currentProductId }: ChangeProductModalProps) {
    const [loading, setLoading] = useState(false)
    const [products, setProducts] = useState<Product[]>([])
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen) {
            fetchProducts()
            setSelectedProductId(currentProductId)
        } else {
            setSelectedProductId(null)
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
            // silent fail
        }
    }

    const productOptions = products.map(p => ({
        value: p.id,
        label: `${p.name} – Rp${p.price.toLocaleString()}${p.id === currentProductId ? ' ✓ Aktif' : ''}`,
    }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProductId) { setError('Silakan pilih produk baru'); return }
        if (selectedProductId === currentProductId) { onClose(); return }
        setLoading(true)
        setError('')
        try {
            await api.post(`/customers/${customerId}/change-product`, { productId: Number(selectedProductId) })
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
            <div className="modal" style={{ maxWidth: '460px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        <FontAwesomeIcon icon={['fas', 'box']} /> Ubah Produk Langganan
                    </h3>
                    <button className="modal-close" onClick={() => onClose()}>
                        <FontAwesomeIcon icon={['fas', 'xmark']} />
                    </button>
                </div>

                <Form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && (
                            <Alert color="danger" className="d-flex align-items-center gap-2 mb-3">
                                <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> {error}
                            </Alert>
                        )}

                        <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', borderLeft: '3px solid var(--accent)' }}>
                            <FontAwesomeIcon icon={['fas', 'circle-info']} />{' '}
                            Mengubah produk akan mencatat history subscription dan memperbarui pengaturan (PPP Secret) di seluruh Mikrotik.
                        </div>

                        <FormGroup>
                            <Label className="form-label">Pilih Produk Baru *</Label>
                            <RSelect
                                options={productOptions}
                                value={productOptions.find(o => o.value === selectedProductId) ?? null}
                                onChange={(opt) => setSelectedProductId(opt?.value ?? null)}
                                placeholder="-- Pilih Paket --"
                                isInvalid={!selectedProductId && !!error}
                            />
                        </FormGroup>
                    </div>

                    <div className="modal-footer">
                        <Button type="button" color="secondary" outline onClick={() => onClose()}>
                            Batal
                        </Button>
                        <Button type="submit" color="primary" disabled={loading}>
                            {loading
                                ? <><Spinner size="sm" /> Memproses...</>
                                : <><FontAwesomeIcon icon={['fas', 'floppy-disk']} /> Simpan Perubahan</>
                            }
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    )
}
