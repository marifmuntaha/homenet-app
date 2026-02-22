import { useState, useEffect } from 'react'
import api from '../../lib/axios'
import type { Product } from '../../types'

interface ProductModalProps {
    product: Product | null
    onClose: (refresh?: boolean) => void
}

interface FormData {
    name: string
    price: string
    downloadSpeed: string
    uploadSpeed: string
    description: string
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
    const isEdit = !!product
    const [form, setForm] = useState<FormData>({
        name: '',
        price: '',
        downloadSpeed: '',
        uploadSpeed: '',
        description: '',
    })
    const [errors, setErrors] = useState<Partial<FormData>>({})
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (product) {
            setForm({
                name: product.name,
                price: String(product.price),
                downloadSpeed: String(product.download_speed),
                uploadSpeed: String(product.upload_speed),
                description: product.description || '',
            })
        }
    }, [product])

    const validate = (): boolean => {
        const errs: Partial<FormData> = {}
        if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Nama minimal 2 karakter'

        const price = Number(form.price)
        if (!form.price || isNaN(price) || price < 0) errs.price = 'Harga tidak valid'

        const dl = Number(form.downloadSpeed)
        if (!form.downloadSpeed || isNaN(dl) || dl < 1) errs.downloadSpeed = 'Kecepatan minimal 1 Mbps'

        const ul = Number(form.uploadSpeed)
        if (!form.uploadSpeed || isNaN(ul) || ul < 1) errs.uploadSpeed = 'Kecepatan minimal 1 Mbps'

        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setIsLoading(true)
        try {
            const payload = {
                name: form.name.trim(),
                price: Number(form.price),
                downloadSpeed: Number(form.downloadSpeed),
                uploadSpeed: Number(form.uploadSpeed),
                description: form.description.trim() || null,
            }

            if (isEdit) {
                await api.put(`/products/${product.id}`, payload)
            } else {
                await api.post('/products', payload)
            }
            onClose(true)
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } }
            if (axiosErr.response?.data?.message) {
                setErrors({ name: axiosErr.response.data.message })
            }
        } finally {
            setIsLoading(false)
        }
    }

    const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }))
        setErrors(prev => ({ ...prev, [field]: undefined }))
    }

    return (
        <div className="modal-overlay" onClick={() => onClose()}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {isEdit ? '✏️ Edit Produk & Sinkronisasi' : '📦 Tambah Produk Baru'}
                    </h3>
                    <button className="modal-close" onClick={() => onClose()}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Nama Produk/Profil <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input
                                className={`form-input ${errors.name ? 'input-error' : ''}`}
                                placeholder="Contoh: Internet 10Mbps"
                                value={form.name}
                                onChange={set('name')}
                            />
                            {errors.name && <span className="form-error">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Harga (Rp) <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input
                                className={`form-input ${errors.price ? 'input-error' : ''}`}
                                placeholder="100000"
                                type="number"
                                min={0}
                                value={form.price}
                                onChange={set('price')}
                            />
                            {errors.price && <span className="form-error">{errors.price}</span>}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="form-group">
                                <label className="form-label">Download (Mbps) <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <input
                                    className={`form-input ${errors.downloadSpeed ? 'input-error' : ''}`}
                                    placeholder="10"
                                    type="number"
                                    min={1}
                                    value={form.downloadSpeed}
                                    onChange={set('downloadSpeed')}
                                />
                                {errors.downloadSpeed && <span className="form-error">{errors.downloadSpeed}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Upload (Mbps) <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <input
                                    className={`form-input ${errors.uploadSpeed ? 'input-error' : ''}`}
                                    placeholder="5"
                                    type="number"
                                    min={1}
                                    value={form.uploadSpeed}
                                    onChange={set('uploadSpeed')}
                                />
                                {errors.uploadSpeed && <span className="form-error">{errors.uploadSpeed}</span>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Deskripsi</label>
                            <textarea
                                className="form-input"
                                placeholder="Catatan tambahan..."
                                rows={3}
                                value={form.description}
                                onChange={set('description')}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ marginTop: 12, padding: '12px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', display: 'flex', gap: '8px' }}>
                                <span>ℹ️</span>
                                <span>Menyimpan produk ini akan otomatis mengubah PPP Profile di <strong>semua Router Mikrotik</strong> yang terdaftar.</span>
                            </p>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={() => onClose()} disabled={isLoading}>
                            Batal
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading
                                ? <><span className="spinner" /> Menyimpan & Sync...</>
                                : isEdit ? '💾 Simpan & Sinkronisasi' : '📦 Buat & Sinkronisasi'
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
