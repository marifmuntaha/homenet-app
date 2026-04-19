import { useState, useEffect } from 'react'
import {
    Form, FormGroup, Label, Input,
    Button, Spinner, Row, Col,
} from 'reactstrap'
import Select from 'react-select'
import api from '../../lib/axios'
import type { CustomerOnt } from '../../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface CustomerOption {
    value: number
    label: string
    pppoeUser?: string
}

interface DeviceOption {
    value: string      // device_id GenieACS
    label: string
    serial_number?: string
    product_class?: string
    manufacturer?: string
    last_inform?: string
    is_mapped: boolean
}

interface OntModalProps {
    ont: CustomerOnt | null
    onClose: (refresh?: boolean) => void
}

interface FormErrors {
    customer_id?: string
    genieacs_device_id?: string
    general?: string
}

export default function OntModal({ ont, onClose }: OntModalProps) {
    const isEdit = !!ont

    const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
    const [deviceOptions, setDeviceOptions] = useState<DeviceOption[]>([])
    const [loadingCustomers, setLoadingCustomers] = useState(true)
    const [loadingDevices, setLoadingDevices] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState<FormErrors>({})

    const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
    const [selectedDevice, setSelectedDevice] = useState<DeviceOption | null>(null)
    const [form, setForm] = useState({
        ont_label: ont?.ontLabel ?? '',
        serial_number: ont?.serialNumber ?? '',
    })

    useEffect(() => {
        // Load customers
        api.get('/customers', { params: { limit: 500 } }).then((res) => {
            const list: any[] = res.data.data?.data ?? []
            const opts: CustomerOption[] = list.map(c => ({
                value: c.id,
                label: c.fullName + (c.pppoeUser ? ` (${c.pppoeUser})` : ''),
                pppoeUser: c.pppoeUser,
            }))
            setCustomerOptions(opts)
            if (ont) {
                const found = opts.find(o => o.value === ont.customerId)
                if (found) setSelectedCustomer(found)
            }
        }).catch(() => { }).finally(() => setLoadingCustomers(false))

        // Load devices from GenieACS discover
        api.get('/onts/discover').then((res) => {
            const all: any[] = res.data.data?.all ?? []
            const opts: DeviceOption[] = all.map(d => ({
                value: d.device_id,
                label: d.serial_number ?? d.device_id,
                serial_number: d.serial_number,
                product_class: d.product_class,
                manufacturer: d.manufacturer,
                last_inform: d.last_inform,
                is_mapped: d.is_mapped,
            }))
            setDeviceOptions(opts)

            // Pre-select jika edit dan sudah ada device
            if (ont?.genieacsDeviceId) {
                const found = opts.find(o => o.value === ont.genieacsDeviceId)
                if (found) setSelectedDevice(found)
            }
        }).catch(() => { }).finally(() => setLoadingDevices(false))
    }, [ont])

    const selectStyles = {
        control: (base: any, state: any) => ({
            ...base,
            background: 'var(--bg-input, var(--surface))',
            border: `1px solid ${state.isFocused ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8,
            boxShadow: state.isFocused ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
            minHeight: 42,
            '&:hover': { borderColor: 'var(--accent)' },
        }),
        menu: (base: any) => ({
            ...base,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            zIndex: 9999,
        }),
        option: (base: any, state: any) => ({
            ...base,
            background: state.isSelected ? 'var(--accent)' : state.isFocused ? 'rgba(99,102,241,0.1)' : 'transparent',
            color: state.isSelected ? '#fff' : 'var(--text-primary)',
            fontSize: 14,
            cursor: 'pointer',
        }),
        singleValue: (base: any) => ({ ...base, color: 'var(--text-primary)', fontSize: 14 }),
        placeholder: (base: any) => ({ ...base, color: 'var(--text-muted)', fontSize: 14 }),
        input: (base: any) => ({ ...base, color: 'var(--text-primary)' }),
        noOptionsMessage: (base: any) => ({ ...base, color: 'var(--text-muted)', fontSize: 13 }),
        loadingMessage: (base: any) => ({ ...base, color: 'var(--text-muted)', fontSize: 13 }),
    }

    const deviceFormatOptionLabel = (opt: DeviceOption) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FontAwesomeIcon
                icon={['fas', 'router']}
                style={{ color: opt.is_mapped ? '#d97706' : '#16a34a', fontSize: 14, flexShrink: 0 }}
            />
            <div>
                <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
                    {opt.serial_number ?? opt.value}
                    {opt.is_mapped && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: '#d97706', fontFamily: 'sans-serif', fontWeight: 400 }}>
                            (sudah dimapping)
                        </span>
                    )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {opt.manufacturer} {opt.product_class}
                    {opt.last_inform && ` · ${new Date(opt.last_inform).toLocaleString('id-ID')}`}
                </div>
            </div>
        </div>
    )

    const validate = (): boolean => {
        const errs: FormErrors = {}
        if (!selectedCustomer) errs.customer_id = 'Pelanggan wajib dipilih'
        if (!form.serial_number && !selectedDevice) errs.genieacs_device_id = 'Serial Number atau Device ONT wajib diisi'
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setIsLoading(true)
        try {
            const serialNumber = selectedDevice?.serial_number ?? form.serial_number;
            const payload: any = {
                customer_id: selectedCustomer!.value,
                genieacs_device_id: selectedDevice?.value,
                serial_number: serialNumber || undefined,
                ont_label: form.ont_label.trim() || undefined,
            }
            if (isEdit) {
                await api.put(`/onts/${ont.id}`, payload)
            } else {
                await api.post('/onts', payload)
            }
            onClose(true)
        } catch (err: any) {
            const msg = err.response?.data?.message ?? 'Terjadi kesalahan, coba lagi.'
            setErrors({ general: msg })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={() => onClose()}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {isEdit
                            ? <><FontAwesomeIcon icon={['fas', 'pen-to-square']} /> Edit Mapping ONT</>
                            : <><FontAwesomeIcon icon={['fas', 'plus']} /> Tambah Mapping ONT</>}
                    </h3>
                    <button className="modal-close" onClick={() => onClose()}>
                        <FontAwesomeIcon icon={['fas', 'xmark']} />
                    </button>
                </div>

                <Form onSubmit={handleSubmit}>
                    <div className="modal-body">

                        {errors.general && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#dc2626', marginBottom: 16, fontSize: '13px' }}>
                                <FontAwesomeIcon icon={['fas', 'circle-exclamation']} style={{ marginRight: 6 }} />
                                {errors.general}
                            </div>
                        )}

                        {/* Pelanggan */}
                        <FormGroup>
                            <Label className="form-label">
                                Pelanggan <span style={{ color: 'var(--danger)' }}>*</span>
                            </Label>
                            <Select
                                options={customerOptions}
                                value={selectedCustomer}
                                onChange={(opt) => {
                                    setSelectedCustomer(opt)
                                    setErrors(e => ({ ...e, customer_id: undefined }))
                                }}
                                isLoading={loadingCustomers}
                                loadingMessage={() => 'Memuat pelanggan...'}
                                noOptionsMessage={() => 'Pelanggan tidak ditemukan'}
                                placeholder="Cari nama atau PPPoE user..."
                                isClearable
                                styles={selectStyles}
                            />
                            {errors.customer_id && (
                                <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 4 }}>{errors.customer_id}</div>
                            )}
                        </FormGroup>

                        {/* Device GenieACS */}
                        <FormGroup>
                            <Label className="form-label">
                                Device ONT dari GenieACS {!isEdit && <span style={{ color: 'var(--danger)' }}>*</span>}
                            </Label>
                            {loadingDevices ? (
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Spinner size="sm" /> Memuat device dari GenieACS...
                                </div>
                            ) : deviceOptions.length === 0 ? (
                                <div style={{ fontSize: 13, color: '#d97706', padding: '10px 14px', background: 'rgba(251,191,36,0.1)', borderRadius: 8, border: '1px solid rgba(251,191,36,0.3)' }}>
                                    <FontAwesomeIcon icon={['fas', 'circle-info']} style={{ marginRight: 6 }} />
                                    Belum ada device di GenieACS. Pastikan ONT sudah terhubung dan mengirim Inform.
                                </div>
                            ) : (
                                <Select
                                    options={deviceOptions}
                                    value={selectedDevice}
                                    onChange={(opt) => {
                                        setSelectedDevice(opt)
                                        setErrors(e => ({ ...e, genieacs_device_id: undefined }))
                                    }}
                                    formatOptionLabel={deviceFormatOptionLabel}
                                    getOptionValue={(o) => o.value}
                                    getOptionLabel={(o) => o.serial_number ?? o.value}
                                    noOptionsMessage={() => 'Device tidak ditemukan'}
                                    placeholder="Pilih device ONT..."
                                    isClearable
                                    styles={selectStyles}
                                />
                            )}
                            {errors.genieacs_device_id && (
                                <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 4 }}>{errors.genieacs_device_id}</div>
                            )}
                        </FormGroup>

                        {/* Serial Number (auto-fill atau manual) */}
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label className="form-label">
                                        Serial Number <span style={{ color: 'var(--danger)' }}>*</span>
                                    </Label>
                                    <Input
                                        className="form-input"
                                        placeholder="Contoh: ZTEGC123456"
                                        value={selectedDevice?.serial_number ?? form.serial_number}
                                        onChange={(e) => setForm(f => ({ ...f, serial_number: e.target.value }))}
                                        style={{ fontFamily: 'monospace', fontSize: 13 }}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label className="form-label">Label ONT</Label>
                                    <Input
                                        className="form-input"
                                        placeholder="Contoh: Rumah Pak Budi"
                                        value={form.ont_label}
                                        onChange={(e) => setForm(f => ({ ...f, ont_label: e.target.value }))}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                    </div>

                    <div className="modal-footer">
                        <Button type="button" color="secondary" outline onClick={() => onClose()} disabled={isLoading}>
                            Batal
                        </Button>
                        <Button type="submit" color="primary" disabled={isLoading}>
                            {isLoading
                                ? <><Spinner size="sm" /> Menyimpan...</>
                                : isEdit
                                    ? <><FontAwesomeIcon icon={['fas', 'floppy-disk']} /> Simpan</>
                                    : <><FontAwesomeIcon icon={['fas', 'link']} /> Tambah Mapping</>
                            }
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    )
}
