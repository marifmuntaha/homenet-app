import { useState, useEffect } from 'react'
import {
    Form, FormGroup, Label, Input, FormFeedback,
    Button, Spinner, Row, Col,
} from 'reactstrap'
import api from '../../lib/axios'
import type { Product } from '../../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

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
    const [form, setForm] = useState<FormData>({ name: '', price: '', downloadSpeed: '', uploadSpeed: '', description: '' })
    const [errors, setErrors] = useState<Partial<FormData>>({})
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (product) {
            setForm({
                name: product.name,
                price: String(product.price),
                downloadSpeed: String(product.downloadSpeed),
                uploadSpeed: String(product.uploadSpeed),
                description: product.description || '',
            })
        } else {
            setForm({ name: '', price: '', downloadSpeed: '', uploadSpeed: '', description: '' })
            setErrors({})
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
            if (axiosErr.response?.data?.message) setErrors({ name: axiosErr.response.data.message })
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
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {isEdit
                            ? <><FontAwesomeIcon icon={['fas', 'pen-to-square']} /> Edit Produk &amp; Sinkronisasi</>
                            : <><FontAwesomeIcon icon={['fas', 'box']} /> Tambah Produk Baru</>}
                    </h3>
                    <button className="modal-close" onClick={() => onClose()}>
                        <FontAwesomeIcon icon={['fas', 'xmark']} />
                    </button>
                </div>

                <Form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <FormGroup>
                            <Label className="form-label">
                                Nama Produk/Profil <span style={{ color: 'var(--danger)' }}>*</span>
                            </Label>
                            <Input
                                className="form-input"
                                placeholder="Contoh: Internet 10Mbps"
                                value={form.name}
                                onChange={set('name')}
                                invalid={!!errors.name}
                            />
                            <FormFeedback>{errors.name}</FormFeedback>
                        </FormGroup>

                        <FormGroup>
                            <Label className="form-label">
                                Harga (Rp) <span style={{ color: 'var(--danger)' }}>*</span>
                            </Label>
                            <Input
                                className="form-input"
                                placeholder="100000"
                                type="number"
                                min={0}
                                value={form.price}
                                onChange={set('price')}
                                invalid={!!errors.price}
                            />
                            <FormFeedback>{errors.price}</FormFeedback>
                        </FormGroup>

                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label className="form-label">
                                        Download (Mbps) <span style={{ color: 'var(--danger)' }}>*</span>
                                    </Label>
                                    <Input
                                        className="form-input"
                                        placeholder="10"
                                        type="number"
                                        min={1}
                                        value={form.downloadSpeed}
                                        onChange={set('downloadSpeed')}
                                        invalid={!!errors.downloadSpeed}
                                    />
                                    <FormFeedback>{errors.downloadSpeed}</FormFeedback>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label className="form-label">
                                        Upload (Mbps) <span style={{ color: 'var(--danger)' }}>*</span>
                                    </Label>
                                    <Input
                                        className="form-input"
                                        placeholder="5"
                                        type="number"
                                        min={1}
                                        value={form.uploadSpeed}
                                        onChange={set('uploadSpeed')}
                                        invalid={!!errors.uploadSpeed}
                                    />
                                    <FormFeedback>{errors.uploadSpeed}</FormFeedback>
                                </FormGroup>
                            </Col>
                        </Row>

                        <FormGroup>
                            <Label className="form-label">Deskripsi</Label>
                            <Input
                                type="textarea"
                                className="form-input"
                                placeholder="Catatan tambahan..."
                                rows={3}
                                value={form.description}
                                onChange={set('description')}
                                style={{ resize: 'vertical' }}
                            />
                        </FormGroup>

                        <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <FontAwesomeIcon icon={['fas', 'circle-info']} style={{ marginTop: 2, color: '#38bdf8', flexShrink: 0 }} />
                                <span>Menyimpan produk ini akan otomatis mengubah PPP Profile di <strong>semua Router Mikrotik</strong> yang terdaftar.</span>
                            </p>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <Button type="button" color="secondary" outline onClick={() => onClose()} disabled={isLoading}>
                            Batal
                        </Button>
                        <Button type="submit" color="primary" disabled={isLoading}>
                            {isLoading
                                ? <><Spinner size="sm" /> Menyimpan &amp; Sync...</>
                                : isEdit
                                    ? <><FontAwesomeIcon icon={['fas', 'floppy-disk']} /> Simpan &amp; Sinkronisasi</>
                                    : <><FontAwesomeIcon icon={['fas', 'box']} /> Buat &amp; Sinkronisasi</>
                            }
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    )
}
