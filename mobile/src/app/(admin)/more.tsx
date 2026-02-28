import React, { useState, useEffect, useCallback } from 'react'
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    Alert, ActivityIndicator, RefreshControl, Modal,
    KeyboardAvoidingView, Platform, ScrollView, TextInput,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import api from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import type { Product, User, PaginatedResponse } from '@/types'

const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const ROLE_MAP: Record<number, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
    1: { label: 'Administrator', color: '#818cf8', icon: 'shield-checkmark-outline' },
    2: { label: 'Customer', color: '#34d399', icon: 'person-outline' },
}

export default function MoreScreen() {
    const insets = useSafeAreaInsets()
    const { user, logout } = useAuth()
    const [section, setSection] = useState<'products' | 'users'>('products')

    const [products, setProducts] = useState<Product[]>([])
    const [loadingProd, setLoadingProd] = useState(true)
    const [showProdModal, setShowProdModal] = useState(false)
    const [editProduct, setEditProduct] = useState<Product | null>(null)

    const [users, setUsers] = useState<User[]>([])
    const [loadingUsers, setLoadingUsers] = useState(true)
    const [showUserModal, setShowUserModal] = useState(false)
    const [editUser, setEditUser] = useState<User | null>(null)
    const [refreshing, setRefreshing] = useState(false)

    const fetchProducts = useCallback(async () => {
        try {
            const res = await api.get<any>('/products')
            const raw = res.data?.data
            setProducts(Array.isArray(raw) ? raw : (raw?.data ?? []))
        } catch { } finally { setLoadingProd(false); setRefreshing(false) }
    }, [])

    const fetchUsers = useCallback(async () => {
        try {
            const res = await api.get<PaginatedResponse<User>>('/users')
            setUsers(res.data.data?.data || [])
        } catch { } finally { setLoadingUsers(false); setRefreshing(false) }
    }, [])

    useEffect(() => { fetchProducts(); fetchUsers() }, [])

    const delProduct = (p: Product) =>
        Alert.alert('Hapus Produk', `Hapus "${p.name}"?`, [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', style: 'destructive', onPress: async () => { try { await api.delete(`/products/${p.id}`); fetchProducts() } catch { Alert.alert('Error', 'Gagal') } } },
        ])

    const delUser = (u: User) =>
        Alert.alert('Hapus Pengguna', `Hapus "${u.name}"?`, [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', style: 'destructive', onPress: async () => { try { await api.delete(`/users/${u.id}`); fetchUsers() } catch { Alert.alert('Error', 'Gagal') } } },
        ])

    const handleLogout = () =>
        Alert.alert('Keluar', 'Yakin ingin keluar dari akun?', [
            { text: 'Batal', style: 'cancel' },
            { text: 'Keluar', style: 'destructive', onPress: async () => { try { await api.delete('/auth/logout') } catch { } logout() } },
        ])

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            {/* Section Tabs */}
            <View style={styles.tabs}>
                {(['products', 'users'] as const).map(tab => (
                    <TouchableOpacity key={tab} style={[styles.tab, section === tab && styles.tabActive]} onPress={() => setSection(tab)}>
                        <Ionicons
                            name={tab === 'products' ? 'cube-outline' : 'people-outline'}
                            size={16}
                            color={section === tab ? '#818cf8' : '#475569'}
                        />
                        <Text style={[styles.tabText, section === tab && styles.tabTextActive]}>
                            {tab === 'products' ? 'Produk' : 'Pengguna'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Products Section */}
            {section === 'products' && (
                <View style={{ flex: 1 }}>
                    <View style={styles.sectionBar}>
                        <View>
                            <Text style={styles.sectionTitle}>Paket Internet</Text>
                            <Text style={styles.sectionSub}>{products.length} paket tersedia</Text>
                        </View>
                        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditProduct(null); setShowProdModal(true) }}>
                            <Ionicons name="add" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    {loadingProd ? (
                        <View style={styles.loader}><ActivityIndicator color="#818cf8" size="large" /></View>
                    ) : (
                        <FlatList
                            data={products}
                            keyExtractor={(i) => String(i.id)}
                            contentContainerStyle={{ padding: 12, gap: 8 }}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProducts() }} tintColor="#818cf8" />}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <View style={styles.card}>
                                    <View style={styles.pkgIcon}>
                                        <Ionicons name="cube-outline" size={22} color="#818cf8" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cardName}>{item.name}</Text>
                                        <Text style={styles.cardPrice}>{formatCurrency(item.price)}/bulan</Text>
                                        <View style={styles.speedRow}>
                                            <View style={styles.speedItem}>
                                                <Ionicons name="arrow-down-outline" size={10} color="#34d399" />
                                                <Text style={styles.speedText}>{item.download_speed} Mbps</Text>
                                            </View>
                                            <View style={styles.speedItem}>
                                                <Ionicons name="arrow-up-outline" size={10} color="#fb923c" />
                                                <Text style={styles.speedText}>{item.upload_speed} Mbps</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.cardBtns}>
                                        <TouchableOpacity style={styles.iconBtn} onPress={() => { setEditProduct(item); setShowProdModal(true) }}>
                                            <Ionicons name="create-outline" size={17} color="#818cf8" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.iconBtn, styles.iconBtnRed]} onPress={() => delProduct(item)}>
                                            <Ionicons name="trash-outline" size={17} color="#f87171" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                            ListEmptyComponent={<View style={styles.emptyBox}><Ionicons name="cube-outline" size={40} color="#1f2937" /><Text style={styles.emptyText}>Belum ada produk</Text></View>}
                        />
                    )}
                </View>
            )}

            {/* Users Section */}
            {section === 'users' && (
                <View style={{ flex: 1 }}>
                    <View style={styles.sectionBar}>
                        <View>
                            <Text style={styles.sectionTitle}>Manajemen Pengguna</Text>
                            <Text style={styles.sectionSub}>{users.length} pengguna terdaftar</Text>
                        </View>
                        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditUser(null); setShowUserModal(true) }}>
                            <Ionicons name="add" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    {loadingUsers ? (
                        <View style={styles.loader}><ActivityIndicator color="#818cf8" size="large" /></View>
                    ) : (
                        <FlatList
                            data={users}
                            keyExtractor={(i) => String(i.id)}
                            contentContainerStyle={{ padding: 12, gap: 8 }}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers() }} tintColor="#818cf8" />}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                const role = ROLE_MAP[item.role] ?? ROLE_MAP[2]
                                return (
                                    <View style={styles.card}>
                                        <View style={[styles.userAvatar, { backgroundColor: item.role === 1 ? 'rgba(79,70,229,0.15)' : 'rgba(52,211,153,0.1)' }]}>
                                            <Ionicons name={role.icon} size={22} color={role.color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cardName}>{item.name}</Text>
                                            <View style={styles.metaRow}>
                                                <Ionicons name="mail-outline" size={11} color="#64748b" />
                                                <Text style={styles.cardEmail}>{item.email}</Text>
                                            </View>
                                            <View style={[styles.roleBadge, { backgroundColor: role.color + '18' }]}>
                                                <Text style={[styles.roleText, { color: role.color }]}>{role.label}</Text>
                                            </View>
                                        </View>
                                        {item.id !== user?.id && (
                                            <View style={styles.cardBtns}>
                                                <TouchableOpacity style={styles.iconBtn} onPress={() => { setEditUser(item); setShowUserModal(true) }}>
                                                    <Ionicons name="create-outline" size={17} color="#818cf8" />
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.iconBtn, styles.iconBtnRed]} onPress={() => delUser(item)}>
                                                    <Ionicons name="trash-outline" size={17} color="#f87171" />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )
                            }}
                            ListFooterComponent={
                                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                                    <Ionicons name="log-out-outline" size={18} color="#f87171" />
                                    <Text style={styles.logoutText}>Keluar dari Akun</Text>
                                </TouchableOpacity>
                            }
                            ListEmptyComponent={<View style={styles.emptyBox}><Ionicons name="people-outline" size={40} color="#1f2937" /><Text style={styles.emptyText}>Belum ada pengguna</Text></View>}
                        />
                    )}
                </View>
            )}

            <ProductModal
                visible={showProdModal}
                product={editProduct}
                onClose={(r) => { setShowProdModal(false); if (r) fetchProducts() }}
            />
            <UserModal
                visible={showUserModal}
                editUser={editUser}
                onClose={(r) => { setShowUserModal(false); if (r) fetchUsers() }}
            />
        </View>
    )
}

// ─── Product Modal ─────────────────────────────────────────────────────────────
function ProductModal({ visible, product, onClose }: { visible: boolean; product: Product | null; onClose: (r?: boolean) => void }) {
    const isEdit = !!product
    const [name, setName] = useState(''); const [price, setPrice] = useState('')
    const [dl, setDl] = useState(''); const [ul, setUl] = useState('')
    const [desc, setDesc] = useState(''); const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (visible && product) { setName(product.name); setPrice(String(product.price)); setDl(String(product.download_speed)); setUl(String(product.upload_speed)); setDesc(product.description || '') }
        else if (visible) { setName(''); setPrice(''); setDl(''); setUl(''); setDesc('') }
    }, [visible, product])

    const handleSave = async () => {
        if (!name || !price || !dl || !ul) { Alert.alert('Validasi', 'Semua field wajib diisi'); return }
        setLoading(true)
        try {
            const payload = { name, price: Number(price), download_speed: Number(dl), upload_speed: Number(ul), description: desc }
            if (isEdit) { await api.put(`/products/${product.id}`, payload) } else { await api.post('/products', payload) }
            onClose(true)
        } catch (err: any) { Alert.alert('Error', err.response?.data?.message || 'Gagal') }
        finally { setLoading(false) }
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={mStyles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name="cube-outline" size={20} color="#818cf8" />
                        <Text style={mStyles.title}>{isEdit ? 'Edit Produk' : 'Tambah Produk'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => onClose()} style={{ padding: 4 }}><Ionicons name="close" size={22} color="#64748b" /></TouchableOpacity>
                </View>
                <ScrollView style={mStyles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={{ padding: 16, gap: 14 }}>
                        {[
                            { label: 'Nama Paket', icon: 'bookmark-outline' as const, value: name, set: setName, placeholder: 'Paket 10 Mbps' },
                            { label: 'Harga / Bulan (Rp)', icon: 'cash-outline' as const, value: price, set: setPrice, keyboard: 'numeric' as any, placeholder: '150000' },
                            { label: 'Download Speed (Mbps)', icon: 'arrow-down-outline' as const, value: dl, set: setDl, keyboard: 'numeric' as any, placeholder: '10' },
                            { label: 'Upload Speed (Mbps)', icon: 'arrow-up-outline' as const, value: ul, set: setUl, keyboard: 'numeric' as any, placeholder: '5' },
                        ].map(f => (
                            <View key={f.label} style={mStyles.field}>
                                <Text style={mStyles.label}>{f.label}</Text>
                                <View style={mStyles.inputWrap}>
                                    <Ionicons name={f.icon} size={15} color="#475569" />
                                    <TextInput style={mStyles.input} placeholder={f.placeholder} placeholderTextColor="#64748b" value={f.value} onChangeText={f.set} keyboardType={f.keyboard} />
                                </View>
                            </View>
                        ))}
                        <View style={mStyles.field}>
                            <Text style={mStyles.label}>Deskripsi</Text>
                            <View style={[mStyles.inputWrap, { minHeight: 80, alignItems: 'flex-start', paddingVertical: 10 }]}>
                                <Ionicons name="document-text-outline" size={15} color="#475569" style={{ marginTop: 2 }} />
                                <TextInput style={[mStyles.input, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Deskripsi opsional..." placeholderTextColor="#64748b" value={desc} onChangeText={setDesc} multiline />
                            </View>
                        </View>
                    </View>
                </ScrollView>
                <View style={mStyles.footer}>
                    <TouchableOpacity style={mStyles.btnCancel} onPress={() => onClose()}><Text style={{ color: '#64748b', fontWeight: '600' }}>Batal</Text></TouchableOpacity>
                    <TouchableOpacity style={[mStyles.btnSave, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="checkmark-outline" size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700' }}>Simpan</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

// ─── User Modal ────────────────────────────────────────────────────────────────
function UserModal({ visible, editUser: target, onClose }: { visible: boolean; editUser: User | null; onClose: (r?: boolean) => void }) {
    const isEdit = !!target
    const [name, setName] = useState(''); const [email, setEmail] = useState('')
    const [password, setPassword] = useState(''); const [role, setRole] = useState<1 | 2>(2)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (visible && target) { setName(target.name); setEmail(target.email); setRole(target.role); setPassword('') }
        else if (visible) { setName(''); setEmail(''); setPassword(''); setRole(2) }
    }, [visible, target])

    const handleSave = async () => {
        if (!name || !email) { Alert.alert('Validasi', 'Nama dan email wajib diisi'); return }
        if (!isEdit && !password) { Alert.alert('Validasi', 'Password wajib diisi'); return }
        setLoading(true)
        try {
            const payload: any = { name, email, role }
            if (password) payload.password = password
            if (isEdit) { await api.put(`/users/${target.id}`, payload) } else { await api.post('/users', payload) }
            onClose(true)
        } catch (err: any) { Alert.alert('Error', err.response?.data?.message || 'Gagal') }
        finally { setLoading(false) }
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={mStyles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name="person-add-outline" size={20} color="#818cf8" />
                        <Text style={mStyles.title}>{isEdit ? 'Edit Pengguna' : 'Tambah Pengguna'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => onClose()} style={{ padding: 4 }}><Ionicons name="close" size={22} color="#64748b" /></TouchableOpacity>
                </View>
                <ScrollView style={mStyles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={{ padding: 16, gap: 14 }}>
                        {[
                            { label: 'Nama Lengkap', icon: 'person-outline' as const, value: name, set: setName, placeholder: 'Nama pengguna' },
                            { label: 'Email', icon: 'mail-outline' as const, value: email, set: setEmail, keyboard: 'email-address' as any, cap: 'none' as any, placeholder: 'email@domain.com' },
                            { label: isEdit ? 'Password (kosongkan jika tak diubah)' : 'Password', icon: 'lock-closed-outline' as const, value: password, set: setPassword, secure: true, placeholder: '••••••••' },
                        ].map(f => (
                            <View key={f.label} style={mStyles.field}>
                                <Text style={mStyles.label}>{f.label}</Text>
                                <View style={mStyles.inputWrap}>
                                    <Ionicons name={f.icon} size={15} color="#475569" />
                                    <TextInput style={mStyles.input} placeholder={f.placeholder} placeholderTextColor="#64748b" value={f.value} onChangeText={f.set} secureTextEntry={f.secure} keyboardType={f.keyboard} autoCapitalize={f.cap || 'words'} />
                                </View>
                            </View>
                        ))}
                        <View style={mStyles.field}>
                            <Text style={mStyles.label}>Role Pengguna</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {([1, 2] as (1 | 2)[]).map(r => {
                                    const rl = ROLE_MAP[r]
                                    return (
                                        <TouchableOpacity key={r} style={[mStyles.roleChip, role === r && { borderColor: rl.color, backgroundColor: rl.color + '15' }]} onPress={() => setRole(r)}>
                                            <Ionicons name={rl.icon} size={16} color={role === r ? rl.color : '#475569'} />
                                            <Text style={[mStyles.roleChipText, role === r && { color: rl.color }]}>{rl.label}</Text>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>
                        </View>
                    </View>
                </ScrollView>
                <View style={mStyles.footer}>
                    <TouchableOpacity style={mStyles.btnCancel} onPress={() => onClose()}><Text style={{ color: '#64748b', fontWeight: '600' }}>Batal</Text></TouchableOpacity>
                    <TouchableOpacity style={[mStyles.btnSave, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="checkmark-outline" size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700' }}>Simpan</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#080f1a' },
    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1f2937' },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: '#4f46e5' },
    tabText: { color: '#475569', fontWeight: '600', fontSize: 14 },
    tabTextActive: { color: '#818cf8' },
    sectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#0d1117' },
    sectionTitle: { color: '#e2e8f0', fontWeight: '700', fontSize: 16 },
    sectionSub: { color: '#475569', fontSize: 12, marginTop: 2 },
    addBtn: { backgroundColor: '#4f46e5', borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#111827', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#1f2937' },
    pkgIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: 'rgba(79,70,229,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(129,140,248,0.2)' },
    cardName: { color: '#e2e8f0', fontWeight: '700', fontSize: 15 },
    cardPrice: { color: '#34d399', fontSize: 13, marginTop: 2 },
    speedRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
    speedItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    speedText: { color: '#64748b', fontSize: 11 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    userAvatar: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    cardEmail: { color: '#64748b', fontSize: 12 },
    roleBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
    roleText: { fontSize: 11, fontWeight: '700' },
    cardBtns: { gap: 6 },
    iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(129,140,248,0.1)', alignItems: 'center', justifyContent: 'center' },
    iconBtnRed: { backgroundColor: 'rgba(248,113,113,0.1)' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 12, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
    logoutText: { color: '#f87171', fontWeight: '700', fontSize: 15 },
    emptyBox: { alignItems: 'center', padding: 48, gap: 10 },
    emptyText: { color: '#374151', fontSize: 13 },
})

const mStyles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#080f1a', borderBottomWidth: 1, borderBottomColor: '#1f2937' },
    title: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
    body: { flex: 1, backgroundColor: '#080f1a' },
    field: { gap: 6 },
    label: { fontSize: 12, fontWeight: '600', color: '#64748b' },
    inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937', borderRadius: 12, paddingHorizontal: 14, minHeight: 48 },
    input: { flex: 1, color: '#f1f5f9', fontSize: 14, backgroundColor: 'transparent', borderWidth: 0, paddingVertical: 12 },
    roleChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937' },
    roleChipText: { color: '#475569', fontWeight: '600', fontSize: 13 },
    footer: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#080f1a', borderTopWidth: 1, borderTopColor: '#1f2937' },
    btnCancel: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937' },
    btnSave: { flex: 2, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#4f46e5' },
})
