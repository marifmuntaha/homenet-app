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

export interface ProductSyncResult {
    [deviceId: number]: boolean
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
    onts?: CustomerOnt[]
    createdAt: string
    updatedAt: string
}

export interface CustomerOnt {
    id: number
    customerId: number
    customer?: Customer
    genieacsDeviceId: string | null
    serialNumber: string | null
    ontLabel: string | null
    wifiSsid: string | null
    wifiPassword: string | null
    provisionStatus: 'pending' | 'provisioned' | 'failed'
    provisionedAt: string | null
    createdAt: string
    updatedAt: string | null
}

export interface OntInfo {
    online: boolean
    deviceId?: string
    serialNumber?: string
    productClass?: string
    softwareVersion?: string
    hardwareVersion?: string
    uptime?: string | number
    wanIp?: string
    ssid?: string
    lastInform?: string
    error?: string
    // mapping fields
    ont_id?: number
    ont_label?: string | null
    serial_number?: string | null
    genieacs_device_id?: string
}

export interface GenieDevice {
    device_id: string
    serial_number?: string
    product_class?: string
    manufacturer?: string
    last_inform?: string
    registered?: string
    is_mapped?: boolean
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
