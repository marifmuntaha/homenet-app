import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../../lib/axios'
import { useAuth } from '../../contexts/AuthContext'
import type { AuthResponse } from '../../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const registerSchema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    email: z.string().email('Email tidak valid'),
    phone: z.string().min(10, 'Nomor HP tidak valid'),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    password_confirmation: z.string(),
}).refine((d) => d.password === d.password_confirmation, {
    message: 'Konfirmasi password tidak cocok',
    path: ['password_confirmation'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [step, setStep] = useState<'register' | 'otp'>('register')
    const [registeredEmail, setRegisteredEmail] = useState('')
    const [otpCode, setOtpCode] = useState('')
    const [resendTimer, setResendTimer] = useState(0)

    useEffect(() => {
        let timer: any
        if (resendTimer > 0) {
            timer = setInterval(() => {
                setResendTimer((prev) => prev - 1)
            }, 1000)
        }
        return () => clearInterval(timer)
    }, [resendTimer])

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

    const onRegisterSubmit = async (data: RegisterFormData) => {
        setError('')
        setIsLoading(true)
        try {
            const res = await api.post<{ success: boolean; message: string; data: { requires_otp: boolean; email: string } }>('/auth/register', data)
            if (res.data.data.requires_otp) {
                setRegisteredEmail(res.data.data.email)
                setStep('otp')
                setResendTimer(60)
            }
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            setError(e.response?.data?.message ?? 'Terjadi kesalahan, coba lagi')
        } finally {
            setIsLoading(false)
        }
    }

    const onOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccessMessage('')
        setIsLoading(true)
        try {
            const res = await api.post<AuthResponse>('/auth/verify-otp', {
                email: registeredEmail,
                otp_code: otpCode
            })
            login(res.data.data.user, res.data.data.token)
            navigate('/users')
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            setError(e.response?.data?.message ?? 'Kode OTP tidak valid')
        } finally {
            setIsLoading(false)
        }
    }

    const onResendOtp = async () => {
        if (resendTimer > 0) return
        setError('')
        setSuccessMessage('')
        setIsLoading(true)
        try {
            await api.post('/auth/resend-otp', { email: registeredEmail })
            setSuccessMessage('Kode OTP baru telah dikirim ke WhatsApp Anda')
            setResendTimer(60)
            setOtpCode('')
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            setError(e.response?.data?.message ?? 'Gagal mengirim ulang OTP')
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
                    <h2>{step === 'register' ? 'Buat Akun Baru' : 'Verifikasi Nomor WhatsApp'}</h2>
                    <p>{step === 'register' ? 'Daftarkan diri Anda di Homenet' : 'Masukkan 6 digit kode OTP yang telah dikirim ke WhatsApp Anda.'}</p>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> {error}
                    </div>
                )}

                {successMessage && (
                    <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                        <FontAwesomeIcon icon={['fas', 'circle-check']} /> {successMessage}
                    </div>
                )}

                {step === 'register' ? (
                    <form onSubmit={handleSubmit(onRegisterSubmit)}>
                        <div className="form-group">
                            <label className="form-label">Nama Lengkap</label>
                            <input
                                {...register('name')}
                                className={`form-input ${errors.name ? 'error' : ''}`}
                                placeholder="John Doe"
                            />
                            {errors.name && <p className="form-error"><FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> {errors.name.message}</p>}
                        </div>

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
                            <label className="form-label">Nomor HP / WhatsApp Active</label>
                            <input
                                {...register('phone')}
                                className={`form-input ${errors.phone ? 'error' : ''}`}
                                placeholder="081234567890"
                                type="tel"
                            />
                            {errors.phone && <p className="form-error"><FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> {errors.phone.message}</p>}
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
                                {errors.password && <p className="form-error"><FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> {errors.password.message}</p>}
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
                                    <p className="form-error"><FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> {errors.password_confirmation.message}</p>
                                )}
                            </div>
                        </div>

                        <button className="btn btn-primary btn-full" type="submit" disabled={isLoading}>
                            {isLoading ? <><span className="spinner" /> Sedang Mendaftar...</> : 'Daftar Sekarang'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={onOtpSubmit}>
                        <div className="form-group" style={{ textAlign: 'center' }}>
                            <label className="form-label" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Kode OTP (6 Digit)</label>
                            <input
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                className="form-input"
                                placeholder="123456"
                                type="text"
                                style={{ fontSize: '2rem', letterSpacing: '0.5rem', textAlign: 'center', height: '60px' }}
                                required
                            />
                        </div>
                        <button className="btn btn-primary btn-full" type="submit" disabled={isLoading || otpCode.length < 6}>
                            {isLoading ? <><span className="spinner" /> Memverifikasi...</> : 'Verifikasi OTP'}
                        </button>

                        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Tidak menerima kode?{' '}
                                <button
                                    type="button"
                                    onClick={onResendOtp}
                                    disabled={isLoading || resendTimer > 0}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: resendTimer > 0 ? 'var(--text-muted)' : 'var(--primary-color)',
                                        cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold',
                                        padding: 0,
                                        textDecoration: resendTimer > 0 ? 'none' : 'underline'
                                    }}
                                >
                                    {resendTimer > 0 ? `Kirim Ulang (${resendTimer}s)` : 'Kirim Ulang'}
                                </button>
                            </p>
                        </div>
                    </form>
                )}

                {step === 'register' && (
                    <div className="auth-footer">
                        Sudah punya akun? <Link to="/login">Masuk</Link>
                    </div>
                )}
            </div>
        </div>
    )
}


