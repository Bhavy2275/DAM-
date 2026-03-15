import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fadeUp } from '../lib/animations';

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
            style={{ background: 'radial-gradient(ellipse at 30% 20%, #0E1629 0%, #070C18 70%)' }}
        >
            {/* Ambient glow orbs */}
            <div style={{ position: 'absolute', top: 80, left: 80, width: 400, height: 400, background: 'radial-gradient(circle, rgba(245,166,35,0.06) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
            <div style={{ position: 'absolute', bottom: 80, right: 80, width: 300, height: 300, background: 'radial-gradient(circle, rgba(245,166,35,0.04) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />

            <div className="w-full max-w-md relative">
                {/* Logo */}
                <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="text-center mb-10">
                    <div
                        className="mx-auto mb-6 flex items-center justify-center"
                        style={{
                            width: 72, height: 72, borderRadius: 'var(--radius-lg)',
                            background: 'var(--color-accent-glow)',
                            border: '1px solid rgba(245,166,35,0.2)',
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 8px 32px rgba(245,166,35,0.15)'
                        }}
                    >
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--color-accent)' }}>D</span>
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.8rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: 4 }}>DAM</h1>
                    <p style={{ color: 'var(--color-accent-dim)', fontSize: 12, letterSpacing: 5, textTransform: 'uppercase', marginTop: 4 }}>design · allocate · maintain</p>
                </motion.div>

                {/* Card */}
                <motion.div
                    variants={fadeUp} initial="hidden" animate="visible" custom={1}
                    style={{
                        background: 'rgba(14,22,41,0.8)', backdropFilter: 'blur(20px)',
                        border: '1px solid var(--color-border)', borderTop: '2px solid var(--color-accent)',
                        borderRadius: 'var(--radius-lg)', padding: 32,
                        boxShadow: '0 20px 80px rgba(0,0,0,0.4)'
                    }}
                >
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 24 }}>Welcome back</h2>

                    {error && (
                        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13 }}>
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
                                    placeholder="admin@damlighting.com" required
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
                        Demo: admin@damlighting.com / admin123
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
