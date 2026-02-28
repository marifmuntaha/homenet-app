import React, { useState, useEffect } from 'react'
import {
    Form, FormGroup, Label, Input, FormFeedback,
    Button, Spinner, Row, Col,
} from 'reactstrap'
import type { Customer, Product } from '../../types'
import api from '../../lib/axios'
import LocationPicker from '../../components/LocationPicker'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import RSelect from '../../components/RSelect'

interface CustomerModalProps {
    isOpen: boolean
    onClose: (shouldRefresh?: boolean) => void
    customer: Customer | null
}

export default function CustomerModal({ isOpen, onClose, customer }: CustomerModalProps) {
    const isEdit = !!customer
    const [loading, setLoading] = useState(false)
    const [products, setProducts] = useState<Product[]>([])

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [latitude, setLatitude] = useState<number | null>(null)
    const [longitude, setLongitude] = useState<number | null>(null)
    const [pppoeUser, setPppoeUser] = useState('')
    const [pppoePassword, setPppoePassword] = useState('')
    const [productId, setProductId] = useState<number | null>(null)
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (isOpen) { fetchProducts() }
        if (customer && isOpen) {
            setFullName(customer.fullName)
            setPhone(customer.phone)
            setAddress(customer.address || '')
            setLatitude(customer.latitude ? Number(customer.latitude) : null)
            setLongitude(customer.longitude ? Number(customer.longitude) : null)
            setPppoeUser(customer.pppoeUser || '')
            const activeSub = customer.subscriptions?.find(s => s.status === 'active')
            if (activeSub) setProductId(activeSub.product_id)
        } else if (!customer) {
            setEmail(''); setPassword(''); setFullName(''); setPhone('')
            setAddress(''); setLatitude(null); setLongitude(null)
            setPppoeUser(''); setPppoePassword(''); setProductId(null); setErrors({})
        }
    }, [customer, isOpen])

    const fetchProducts = async () => {
        try {
            const res = await api.get<any>('/products')
            const payload = res.data
            const productList = payload?.data?.data || payload?.data || []
            setProducts(Array.isArray(productList) ? productList : [])
        } catch { /* silent */ }
    }

    const productOptions = products.map(p => ({
        value: p.id,
        label: `${p.name} — Rp${p.price.toLocaleString()}`,
    }))

    const validate = () => {
        const newErrs: Record<string, string> = {}
        if (!fullName) newErrs.fullName = 'Nama lengkap wajib diisi'
        if (!phone) newErrs.phone = 'No HP wajib diisi'
        if (!isEdit) {
            if (!email) newErrs.email = 'Email wajib diisi'
            if (!password || password.length < 8) newErrs.password = 'Password minimal 8 karakter'
            if (!productId) newErrs.productId = 'Silakan pilih paket produk'
        }
        setErrors(newErrs)
        return Object.keys(newErrs).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setLoading(true)
        try {
            const payload: any = { fullName, phone, address, latitude, longitude, pppoeUser: pppoeUser || null, pppoePassword: pppoePassword || null }
            if (isEdit) {
                await api.put(`/customers/${customer.id}`, payload)
            } else {
                payload.email = email; payload.password = password; payload.productId = Number(productId)
                await api.post('/customers', payload)
            }
            onClose(true)
        } catch (err: any) {
            if (err.response?.status === 422) {
                const apiErrors: Record<string, string> = {}
                err.response.data.errors.forEach((e: any) => { apiErrors[e.field] = e.message })
                setErrors(apiErrors)
            } else if (err.response?.status === 409) {
                alert(err.response.data.message)
            } else {
                alert('Terjadi kesalahan')
            }
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: '820px', width: '92%' }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {isEdit
                            ? <><FontAwesomeIcon icon={['fas', 'pen-to-square']} /> Edit Pelanggan</>
                            : <><FontAwesomeIcon icon={['fas', 'user-plus']} /> Tambah Pelanggan Baru</>}
                    </h3>
                    <button className="modal-close" onClick={() => onClose()}>
                        <FontAwesomeIcon icon={['fas', 'xmark']} />
                    </button>
                </div>

                <Form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 1fr', gap: '24px' }}>

                        {/* Kolom Kiri */}
                        <div>
                            {!isEdit && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h6 style={{ marginBottom: 12, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <FontAwesomeIcon icon={['fas', 'key']} style={{ color: 'var(--accent)' }} /> Akun Login
                                    </h6>
                                    <FormGroup>
                                        <Label className="form-label">Email *</Label>
                                        <Input
                                            type="email"
                                            className={`form-input ${errors.email ? 'is-invalid' : ''}`}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="pelanggan@email.com"
                                            invalid={!!errors.email}
                                        />
                                        <FormFeedback>{errors.email}</FormFeedback>
                                    </FormGroup>
                                    <FormGroup>
                                        <Label className="form-label">Password *</Label>
                                        <Input
                                            type="password"
                                            className={`form-input ${errors.password ? 'is-invalid' : ''}`}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Minimal 8 karakter"
                                            invalid={!!errors.password}
                                        />
                                        <FormFeedback>{errors.password}</FormFeedback>
                                    </FormGroup>
                                </div>
                            )}

                            <div>
                                <h6 style={{ marginBottom: 12, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FontAwesomeIcon icon={['fas', 'user']} style={{ color: 'var(--accent)' }} /> Data Pelanggan
                                </h6>
                                <FormGroup>
                                    <Label className="form-label">Nama Lengkap *</Label>
                                    <Input
                                        type="text"
                                        className="form-input"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Nama Sesuai KTP"
                                        invalid={!!errors.fullName}
                                    />
                                    <FormFeedback>{errors.fullName}</FormFeedback>
                                </FormGroup>
                                <FormGroup>
                                    <Label className="form-label">No. HP (WhatsApp) *</Label>
                                    <Input
                                        type="text"
                                        className="form-input"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="08123xxxx"
                                        invalid={!!errors.phone}
                                    />
                                    <FormFeedback>{errors.phone}</FormFeedback>
                                </FormGroup>
                                <FormGroup>
                                    <Label className="form-label">Alamat Lengkap</Label>
                                    <Input
                                        type="textarea"
                                        className="form-input"
                                        rows={3}
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Nama Jalan, RT/RW, dsb"
                                    />
                                </FormGroup>
                            </div>
                        </div>

                        {/* Kolom Kanan */}
                        <div>
                            <div style={{ marginBottom: '24px' }}>
                                <h6 style={{ marginBottom: 12, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FontAwesomeIcon icon={['fas', 'map-location-dot']} style={{ color: 'var(--accent)' }} /> Titik Koordinat Maps
                                </h6>
                                <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 10 }}>
                                    Geser atau klik pada peta untuk menentukan lokasi rumah pelanggan.
                                </small>
                                <LocationPicker
                                    latitude={latitude}
                                    longitude={longitude}
                                    onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng) }}
                                />
                                {latitude && longitude && (
                                    <small style={{ display: 'block', marginTop: 8, color: 'var(--success)' }}>
                                        <FontAwesomeIcon icon={['fas', 'circle-check']} /> Terpilih: {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
                                    </small>
                                )}
                            </div>

                            <div>
                                <h6 style={{ marginBottom: 12, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FontAwesomeIcon icon={['fas', 'gear']} style={{ color: 'var(--accent)' }} /> Konfigurasi Layanan
                                </h6>

                                <FormGroup>
                                    <Label className="form-label">Produk Berlangganan *</Label>
                                    {isEdit ? (
                                        <Input
                                            className="form-input"
                                            value={productOptions.find(o => o.value === productId)?.label ?? 'Tidak ada langganan aktif'}
                                            disabled
                                        />
                                    ) : (
                                        <RSelect
                                            options={productOptions}
                                            value={productOptions.find(o => o.value === productId) ?? null}
                                            onChange={(opt) => setProductId(opt?.value ?? null)}
                                            placeholder="-- Pilih Paket --"
                                            isInvalid={!!errors.productId}
                                        />
                                    )}
                                    {isEdit && (
                                        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                                            Gunakan fitur <strong>Ganti Pkt</strong> di tabel untuk mengubah layanan.
                                        </small>
                                    )}
                                    {errors.productId && <div className="text-danger mt-1" style={{ fontSize: 13 }}>{errors.productId}</div>}
                                </FormGroup>

                                <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', borderLeft: '3px solid var(--accent)' }}>
                                    <FontAwesomeIcon icon={['fas', 'circle-info']} />{' '}
                                    Mengisi PPPoE User &amp; Password akan otomatis melakukan pendaftaran (sync) pada Router Mikrotik.
                                </div>

                                <Row>
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label className="form-label">PPPoE Username</Label>
                                            <Input
                                                type="text"
                                                className="form-input"
                                                value={pppoeUser}
                                                onChange={(e) => setPppoeUser(e.target.value)}
                                                placeholder="customer_01"
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label className="form-label">PPPoE Password</Label>
                                            <Input
                                                type="text"
                                                className="form-input"
                                                value={pppoePassword}
                                                onChange={(e) => setPppoePassword(e.target.value)}
                                                placeholder={isEdit ? '(Biarkan jika tak diubah)' : 'Boleh kosong'}
                                            />
                                        </FormGroup>
                                    </Col>
                                </Row>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <Button type="button" color="secondary" outline onClick={() => onClose()}>
                            Batal
                        </Button>
                        <Button type="submit" color="primary" disabled={loading}>
                            {loading
                                ? <><Spinner size="sm" /> Menyimpan...</>
                                : isEdit
                                    ? <><FontAwesomeIcon icon={['fas', 'floppy-disk']} /> Simpan Perubahan</>
                                    : <><FontAwesomeIcon icon={['fas', 'user-plus']} /> Tambah Pelanggan</>
                            }
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    )
}
