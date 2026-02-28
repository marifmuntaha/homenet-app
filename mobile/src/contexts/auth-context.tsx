import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import type { User } from '@/types'
import { setApiToken } from '@/lib/api'

interface AuthContextType {
    user: User | null
    token: string | null
    isLoading: boolean
    login: (user: User, token: string) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadStoredAuth()
    }, [])

    const loadStoredAuth = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('auth_token')
            const storedUser = await AsyncStorage.getItem('auth_user')
            if (storedToken && storedUser) {
                setApiToken(storedToken) // restore in-memory token on startup
                setToken(storedToken)
                setUser(JSON.parse(storedUser))
            }
        } catch {
            // ignore
        } finally {
            setIsLoading(false)
        }
    }

    const login = async (user: User, token: string) => {
        await AsyncStorage.setItem('auth_token', token)
        await AsyncStorage.setItem('auth_user', JSON.stringify(user))
        setApiToken(token) // update in-memory cache immediately
        setUser(user)
        setToken(token)
    }

    const logout = async () => {
        await AsyncStorage.removeItem('auth_token')
        await AsyncStorage.removeItem('auth_user')
        setApiToken(null) // clear in-memory cache
        setUser(null)
        setToken(null)
        router.replace('/(auth)/login')
    }

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
