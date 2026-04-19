import { useState, useEffect } from 'react'
import {
    Form, FormGroup, Label, Input,
    Button, Spinner, Row, Col,
} from 'reactstrap'
import api from '../../lib/axios'
import type { Product, Device } from '../../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface VoucherBatchModalProps {
    onClose: (refresh?: boolean) => void
}

export default function VoucherBatchModal({ onClose }: VoucherBatchModalProps) {
    const [products, setProducts] = useState<Product[]>([])
    const [devices, setDevices] = useState<Device[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)
    
    const [productId, setProductId] = useState('')
    const [deviceId, setDeviceId] = useState('')
    const [count, setCount] = useState('10')
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodRes, devRes] = await Promise.all([
                    api.get<PaginatedResponse<Product>>('/products', { params: { limit: 100 } }),
                    api.get<PaginatedResponse<Device>>('/devices', { params: { limit: 100 } })
                ])
                const hotspotProducts = prodRes.data.data.data.filter(p => p.category === 'hotspot')
                const deviceList = devRes.data.data.data

                setProducts(hotspotProducts)
                setDevices(deviceList)
                
                if (hotspotProducts.length > 0) {
                    setProductId(String(hotspotProducts[0].id))
                }
                if (deviceList.length > 0) {
                    setDeviceId(String(deviceList[0].id))
                }
            } catch (err) {
                console.error('Fetch data error:', err)
            } finally {
                setIsFetching(false)
            }
        }
        fetchData()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!productId || !deviceId || !count) return
        
        setIsLoading(true)
        setError('')
        try {
            await api.post('/vouchers/generate', {
                productId: Number(productId),
                deviceId: Number(deviceId),
                count: Number(count)
            })
            onClose(true)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal generate voucher')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={() => onClose()}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        <FontAwesomeIcon icon={['fas', 'ticket']} style={{ marginRight: '8px' }} />
                        Generate Batch Voucher
                    </h3>
                    <button className="modal-close" onClick={() => onClose()}>
                        <FontAwesomeIcon icon={['fas', 'xmark']} />
                    </button>
                </div>

                {isFetching ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <Spinner color="primary" />
                        <p style={{ marginTop: '12px', color: '#64748b' }}>Memuat data paket & router...</p>
                    </div>
                ) : (
                    <Form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {error && (
                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '20px', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} style={{ marginRight: '8px' }} />
                                    {error}
                                </div>
                            )}

                            <FormGroup>
                                <Label className="form-label">Pilih Paket Hotspot</Label>
                                <Input 
                                    type="select" 
                                    className="form-input" 
                                    value={productId} 
                                    onChange={(e) => setProductId(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Pilih Paket...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} - Rp {p.price.toLocaleString('id-ID')}</option>
                                    ))}
                                </Input>
                            </FormGroup>

                            <FormGroup>
                                <Label className="form-label">Target Router Mikrotik</Label>
                                <Input 
                                    type="select" 
                                    className="form-input" 
                                    value={deviceId} 
                                    onChange={(e) => setDeviceId(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Pilih Router...</option>
                                    {devices.map(d => (
                                        <option key={d.id} value={d.id}>{d.name} ({d.host})</option>
                                    ))}
                                </Input>
                            </FormGroup>

                            <FormGroup>
                                <Label className="form-label">Jumlah Voucher</Label>
                                <Input 
                                    type="number" 
                                    className="form-input" 
                                    value={count} 
                                    onChange={(e) => setCount(e.target.value)}
                                    min={1}
                                    max={100}
                                    required
                                />
                                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>Maksimal 100 voucher per batch untuk stabilitas sync Mikrotik.</p>
                            </FormGroup>

                            <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                                <p style={{ margin: 0, fontSize: '13px', color: '#475569', display: 'flex', gap: '8px' }}>
                                    <FontAwesomeIcon icon={['fas', 'circle-info']} style={{ marginTop: '3px', color: '#6366f1' }} />
                                    Voucher yang dibuat akan otomatis ditambahkan ke daftar <strong>IP Hotspot Users</strong> pada Router Mikrotik yang dipilih.
                                </p>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <Button type="button" color="secondary" outline onClick={() => onClose()} disabled={isLoading}>
                                Batal
                            </Button>
                            <Button type="submit" color="primary" disabled={isLoading || products.length === 0}>
                                {isLoading ? <><Spinner size="sm" /> Generating...</> : 'Generate Voucher'}
                            </Button>
                        </div>
                    </Form>
                )}
            </div>
        </div>
    )
}
