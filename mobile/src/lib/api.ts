import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from './config'

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
    timeout: 15000,
})

// Cache token in memory for synchronous use in interceptor
let _cachedToken: string | null = null

// Load token once at startup
AsyncStorage.getItem('auth_token').then((t) => {
    _cachedToken = t
})

// Synchronous request interceptor — attach token from memory cache
api.interceptors.request.use((config) => {
    if (_cachedToken) {
        config.headers.Authorization = `Bearer ${_cachedToken}`
    }
    return config
})

// Response interceptor — handle 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            _cachedToken = null
            await AsyncStorage.removeItem('auth_token')
            await AsyncStorage.removeItem('auth_user')
        }
        return Promise.reject(error)
    }
)

/** Call this after login to update in-memory cache immediately */
export function setApiToken(token: string | null) {
    _cachedToken = token
}

export default api
