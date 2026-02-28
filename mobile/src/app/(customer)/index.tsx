import React, { useState, useEffect, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert, Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import api from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import type { CustomerDashboardData, Invoice } from '@/types'

const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
const formatMonth = (m: string) => {
    if (!m?.includes('-')) return m
    const [yr, mo] = m.split('-')
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    return `${months[parseInt(mo) - 1]} ${yr}`
}

function InfoRow({ icon, label, value, valueColor }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; valueColor?: string }) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
                <Ionicons name={icon} size={14} color="#475569" />
                <Text style={styles.infoLabel}>{label}</Text>
            </View>
            <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
        </View>
    )
}

export default function CustomerDashboard() {
    const insets = useSafeAreaInsets()
    const { user, logout } = useAuth()
    const [data, setData] = useState<CustomerDashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            const res = await api.get<{ data: CustomerDashboardData }>('/customer/dashboard')
            setData(res.data.data)
        } catch { } finally { setLoading(false); setRefreshing(false) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const handlePayOnline = async (invoice: Invoice) => {
        try {
            const res = await api.post<{ success: boolean; data: { token: string; redirect_url: string } }>(
                `/invoices/${invoice.id}/pay`
            )
            if (res.data.success && res.data.data.redirect_url) {
                await WebBrowser.openBrowserAsync(res.data.data.redirect_url)
                fetchData()
            }
        } catch (err: any) {
            Alert.alert('Gagal', err.response?.data?.message || 'Gagal memulai pembayaran online')
        }
    }

    const handlePayWA = () => {
        if (!data?.currentInvoice) return
        const inv = data.currentInvoice
        const msg = `Halo Admin Homenet,\n\nSaya ingin konfirmasi pembayaran:\n- Nama: *${data.customer?.fullName}*\n- Bulan: *${formatMonth(inv.month)}*\n- Total: *${formatCurrency(inv.totalAmount)}*\n\nTerima kasih.`
        Linking.openURL(`https://wa.me/6281234567890?text=${encodeURIComponent(msg)}`)
    }

    const handleLogout = () =>
        Alert.alert('Keluar', 'Yakin ingin keluar?', [
            { text: 'Batal', style: 'cancel' },
            { text: 'Keluar', style: 'destructive', onPress: async () => { try { await api.delete('/auth/logout') } catch { } logout() } },
        ])

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#818cf8" />
                <Text style={styles.loaderText}>Memuat dashboard...</Text>
            </View>
        )
    }

    const sub = data?.activeSubscription
    const inv = data?.currentInvoice
    const customer = data?.customer

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor="#818cf8" />}
            showsVerticalScrollIndicator={false}
        >
            {/* Welcome Card */}
            <View style={styles.welcomeCard}>
                <View style={styles.welcomeLeft}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() ?? 'U'}</Text>
                    </View>
                    <View>
                        <Text style={styles.greet}>Selamat datang,</Text>
                        <Text style={styles.userName}>{customer?.fullName ?? user?.name}</Text>
                        {customer?.pppoeUser ? (
                            <View style={styles.pppoeTag}>
                                <Ionicons name="key-outline" size={11} color="#818cf8" />
                                <Text style={styles.pppoeText}>{customer.pppoeUser}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
                    <Ionicons name="log-out-outline" size={20} color="#475569" />
                </TouchableOpacity>
            </View>

            {/* Unpaid warning */}
            {(data?.unpaidCount ?? 0) > 0 && (
                <View style={styles.warningCard}>
                    <Ionicons name="warning-outline" size={16} color="#fb923c" />
                    <Text style={styles.warningText}>
                        {data?.unpaidCount} tagihan belum dibayar • {formatCurrency(data?.totalUnpaid ?? 0)}
                    </Text>
                </View>
            )}

            {/* Active Package */}
            <Text style={styles.sectionLabel}>Paket Aktif</Text>
            <View style={styles.card}>
                {sub ? (
                    <View style={{ gap: 14 }}>
                        <View style={styles.pkgHeader}>
                            <View style={styles.pkgIconBox}>
                                <Ionicons name="cube-outline" size={22} color="#818cf8" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.pkgName}>{sub.product?.name}</Text>
                                <Text style={styles.pkgPrice}>{formatCurrency(sub.product?.price ?? 0)}/bulan</Text>
                            </View>
                            <View style={[styles.statusBadge, sub.status === 'active' ? styles.badgeGreen : styles.badgeRed]}>
                                <Ionicons name={sub.status === 'active' ? 'checkmark-circle-outline' : 'close-circle-outline'} size={11} color={sub.status === 'active' ? '#34d399' : '#f87171'} />
                                <Text style={[styles.statusText, { color: sub.status === 'active' ? '#34d399' : '#f87171' }]}>
                                    {sub.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.speedGrid}>
                            <View style={styles.speedItem}>
                                <Ionicons name="arrow-down-outline" size={16} color="#34d399" />
                                <Text style={styles.speedVal}>{sub.product?.download_speed} Mbps</Text>
                                <Text style={styles.speedLabel}>Download</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.speedItem}>
                                <Ionicons name="arrow-up-outline" size={16} color="#fb923c" />
                                <Text style={styles.speedVal}>{sub.product?.upload_speed} Mbps</Text>
                                <Text style={styles.speedLabel}>Upload</Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyCard}>
                        <Ionicons name="cube-outline" size={32} color="#1f2937" />
                        <Text style={styles.emptyText}>Tidak ada paket aktif</Text>
                    </View>
                )}
            </View>

            {/* Current Invoice */}
            <Text style={styles.sectionLabel}>Tagihan Bulan Ini</Text>
            <View style={styles.card}>
                {inv ? (
                    <View style={{ gap: 10 }}>
                        <InfoRow icon="calendar-outline" label="Bulan" value={formatMonth(inv.month)} />
                        <InfoRow icon="cash-outline" label="Tagihan Pokok" value={formatCurrency(inv.amount)} />
                        {Number(inv.previousBalance) > 0 && (
                            <InfoRow icon="alert-circle-outline" label="Tunggakan" value={formatCurrency(inv.previousBalance)} valueColor="#f87171" />
                        )}
                        {Number(inv.discount) > 0 && (
                            <InfoRow icon="pricetag-outline" label="Diskon" value={`-${formatCurrency(inv.discount)}`} valueColor="#34d399" />
                        )}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total Tagihan</Text>
                            <Text style={styles.totalValue}>{formatCurrency(inv.totalAmount)}</Text>
                        </View>
                        <InfoRow
                            icon="time-outline" label="Jatuh Tempo"
                            value={new Date(inv.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        />

                        {inv.status === 'unpaid' ? (
                            <View style={{ gap: 8 }}>
                                <TouchableOpacity style={styles.payOnlineBtn} onPress={() => handlePayOnline(inv)}>
                                    <Ionicons name="card-outline" size={18} color="#fff" />
                                    <Text style={styles.payBtnText}>Bayar Sekarang (Online)</Text>
                                </TouchableOpacity>
                                <Text style={styles.feeInfo}>
                                    Metode: VA, QRIS, E-Wallet • <Text style={{ color: '#f87171' }}>+ Biaya Rp 2.000</Text>
                                </Text>
                                <TouchableOpacity style={styles.payBtn} onPress={handlePayWA}>
                                    <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                                    <Text style={styles.payBtnText}>Konfirmasi via WhatsApp</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.paidBanner}>
                                <Ionicons name="checkmark-circle-outline" size={16} color="#34d399" />
                                <Text style={styles.paidText}>Tagihan ini sudah LUNAS</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.emptyCard}>
                        <Ionicons name="receipt-outline" size={32} color="#1f2937" />
                        <Text style={styles.emptyText}>Tidak ada tagihan bulan ini</Text>
                    </View>
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

    welcomeCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#1f2937' },
    welcomeLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatarCircle: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#818cf8', fontWeight: '800', fontSize: 22 },
    greet: { color: '#64748b', fontSize: 12 },
    userName: { color: '#f1f5f9', fontWeight: '700', fontSize: 16, marginTop: 2 },
    pppoeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    pppoeText: { color: '#818cf8', fontSize: 11, fontWeight: '600' },
    logoutIcon: { padding: 6, backgroundColor: '#1f2937', borderRadius: 10 },

    warningCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(251,146,60,0.08)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(251,146,60,0.2)' },
    warningText: { color: '#fb923c', fontSize: 13, fontWeight: '600', flex: 1 },

    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },

    card: { backgroundColor: '#111827', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#1f2937' },
    pkgHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pkgIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(79,70,229,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(129,140,248,0.2)' },
    pkgName: { color: '#f1f5f9', fontWeight: '700', fontSize: 16 },
    pkgPrice: { color: '#34d399', fontSize: 13, marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
    badgeGreen: { backgroundColor: 'rgba(52,211,153,0.1)' },
    badgeRed: { backgroundColor: 'rgba(248,113,113,0.1)' },
    statusText: { fontSize: 11, fontWeight: '700' },
    speedGrid: { flexDirection: 'row', backgroundColor: '#0d1117', borderRadius: 12, overflow: 'hidden' },
    speedItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
    divider: { width: 1, backgroundColor: '#1f2937' },
    speedVal: { color: '#f1f5f9', fontWeight: '700', fontSize: 18 },
    speedLabel: { color: '#64748b', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
    infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoLabel: { color: '#64748b', fontSize: 13 },
    infoValue: { color: '#e2e8f0', fontSize: 13, fontWeight: '500' },
    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1f2937', paddingTop: 12, marginTop: 4 },
    totalLabel: { color: '#94a3b8', fontWeight: '700', fontSize: 14 },
    totalValue: { color: '#f1f5f9', fontWeight: '800', fontSize: 20 },

    payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a', borderRadius: 12, padding: 14, marginTop: 4 },
    payOnlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4f46e5', borderRadius: 12, padding: 14, marginTop: 6 },
    payBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    feeInfo: { color: '#64748b', fontSize: 11, textAlign: 'center', marginBottom: 4 },
    paidBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(52,211,153,0.08)', borderRadius: 12, padding: 14, marginTop: 6, borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)' },
    paidText: { color: '#34d399', fontWeight: '700', fontSize: 14 },

    emptyCard: { alignItems: 'center', padding: 24, gap: 8 },
    emptyText: { color: '#374151', fontSize: 13 },
})
