import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import api from '../../lib/axios'
import { useAuth } from '../../contexts/AuthContext'
import type { AuthResponse } from '../../types'

const schema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    email: z.string().email('Email tidak valid'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    password_confirmation: z.string(),
}).refine((d) => d.password === d.password_confirmation, {
    message: 'Konfirmasi password tidak cocok',
    path: ['password_confirmation'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) })

    const onSubmit = async (data: FormData) => {
        setError('')
        setIsLoading(true)
        try {
            const res = await api.post<AuthResponse>('/auth/register', data)
            login(res.data.data.user, res.data.data.token)
            navigate('/users')
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            setError(e.response?.data?.message ?? 'Terjadi kesalahan, coba lagi')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">🏠</div>
                    <h2>Buat Akun Baru</h2>
                    <p>Daftarkan diri Anda di Homenet</p>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="form-group">
                        <label className="form-label">Nama Lengkap</label>
                        <input
                            {...register('name')}
                            className={`form-input ${errors.name ? 'error' : ''}`}
                            placeholder="John Doe"
                        />
                        {errors.name && <p className="form-error">⚠ {errors.name.message}</p>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            {...register('email')}
                            className={`form-input ${errors.email ? 'error' : ''}`}
                            placeholder="nama@email.com"
                            type="email"
                        />
                        {errors.email && <p className="form-error">⚠ {errors.email.message}</p>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Nomor HP <span style={{ color: 'var(--text-muted)' }}>(opsional)</span></label>
                        <input
                            {...register('phone')}
                            className="form-input"
                            placeholder="+6281234567890"
                            type="tel"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Password</label>
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

                    <button className="btn btn-primary btn-full" type="submit" disabled={isLoading}>
                        {isLoading ? <><span className="spinner" /> Mendaftar...</> : 'Daftar Sekarang'}
                    </button>
                </form>

                <div className="auth-footer">
                    Sudah punya akun? <Link to="/login">Masuk</Link>
                </div>
            </div>
        </div>
    )
}
