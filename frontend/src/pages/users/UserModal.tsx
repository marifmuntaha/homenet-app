import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import {
    Form, FormGroup, Label, Input, FormFeedback,
    Button, Alert, Spinner, Row, Col,
} from 'reactstrap'
import api from '../../lib/axios'
import type { User } from '../../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import RSelect from '../../components/RSelect'

interface Props {
    user: User | null
    onClose: (refresh?: boolean) => void
}

const schema = z
    .object({
        name: z.string().min(2, 'Nama minimal 2 karakter'),
        email: z.string().email('Email tidak valid'),
        phone: z.string().optional(),
        role: z.number().int().min(1).max(2),
        password: z.string().optional(),
        password_confirmation: z.string().optional(),
        _isEdit: z.boolean(),
    })
    .superRefine((data, ctx) => {
        if (!data._isEdit) {
            if (!data.password || data.password.length < 8) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Password minimal 8 karakter', path: ['password'] })
            }
        } else if (data.password && data.password.length < 8) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Password minimal 8 karakter', path: ['password'] })
        }
        if (data.password && data.password !== data.password_confirmation) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Konfirmasi password tidak cocok', path: ['password_confirmation'] })
        }
    })

type FormData = z.infer<typeof schema>

const roleOptions = [
    { value: 2, label: 'Staff / Admin' },
    { value: 1, label: 'Administrator' },
]

export default function UserModal({ user, onClose }: Props) {
    const isEdit = !!user
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
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
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {isEdit
                            ? <><FontAwesomeIcon icon={['fas', 'pen-to-square']} /> Edit User</>
                            : <><FontAwesomeIcon icon={['fas', 'plus']} /> Tambah User</>}
                    </h3>
                    <button className="modal-close" onClick={() => onClose()}>
                        <FontAwesomeIcon icon={['fas', 'xmark']} />
                    </button>
                </div>

                <Form onSubmit={handleSubmit(onSubmit)}>
                    <div className="modal-body">
                        {error && (
                            <Alert color="danger" className="d-flex align-items-center gap-2 mb-3">
                                <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> {error}
                            </Alert>
                        )}

                        <Row>
                            <Col md={8}>
                                <FormGroup>
                                    <Label className="form-label">Nama Lengkap *</Label>
                                    <Input
                                        {...register('name')}
                                        invalid={!!errors.name}
                                        placeholder="John Doe"
                                        className="form-input"
                                    />
                                    <FormFeedback>
                                        <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> {errors.name?.message}
                                    </FormFeedback>
                                </FormGroup>
                            </Col>
                            <Col md={4}>
                                <FormGroup>
                                    <Label className="form-label">Role *</Label>
                                    <Controller
                                        name="role"
                                        control={control}
                                        render={({ field }) => (
                                            <RSelect
                                                inputId="role"
                                                options={roleOptions}
                                                value={roleOptions.find(o => o.value === field.value) ?? null}
                                                onChange={(opt) => field.onChange(opt?.value)}
                                                isInvalid={!!errors.role}
                                                placeholder="Pilih role..."
                                            />
                                        )}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <FormGroup>
                            <Label className="form-label">Email *</Label>
                            <Input
                                {...register('email')}
                                invalid={!!errors.email}
                                placeholder="nama@email.com"
                                type="email"
                                className="form-input"
                            />
                            <FormFeedback>
                                <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> {errors.email?.message}
                            </FormFeedback>
                        </FormGroup>

                        <FormGroup>
                            <Label className="form-label">
                                Nomor HP <span style={{ color: 'var(--text-muted)' }}>(opsional)</span>
                            </Label>
                            <Input
                                {...register('phone')}
                                className="form-input"
                                placeholder="+6281234567890"
                                type="tel"
                            />
                        </FormGroup>

                        <div
                            style={{
                                padding: '10px 14px',
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: '16px',
                                fontSize: '13px',
                                color: 'var(--text-muted)',
                                borderLeft: '3px solid var(--accent)',
                            }}
                        >
                            <FontAwesomeIcon icon={['fas', 'lock']} />{' '}
                            {isEdit ? 'Kosongkan password jika tidak ingin mengubahnya' : 'Password wajib diisi'}
                        </div>

                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label className="form-label">Password {!isEdit && '*'}</Label>
                                    <Input
                                        {...register('password')}
                                        invalid={!!errors.password}
                                        placeholder="••••••••"
                                        type="password"
                                        className="form-input"
                                    />
                                    <FormFeedback>
                                        <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> {errors.password?.message}
                                    </FormFeedback>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label className="form-label">Konfirmasi Password</Label>
                                    <Input
                                        {...register('password_confirmation')}
                                        invalid={!!errors.password_confirmation}
                                        placeholder="••••••••"
                                        type="password"
                                        className="form-input"
                                    />
                                    <FormFeedback>
                                        <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> {errors.password_confirmation?.message}
                                    </FormFeedback>
                                </FormGroup>
                            </Col>
                        </Row>
                    </div>

                    <div className="modal-footer">
                        <Button type="button" color="secondary" outline onClick={() => onClose()}>
                            Batal
                        </Button>
                        <Button type="submit" color="primary" disabled={isLoading}>
                            {isLoading ? (
                                <><Spinner size="sm" /> Menyimpan...</>
                            ) : isEdit ? (
                                <><FontAwesomeIcon icon={['fas', 'floppy-disk']} /> Simpan</>
                            ) : (
                                <><FontAwesomeIcon icon={['fas', 'plus']} /> Tambah</>
                            )}
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    )
}
