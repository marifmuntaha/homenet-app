import React, { useState, useEffect, useCallback } from 'react'
import {
    View, Text, FlatList, StyleSheet,
    ActivityIndicator, RefreshControl, Alert, TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import api from '@/lib/api'
import { MIDTRANS_URL } from '@/lib/config'
import type { Invoice, PaginatedResponse } from '@/types'

const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
const formatMonth = (m: string) => {
    if (!m?.includes('-')) return m
    const [yr, mo] = m.split('-')
    const names = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    return `${names[parseInt(mo) - 1]} ${yr}`
}

const STATUS: Record<string, {
    label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap
}> = {
    paid: { label: 'Lunas', color: '#34d399', bg: 'rgba(52,211,153,0.1)', icon: 'checkmark-circle-outline' },
    unpaid: { label: 'Belum Bayar', color: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: 'time-outline' },
    cancelled: { label: 'Dibatalkan', color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: 'close-circle-outline' },
}

export default function CustomerInvoicesScreen() {
    const insets = useSafeAreaInsets()
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [page, setPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)

    const fetch = useCallback(async (p = 1) => {
        try {
            const res = await api.get<PaginatedResponse<Invoice>>(`/customer/invoices?page=${p}`)
            const list = res.data.data?.data ?? []
            const meta = res.data.data?.meta as any
            setInvoices(p === 1 ? list : prev => [...prev, ...list])
            setLastPage(meta?.last_page ?? 1); setPage(p)
        } catch { } finally { setLoading(false); setRefreshing(false) }
    }, [])

    const handlePayOnline = async (invoice: Invoice) => {
        try {
            const res = await api.post<{ success: boolean; data: { token: string; redirect_url: string } }>(`/invoices/${invoice.id}/pay`)
            const snapToken = res.data.data.token
            const result = await WebBrowser.openBrowserAsync(`${MIDTRANS_URL}${snapToken}`)

            if (result.type === 'cancel' || result.type === 'dismiss') {
                fetch(1)
            }
        } catch (err: any) {
            Alert.alert('Gagal', err.response?.data?.message || 'Gagal memulai pembayaran online')
        }
    }

    useEffect(() => { fetch(1) }, [fetch])

    const renderItem = ({ item }: { item: Invoice }) => {
        const s = STATUS[item.status] ?? STATUS.cancelled
        const isPaid = item.status === 'paid'
        return (
            <View style={[styles.card, isPaid && styles.cardPaid]}>
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.monthBadge}>
                        <Ionicons name="calendar-outline" size={13} color="#818cf8" />
                        <Text style={styles.monthText}>{formatMonth(item.month)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                        <Ionicons name={s.icon} size={11} color={s.color} />
                        <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                    </View>
                </View>

                {/* Amount breakdown */}
                <View style={styles.rows}>
                    <Row label="Tagihan Pokok" value={formatCurrency(item.amount)} />
                    {Number(item.previousBalance) > 0 && (
                        <Row label="Tunggakan" value={formatCurrency(item.previousBalance)} valueColor="#f87171" />
                    )}
                    {Number(item.discount) > 0 && (
                        <Row label="Diskon" value={`-${formatCurrency(item.discount)}`} valueColor="#34d399" />
                    )}
                </View>

                {/* Total */}
                <View style={styles.totalBox}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={[styles.totalValue, { color: isPaid ? '#34d399' : '#f1f5f9' }]}>
                        {formatCurrency(item.totalAmount)}
                    </Text>
                </View>

                {/* Actions */}
                {!isPaid && item.status === 'unpaid' && (
                    <TouchableOpacity style={styles.payBtn} onPress={() => handlePayOnline(item)}>
                        <Ionicons name="card-outline" size={14} color="#fff" />
                        <Text style={styles.payBtnText}>Bayar Online (+ Rp 2.000)</Text>
                    </TouchableOpacity>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerLeft}>
                        <Ionicons name="time-outline" size={11} color="#475569" />
                        <Text style={styles.footerText}>
                            Jatuh tempo: {new Date(item.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                    </View>
                    {isPaid && item.paidAt ? (
                        <View style={styles.footerRight}>
                            <Ionicons name="checkmark-done-outline" size={11} color="#34d399" />
                            <Text style={styles.paidAtText}>
                                Dibayar {new Date(item.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>
        )
    }

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            {loading ? (
                <View style={styles.loader}><ActivityIndicator color="#818cf8" size="large" /></View>
            ) : (
                <FlatList
                    data={invoices}
                    keyExtractor={(i) => String(i.id)}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 14, gap: 10 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(1) }} tintColor="#818cf8" />}
                    onEndReached={() => { if (page < lastPage) fetch(page + 1) }}
                    onEndReachedThreshold={0.4}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ionicons name="receipt-outline" size={48} color="#1f2937" />
                            <Text style={styles.emptyTitle}>Belum ada tagihan</Text>
                            <Text style={styles.emptySub}>Riwayat tagihan akan muncul di sini</Text>
                        </View>
                    }
                />
            )}
        </View>
    )
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#080f1a' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    card: {
        backgroundColor: '#111827', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: '#1f2937', gap: 12,
    },
    cardPaid: { borderColor: 'rgba(52,211,153,0.2)' },

    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    monthBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    monthText: { color: '#f1f5f9', fontWeight: '700', fontSize: 15 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
    statusText: { fontSize: 11, fontWeight: '700' },

    rows: { gap: 8, borderTopWidth: 1, borderTopColor: '#1f2937', paddingTop: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    rowLabel: { color: '#64748b', fontSize: 13 },
    rowValue: { color: '#e2e8f0', fontSize: 13 },

    totalBox: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#0d1117', borderRadius: 10, padding: 14,
    },
    totalLabel: { color: '#64748b', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
    totalValue: { fontWeight: '800', fontSize: 20 },

    payBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: '#4f46e5', borderRadius: 10, padding: 12,
    },
    payBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1f2937', paddingTop: 10 },
    footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    footerText: { color: '#475569', fontSize: 11 },
    footerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    paidAtText: { color: '#34d399', fontSize: 11 },

    emptyBox: { alignItems: 'center', padding: 48, gap: 10 },
    emptyTitle: { color: '#e2e8f0', fontWeight: '600', fontSize: 16 },
    emptySub: { color: '#475569', fontSize: 13, textAlign: 'center' },
})
