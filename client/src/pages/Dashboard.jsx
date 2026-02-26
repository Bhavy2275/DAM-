import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Users, CreditCard, TrendingUp, Plus, ArrowRight, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../lib/api';
import { formatINR } from '../lib/formatCurrency';
import { fadeUp, staggerContainer, useCountUp } from '../lib/animations';
import StatusBadge from '../components/StatusBadge';

function StatCard({ label, value, icon: Icon, color, index, isCurrency }) {
    const numValue = isCurrency ? null : useCountUp(typeof value === 'number' ? value : 0);
    return (
        <motion.div variants={fadeUp} custom={index} className="card-surface" style={{ padding: 24, cursor: 'default' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} />
                </div>
            </div>
            <div className="font-display tabular-nums" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
                {isCurrency ? value : numValue}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6 }}>{label}</div>
        </motion.div>
    );
}

// Skeleton row
function SkeletonRow() {
    return (
        <tr><td colSpan="5" style={{ padding: '14px 20px' }}>
            <div className="skeleton" style={{ height: 16, width: '100%' }} />
        </td></tr>
    );
}

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        try { const { data } = await api.get('/dashboard/stats'); setStats(data); }
        catch (err) { console.error('Failed to load stats:', err); }
        finally { setLoading(false); }
    };

    if (loading) {
        return (
            <div style={{ padding: 32 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 140 }} />)}
                </div>
                <div className="skeleton" style={{ height: 320, marginBottom: 20 }} />
            </div>
        );
    }

    const PIE_COLORS = ['#4A5568', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6'];
    const statusData = stats?.statusCounts ? Object.entries(stats.statusCounts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0) : [];

    return (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center justify-between" style={{ marginBottom: 32 }}>
                <div>
                    <h1 className="font-display heading-underline" style={{ fontSize: '2.4rem', fontWeight: 700 }}>Dashboard</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 12 }}>Welcome to DAM Lighting Solution</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/quotations/new" className="btn-primary"><Plus size={16} /> New Quote</Link>
                    <Link to="/clients" className="btn-ghost"><Users size={16} /> Add Client</Link>
                </div>
            </motion.div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
                <StatCard label="Total Quotations" value={stats?.totalQuotations || 0} icon={FileText} color="rgba(59,130,246,0.15)" index={0} />
                <StatCard label="Pending Quotes" value={stats?.pending || 0} icon={Clock} color="var(--color-accent-glow)" index={1} />
                <StatCard label="Accepted" value={stats?.accepted || 0} icon={TrendingUp} color="rgba(16,185,129,0.15)" index={2} />
                <StatCard label="Total Revenue" value={formatINR(stats?.totalRevenue)} icon={CreditCard} color="rgba(139,92,246,0.15)" index={3} isCurrency />
            </div>

            {/* Payment Summary */}
            <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
                <div className="card-surface" style={{ padding: 24, borderTop: '2px solid var(--color-status-accepted)', cursor: 'default' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-status-accepted)', fontWeight: 600, marginBottom: 4 }}>Payments Received</div>
                    <div className="font-display tabular-nums" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-status-accepted)' }}>{formatINR(stats?.totalPaid)}</div>
                </div>
                <div className="card-surface" style={{ padding: 24, borderTop: '2px solid var(--color-accent)', cursor: 'default' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600, marginBottom: 4 }}>Payments Pending</div>
                    <div className="font-display tabular-nums" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-accent)' }}>{formatINR(stats?.totalPendingPayments)}</div>
                </div>
            </motion.div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 32 }}>
                <motion.div variants={fadeUp} className="card-surface" style={{ padding: 24, borderTop: '2px solid var(--color-accent)', cursor: 'default' }}>
                    <h3 className="font-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Monthly Revenue</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={stats?.monthlyRevenue || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)" />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                formatter={(v) => formatINR(v)}
                                contentStyle={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                                itemStyle={{ color: 'var(--color-text-primary)' }}
                                labelStyle={{ color: 'var(--color-text-secondary)' }}
                            />
                            <Bar dataKey="amount" fill="#F5A623" radius={[6, 6, 0, 0]} animationDuration={1200} />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>

                <motion.div variants={fadeUp} className="card-surface" style={{ padding: 24, cursor: 'default' }}>
                    <h3 className="font-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Quote Status</h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value" animationDuration={1200}>
                                {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)', borderRadius: 8 }} itemStyle={{ color: 'var(--color-text-primary)', fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3" style={{ marginTop: 12 }}>
                        {statusData.map((d, i) => (
                            <div key={d.name} className="flex items-center gap-1.5" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i] }} />
                                {d.name} ({d.value})
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Recent Quotations */}
            <motion.div variants={fadeUp} className="card-surface" style={{ overflow: 'hidden', cursor: 'default' }}>
                <div className="flex items-center justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                    <h3 className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>Recent Quotations</h3>
                    <Link to="/quotations" style={{ fontSize: 12, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                        View All <ArrowRight size={14} />
                    </Link>
                </div>
                <table className="dark-table">
                    <thead>
                        <tr>
                            <th>Quote #</th>
                            <th>Project</th>
                            <th>Client</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(stats?.recentQuotations || []).map((q, i) => (
                            <motion.tr key={q.id} variants={fadeUp} custom={i}>
                                <td><Link to={`/quotations/${q.id}`} style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>{q.quoteNumber}</Link></td>
                                <td style={{ color: 'var(--color-text-primary)' }}>{q.projectName}</td>
                                <td style={{ color: 'var(--color-text-secondary)' }}>{q.clientName}</td>
                                <td><StatusBadge status={q.status} /></td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">{formatINR(q.total)}</td>
                            </motion.tr>
                        ))}
                        {(!stats?.recentQuotations || stats.recentQuotations.length === 0) && (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>No quotations yet</td></tr>
                        )}
                    </tbody>
                </table>
            </motion.div>
        </motion.div>
    );
}
