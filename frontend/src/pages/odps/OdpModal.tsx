import React, { useState, useEffect } from 'react'
import { Form, FormGroup, Label, Input, FormFeedback, Button, Spinner } from 'reactstrap'
import api from '../../lib/axios'
import LocationPicker from '../../components/LocationPicker'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import RSelect from '../../components/RSelect'

export interface Odp {
    id: number
    parentId: number | null
    name: string
    description: string | null
    latitude: number | null
    longitude: number | null
    parent?: Odp
}

interface OdpModalProps {
    isOpen: boolean
    onClose: (shouldRefresh?: boolean) => void
    odp: Odp | null
    allOdps: Odp[] // List of all ODPs to select as parent
}

export default function OdpModal({ isOpen, onClose, odp, allOdps }: OdpModalProps) {
    const isEdit = !!odp
    const [loading, setLoading] = useState(false)

    const [parentId, setParentId] = useState<number | null>(null)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [latitude, setLatitude] = useState<number | null>(null)
    const [longitude, setLongitude] = useState<number | null>(null)
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (odp && isOpen) {
            setParentId(odp.parentId)
            setName(odp.name)
            setDescription(odp.description || '')
            setLatitude(odp.latitude ? Number(odp.latitude) : null)
            setLongitude(odp.longitude ? Number(odp.longitude) : null)
        } else if (!odp) {
            setParentId(null)
            setName('')
            setDescription('')
            setLatitude(null)
            setLongitude(null)
            setErrors({})
        }
    }, [odp, isOpen])

    // Filter out self and children if edit mode to prevent circular dependency
    const availableParents = allOdps.filter(o => {
        if (!isEdit) return true
        if (o.id === odp.id) return false // can't be its own parent
        return true // For deep circular check, we'd need a recursive tree check, keeping it simple here
    })

    const parentOptions = availableParents.map(p => ({
        value: p.id,
        label: p.name,
    }))

    const validate = () => {
        const newErrs: Record<string, string> = {}
        if (!name) newErrs.name = 'Nama ODP wajib diisi'
        setErrors(newErrs)
        return Object.keys(newErrs).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setLoading(true)
        try {
            const payload = { parentId, name, description, latitude, longitude }
            if (isEdit) {
                await api.put(`/odps/${odp.id}`, payload)
            } else {
                await api.post('/odps', payload)
            }
            onClose(true)
        } catch (err: any) {
            if (err.response?.status === 422) {
                const apiErrors: Record<string, string> = {}
                err.response.data.errors.forEach((e: any) => { apiErrors[e.field] = e.message })
                setErrors(apiErrors)
            } else if (err.response?.status === 400) {
                alert(err.response.data.message)
            } else {
                alert('Terjadi kesalahan')
            }
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: '820px', width: '92%' }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {isEdit
                            ? <><FontAwesomeIcon icon={['fas', 'pen-to-square']} /> Edit ODP</>
                            : <><FontAwesomeIcon icon={['fas', 'sitemap']} /> Tambah ODP Baru</>}
                    </h3>
                    <button className="modal-close" onClick={() => onClose()}>
                        <FontAwesomeIcon icon={['fas', 'xmark']} />
                    </button>
                </div>

                <Form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 1fr', gap: '24px' }}>
                        <div>
                            <div>
                                <h6 style={{ marginBottom: 12, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FontAwesomeIcon icon={['fas', 'info-circle']} style={{ color: 'var(--accent)' }} /> Informasi ODP
                                </h6>
                                <FormGroup>
                                    <Label className="form-label">Parent ODP (Opsional)</Label>
                                    <RSelect
                                        options={parentOptions}
                                        value={parentOptions.find(o => o.value === parentId) ?? null}
                                        onChange={(opt) => setParentId(opt?.value ?? null)}
                                        placeholder="-- Pilih Root / Parent ODP --"
                                        isClearable
                                    />
                                    <small style={{ color: 'var(--text-muted)' }}>Biarkan kosong jika ini ODP root / utama.</small>
                                </FormGroup>
                                <FormGroup>
                                    <Label className="form-label">Nama / Kode ODP *</Label>
                                    <Input
                                        type="text"
                                        className="form-input"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="ODP-01"
                                        invalid={!!errors.name}
                                    />
                                    <FormFeedback>{errors.name}</FormFeedback>
                                </FormGroup>
                                <FormGroup>
                                    <Label className="form-label">Deskripsi / Area</Label>
                                    <Input
                                        type="textarea"
                                        className="form-input"
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Misal: Area Perumahan Blok A"
                                    />
                                </FormGroup>
                            </div>
                        </div>

                        <div>
                            <div style={{ marginBottom: '24px' }}>
                                <h6 style={{ marginBottom: 12, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FontAwesomeIcon icon={['fas', 'map-location-dot']} style={{ color: 'var(--accent)' }} /> Titik Koordinat Maps
                                </h6>
                                <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 10 }}>
                                    Pilih lokasi pada peta untuk menentukan letak koordinat ODP di lapangan.
                                </small>
                                <LocationPicker
                                    latitude={latitude}
                                    longitude={longitude}
                                    onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng) }}
                                />
                                {latitude && longitude && (
                                    <small style={{ display: 'block', marginTop: 8, color: 'var(--success)' }}>
                                        <FontAwesomeIcon icon={['fas', 'circle-check']} /> Terpilih: {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
                                    </small>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <Button type="button" color="secondary" outline onClick={() => onClose()}>
                            Batal
                        </Button>
                        <Button type="submit" color="primary" disabled={loading}>
                            {loading
                                ? <><Spinner size="sm" /> Menyimpan...</>
                                : <><FontAwesomeIcon icon={['fas', 'floppy-disk']} /> Simpan ODP</>
                            }
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    )
}
