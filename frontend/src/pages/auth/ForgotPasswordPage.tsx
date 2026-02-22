import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import api from '../../lib/axios'

const forgotSchema = z.object({
    email: z.string().email('Email tidak valid'),
})

const resetSchema = z.object({
    email: z.string().email('Email tidak valid'),
    token: z.string().min(1, 'Token wajib diisi'),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    password_confirmation: z.string(),
}).refine((d) => d.password === d.password_confirmation, {
    message: 'Konfirmasi password tidak cocok',
    path: ['password_confirmation'],
})

type ForgotData = z.infer<typeof forgotSchema>
type ResetData = z.infer<typeof resetSchema>

export default function ForgotPasswordPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [devToken, setDevToken] = useState('')
    const mode = searchParams.get('mode') === 'reset' ? 'reset' : 'forgot'

    const forgotForm = useForm<ForgotData>({ resolver: zodResolver(forgotSchema) })
    const resetForm = useForm<ResetData>({ resolver: zodResolver(resetSchema) })

    const onForgot = async (data: ForgotData) => {
        setError('')
        setSuccess('')
        setIsLoading(true)
        try {
            const res = await api.post('/auth/forgot-password', data)
            setSuccess('Link reset password telah dikirim! Cek email Anda.')
            if (res.data.dev_token) {
                setDevToken(res.data.dev_token)
            }
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            setError(e.response?.data?.message ?? 'Terjadi kesalahan')
        } finally {
            setIsLoading(false)
        }
    }

    const onReset = async (data: ResetData) => {
        setError('')
        setIsLoading(true)
        try {
            await api.post('/auth/reset-password', data)
            navigate('/login?reset=success')
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            setError(e.response?.data?.message ?? 'Token tidak valid atau kedaluwarsa')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">🔑</div>
                    {mode === 'forgot' ? (
                        <>
                            <h2>Lupa Password</h2>
                            <p>Masukkan email Anda untuk reset password</p>
                        </>
                    ) : (
                        <>
                            <h2>Reset Password</h2>
                            <p>Masukkan token dan password baru Anda</p>
                        </>
                    )}
                </div>

                {error && <div className="alert alert-error"><span>⚠️</span> {error}</div>}
                {success && (
                    <div className="alert alert-success">
                        <span>✅</span> {success}
                    </div>
                )}

                {devToken && (
                    <div
                        className="alert"
                        style={{ background: 'var(--warning-light)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
                    >
                        <span style={{ fontWeight: 600 }}>🧪 Dev Mode — Token Reset:</span>
                        <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>{devToken}</code>
                        <button
                            className="btn btn-sm"
                            style={{ marginTop: 8, background: 'var(--warning)', color: 'white' }}
                            onClick={() => {
                                window.location.href = `/forgot-password?mode=reset`
                            }}
                        >
                            → Pergi ke halaman Reset
                        </button>
                    </div>
                )}

                {mode === 'forgot' ? (
                    <form onSubmit={forgotForm.handleSubmit(onForgot)}>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                {...forgotForm.register('email')}
                                className={`form-input ${forgotForm.formState.errors.email ? 'error' : ''}`}
                                placeholder="nama@email.com"
                                type="email"
                            />
                            {forgotForm.formState.errors.email && (
                                <p className="form-error">⚠ {forgotForm.formState.errors.email.message}</p>
                            )}
                        </div>

                        <button className="btn btn-primary btn-full" type="submit" disabled={isLoading}>
                            {isLoading ? <><span className="spinner" /> Mengirim...</> : 'Kirim Link Reset'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={resetForm.handleSubmit(onReset)}>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                {...resetForm.register('email')}
                                className={`form-input ${resetForm.formState.errors.email ? 'error' : ''}`}
                                placeholder="nama@email.com"
                                type="email"
                            />
                            {resetForm.formState.errors.email && (
                                <p className="form-error">⚠ {resetForm.formState.errors.email.message}</p>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Token Reset</label>
                            <input
                                {...resetForm.register('token')}
                                className={`form-input ${resetForm.formState.errors.token ? 'error' : ''}`}
                                placeholder="Paste token dari email"
                            />
                            {resetForm.formState.errors.token && (
                                <p className="form-error">⚠ {resetForm.formState.errors.token.message}</p>
                            )}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Password Baru</label>
                                <input
                                    {...resetForm.register('password')}
                                    className={`form-input ${resetForm.formState.errors.password ? 'error' : ''}`}
                                    placeholder="••••••••"
                                    type="password"
                                />
                                {resetForm.formState.errors.password && (
                                    <p className="form-error">⚠ {resetForm.formState.errors.password.message}</p>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Konfirmasi Password</label>
                                <input
                                    {...resetForm.register('password_confirmation')}
                                    className={`form-input ${resetForm.formState.errors.password_confirmation ? 'error' : ''}`}
                                    placeholder="••••••••"
                                    type="password"
                                />
                                {resetForm.formState.errors.password_confirmation && (
                                    <p className="form-error">⚠ {resetForm.formState.errors.password_confirmation.message}</p>
                                )}
                            </div>
                        </div>

                        <button className="btn btn-primary btn-full" type="submit" disabled={isLoading}>
                            {isLoading ? <><span className="spinner" /> Menyimpan...</> : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    <Link to="/login">← Kembali ke Login</Link>
                </div>
            </div>
        </div>
    )
}
