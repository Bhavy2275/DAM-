import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, FileText, Users, Settings,
    ChevronLeft, ChevronRight, Lightbulb
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { slideInLeft } from '../lib/animations';
import logo from '../assets/logo.png';

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/quotations', icon: FileText, label: 'Quotations' },
    { path: '/clients', icon: Users, label: 'Clients' },
    { path: '/products', icon: Lightbulb, label: 'Products' },
    { path: '/settings', icon: Settings, label: 'Settings', adminOnly: true },
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const { user } = useAuth();
    const location = useLocation();
    const w = collapsed ? 64 : 220;

    return (
        <motion.aside
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1, width: w }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="sticky left-0 top-0 h-screen flex-shrink-0 flex flex-col z-50"
            style={{ background: 'var(--color-sidebar)', borderRight: '1px solid var(--color-sidebar-border)' }}
        >
            {/* Logo */}
            <div className="px-4 py-5 flex items-center justify-center" style={{ borderBottom: '1px solid var(--color-sidebar-border)', minHeight: 77 }}>
                {collapsed ? (
                    <img 
                        src={logo} 
                        alt="Logo" 
                        style={{ width: 32, height: 32, objectFit: 'contain', filter: 'brightness(1.1)' }} 
                    />
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                        <img 
                            src={logo} 
                            alt="DAM Lighting" 
                            style={{ height: 48, objectFit: 'contain' }} 
                        />
                    </motion.div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-0.5">
                {navItems.map((item, i) => {
                    if (item.adminOnly && user?.role !== 'ADMIN') return null;
                    const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                    return (
                        <motion.div
                            key={item.path}
                            custom={i}
                            variants={slideInLeft}
                            initial="hidden"
                            animate="visible"
                        >
                            <NavLink
                                to={item.path}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg relative group"
                                style={{
                                    color: isActive ? 'var(--color-accent-bright)' : 'rgba(255,255,255,0.65)',
                                    background: isActive ? 'rgba(224,155,16,0.15)' : 'transparent',
                                    transition: 'all 0.2s ease',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Active left bar */}
                                <div
                                    style={{
                                        position: 'absolute', left: 0, top: '20%', bottom: '20%',
                                        width: isActive ? 3 : 0, borderRadius: 2,
                                        background: 'var(--color-accent)',
                                        transition: 'width 0.2s ease'
                                    }}
                                />
                                {/* Ambient glow on active */}
                                {isActive && (
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        boxShadow: 'inset 0 0 40px var(--color-accent-glow)',
                                        borderRadius: 8, pointerEvents: 'none'
                                    }} />
                                )}
                                <item.icon style={{ width: 20, height: 20, flexShrink: 0 }} />
                                {!collapsed && (
                                    <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                                )}
                            </NavLink>
                        </motion.div>
                    );
                })}
            </nav>

            {/* User + Collapse */}
            <div className="px-2 pb-4 space-y-2">
                {!collapsed && user && (
                    <div className="px-3 py-2 flex items-center gap-2">
                        <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'var(--color-accent)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700
                        }}>
                            {user.name?.[0] || 'A'}
                        </div>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{user.name}</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{user.role}</div>
                        </div>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center py-2 rounded-lg"
                    style={{
                        background: 'var(--color-sidebar-hover)', color: 'rgba(255,255,255,0.6)',
                        border: '1px solid var(--color-sidebar-border)', cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>
        </motion.aside>
    );
}
