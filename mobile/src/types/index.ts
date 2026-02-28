export interface User {
    id: number
    name: string
    email: string
    phone: string | null
    role: 1 | 2
    created_at: string
    updated_at: string | null
}

export interface Device {
    id: number
    name: string
    host: string
    user: string
    port: number
    created_at: string
    updated_at: string | null
}

export interface DeviceStatus {
    device_id: number
    online: boolean
    identity?: string
    response_ms?: number
    error?: string
    checked_at: string
}

export interface Product {
    id: number
    name: string
    price: number
    download_speed: number
    upload_speed: number
    description?: string
    created_at: string
    updated_at: string
}

export interface CustomerSubscription {
    id: number
    customer_id: number
    product_id: number
    status: 'active' | 'inactive'
    product?: Product
    created_at: string
    updated_at: string
}

export interface Invoice {
    id: number
    customerId: number
    customer?: Customer
    month: string
    amount: number
    previousBalance: number
    discount: number
    totalAmount: number
    status: 'unpaid' | 'paid' | 'cancelled'
    dueDate: string
    paidAt: string | null
    createdAt: string
    updatedAt: string
}

export interface Customer {
    id: number
    userId: number
    fullName: string
    phone: string
    address?: string
    latitude?: number
    longitude?: number
    pppoeUser?: string
    pppoePassword?: string
    subscriptions?: CustomerSubscription[]
    invoices?: Invoice[]
    createdAt: string
    updatedAt: string
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

export interface DashboardStats {
    totalCustomers: number
    onlineCustomers: number
    unpaidInvoicesCount: number
    unpaidInvoicesAmount: number
}

export interface DashboardData {
    stats: DashboardStats
    recentInvoices: Invoice[]
}

export interface CustomerDashboardData {
    customer: Customer
    activeSubscription: CustomerSubscription | null
    currentInvoice: Invoice | null
    totalUnpaid: number
    unpaidCount: number
}
