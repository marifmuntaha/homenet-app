import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import api from '../../lib/axios'
import type { User } from '../../types'

interface Props {
    user: User | null
    onClose: (refresh?: boolean) => void
}

// Satu schema universal; validasi "required" pada password dikondisikan via superRefine di runtime
const schema = z
    .object({
        name: z.string().min(2, 'Nama minimal 2 karakter'),
        email: z.string().email('Email tidak valid'),
        phone: z.string().optional(),
        role: z.number().int().min(1).max(2),
        password: z.string().optional(),
        password_confirmation: z.string().optional(),
        // flag untuk mode, tidak dikirim ke API
        _isEdit: z.boolean(),
    })
    .superRefine((data, ctx) => {
        if (!data._isEdit) {
            // Saat create: password wajib dan min 8 karakter
            if (!data.password || data.password.length < 8) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Password minimal 8 karakter',
                    path: ['password'],
                })
            }
        } else if (data.password) {
            // Saat edit: jika password diisi, minimal 8 karakter
            if (data.password.length < 8) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Password minimal 8 karakter',
                    path: ['password'],
                })
            }
        }

        // Konfirmasi password harus cocok jika password diisi
        if (data.password && data.password !== data.password_confirmation) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Konfirmasi password tidak cocok',
                path: ['password_confirmation'],
            })
        }
    })

type FormData = z.infer<typeof schema>

export default function UserModal({ user, onClose }: Props) {
    const isEdit = !!user
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: user?.name ?? '',
            email: user?.email ?? '',
            phone: user?.phone ?? '',
            role: user?.role ?? 2,
            password: '',
            password_confirmation: '',
            _isEdit: isEdit,
        },
    })

    useEffect(() => {
        if (user) {
            reset({
                name: user.name,
                email: user.email,
                phone: user.phone ?? '',
                role: user.role,
                password: '',
                password_confirmation: '',
                _isEdit: true,
            })
        }
    }, [user, reset])

    const onSubmit = async (data: FormData) => {
        setError('')
        setIsLoading(true)
        try {
            const payload: Record<string, unknown> = {
                name: data.name,
                email: data.email,
                phone: data.phone ?? undefined,
                role: data.role,
            }

            if (data.password) {
                payload.password = data.password
                payload.password_confirmation = data.password_confirmation
            }

            if (isEdit) {
                await api.put(`/users/${user.id}`, payload)
            } else {
                await api.post('/users', payload)
            }

            onClose(true)
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            setError(e.response?.data?.message ?? 'Terjadi kesalahan')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">{isEdit ? '✏️ Edit User' : '➕ Tambah User'}</h3>
                    <button className="modal-close" onClick={() => onClose()}>
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="modal-body">
                        {error && (
                            <div className="alert alert-error">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Nama Lengkap *</label>
                                <input
                                    {...register('name')}
                                    className={`form-input ${errors.name ? 'error' : ''}`}
                                    placeholder="John Doe"
                                />
                                {errors.name && <p className="form-error">⚠ {errors.name.message}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Role *</label>
                                <select {...register('role', { valueAsNumber: true })} className="form-select">
                                    <option value={2}>🧑 Customer</option>
                                    <option value={1}>👑 Administrator</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email *</label>
                            <input
                                {...register('email')}
                                className={`form-input ${errors.email ? 'error' : ''}`}
                                placeholder="nama@email.com"
                                type="email"
                            />
                            {errors.email && <p className="form-error">⚠ {errors.email.message}</p>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Nomor HP <span style={{ color: 'var(--text-muted)' }}>(opsional)</span>
                            </label>
                            <input
                                {...register('phone')}
                                className="form-input"
                                placeholder="+6281234567890"
                                type="tel"
                            />
                        </div>

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
                            {isEdit
                                ? '🔒 Kosongkan password jika tidak ingin mengubahnya'
                                : '🔒 Password wajib diisi'}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Password {!isEdit && '*'}</label>
                                <input
                                    {...register('password')}
                                    className={`form-input ${errors.password ? 'error' : ''}`}
                                    placeholder="••••••••"
                                    type="password"
                                />
                                {errors.password && <p className="form-error">⚠ {errors.password.message}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Konfirmasi Password</label>
                                <input
                                    {...register('password_confirmation')}
                                    className={`form-input ${errors.password_confirmation ? 'error' : ''}`}
                                    placeholder="••••••••"
                                    type="password"
                                />
                                {errors.password_confirmation && (
                                    <p className="form-error">⚠ {errors.password_confirmation.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={() => onClose()}>
                            Batal
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <span className="spinner" /> Menyimpan...
                                </>
                            ) : isEdit ? (
                                '💾 Simpan'
                            ) : (
                                '➕ Tambah'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
