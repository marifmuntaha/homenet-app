import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/axios'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Card, CardBody, Button, Spinner, FormGroup, Label, Input, Alert } from 'reactstrap'
import type { Product } from '../../types'

export default function PublicVoucherPurchasePage() {
    const navigate = useNavigate()
    const [products, setProducts] = useState<Product[]>([])
    const [selectedProduct, setSelectedProduct] = useState('')
    const [fullname, setFullname] = useState('')
    const [whatsapp, setWhatsapp] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const prodRes = await api.get<{ data: Product[] }>('/public/voucher-products')
            setProducts(prodRes.data.data)
            
            if (prodRes.data.data.length > 0) setSelectedProduct(String(prodRes.data.data[0].id))
        } catch (err) {
            setError('Gagal mengambil data produk. Silakan coba lagi nanti.')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProduct || !whatsapp || !fullname) {
            setError('Mohon lengkapi semua data.')
            return
        }

        setSubmitting(true)
        setError('')
        try {
            const res = await api.post<{ data: { token: string } }>('/public/buy-voucher', {
                productId: Number(selectedProduct),
                whatsapp: whatsapp,
                fullname: fullname
            })
            navigate(`/pay/${res.data.data.token}`)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal membuat pesanan.')
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f8fafc' }}>
                <div className="text-center">
                    <Spinner color="primary" />
                    <p className="mt-3 text-secondary">Menyiapkan halaman...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="public-purchase-page" style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <div className="text-center mb-4">
                    <div style={{
                        width: '64px', height: '64px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        borderRadius: '16px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)'
                    }}>
                        <FontAwesomeIcon icon={['fas', 'ticket']} style={{ color: 'white', fontSize: '2rem' }} />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>Beli Voucher WiFi</h1>
                    <p style={{ color: '#64748b' }}>Instan & Aman</p>
                </div>

                <Card style={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <CardBody className="p-4 pt-5">
                        {error && <Alert color="danger" style={{ borderRadius: '12px' }}>{error}</Alert>}

                        <form onSubmit={handleSubmit}>
                            <FormGroup className="mb-4">
                                <Label style={{ fontWeight: 600, color: '#475569' }}>Nama Lengkap</Label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                        <FontAwesomeIcon icon={['fas', 'user']} />
                                    </span>
                                    <Input
                                        type="text"
                                        placeholder="Masukkan nama Anda"
                                        value={fullname}
                                        onChange={(e) => setFullname(e.target.value)}
                                        style={{ paddingLeft: '40px', borderRadius: '10px', height: '48px' }}
                                        required
                                    />
                                </div>
                            </FormGroup>

                            <FormGroup className="mb-4">
                                <Label style={{ fontWeight: 600, color: '#475569' }}>Nomor WhatsApp</Label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                        <FontAwesomeIcon icon={['fas', 'phone']} />
                                    </span>
                                    <Input
                                        type="text"
                                        placeholder="Contoh: 08123456789"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        style={{ paddingLeft: '40px', borderRadius: '10px', height: '48px' }}
                                        required
                                    />
                                </div>
                                <small className="text-muted">Kode voucher akan dikirimkan ke nomor ini.</small>
                            </FormGroup>

                            <FormGroup className="mb-5">
                                <Label style={{ fontWeight: 600, color: '#475569' }}>Pilih Paket WiFi</Label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                    {products.map(p => (
                                        <div 
                                            key={p.id}
                                            onClick={() => setSelectedProduct(String(p.id))}
                                            style={{
                                                padding: '16px', borderRadius: '12px', border: '2px solid',
                                                borderColor: selectedProduct === String(p.id) ? '#6366f1' : '#f1f5f9',
                                                background: selectedProduct === String(p.id) ? '#f5f3ff' : 'white',
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{p.name}</div>
                                                    <div style={{ fontSize: '13px', color: '#64748b' }}>{p.description || `Speed: ${p.downloadSpeed}Mbps`}</div>
                                                </div>
                                                <div style={{ fontWeight: 800, color: '#6366f1' }}>Rp {p.price.toLocaleString('id-ID')}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </FormGroup>

                            <Button 
                                color="primary" 
                                block 
                                size="lg" 
                                type="submit"
                                disabled={submitting}
                                style={{ borderRadius: '12px', height: '54px', fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}
                            >
                                {submitting ? <Spinner size="sm" /> : 'Lanjut ke Pembayaran'}
                            </Button>
                        </form>
                    </CardBody>
                </Card>

                <div className="mt-4 text-center">
                    <p style={{ color: '#94a3b8', fontSize: '13px' }}>&copy; 2026 HOMENET. All rights reserved.</p>
                </div>
            </div>
        </div>
    )
}
