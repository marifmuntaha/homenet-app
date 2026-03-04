import React, { useState, useEffect } from 'react'
import {
    Form, FormGroup, Label, Input, FormFeedback,
    Button, Spinner, Row, Col,
} from 'reactstrap'
import type { Customer, Product, Odp } from '../../types'
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
    const [odps, setOdps] = useState<Odp[]>([])

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [latitude, setLatitude] = useState<number | null>(null)
    const [longitude, setLongitude] = useState<number | null>(null)
    const [pppoeUser, setPppoeUser] = useState('')
    const [pppoePassword, setPppoePassword] = useState('')
    const [status, setStatus] = useState<Customer['status']>('daftar')
    const [productId, setProductId] = useState<number | null>(null)
    const [odpId, setOdpId] = useState<number | null>(null)
    const [odpPort, setOdpPort] = useState<string>('')
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [generateLoading, setGenerateLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchProducts()
            fetchOdps()
        }
        if (customer && isOpen) {
            setFullName(customer.fullName)
            setPhone(customer.phone)
            setAddress(customer.address || '')
            setLatitude(customer.latitude ? Number(customer.latitude) : null)
            setLongitude(customer.longitude ? Number(customer.longitude) : null)
            setPppoeUser(customer.pppoeUser || '')
            setStatus(customer.status)
            const activeSub = customer.subscriptions?.find(s => s.status === 'active')
            if (activeSub) setProductId(activeSub.productId)
            setOdpId(customer.odpId ?? null)
            setOdpPort(customer.odpPort?.toString() ?? '')
        } else if (!customer) {
            setEmail(''); setPassword(''); setFullName(''); setPhone('')
            setAddress(''); setLatitude(null); setLongitude(null)
            setPppoeUser(''); setPppoePassword(''); setStatus('daftar'); setProductId(null); setErrors({})
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

    const fetchOdps = async () => {
        try {
            const res = await api.get<any>('/odps')
            const list = res.data?.data || []
            setOdps(list)
        } catch { /* silent */ }
    }

    const productOptions = products.map(p => ({
        value: p.id,
        label: `${p.name} — Rp${p.price.toLocaleString()}`,
    }))

    const odpOptions = odps.map(o => ({
        value: o.id,
        label: o.name,
    }))

    const statusOptions = [
        { value: 'daftar', label: 'Daftar' },
        { value: 'pemasangan', label: 'Pemasangan' },
        { value: 'aktif', label: 'Aktif' },
        { value: 'isolir', label: 'Isolir' },
        { value: 'non aktif', label: 'Non Aktif' },
    ]

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
            const payload: any = {
                fullName, phone, address, latitude, longitude,
                pppoeUser: pppoeUser || null,
                pppoePassword: pppoePassword || null,
                status,
                odpId: status === 'pemasangan' ? (odpId || null) : (customer?.odpId || null),
                odpPort: status === 'pemasangan' ? (odpPort ? Number(odpPort) : null) : (customer?.odpPort || null)
            }
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

    const handleGeneratePppoe = async () => {
        if (!customer) return
        setGenerateLoading(true)
        try {
            const res = await api.post<{ success: boolean; pppoe_user: string; pppoe_password: string }>(
                `/customers/${customer.id}/generate-pppoe`
            )
            if (res.data.success) {
                setPppoeUser(res.data.pppoe_user)
                setPppoePassword(res.data.pppoe_password)
            }
        } catch {
            alert('Gagal generate kredensial PPPoE')
        } finally {
            setGenerateLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: '880px', width: '92%' }}>
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
                    <div className="modal-body">
                        <div className="customer-modal-grid">
                            {/* KOLOM KIRI: AKUN, IDENTITAS, LAYANAN */}
                            <div className="modal-column">
                                {!isEdit && (
                                    <div className="modal-section-card mb-2">
                                        <h5 className="section-title">
                                            <FontAwesomeIcon icon={['fas', 'key']} className="section-icon" />
                                            AKUN
                                        </h5>
                                        <div className="section-content">
                                            <FormGroup>
                                                <Label className="field-label">Email *</Label>
                                                <Input
                                                    type="email"
                                                    className="form-control"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="pelanggan@email.com"
                                                    invalid={!!errors.email}
                                                />
                                                <FormFeedback>{errors.email}</FormFeedback>
                                            </FormGroup>
                                            <FormGroup>
                                                <Label className="field-label">Password *</Label>
                                                <Input
                                                    type="password"
                                                    className="form-control"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="Minimal 8 karakter"
                                                    invalid={!!errors.password}
                                                />
                                                <FormFeedback>{errors.password}</FormFeedback>
                                            </FormGroup>
                                        </div>
                                    </div>
                                )}

                                <div className="modal-section-card mb-2">
                                    <h5 className="section-title">
                                        <FontAwesomeIcon icon={['fas', 'id-card']} className="section-icon" />
                                        IDENTITAS
                                    </h5>
                                    <div className="section-content">
                                        <FormGroup>
                                            <Label className="field-label">Nama Lengkap *</Label>
                                            <Input
                                                type="text"
                                                className="form-control"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Nama Sesuai KTP"
                                                invalid={!!errors.fullName}
                                            />
                                            <FormFeedback>{errors.fullName}</FormFeedback>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label className="field-label">No. HP (WhatsApp) *</Label>
                                            <Input
                                                type="text"
                                                className="form-control"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="08123xxxx"
                                                invalid={!!errors.phone}
                                            />
                                            <FormFeedback>{errors.phone}</FormFeedback>
                                        </FormGroup>
                                    </div>
                                </div>

                                <div className="modal-section-card">
                                    <h5 className="section-title">
                                        <FontAwesomeIcon icon={['fas', 'layer-group']} className="section-icon" />
                                        LAYANAN
                                    </h5>
                                    <div className="section-content">
                                        <FormGroup>
                                            <Label className="field-label">Produk Berlangganan *</Label>
                                            {isEdit ? (
                                                <Input
                                                    className="form-control"
                                                    value={productOptions.find(o => o.value === productId)?.label ?? 'N/A'}
                                                    disabled
                                                />
                                            ) : (
                                                <RSelect
                                                    options={productOptions}
                                                    value={productOptions.find(o => o.value === productId) ?? null}
                                                    onChange={(opt) => setProductId(opt?.value ?? null)}
                                                    placeholder="Pilih Paket"
                                                    isInvalid={!!errors.productId}
                                                />
                                            )}
                                            {errors.productId && <div className="invalid-feedback d-block">{errors.productId}</div>}
                                            {isEdit && (
                                                <small className="text-muted mt-1 d-block">
                                                    Gunakan fitur <b>Ganti Pkt</b> di tabel untuk mengubah layanan.
                                                </small>
                                            )}
                                        </FormGroup>

                                        {isEdit && (
                                            <>
                                                <FormGroup className="mt-2">
                                                    <Label className="field-label">Status Customer</Label>
                                                    <RSelect
                                                        options={statusOptions}
                                                        value={statusOptions.find(s => s.value === status) || null}
                                                        onChange={(opt) => setStatus(opt?.value as any)}
                                                        placeholder="Pilih Status"
                                                    />
                                                </FormGroup>

                                                {status === 'pemasangan' && (
                                                    <div className="odp-selection-card mt-2 p-3 rounded" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                                                        <FormGroup>
                                                            <Label className="field-label">ODP (Optical Distribution Point)</Label>
                                                            <RSelect
                                                                options={odpOptions}
                                                                value={odpOptions.find(o => o.value === odpId) ?? null}
                                                                onChange={(opt) => setOdpId(opt?.value as number ?? null)}
                                                                placeholder="Pilih ODP"
                                                            />
                                                        </FormGroup>
                                                        <FormGroup className="mt-2 mb-0">
                                                            <Label className="field-label">Port ODP</Label>
                                                            <Input
                                                                type="number"
                                                                className="form-control"
                                                                value={odpPort}
                                                                onChange={(e) => setOdpPort(e.target.value)}
                                                                placeholder="Contoh: 1"
                                                            />
                                                        </FormGroup>
                                                    </div>
                                                )}

                                                <div className="pppoe-group-card mt-2">
                                                    <div className="pppoe-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <span>
                                                            <FontAwesomeIcon icon={['fas', 'network-wired']} /> Kredensial PPPoE
                                                        </span>
                                                        <button
                                                            type="button"
                                                            disabled={generateLoading}
                                                            onClick={handleGeneratePppoe}
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                                                color: '#fff', border: 'none', borderRadius: 8,
                                                                padding: '4px 12px', fontSize: 12, fontWeight: 600,
                                                                cursor: generateLoading ? 'not-allowed' : 'pointer',
                                                                opacity: generateLoading ? 0.7 : 1,
                                                                transition: 'all 0.2s',
                                                                boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                                                            }}
                                                        >
                                                            {generateLoading
                                                                ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Generating...</>
                                                                : <><FontAwesomeIcon icon={['fas', 'wand-magic-sparkles']} /> Generate</>
                                                            }
                                                        </button>
                                                    </div>
                                                    <Row>
                                                        <Col md={6}>
                                                            <FormGroup>
                                                                <Label className="field-label">Username</Label>
                                                                <Input
                                                                    type="text"
                                                                    className="form-control"
                                                                    value={pppoeUser}
                                                                    onChange={(e) => setPppoeUser(e.target.value)}
                                                                    placeholder="auto-generated"
                                                                />
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md={6}>
                                                            <FormGroup>
                                                                <Label className="field-label">Password</Label>
                                                                <Input
                                                                    type="text"
                                                                    className="form-control"
                                                                    value={pppoePassword}
                                                                    onChange={(e) => setPppoePassword(e.target.value)}
                                                                    placeholder="Biarkan kosong jika tak diubah"
                                                                />
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* KOLOM KANAN: LOKASI PEMASANGAN */}
                            <div className="modal-column">
                                <div className="modal-section-card">
                                    <h5 className="section-title">
                                        <FontAwesomeIcon icon={['fas', 'map-location-dot']} className="section-icon" />
                                        LOKASI PEMASANGAN
                                    </h5>
                                    <div className="section-content">
                                        <FormGroup>
                                            <Label className="field-label">Alamat Lengkap</Label>
                                            <Input
                                                type="textarea"
                                                className="form-control"
                                                rows={3}
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                placeholder="Nama Jalan, RT/RW, Desa/Kelurahan..."
                                            />
                                        </FormGroup>

                                        <div className="map-wrapper flex-grow-1">
                                            <LocationPicker
                                                latitude={latitude}
                                                longitude={longitude}
                                                onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng) }}
                                            />
                                        </div>

                                        <div className="coord-info mt-3 p-3 rounded" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <span className="text-secondary" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>
                                                    <FontAwesomeIcon icon={['fas', 'compass']} className="me-1" />
                                                    TITIK KOORDINAT
                                                </span>
                                                {latitude && longitude ? (
                                                    <span className="badge bg-success-light text-success" style={{ fontSize: '10px' }}>
                                                        <FontAwesomeIcon icon={['fas', 'check']} /> TERPASANG
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-warning-light text-warning" style={{ fontSize: '10px' }}>BELUM DISET</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-primary)' }}>
                                                {latitude && longitude ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <Button type="button" color="secondary" onClick={() => onClose()}>
                            Batal
                        </Button>
                        <Button type="submit" color="primary" disabled={loading} style={{ minWidth: '180px' }}>
                            {loading ? <Spinner size="sm" /> : (
                                <><FontAwesomeIcon icon={isEdit ? ['fas', 'save'] : ['fas', 'user-plus']} /> {isEdit ? 'Simpan Perubahan' : 'Daftarkan Pelanggan'}</>
                            )}
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    )
}
