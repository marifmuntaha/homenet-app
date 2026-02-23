import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import UsersPage from './pages/users/UsersPage'
import DevicesPage from './pages/devices/DevicesPage'
import ProductsPage from './pages/products/ProductsPage'
import CustomersPage from './pages/customers/CustomersPage'
import InvoicesPage from './pages/invoices/InvoicesPage'
import AdminDashboardPage from './pages/dashboard/AdminDashboardPage'
import CustomerDashboardPage from './pages/customer/CustomerDashboardPage'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null

  if (isAuthenticated) {
    return user?.role === 1 ? <Navigate to="/users" replace /> : <Navigate to="/customer/dashboard" replace />
  }

  return <>{children}</>
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 1) return <Navigate to="/customer/dashboard" replace />

  return <>{children}</>
}

function AppRoutes() {
  const { user, isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/" element={
        isAuthenticated
          ? (user?.role === 1 ? <Navigate to="/dashboard" replace /> : <Navigate to="/customer/dashboard" replace />)
          : <Navigate to="/login" replace />
      } />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Admin Routes */}
      <Route path="/dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
      <Route path="/devices" element={<AdminRoute><DevicesPage /></AdminRoute>} />
      <Route path="/products" element={<AdminRoute><ProductsPage /></AdminRoute>} />
      <Route path="/customers" element={<AdminRoute><CustomersPage /></AdminRoute>} />
      <Route path="/invoices" element={<AdminRoute><InvoicesPage /></AdminRoute>} />

      {/* Customer Routes */}
      <Route path="/customer/dashboard" element={<ProtectedRoute><CustomerDashboardPage /></ProtectedRoute>} />
      <Route path="/customer/invoices" element={<ProtectedRoute><CustomerDashboardPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
