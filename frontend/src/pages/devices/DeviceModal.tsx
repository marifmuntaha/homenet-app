import { useState, useEffect } from 'react'
import {
    Form, FormGroup, Label, Input, FormFeedback,
    Button, Spinner, Row, Col,
} from 'reactstrap'
import api from '../../lib/axios'
import type { Device } from '../../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface DeviceModalProps {
    device: Device | null
    onClose: (refresh?: boolean) => void
}

interface FormData {
    name: string
    host: string
    user: string
    password: string
    port: string
}

export default function DeviceModal({ device, onClose }: DeviceModalProps) {
    const isEdit = !!device
    const [form, setForm] = useState<FormData>({ name: '', host: '', user: '', password: '', port: '8728' })
    const [errors, setErrors] = useState<Partial<FormData>>({})
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        if (device) {
            setForm({ name: device.name, host: device.host, user: device.user, password: '', port: String(device.port) })
        } else {
            setForm({ name: '', host: '', user: '', password: '', port: '8728' })
            setErrors({})
        }
    }, [device])

    const validate = (): boolean => {
        const errs: Partial<FormData> = {}
        if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Nama minimal 2 karakter'
        if (!form.host.trim()) errs.host = 'Host wajib diisi'
        if (!form.user.trim()) errs.user = 'User wajib diisi'
        if (!isEdit && !form.password) errs.password = 'Password wajib diisi'
        const port = Number(form.port)
        if (!form.port || isNaN(port) || port < 1 || port > 65535) errs.port = 'Port harus angka 1–65535'
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setIsLoading(true)
        try {
            const payload: Record<string, string | number> = {
                name: form.name.trim(), host: form.host.trim(), user: form.user.trim(), port: Number(form.port),
            }
            if (form.password) payload.password = form.password
            if (isEdit) {
                await api.put(`/devices/${device.id}`, payload)
            } else {
                await api.post('/devices', payload)
            }
            onClose(true)
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } }
            if (axiosErr.response?.data?.message) setErrors({ name: axiosErr.response.data.message })
        } finally {
            setIsLoading(false)
        }
    }

    const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }))
        setErrors(prev => ({ ...prev, [field]: undefined }))
    }

    return (
        <div className="modal-overlay" onClick={() => onClose()}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {isEdit
                            ? <><FontAwesomeIcon icon={['fas', 'pen-to-square']} /> Edit Device</>
                            : <><FontAwesomeIcon icon={['fas', 'plus']} /> Tambah Device</>}
                    </h3>
                    <button className="modal-close" onClick={() => onClose()}>
                        <FontAwesomeIcon icon={['fas', 'xmark']} />
                    </button>
                </div>

                <Form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <FormGroup>
                            <Label className="form-label">
                                Nama Device <span style={{ color: 'var(--danger)' }}>*</span>
                            </Label>
                            <Input
                                className="form-input"
                                placeholder="Contoh: Router Utama"
                                value={form.name}
                                onChange={set('name')}
                                invalid={!!errors.name}
                            />
                            <FormFeedback>{errors.name}</FormFeedback>
                        </FormGroup>

                        <FormGroup>
                            <Label className="form-label">
                                Host / IP Address <span style={{ color: 'var(--danger)' }}>*</span>
                            </Label>
                            <Input
                                className="form-input"
                                placeholder="Contoh: 192.168.1.1"
                                value={form.host}
                                onChange={set('host')}
                                invalid={!!errors.host}
                            />
                            <FormFeedback>{errors.host}</FormFeedback>
                        </FormGroup>

                        <Row>
                            <Col md={8}>
                                <FormGroup>
                                    <Label className="form-label">
                                        User <span style={{ color: 'var(--danger)' }}>*</span>
                                    </Label>
                                    <Input
                                        className="form-input"
                                        placeholder="Contoh: admin"
                                        value={form.user}
                                        onChange={set('user')}
                                        invalid={!!errors.user}
                                    />
                                    <FormFeedback>{errors.user}</FormFeedback>
                                </FormGroup>
                            </Col>
                            <Col md={4}>
                                <FormGroup>
                                    <Label className="form-label">Port</Label>
                                    <Input
                                        className="form-input"
                                        placeholder="8728"
                                        type="number"
                                        min={1}
                                        max={65535}
                                        value={form.port}
                                        onChange={set('port')}
                                        invalid={!!errors.port}
                                    />
                                    <FormFeedback>{errors.port}</FormFeedback>
                                </FormGroup>
                            </Col>
                        </Row>

                        <FormGroup>
                            <Label className="form-label">
                                Password
                                {!isEdit && <span style={{ color: 'var(--danger)' }}> *</span>}
                                {isEdit && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (kosongkan jika tidak diubah)</span>}
                            </Label>
                            <div style={{ position: 'relative' }}>
                                <Input
                                    className="form-input"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder={isEdit ? 'Kosongkan jika tidak diubah' : 'Masukkan password'}
                                    value={form.password}
                                    onChange={set('password')}
                                    invalid={!!errors.password}
                                    style={{ paddingRight: '48px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(p => !p)}
                                    style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                                        color: 'var(--text-muted)', zIndex: 2,
                                    }}
                                >
                                    <FontAwesomeIcon icon={['fas', showPassword ? 'eye-slash' : 'eye']} />
                                </button>
                            </div>
                            {errors.password && <div className="text-danger mt-1" style={{ fontSize: 13 }}>{errors.password}</div>}
                        </FormGroup>
                    </div>

                    <div className="modal-footer">
                        <Button type="button" color="secondary" outline onClick={() => onClose()} disabled={isLoading}>
                            Batal
                        </Button>
                        <Button type="submit" color="primary" disabled={isLoading}>
                            {isLoading
                                ? <><Spinner size="sm" /> Menyimpan...</>
                                : isEdit
                                    ? <><FontAwesomeIcon icon={['fas', 'floppy-disk']} /> Simpan Perubahan</>
                                    : <><FontAwesomeIcon icon={['fas', 'plus']} /> Tambah Device</>
                            }
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    )
}
