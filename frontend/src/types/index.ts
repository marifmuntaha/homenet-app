export interface User {
    id: number
    name: string
    email: string
    phone: string | null
    phone_verified_at: string | null
    role: 1 | 2
    created_at: string
    updated_at: string | null
}

export interface AuthToken {
    type: string
    value: string
}

export interface AuthResponse {
    success: boolean
    message: string
    data: {
        user: User
        token: string
    }
}

export interface ApiResponse<T = unknown> {
    success: boolean
    message?: string
    data?: T
}

export interface PaginatedResponse<T> {
    success: boolean
    data: {
        data: T[]
        meta: {
            total: number
            per_page: number
            current_page: number
            last_page: number
            first_page: number
        }
    }
}

export const ROLES = {
    1: 'Administrator',
    2: 'Customer',
} as const
