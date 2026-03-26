import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        // If there is no token, skip the /auth/me call entirely
        const token = localStorage.getItem('dam_token');
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const { data } = await api.get('/auth/me');
            setUser(data.user);
        } catch {
            // If token is invalid/expired, clear it so we don't keep getting 401s
            localStorage.removeItem('dam_token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        if (data.token) {
            localStorage.setItem('dam_token', data.token);
        }
        setUser(data.user);
        return data;
    };

    const logout = async () => {
        await api.post('/auth/logout');
        localStorage.removeItem('dam_token');
        setUser(null);
    };

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

