import React, { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert
} from 'react-native'
import { StatusBar } from 'expo-status-bar'

import { Ionicons } from '@expo/vector-icons'
import api from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import type { AuthResponse } from '@/types'

export default function LoginScreen() {
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

    const validate = () => {
        const e: typeof errors = {}
        if (!email.trim()) e.email = 'Email wajib diisi'
        else if (!email.includes('@')) e.email = 'Email tidak valid'
        if (!password) e.password = 'Password wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleLogin = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            const res = await api.post<AuthResponse>('/auth/login', { email: email.trim().toLowerCase(), password })
            await login(res.data.data.user, res.data.data.token)
        } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Email atau password salah'
            Alert.alert('Login Gagal', msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="light" />
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Logo */}
                <View style={styles.logoSection}>
                    <View style={styles.logoCircle}>
                        <Ionicons name="wifi" size={36} color="#818cf8" />
                    </View>
                    <Text style={styles.appName}>Homenet</Text>
                    <Text style={styles.tagline}>Manajemen Internet Anda</Text>
                </View>

                {/* Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Masuk</Text>

                    {/* Email */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Email</Text>
                        <View style={[styles.inputWrap, errors.email ? styles.inputWrapError : null]}>
                            <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.inputIcon} />
                            <TextInput
                                style={styles.nativeInput}
                                placeholder="nama@email.com"
                                placeholderTextColor="#64748b"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={email}
                                onChangeText={(v) => { setEmail(v); setErrors(p => ({ ...p, email: undefined })) }}
                            />
                        </View>
                        {errors.email ? (
                            <View style={styles.errorRow}>
                                <Ionicons name="alert-circle-outline" size={13} color="#f87171" />
                                <Text style={styles.errorText}>{errors.email}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Password */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Password</Text>
                        <View style={[styles.inputWrap, errors.password ? styles.inputWrapError : null]}>
                            <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
                            <TextInput
                                style={styles.nativeInput}
                                placeholder="••••••••"
                                placeholderTextColor="#64748b"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={(v) => { setPassword(v); setErrors(p => ({ ...p, password: undefined })) }}
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={18} color="#64748b"
                                />
                            </TouchableOpacity>
                        </View>
                        {errors.password ? (
                            <View style={styles.errorRow}>
                                <Ionicons name="alert-circle-outline" size={13} color="#f87171" />
                                <Text style={styles.errorText}>{errors.password}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        style={[styles.btn, loading && styles.btnDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <View style={styles.btnInner}>
                                <Ionicons name="log-in-outline" size={18} color="#fff" />
                                <Text style={styles.btnText}>Masuk</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>Homenet © 2025</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#080f1a' },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },

    logoSection: { alignItems: 'center', marginBottom: 36 },
    logoCircle: {
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: '#1a2035',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1, borderColor: '#2d3a55',
        shadowColor: '#6366f1', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 16,
        elevation: 8,
    },
    appName: {
        fontSize: 30, fontWeight: '800', color: '#f1f5f9',
        letterSpacing: -0.5,
    },
    tagline: { fontSize: 13, color: '#475569', marginTop: 4 },

    card: {
        backgroundColor: '#111827',
        borderRadius: 20, padding: 24,
        borderWidth: 1, borderColor: '#1f2937',
        gap: 18,
    },
    cardTitle: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 4 },

    fieldGroup: { gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0d1117',
        borderWidth: 1, borderColor: '#1f2937',
        borderRadius: 12, paddingHorizontal: 14,
        minHeight: 52,
    },
    inputWrapError: { borderColor: '#ef4444' },
    inputIcon: { marginRight: 10 },
    nativeInput: {
        flex: 1, color: '#f1f5f9', fontSize: 15,
        paddingVertical: 14,
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    eyeBtn: { padding: 4, marginLeft: 4 },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    errorText: { fontSize: 12, color: '#f87171' },

    btn: {
        backgroundColor: '#4f46e5',
        borderRadius: 12, paddingVertical: 16,
        alignItems: 'center',
        marginTop: 4,
    },
    btnDisabled: { opacity: 0.6 },
    btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    footer: { textAlign: 'center', color: '#374151', fontSize: 12, marginTop: 32 },
})
