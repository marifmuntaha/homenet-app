import React, { useState, useEffect, useCallback } from 'react'
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    Alert, ActivityIndicator, RefreshControl, Modal,
    KeyboardAvoidingView, Platform, ScrollView, TextInput,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import api from '@/lib/api'
import type { Device } from '@/types'

export default function DevicesScreen() {
    const insets = useSafeAreaInsets()
    const [devices, setDevices] = useState<Device[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editTarget, setEditTarget] = useState<Device | null>(null)

    const fetchDevices = useCallback(async (q = search) => {
        try {
            const res = await api.get<any>(`/devices?search=${q}`)
            const raw = res.data?.data
            setDevices(Array.isArray(raw) ? raw : (raw?.data ?? []))
        } catch { } finally { setLoading(false); setRefreshing(false) }
    }, [search])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDevices()
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    const handleDelete = (d: Device) => {
        Alert.alert('Hapus Perangkat', `Hapus "${d.name}"?`, [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Hapus', style: 'destructive', onPress: async () => {
                    try { await api.delete(`/devices/${d.id}`); fetchDevices() }
                    catch { Alert.alert('Error', 'Gagal menghapus') }
                },
            },
        ])
    }

    const renderItem = ({ item }: { item: Device }) => (
        <View style={styles.card}>
            <View style={styles.cardIcon}>
                <Ionicons name="hardware-chip-outline" size={24} color="#818cf8" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                <View style={styles.metaRow}>
                    <Ionicons name="globe-outline" size={11} color="#818cf8" />
                    <Text style={styles.cardHost}>{item.host}:{item.port}</Text>
                </View>
                <View style={styles.metaRow}>
                    <Ionicons name="person-outline" size={11} color="#64748b" />
                    <Text style={styles.cardUser}>{item.user}</Text>
                </View>
            </View>
            <View style={styles.cardBtns}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => { setEditTarget(item); setShowModal(true) }}>
                    <Ionicons name="create-outline" size={17} color="#818cf8" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, styles.iconBtnRed]} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={17} color="#f87171" />
                </TouchableOpacity>
            </View>
        </View>
    )

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <View style={styles.toolbar}>
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={16} color="#475569" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Cari router..."
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
                <TouchableOpacity style={styles.addBtn} onPress={() => { setEditTarget(null); setShowModal(true) }}>
                    <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loader}><ActivityIndicator color="#818cf8" size="large" /></View>
            ) : (
                <FlatList
                    data={devices}
                    keyExtractor={(i) => String(i.id)}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 12, gap: 8 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDevices() }} tintColor="#818cf8" />}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ionicons name="hardware-chip-outline" size={48} color="#1f2937" />
                            <Text style={styles.emptyTitle}>Belum ada perangkat</Text>
                            <Text style={styles.emptyText}>Tambah Router Mikrotik untuk mulai monitoring</Text>
                        </View>
                    }
                />
            )}

            <DeviceModal visible={showModal} device={editTarget} onClose={(r) => { setShowModal(false); if (r) fetchDevices() }} />
        </View>
    )
}

function DeviceModal({ visible, device, onClose }: {
    visible: boolean; device: Device | null; onClose: (r?: boolean) => void
}) {
    const isEdit = !!device
    const [name, setName] = useState(''); const [host, setHost] = useState('')
    const [user, setUser] = useState(''); const [password, setPassword] = useState('')
    const [port, setPort] = useState('8728'); const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (visible && device) { setName(device.name); setHost(device.host); setUser(device.user); setPort(String(device.port)); setPassword('') }
        else if (visible) { setName(''); setHost(''); setUser(''); setPassword(''); setPort('8728') }
    }, [visible, device])

    const handleSave = async () => {
        if (!name || !host || !user) { Alert.alert('Validasi', 'Nama, Host, dan User wajib diisi'); return }
        if (!isEdit && !password) { Alert.alert('Validasi', 'Password wajib diisi'); return }
        setLoading(true)
        try {
            const payload: any = { name, host, user, port: Number(port) }
            if (password) payload.password = password
            if (isEdit) { await api.put(`/devices/${device.id}`, payload) }
            else { await api.post('/devices', payload) }
            onClose(true)
        } catch (err: any) { Alert.alert('Error', err.response?.data?.message || 'Gagal menyimpan') }
        finally { setLoading(false) }
    }

    const fields = [
        { label: 'Nama Perangkat', icon: 'bookmark-outline' as const, value: name, set: setName, placeholder: 'MikroTik RB750' },
        { label: 'Host / IP Address', icon: 'globe-outline' as const, value: host, set: setHost, placeholder: '192.168.1.1', keyboard: 'url' as any },
        { label: 'Username', icon: 'person-outline' as const, value: user, set: setUser, placeholder: 'admin', cap: 'none' as any },
        { label: isEdit ? 'Password (kosongkan jika tak diubah)' : 'Password', icon: 'lock-closed-outline' as const, value: password, set: setPassword, secure: true, placeholder: '••••••••' },
        { label: 'Port API', icon: 'radio-outline' as const, value: port, set: setPort, placeholder: '8728', keyboard: 'numeric' as any },
    ]

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={mStyles.header}>
                    <View style={mStyles.headerLeft}>
                        <Ionicons name="hardware-chip-outline" size={20} color="#818cf8" />
                        <Text style={mStyles.title}>{isEdit ? 'Edit Perangkat' : 'Tambah Perangkat'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => onClose()} style={{ padding: 4 }}>
                        <Ionicons name="close" size={22} color="#64748b" />
                    </TouchableOpacity>
                </View>
                <ScrollView style={mStyles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={{ padding: 16, gap: 14 }}>
                        {fields.map(f => (
                            <View key={f.label} style={mStyles.field}>
                                <Text style={mStyles.label}>{f.label}</Text>
                                <View style={mStyles.inputWrap}>
                                    <Ionicons name={f.icon} size={15} color="#475569" />
                                    <TextInput
                                        style={mStyles.input}
                                        placeholder={f.placeholder}
                                        placeholderTextColor="#64748b"
                                        value={f.value}
                                        onChangeText={f.set}
                                        secureTextEntry={f.secure}
                                        keyboardType={f.keyboard}
                                        autoCapitalize={f.cap || 'words'}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
                <View style={mStyles.footer}>
                    <TouchableOpacity style={mStyles.btnCancel} onPress={() => onClose()}>
                        <Text style={{ color: '#64748b', fontWeight: '600' }}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[mStyles.btnSave, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="checkmark-outline" size={16} color="#fff" />
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Simpan</Text>
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
    toolbar: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#0d1117' },
    searchBox: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
        borderWidth: 1, borderColor: '#1f2937',
    },
    searchInput: { flex: 1, color: '#f1f5f9', fontSize: 14, backgroundColor: 'transparent', borderWidth: 0, padding: 0 },
    toolbarLabel: { color: '#e2e8f0', fontWeight: '700', fontSize: 16 },
    toolbarSub: { color: '#475569', fontSize: 12, marginTop: 2 },
    addBtn: { backgroundColor: '#4f46e5', borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#111827', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#1f2937' },
    cardIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: 'rgba(79,70,229,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(129,140,248,0.2)' },
    cardName: { color: '#e2e8f0', fontWeight: '700', fontSize: 15 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    cardHost: { color: '#818cf8', fontSize: 12 },
    cardUser: { color: '#64748b', fontSize: 12 },
    cardBtns: { gap: 6 },
    iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(129,140,248,0.1)', alignItems: 'center', justifyContent: 'center' },
    iconBtnRed: { backgroundColor: 'rgba(248,113,113,0.1)' },
    emptyBox: { alignItems: 'center', padding: 48, gap: 10 },
    emptyTitle: { color: '#e2e8f0', fontWeight: '600', fontSize: 16 },
    emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center' },
})

const mStyles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#080f1a', borderBottomWidth: 1, borderBottomColor: '#1f2937' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
    body: { flex: 1, backgroundColor: '#080f1a' },
    field: { gap: 6 },
    label: { fontSize: 12, fontWeight: '600', color: '#64748b' },
    inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937', borderRadius: 12, paddingHorizontal: 14, minHeight: 48 },
    input: { flex: 1, color: '#f1f5f9', fontSize: 14, backgroundColor: 'transparent', borderWidth: 0, paddingVertical: 12 },
    footer: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#080f1a', borderTopWidth: 1, borderTopColor: '#1f2937' },
    btnCancel: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937' },
    btnSave: { flex: 2, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#4f46e5' },
})
