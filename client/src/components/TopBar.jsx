import { useLocation } from 'react-router-dom';
import { LogOut, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const routeNames = {
    '/': 'Dashboard',
    '/quotations': 'Quotations',
    '/quotations/new': 'New Quotation',
    '/clients': 'Clients',
    '/payments': 'Payments',

    '/settings': 'Settings',
};

export default function TopBar() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const pageName = routeNames[location.pathname] ||
        (location.pathname.includes('/quotations/') ? 'Quotation Details' :
            location.pathname.includes('/clients/') ? 'Client Details' : 'Page');

    return (
        <header
            className="h-[60px] flex items-center justify-between px-8 sticky top-0 z-40"
            style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
        >
            <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>DAM</span>
                <span style={{ color: 'var(--color-border)' }}>/</span>
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{pageName}</span>
            </div>

            <div className="flex items-center gap-4">
                {/* Ghost Search */}
                <div className="relative">
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="input-dark"
                        style={{
                            paddingLeft: 34, width: 180, height: 34, fontSize: 12,
                            background: 'var(--color-base)', borderRadius: 'var(--radius-sm)'
                        }}
                    />
                </div>

                {/* User */}
                <div className="flex items-center gap-3">
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--color-accent)', color: 'var(--color-base)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700
                    }}>
                        {user?.name?.[0] || 'A'}
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center justify-center"
                        style={{
                            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                            background: 'transparent', border: 'none',
                            color: 'var(--color-text-muted)', cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => { e.target.style.color = 'var(--color-status-rejected)'; e.target.style.background = 'rgba(239,68,68,0.1)'; }}
                        onMouseLeave={e => { e.target.style.color = 'var(--color-text-muted)'; e.target.style.background = 'transparent'; }}
                        title="Logout"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </header>
    );
}
