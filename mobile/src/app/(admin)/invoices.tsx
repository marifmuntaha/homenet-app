import React, { useState, useEffect, useCallback } from 'react'
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    Alert, ActivityIndicator, RefreshControl, Linking, TextInput,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import api from '@/lib/api'
import type { Invoice, PaginatedResponse } from '@/types'

const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
const formatMonth = (m: string) => {
    if (!m?.includes('-')) return m
    const [yr, mo] = m.split('-')
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return `${names[parseInt(mo) - 1]} ${yr}`
}

const FILTERS = [
    { value: '', label: 'Semua', icon: 'apps-outline' as const },
    { value: 'unpaid', label: 'Belum Bayar', icon: 'time-outline' as const },
    { value: 'paid', label: 'Lunas', icon: 'checkmark-circle-outline' as const },
]

const STATUS: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
    paid: { label: 'Lunas', color: '#34d399', bg: 'rgba(52,211,153,0.1)', icon: 'checkmark-circle-outline' },
    unpaid: { label: 'Belum Bayar', color: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: 'time-outline' },
    cancelled: { label: 'Batal', color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: 'close-circle-outline' },
}

export default function InvoicesScreen() {
    const insets = useSafeAreaInsets()
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [filter, setFilter] = useState('')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)

    const fetch = useCallback(async (p = 1, s = filter, q = search) => {
        try {
            const res = await api.get<PaginatedResponse<Invoice>>(`/invoices?page=${p}&status=${s}&search=${q}&year=${new Date().getFullYear()}`)
            const list = res.data.data?.data ?? []
            const meta = res.data.data?.meta as any
            setInvoices(p === 1 ? list : prev => [...prev, ...list])
            setLastPage(meta?.last_page ?? 1); setPage(p)
        } catch { } finally { setLoading(false); setRefreshing(false) }
    }, [filter, search])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetch(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [filter, search])

    const handlePaid = (inv: Invoice) =>
        Alert.alert('Konfirmasi Bayar', `Tandai tagihan ${inv.customer?.fullName} bulan ${formatMonth(inv.month)} sebagai sudah dibayar (CASH)?`, [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Ya, Bayar', onPress: async () => {
                    try {
                        await api.put(`/invoices/${inv.id}`, {
                            status: 'paid',
                            payment_type: 'cash'
                        })
                        fetch(1)
                        Alert.alert('Sukses', 'Pembayaran cash berhasil dicatat')
                    } catch { Alert.alert('Error', 'Gagal memperbarui') }
                }
            },
        ])

    const handleGenerate = async () => {
        Alert.alert('Generate Tagihan', 'Buat tagihan massal untuk semua pelanggan aktif bulan ini?', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Generate Sekarang', onPress: async () => {
                    setGenerating(true)
                    try {
                        const res = await api.post('/invoices')
                        Alert.alert('Berhasil', res.data.message || 'Tagihan berhasil dibuat')
                        fetch(1)
                    } catch (err: any) {
                        Alert.alert('Gagal', err.response?.data?.message || 'Gagal generate tagihan')
                    } finally {
                        setGenerating(false)
                    }
                }
            }
        ])
    }

    const handleWA = async (inv: Invoice) => {
        try {
            await api.post(`/invoices/${inv.id}/notify`)
            Alert.alert('Sukses', 'Notifikasi WhatsApp telah dikirim via sistem')
        } catch (err: any) {
            Alert.alert('Gagal', err.response?.data?.message || 'Gagal mengirim notifikasi')
        }
    }

    const renderItem = ({ item }: { item: Invoice }) => {
        const s = STATUS[item.status] ?? STATUS.cancelled
        return (
            <View style={styles.card}>
                <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.clientName}>{item.customer?.fullName}</Text>
                        <View style={styles.metaRow}>
                            <Ionicons name="call-outline" size={11} color="#64748b" />
                            <Text style={styles.clientPhone}>{item.customer?.phone}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                        <Ionicons name={s.icon} size={11} color={s.color} />
                        <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                    </View>
                </View>

                <View style={styles.cardMeta}>
                    <MetaItem icon="calendar-outline" label="Bulan" value={formatMonth(item.month)} />
                    <MetaItem icon="cash-outline" label="Total" value={formatCurrency(item.totalAmount)} bold />
                    <MetaItem icon="time-outline" label="Jatuh Tempo" value={new Date(item.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} />
                </View>

                {item.status === 'unpaid' && (
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.btnWA} onPress={() => handleWA(item)}>
                            <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                            <Text style={styles.btnWAText}>Kirim WA</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnPay} onPress={() => handlePaid(item)}>
                            <Ionicons name="checkmark-outline" size={14} color="#34d399" />
                            <Text style={styles.btnPayText}>Bayar Cash</Text>
                        </TouchableOpacity>
                    </View>
                )}
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
                        placeholder="Cari pelanggan / tagihan..."
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor="#64748b"
                        autoCapitalize="none"
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={16} color="#475569" />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Filter chips */}
            <View style={styles.filterRow}>
                {FILTERS.map(f => (
                    <TouchableOpacity
                        key={f.value}
                        style={[styles.chip, filter === f.value && styles.chipActive]}
                        onPress={() => setFilter(f.value)}
                    >
                        <Ionicons name={f.icon} size={13} color={filter === f.value ? '#818cf8' : '#475569'} />
                        <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loader}><ActivityIndicator color="#818cf8" size="large" /></View>
            ) : (
                <FlatList
                    data={invoices}
                    keyExtractor={(i) => String(i.id)}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 12, gap: 8 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(1) }} tintColor="#818cf8" />}
                    onEndReached={() => { if (page < lastPage) fetch(page + 1) }}
                    onEndReachedThreshold={0.4}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ionicons name="receipt-outline" size={40} color="#1f2937" />
                            <Text style={styles.emptyText}>Tidak ada tagihan</Text>
                        </View>
                    }
                />
            )}

            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.btnGenerate, generating && { opacity: 0.7 }]}
                    onPress={handleGenerate}
                    disabled={generating}
                >
                    {generating ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="flash-outline" size={14} color="#818cf8" />
                            <Text style={styles.btnGenerateText}>Generate Tagihan Bulan Ini</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    )
}

function MetaItem({ icon, label, value, bold = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; bold?: boolean }) {
    return (
        <View style={styles.metaItem}>
            <View style={styles.metaRow}>
                <Ionicons name={icon} size={11} color="#475569" />
                <Text style={styles.metaLabel}>{label}</Text>
            </View>
            <Text style={[styles.metaValue, bold && { color: '#f1f5f9', fontWeight: '700' }]}>{value}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#080f1a' },
    toolbar: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
        borderWidth: 1, borderColor: '#1f2937',
    },
    searchInput: { flex: 1, color: '#f1f5f9', fontSize: 14, backgroundColor: 'transparent', borderWidth: 0, padding: 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    headerTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: '800' },
    bottomBar: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'transparent' },
    btnGenerate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#4f46e5' },
    btnGenerateText: { color: '#818cf8', fontSize: 15, fontWeight: '700' },
    filterRow: { flexDirection: 'row', gap: 8, padding: 12 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
        backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937',
    },
    chipActive: { borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.1)' },
    chipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
    chipTextActive: { color: '#818cf8' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#111827', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1f2937', gap: 12 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    clientName: { color: '#e2e8f0', fontWeight: '700', fontSize: 15 },
    clientPhone: { color: '#64748b', fontSize: 11 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
    statusText: { fontSize: 11, fontWeight: '700' },
    cardMeta: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#1f2937', paddingTop: 12 },
    metaItem: { gap: 3 },
    metaLabel: { color: '#475569', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    metaValue: { color: '#94a3b8', fontSize: 13 },
    actions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#1f2937', paddingTop: 12 },
    btnWA: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(37,211,102,0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(37,211,102,0.2)' },
    btnWAText: { color: '#25D366', fontWeight: '600', fontSize: 13 },
    btnPay: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(52,211,153,0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)' },
    btnPayText: { color: '#34d399', fontWeight: '600', fontSize: 13 },
    emptyBox: { alignItems: 'center', padding: 48, gap: 10 },
    emptyText: { color: '#64748b', fontSize: 13 },
})
