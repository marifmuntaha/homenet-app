import React, { useState, useEffect, useCallback } from 'react'
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    Alert, ActivityIndicator, RefreshControl, Modal,
    KeyboardAvoidingView, Platform, ScrollView, TextInput,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import api from '@/lib/api'
import type { Customer, PaginatedResponse, Product } from '@/types'

const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

export default function CustomersScreen() {
    const insets = useSafeAreaInsets()
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [showModal, setShowModal] = useState(false)
    const [editTarget, setEditTarget] = useState<Customer | null>(null)

    const fetchCustomers = useCallback(async (p = 1, q = search) => {
        try {
            const res = await api.get<PaginatedResponse<Customer>>(`/customers?page=${p}&search=${q}`)
            const list = res.data.data?.data ?? []
            const meta = res.data.data?.meta as any
            setCustomers(p === 1 ? list : prev => [...prev, ...list])
            setLastPage(meta?.last_page ?? 1)
            setPage(p)
        } catch { } finally { setLoading(false); setRefreshing(false) }
    }, [search])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    const handleDelete = (c: Customer) => {
        Alert.alert('Hapus Pelanggan', `Hapus "${c.fullName}"?`, [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Hapus', style: 'destructive', onPress: async () => {
                    try { await api.delete(`/customers/${c.id}`); fetchCustomers(1) }
                    catch { Alert.alert('Error', 'Gagal menghapus pelanggan') }
                },
            },
        ])
    }

    const renderItem = ({ item }: { item: Customer }) => {
        const sub = item.subscriptions?.find(s => s.status === 'active')
        return (
            <View style={styles.item}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.fullName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.fullName}</Text>
                    <View style={styles.itemMeta}>
                        <Ionicons name="call-outline" size={11} color="#64748b" />
                        <Text style={styles.itemSub}>{item.phone}</Text>
                    </View>
                    {item.pppoeUser ? (
                        <View style={styles.itemMeta}>
                            <Ionicons name="key-outline" size={11} color="#818cf8" />
                            <Text style={styles.itemPppoe}>{item.pppoeUser}</Text>
                        </View>
                    ) : null}
                    {sub ? (
                        <View style={styles.itemMeta}>
                            <Ionicons name="cube-outline" size={11} color="#34d399" />
                            <Text style={styles.itemPkg}>{sub.product?.name} · {formatCurrency(sub.product?.price ?? 0)}</Text>
                        </View>
                    ) : null}
                </View>
                <View style={styles.itemBtns}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => { setEditTarget(item); setShowModal(true) }}>
                        <Ionicons name="create-outline" size={17} color="#818cf8" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconBtn, styles.iconBtnRed]} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash-outline" size={17} color="#f87171" />
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            {/* Toolbar */}
            <View style={styles.toolbar}>
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={16} color="#475569" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Cari pelanggan..."
                        placeholderTextColor="#64748b"
                        value={search}
                        onChangeText={setSearch}
                        autoCapitalize="none"
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={16} color="#475569" />
                        </TouchableOpacity>
                    ) : null}
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => { setEditTarget(null); setShowModal(true) }}
                >
                    <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loaderBox}><ActivityIndicator color="#818cf8" size="large" /></View>
            ) : (
                <FlatList
                    data={customers}
                    keyExtractor={(i) => String(i.id)}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 12, gap: 8 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCustomers(1) }} tintColor="#818cf8" />}
                    onEndReached={() => { if (page < lastPage) fetchCustomers(page + 1) }}
                    onEndReachedThreshold={0.4}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ionicons name="people-outline" size={40} color="#1f2937" />
                            <Text style={styles.emptyText}>Tidak ada pelanggan</Text>
                        </View>
                    }
                />
            )}

            <CustomerModal
                visible={showModal}
                customer={editTarget}
                onClose={(refresh) => { setShowModal(false); if (refresh) fetchCustomers(1) }}
            />
        </View>
    )
}

// ─── Customer Modal ────────────────────────────────────────────────────────────
function CustomerModal({ visible, customer, onClose }: {
    visible: boolean; customer: Customer | null; onClose: (r?: boolean) => void
}) {
    const isEdit = !!customer
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [pppoeUser, setPppoeUser] = useState('')
    const [pppoePassword, setPppoePassword] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [products, setProducts] = useState<Product[]>([])
    const [productId, setProductId] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const [showProducts, setShowProducts] = useState(false)

    useEffect(() => {
        if (!visible) return
        api.get<any>('/products').then(res => {
            const raw = res.data?.data
            setProducts(Array.isArray(raw) ? raw : (raw?.data ?? []))
        }).catch(() => { })
        if (customer) {
            setFullName(customer.fullName); setPhone(customer.phone)
            setAddress(customer.address || ''); setPppoeUser(customer.pppoeUser || '')
            setPppoePassword(''); setEmail(''); setPassword('')
            const sub = customer.subscriptions?.find(s => s.status === 'active')
            setProductId(sub?.product_id ?? null)
        } else {
            setFullName(''); setPhone(''); setAddress(''); setPppoeUser('')
            setPppoePassword(''); setEmail(''); setPassword(''); setProductId(null)
        }
    }, [visible, customer])

    const handleSave = async () => {
        if (!fullName || !phone) { Alert.alert('Error', 'Nama dan No HP wajib diisi'); return }
        if (!isEdit && (!email || !password || !productId)) {
            Alert.alert('Error', 'Email, Password, dan Produk wajib untuk pelanggan baru'); return
        }
        setLoading(true)
        try {
            const payload: any = { fullName, phone, address, pppoeUser: pppoeUser || null, pppoePassword: pppoePassword || null }
            if (isEdit) { await api.put(`/customers/${customer.id}`, payload) }
            else { await api.post('/customers', { ...payload, email, password, productId }) }
            onClose(true)
        } catch (err: any) { Alert.alert('Error', err.response?.data?.message || 'Gagal menyimpan') }
        finally { setLoading(false) }
    }

    const selectedProduct = products.find(p => p.id === productId)

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <KeyboardAvoidingView style={mStyles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={mStyles.header}>
                    <View style={mStyles.headerLeft}>
                        <Ionicons name={isEdit ? 'create-outline' : 'person-add-outline'} size={20} color="#818cf8" />
                        <Text style={mStyles.title}>{isEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => onClose()} style={mStyles.closeBtn}>
                        <Ionicons name="close" size={22} color="#64748b" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={mStyles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {!isEdit && (
                        <View style={mStyles.section}>
                            <Text style={mStyles.sectionTitle}>Akun Login</Text>
                            <MField label="Email" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="email@domain.com" />
                            <MField label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry placeholder="Minimal 8 karakter" />
                        </View>
                    )}

                    <View style={mStyles.section}>
                        <Text style={mStyles.sectionTitle}>Data Pelanggan</Text>
                        <MField label="Nama Lengkap *" icon="person-outline" value={fullName} onChangeText={setFullName} />
                        <MField label="No. WhatsApp *" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                        <MField label="Alamat" icon="location-outline" value={address} onChangeText={setAddress} multiline />
                    </View>

                    <View style={mStyles.section}>
                        <Text style={mStyles.sectionTitle}>Akses PPPoE</Text>
                        <MField label="Username PPPoE" icon="key-outline" value={pppoeUser} onChangeText={setPppoeUser} autoCapitalize="none" />
                        <MField label="Password PPPoE" icon="lock-closed-outline" value={pppoePassword} onChangeText={setPppoePassword} autoCapitalize="none" />
                    </View>

                    {!isEdit && (
                        <View style={mStyles.section}>
                            <Text style={mStyles.sectionTitle}>Paket Internet *</Text>
                            <TouchableOpacity
                                style={[mStyles.selectBox, showProducts && mStyles.selectBoxOpen]}
                                onPress={() => setShowProducts(!showProducts)}
                            >
                                <Ionicons name="cube-outline" size={16} color={selectedProduct ? '#818cf8' : '#475569'} />
                                <Text style={[mStyles.selectText, selectedProduct && { color: '#e2e8f0' }]}>
                                    {selectedProduct ? `${selectedProduct.name} — ${formatCurrency(selectedProduct.price)}/bln` : 'Pilih paket internet...'}
                                </Text>
                                <Ionicons name={showProducts ? 'chevron-up' : 'chevron-down'} size={16} color="#475569" />
                            </TouchableOpacity>
                            {showProducts && (
                                <View style={mStyles.dropdown}>
                                    {products.map(p => (
                                        <TouchableOpacity key={p.id} style={[mStyles.dropItem, productId === p.id && mStyles.dropItemActive]}
                                            onPress={() => { setProductId(p.id); setShowProducts(false) }}
                                        >
                                            <View>
                                                <Text style={[mStyles.dropName, productId === p.id && { color: '#818cf8' }]}>{p.name}</Text>
                                                <Text style={mStyles.dropPrice}>{formatCurrency(p.price)}/bulan · ⬇{p.download_speed} ⬆{p.upload_speed} Mbps</Text>
                                            </View>
                                            {productId === p.id && <Ionicons name="checkmark-circle" size={18} color="#818cf8" />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>

                <View style={mStyles.footer}>
                    <TouchableOpacity style={mStyles.btnCancel} onPress={() => onClose()}>
                        <Text style={mStyles.btnCancelText}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[mStyles.btnSave, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                            <View style={mStyles.btnInner}>
                                <Ionicons name="checkmark-outline" size={16} color="#fff" />
                                <Text style={mStyles.btnSaveText}>Simpan</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

function MField({ label, icon, ...props }: { label: string; icon: keyof typeof Ionicons.glyphMap } & React.ComponentProps<typeof TextInput>) {
    return (
        <View style={mStyles.field}>
            <Text style={mStyles.fieldLabel}>{label}</Text>
            <View style={mStyles.inputWrap}>
                <Ionicons name={icon} size={15} color="#475569" />
                <TextInput style={mStyles.input} placeholderTextColor="#64748b" {...props} />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#080f1a' },
    toolbar: { flexDirection: 'row', padding: 12, gap: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#0d1117' },
    searchBox: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
        borderWidth: 1, borderColor: '#1f2937',
    },
    searchInput: { flex: 1, color: '#f1f5f9', fontSize: 14, backgroundColor: 'transparent', borderWidth: 0, padding: 0 },
    addBtn: { backgroundColor: '#4f46e5', borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    item: {
        backgroundColor: '#111827', borderRadius: 14, padding: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderWidth: 1, borderColor: '#1f2937',
    },
    avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#818cf8', fontWeight: '800', fontSize: 18 },
    itemName: { color: '#e2e8f0', fontWeight: '600', fontSize: 14 },
    itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    itemSub: { color: '#64748b', fontSize: 11 },
    itemPppoe: { color: '#818cf8', fontSize: 11 },
    itemPkg: { color: '#34d399', fontSize: 11 },
    itemBtns: { gap: 6 },
    iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(129,140,248,0.1)', alignItems: 'center', justifyContent: 'center' },
    iconBtnRed: { backgroundColor: 'rgba(248,113,113,0.1)' },
    emptyBox: { alignItems: 'center', padding: 48, gap: 10 },
    emptyText: { color: '#64748b', fontSize: 13 },
})

const mStyles = StyleSheet.create({
    flex: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 20, backgroundColor: '#080f1a', borderBottomWidth: 1, borderBottomColor: '#1f2937',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
    closeBtn: { padding: 4 },
    body: { flex: 1, backgroundColor: '#080f1a' },
    section: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
    field: { gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937',
        borderRadius: 12, paddingHorizontal: 14, minHeight: 48,
    },
    input: { flex: 1, color: '#f1f5f9', fontSize: 14, backgroundColor: 'transparent', borderWidth: 0, paddingVertical: 12 },
    selectBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937',
        borderRadius: 12, padding: 14,
    },
    selectBoxOpen: { borderColor: '#4f46e5' },
    selectText: { flex: 1, color: '#475569', fontSize: 14 },
    dropdown: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937', borderRadius: 12, overflow: 'hidden', marginTop: 4 },
    dropItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
    dropItemActive: { backgroundColor: 'rgba(79,70,229,0.08)' },
    dropName: { color: '#e2e8f0', fontWeight: '600', fontSize: 14 },
    dropPrice: { color: '#64748b', fontSize: 12, marginTop: 2 },
    footer: {
        flexDirection: 'row', gap: 10, padding: 16,
        backgroundColor: '#080f1a', borderTopWidth: 1, borderTopColor: '#1f2937',
    },
    btnCancel: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937' },
    btnCancelText: { color: '#64748b', fontWeight: '600' },
    btnSave: { flex: 2, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#4f46e5' },
    btnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    btnSaveText: { color: '#fff', fontWeight: '700' },
})
