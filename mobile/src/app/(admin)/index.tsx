import React, { useState, useEffect, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet,
    TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import api from '@/lib/api'
import type { DashboardData } from '@/types'

const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const formatMonth = (m: string) => {
    if (!m?.includes('-')) return m
    const [yr, mo] = m.split('-')
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return `${names[parseInt(mo) - 1]} ${yr}`
}

interface StatCardProps {
    icon: keyof typeof Ionicons.glyphMap
    label: string
    value: string
    accent: string
}

function StatCard({ icon, label, value, accent }: StatCardProps) {
    return (
        <View style={[styles.statCard, { borderTopColor: accent }]}>
            <View style={[styles.statIconBox, { backgroundColor: accent + '1A' }]}>
                <Ionicons name={icon} size={20} color={accent} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    )
}

export default function AdminDashboard() {
    const insets = useSafeAreaInsets()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            const res = await api.get<{ data: DashboardData }>('/admin/dashboard')
            setData(res.data.data)
        } catch { } finally {
            setLoading(false); setRefreshing(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#818cf8" />
                <Text style={styles.loaderText}>Memuat dashboard...</Text>
            </View>
        )
    }

    const stats = data?.stats
    const invoices = data?.recentInvoices ?? []

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor="#818cf8" />}
            showsVerticalScrollIndicator={false}
        >
            {/* Section: Statistik */}
            <Text style={styles.sectionLabel}>Statistik</Text>
            <View style={styles.statsGrid}>
                <StatCard icon="people-outline" label="Total Pelanggan" value={String(stats?.totalCustomers ?? 0)} accent="#818cf8" />
                <StatCard icon="wifi-outline" label="Online" value={String(stats?.onlineCustomers ?? 0)} accent="#34d399" />
                <StatCard icon="receipt-outline" label="Tertunggak" value={String(stats?.unpaidInvoicesCount ?? 0)} accent="#fb923c" />
                <StatCard icon="cash-outline" label="Nilai Tunggak" value={formatCurrency(stats?.unpaidInvoicesAmount ?? 0)} accent="#f87171" />
            </View>

            {/* Section: Tagihan Terbaru */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Tagihan Terbaru</Text>
                <Ionicons name="receipt-outline" size={14} color="#475569" />
            </View>

            <View style={styles.card}>
                {invoices.length === 0 ? (
                    <View style={styles.emptyInner}>
                        <Ionicons name="receipt-outline" size={32} color="#374151" />
                        <Text style={styles.emptyText}>Belum ada tagihan</Text>
                    </View>
                ) : (
                    invoices.map((inv, idx) => (
                        <View key={inv.id} style={[styles.invRow, idx > 0 && styles.invBorder]}>
                            <View style={styles.invLeft}>
                                <Text style={styles.invName}>{inv.customer?.fullName}</Text>
                                <Text style={styles.invMonth}>{formatMonth(inv.month)}</Text>
                            </View>
                            <View style={styles.invRight}>
                                <Text style={styles.invAmount}>{formatCurrency(Number(inv.totalAmount))}</Text>
                                <View style={[styles.badge,
                                inv.status === 'paid'
                                    ? styles.badgePaid
                                    : styles.badgeUnpaid
                                ]}>
                                    <Text style={[styles.badgeText,
                                    inv.status === 'paid' ? { color: '#34d399' } : { color: '#f87171' }
                                    ]}>
                                        {inv.status === 'paid' ? 'Lunas' : 'Belum'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: '#080f1a' },
    content: { padding: 16, gap: 12 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#080f1a', gap: 12 },
    loaderText: { color: '#64748b', fontSize: 14 },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 1, flex: 1 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statCard: {
        flex: 1, minWidth: '45%',
        backgroundColor: '#111827',
        borderRadius: 14, padding: 16,
        borderTopWidth: 2, gap: 6,
        borderWidth: 1, borderColor: '#1f2937',
    },
    statIconBox: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
    },
    statValue: { fontSize: 22, fontWeight: '800', color: '#f1f5f9', letterSpacing: -0.5 },
    statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

    card: {
        backgroundColor: '#111827', borderRadius: 14,
        borderWidth: 1, borderColor: '#1f2937', overflow: 'hidden',
    },
    invRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
    invBorder: { borderTopWidth: 1, borderTopColor: '#1f2937' },
    invLeft: { flex: 1 },
    invName: { color: '#e2e8f0', fontWeight: '600', fontSize: 14 },
    invMonth: { color: '#64748b', fontSize: 12, marginTop: 2 },
    invRight: { alignItems: 'flex-end', gap: 4 },
    invAmount: { color: '#f1f5f9', fontWeight: '700', fontSize: 14 },
    badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    badgePaid: { backgroundColor: 'rgba(52,211,153,0.1)' },
    badgeUnpaid: { backgroundColor: 'rgba(248,113,113,0.1)' },
    badgeText: { fontSize: 11, fontWeight: '700' },
    emptyInner: { alignItems: 'center', padding: 32, gap: 8 },
    emptyText: { color: '#374151', fontSize: 13 },
})
