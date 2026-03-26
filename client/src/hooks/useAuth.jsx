import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

// ── TEMPORARY: Auth disabled for client access ──
const GUEST_USER = { id: 'guest', name: 'Admin', email: 'admin@dam.app', role: 'ADMIN' };

export function AuthProvider({ children }) {
    const [user, setUser] = useState(GUEST_USER);
    const [loading, setLoading] = useState(false);

    const login = async () => { setUser(GUEST_USER); };
    const logout = async () => { setUser(GUEST_USER); };
    const checkAuth = () => {};

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
