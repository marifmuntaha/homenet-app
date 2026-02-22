import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '../types'

interface AuthContextType {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (user: User, token: string) => void
    logout: () => void
    updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token')
        const storedUser = localStorage.getItem('auth_user')

        if (storedToken && storedUser) {
            try {
                setToken(storedToken)
                setUser(JSON.parse(storedUser))
            } catch {
                localStorage.removeItem('auth_token')
                localStorage.removeItem('auth_user')
            }
        }
        setIsLoading(false)
    }, [])

    const login = (userData: User, authToken: string) => {
        setUser(userData)
        setToken(authToken)
        localStorage.setItem('auth_token', authToken)
        localStorage.setItem('auth_user', JSON.stringify(userData))
    }

    const logout = () => {
        setUser(null)
        setToken(null)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
    }

    const updateUser = (userData: User) => {
        setUser(userData)
        localStorage.setItem('auth_user', JSON.stringify(userData))
    }

    return (
        <AuthContext.Provider
            value={{ user, token, isAuthenticated: !!token, isLoading, login, logout, updateUser }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}
