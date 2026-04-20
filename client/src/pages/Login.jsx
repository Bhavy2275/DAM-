import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fadeUp } from '../lib/animations';
import logo from '../assets/logo.png';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'var(--color-base)' }}
        >
            {/* Subtle background accents */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--color-accent)' }} />
            <div style={{ position: 'absolute', top: 80, left: 80, width: 400, height: 400, background: 'radial-gradient(circle, rgba(224,155,16,0.06) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
            <div style={{ position: 'absolute', bottom: 80, right: 80, width: 300, height: 300, background: 'radial-gradient(circle, rgba(28,35,51,0.05) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />

            <div className="w-full max-w-md relative">
                {/* Logo */}
                <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="text-center mb-10">
                    <img
                        src={logo}
                        alt="DAM Lighting"
                        style={{
                            height: 100,
                            margin: '0 auto 0 auto',
                            filter: 'brightness(0) saturate(100%)'
                        }}
                    />
                </motion.div>

                {/* Card */}
                <motion.div
                    variants={fadeUp} initial="hidden" animate="visible" custom={1}
                    style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)', borderTop: '3px solid var(--color-accent)',
                        borderRadius: 'var(--radius-lg)', padding: 32,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
                    }}
                >
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 24 }}>Welcome back</h2>

                    {error && (
                        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#B91C1C', fontSize: 13 }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 20 }}>
                            <label htmlFor="login-email" className="label">Email</label>
                            <div className="relative">
                                <Mail size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    id="login-email"
                                    name="email"
                                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="input-dark" style={{ paddingLeft: 38 }}
                                    placeholder="Email address" required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label htmlFor="login-password" className="label">Password</label>
                            <div className="relative">
                                <Lock size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    id="login-password"
                                    name="password"
                                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="input-dark" style={{ paddingLeft: 38 }}
                                    placeholder="••••••••" required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 14 }}>
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <p style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)' }}>
                        Contact admin for access
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
