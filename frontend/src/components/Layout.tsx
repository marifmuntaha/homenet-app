import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/axios'
import type { ReactNode } from 'react'

interface LayoutProps {
    children: ReactNode
    title: string
}

export default function Layout({ children, title }: LayoutProps) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

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
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">🏠</div>
                    <div className="sidebar-logo-text">
                        <h1>Homenet</h1>
                        <span>Admin Panel</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section-label">Menu</div>
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
                    <h2 className="topbar-title">{title}</h2>
                </header>
                <main className="page-content">{children}</main>
            </div>
        </div>
    )
}
