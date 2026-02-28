import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import api from '../../lib/axios'
import { useAuth } from '../../contexts/AuthContext'
import type { AuthResponse } from '../../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const schema = z.object({
    email: z.string().email('Email tidak valid'),
    password: z.string().min(1, 'Password wajib diisi'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
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
            const res = await api.post<AuthResponse>('/auth/login', data)
            login(res.data.data.user, res.data.data.token)
            navigate('/users')
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            setError(e.response?.data?.message ?? 'Email atau password salah')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">
                        <FontAwesomeIcon icon={['fas', 'wifi']} />
                    </div>
                    <h2>Selamat Datang Kembali</h2>
                    <p>Masuk ke akun Homenet Anda</p>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            {...register('email')}
                            className={`form-input ${errors.email ? 'error' : ''}`}
                            placeholder="nama@email.com"
                            type="email"
                        />
                        {errors.email && <p className="form-error"><FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> {errors.email.message}</p>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            {...register('password')}
                            className={`form-input ${errors.password ? 'error' : ''}`}
                            placeholder="••••••••"
                            type="password"
                        />
                        {errors.password && <p className="form-error"><FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> {errors.password.message}</p>}
                    </div>

                    <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                        <Link to="/forgot-password" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none' }}>
                            Lupa password?
                        </Link>
                    </div>

                    <button className="btn btn-primary btn-full" type="submit" disabled={isLoading}>
                        {isLoading ? <><span className="spinner" /> Masuk...</> : 'Masuk'}
                    </button>
                </form>

                <div className="auth-footer">
                    Belum punya akun? <Link to="/register">Daftar sekarang</Link>
                </div>
            </div>
        </div>
    )
}
