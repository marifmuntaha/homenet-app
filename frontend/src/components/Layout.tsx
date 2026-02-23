import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/axios'
import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'

interface LayoutProps {
    children: ReactNode
    title: string
}

export default function Layout({ children, title }: LayoutProps) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    useEffect(() => {
        // Close sidebar on route change (mobile)
        setIsSidebarOpen(false)
    }, [location.pathname])

    const handleLogout = async () => {
        try {
            await api.delete('/auth/logout')
        } catch {
            // ignore
        }
        logout()
        navigate('/login')
    }

    return (
        <div className="app-layout">
            {/* Sidebar Overlay (Mobile) */}
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">🏠</div>
                    <div className="sidebar-logo-text">
                        <h1>Homenet</h1>
                        <span>Admin Panel</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section-label">Menu</div>
                    {user?.role === 1 ? (
                        <>
                            <NavLink
                                to="/dashboard"
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">📊</span>
                                Dashboard
                            </NavLink>
                            <NavLink
                                to="/users"
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">👥</span>
                                User Management
                            </NavLink>
                            <NavLink
                                to="/devices"
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">🖥️</span>
                                Device Mikrotik
                            </NavLink>
                            <NavLink
                                to="/products"
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">📦</span> Product & Bandwidth
                            </NavLink>
                            <NavLink
                                to="/customers"
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">👥</span> Manajemen Pelanggan
                            </NavLink>
                            <NavLink
                                to="/invoices"
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">🧾</span> Manajemen Tagihan
                            </NavLink>
                        </>
                    ) : (
                        <>
                            <NavLink
                                to="/customer/dashboard"
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">🏠</span>
                                Dashboard Saya
                            </NavLink>
                            <NavLink
                                to="/customer/invoices"
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">🧾</span>
                                Tagihan Saya
                            </NavLink>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                        </div>
                        <div className="user-details">
                            <div className="user-name">{user?.name}</div>
                            <div className="user-role">
                                {user?.role === 1 ? 'Administrator' : 'Customer'}
                            </div>
                        </div>
                        <button className="logout-btn" onClick={handleLogout} title="Logout">
                            ⟵
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div className="main-content">
                <header className="topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            className="menu-toggle"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            ☰
                        </button>
                        <h2 className="topbar-title">{title}</h2>
                    </div>
                </header>
                <main className="page-content">{children}</main>
            </div>
        </div>
    )
}
