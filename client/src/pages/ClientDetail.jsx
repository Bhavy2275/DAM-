import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Phone, Mail, Building, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { formatINR } from '../lib/formatCurrency';
import { fadeUp, staggerContainer, getAvatarColor, getInitials } from '../lib/animations';
import StatusBadge from '../components/StatusBadge';

function SummaryCard({ label, value, valueColor, icon: Icon, iconColor }) {
    return (
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${iconColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} style={{ color: iconColor }} />
            </div>
            <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div className="font-display tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700, color: valueColor }}>{value}</div>
            </div>
        </div>
    );
}

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

    const summary = client.summary || { totalQuoted: 0, totalPaid: 0, outstanding: 0, totalQuotations: 0 };

    return (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
            <button onClick={() => navigate('/clients')} className="btn-ghost" style={{ marginBottom: 16, padding: '6px 12px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>

            {/* Client Header Card */}
            <motion.div variants={fadeUp} className="card-surface" style={{ padding: 32, marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 24, cursor: 'default' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: getAvatarColor(client.fullName), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, flexShrink: 0 }}>
                    {getInitials(client.fullName)}
                </div>
                <div style={{ flex: 1 }}>
                    <h1 className="font-display" style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 4 }}>{client.fullName}</h1>
                    {client.companyName && (
                        <div style={{ fontSize: 15, color: 'var(--color-accent)', fontWeight: 600, marginBottom: 12 }}>{client.companyName}</div>
                    )}
                    <div className="flex flex-wrap gap-4" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                        {client.city && <span className="flex items-center gap-1"><MapPin size={14} /> {client.city}{client.state ? `, ${client.state}` : ''}{client.pinCode ? ` — ${client.pinCode}` : ''}</span>}
                        {client.mobileNumber && <span className="flex items-center gap-1"><Phone size={14} /> {client.mobileNumber}</span>}
                        {client.emailId && <span className="flex items-center gap-1"><Mail size={14} /> {client.emailId}</span>}
                        {client.companyGstNumber && <span className="flex items-center gap-1"><Building size={14} /> GST: {client.companyGstNumber}</span>}
                    </div>
                    {client.address && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>{client.address}</div>}
                </div>
            </motion.div>

            {/* Financial Summary Strip */}
            <motion.div variants={fadeUp} className="card-surface" style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', cursor: 'default', overflow: 'hidden' }}>
                <SummaryCard label="Total Quoted" value={formatINR(summary.totalQuoted)} valueColor="var(--color-text-primary)" icon={TrendingUp} iconColor="var(--color-accent)" />
                <div style={{ background: 'var(--color-border)', margin: '16px 0' }} />
                <SummaryCard label="Total Paid" value={formatINR(summary.totalPaid)} valueColor="var(--color-status-accepted)" icon={DollarSign} iconColor="var(--color-status-accepted)" />
                <div style={{ background: 'var(--color-border)', margin: '16px 0' }} />
                <SummaryCard label="Outstanding" value={formatINR(summary.outstanding)} valueColor={summary.outstanding > 0 ? 'var(--color-danger)' : 'var(--color-status-accepted)'} icon={AlertCircle} iconColor={summary.outstanding > 0 ? 'var(--color-danger)' : 'var(--color-status-accepted)'} />
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
                                    <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(q.grandTotal || 0)}</td>
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
                        <thead><tr><th>Date</th><th>Quote #</th><th>Method</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th></tr></thead>
                        <tbody>
                            {client.payments.map(p => (
                                <tr key={p.id}>
                                    <td>{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                                    <td style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{p.quotation?.quoteNumber || '—'}</td>
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
