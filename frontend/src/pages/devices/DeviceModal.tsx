import { useState, useEffect } from 'react'
import api from '../../lib/axios'
import type { Device } from '../../types'

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
    const [form, setForm] = useState<FormData>({
        name: '',
        host: '',
        user: '',
        password: '',
        port: '8728',
    })
    const [errors, setErrors] = useState<Partial<FormData>>({})
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        if (device) {
            setForm({
                name: device.name,
                host: device.host,
                user: device.user,
                password: '',
                port: String(device.port),
            })
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
                name: form.name.trim(),
                host: form.host.trim(),
                user: form.user.trim(),
                port: Number(form.port),
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
            if (axiosErr.response?.data?.message) {
                setErrors({ name: axiosErr.response.data.message })
            }
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
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {isEdit ? '✏️ Edit Device' : '➕ Tambah Device'}
                    </h3>
                    <button className="modal-close" onClick={() => onClose()}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Name */}
                        <div className="form-group">
                            <label className="form-label">Nama Device <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input
                                className={`form-input ${errors.name ? 'input-error' : ''}`}
                                placeholder="Contoh: Router Utama"
                                value={form.name}
                                onChange={set('name')}
                            />
                            {errors.name && <span className="form-error">{errors.name}</span>}
                        </div>

                        {/* Host */}
                        <div className="form-group">
                            <label className="form-label">Host / IP Address <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input
                                className={`form-input ${errors.host ? 'input-error' : ''}`}
                                placeholder="Contoh: 192.168.1.1"
                                value={form.host}
                                onChange={set('host')}
                            />
                            {errors.host && <span className="form-error">{errors.host}</span>}
                        </div>

                        {/* User & Port */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="form-group">
                                <label className="form-label">User <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <input
                                    className={`form-input ${errors.user ? 'input-error' : ''}`}
                                    placeholder="Contoh: admin"
                                    value={form.user}
                                    onChange={set('user')}
                                />
                                {errors.user && <span className="form-error">{errors.user}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Port</label>
                                <input
                                    className={`form-input ${errors.port ? 'input-error' : ''}`}
                                    placeholder="8728"
                                    type="number"
                                    min={1}
                                    max={65535}
                                    value={form.port}
                                    onChange={set('port')}
                                />
                                {errors.port && <span className="form-error">{errors.port}</span>}
                            </div>
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <label className="form-label">
                                Password {!isEdit && <span style={{ color: 'var(--danger)' }}>*</span>}
                                {isEdit && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (kosongkan jika tidak diubah)</span>}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className={`form-input ${errors.password ? 'input-error' : ''}`}
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder={isEdit ? 'Kosongkan jika tidak diubah' : 'Masukkan password'}
                                    value={form.password}
                                    onChange={set('password')}
                                    style={{ paddingRight: '48px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(p => !p)}
                                    style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
                                        color: 'var(--text-muted)',
                                    }}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {errors.password && <span className="form-error">{errors.password}</span>}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={() => onClose()} disabled={isLoading}>
                            Batal
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading
                                ? <><span className="spinner" /> Menyimpan...</>
                                : isEdit ? '💾 Simpan Perubahan' : '➕ Tambah Device'
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
