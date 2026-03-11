import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, FileText, Users, CreditCard, Settings,
    ChevronLeft, ChevronRight, Lightbulb
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { slideInLeft } from '../lib/animations';

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/quotations', icon: FileText, label: 'Quotations' },
    { path: '/clients', icon: Users, label: 'Clients' },
    { path: '/products', icon: Lightbulb, label: 'Products' },
    { path: '/payments', icon: CreditCard, label: 'Payments' },
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
            style={{ background: 'var(--color-base)', borderRight: '1px solid var(--color-border)' }}
        >
            {/* Logo */}
            <div className="px-4 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-md)',
                        background: 'var(--color-accent)', color: 'var(--color-base)',
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18
                    }}
                >
                    D
                </div>
                {!collapsed && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--color-text-primary)', letterSpacing: 2 }}>DAM</div>
                        <div style={{ fontSize: 8, color: 'var(--color-text-muted)', letterSpacing: 3, textTransform: 'uppercase', marginTop: -2 }}>design · allocate · maintain</div>
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
                                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                    background: isActive ? 'var(--color-accent-glow)' : 'transparent',
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
                            background: 'var(--color-accent)', color: 'var(--color-base)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700
                        }}>
                            {user.name?.[0] || 'A'}
                        </div>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{user.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{user.role}</div>
                        </div>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center py-2 rounded-lg"
                    style={{
                        background: 'var(--color-surface)', color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)', cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>
        </motion.aside>
    );
}
