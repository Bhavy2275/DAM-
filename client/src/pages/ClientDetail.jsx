import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Phone, Mail, Building } from 'lucide-react';
import api from '../lib/api';
import { formatINR } from '../lib/formatCurrency';
import { fadeUp, staggerContainer, getAvatarColor, getInitials } from '../lib/animations';
import StatusBadge from '../components/StatusBadge';

export default function ClientDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadClient(); }, [id]);

    const loadClient = async () => {
        try { const { data } = await api.get(`/clients/${id}`); setClient(data); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    if (loading) return <div style={{ padding: 32 }}><div className="skeleton" style={{ height: 200 }} /></div>;
    if (!client) return <div style={{ padding: 32, color: 'var(--color-text-muted)' }}>Client not found</div>;

    const getQuoteTotal = (q) => {
        const recA = (q.recommendations || []).filter(r => r.label === 'RECOMMENDATION A');
        return recA.reduce((s, r) => s + r.amount, 0);
    };

    return (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
            <button onClick={() => navigate('/clients')} className="btn-ghost" style={{ marginBottom: 16, padding: '6px 12px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>

            {/* Client Info */}
            <motion.div variants={fadeUp} className="card-surface" style={{ padding: 32, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 24, cursor: 'default' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: getAvatarColor(client.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, flexShrink: 0 }}>
                    {getInitials(client.name)}
                </div>
                <div>
                    <h1 className="font-display" style={{ fontSize: '1.8rem', fontWeight: 700 }}>{client.name}</h1>
                    <div className="flex flex-wrap gap-4" style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                        {client.company && <span className="flex items-center gap-1"><Building size={14} /> {client.company}</span>}
                        {client.city && <span className="flex items-center gap-1"><MapPin size={14} /> {client.city}, {client.state}</span>}
                        {client.phone && <span className="flex items-center gap-1"><Phone size={14} /> {client.phone}</span>}
                        {client.email && <span className="flex items-center gap-1"><Mail size={14} /> {client.email}</span>}
                    </div>
                </div>
            </motion.div>

            {/* Quotations */}
            <motion.div variants={fadeUp} className="card-surface" style={{ overflow: 'hidden', marginBottom: 24, cursor: 'default' }}>
                <div style={{ padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, borderBottom: '1px solid var(--color-border)' }}>Quotations ({client.quotations?.length || 0})</div>
                {client.quotations?.length > 0 ? (
                    <table className="dark-table">
                        <thead><tr><th>Quote #</th><th>Project</th><th>Status</th><th style={{ textAlign: 'right' }}>Total</th><th>Date</th></tr></thead>
                        <tbody>
                            {client.quotations.map(q => (
                                <tr key={q.id}>
                                    <td><Link to={`/quotations/${q.id}`} style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>{q.quoteNumber}</Link></td>
                                    <td>{q.projectName}</td>
                                    <td><StatusBadge status={q.status} /></td>
                                    <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(getQuoteTotal(q))}</td>
                                    <td style={{ color: 'var(--color-text-muted)' }}>{new Date(q.createdAt).toLocaleDateString('en-IN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>No quotations yet</div>}
            </motion.div>

            {/* Payments */}
            {client.payments?.length > 0 && (
                <motion.div variants={fadeUp} className="card-surface" style={{ overflow: 'hidden', cursor: 'default' }}>
                    <div style={{ padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, borderBottom: '1px solid var(--color-border)' }}>Payment History</div>
                    <table className="dark-table">
                        <thead><tr><th>Date</th><th>Method</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th></tr></thead>
                        <tbody>
                            {client.payments.map(p => (
                                <tr key={p.id}>
                                    <td>{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                                    <td>{p.paymentMethod}</td>
                                    <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-status-accepted)' }}>{formatINR(p.amountPaid)}</td>
                                    <td><StatusBadge status={p.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>
            )}
        </motion.div>
    );
}
