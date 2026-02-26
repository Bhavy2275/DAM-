import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Download, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { formatINR } from '../lib/formatCurrency';
import { fadeUp, staggerContainer, modalOverlay, modalContent, useCountUp } from '../lib/animations';
import StatusBadge from '../components/StatusBadge';

function SummaryBlock({ label, value, color, index }) {
    return (
        <motion.div variants={fadeUp} custom={index} style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div className="font-display tabular-nums" style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{value}</div>
        </motion.div>
    );
}

export default function Payments() {
    const [payments, setPayments] = useState([]);
    const [summary, setSummary] = useState({ totalReceived: 0, totalPending: 0, count: 0 });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [quotations, setQuotations] = useState([]);
    const [form, setForm] = useState({ quotationId: '', clientId: '', amountPaid: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'BANK_TRANSFER', referenceNumber: '', notes: '' });

    useEffect(() => { loadPayments(); loadQuotations(); }, []);

    const loadPayments = async () => {
        try {
            const [{ data: payments }, { data: sum }] = await Promise.all([api.get('/payments'), api.get('/payments/summary')]);
            setPayments(payments);
            setSummary(sum);
        } catch (e) { }
        finally { setLoading(false); }
    };

    const loadQuotations = async () => { try { const { data } = await api.get('/quotations'); setQuotations(data); } catch (e) { } };

    const handleSave = async () => {
        try {
            const q = quotations.find(q => q.id === form.quotationId);
            await api.post('/payments', { ...form, clientId: q?.clientId || '', amountPaid: parseFloat(form.amountPaid) });
            toast.success('Payment added');
            setShowModal(false); loadPayments();
        } catch (err) { toast.error('Failed to add payment'); }
    };

    const exportCSV = () => {
        const csv = [
            'Date,Client,Amount,Method,Reference,Status',
            ...payments.map(p => `${new Date(p.paymentDate).toLocaleDateString()},${p.quotation?.client?.name || ''},${p.amountPaid},${p.paymentMethod},${p.referenceNumber || ''},${p.status}`)
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'payments.csv'; a.click();
        toast.success('CSV exported');
    };

    if (loading) return <div style={{ padding: 32 }}><div className="skeleton" style={{ height: 120, marginBottom: 16 }} />{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 50, marginBottom: 8 }} />)}</div>;

    return (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center justify-between" style={{ marginBottom: 32 }}>
                <div>
                    <h1 className="font-display heading-underline" style={{ fontSize: '2.4rem', fontWeight: 700 }}>Payments</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 12 }}>Track all financial transactions</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={exportCSV} className="btn-ghost"><Download size={16} /> Export CSV</button>
                    <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Add Payment</button>
                </div>
            </motion.div>

            {/* Summary Strip */}
            <motion.div variants={fadeUp} className="card-surface" style={{ marginBottom: 32, display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', cursor: 'default' }}>
                <SummaryBlock label="Total Received" value={formatINR(summary.totalReceived)} color="var(--color-status-accepted)" index={0} />
                <div style={{ background: 'var(--color-accent)', margin: '16px 0' }} />
                <SummaryBlock label="Total Pending" value={formatINR(summary.totalPending)} color="var(--color-accent)" index={1} />
                <div style={{ background: 'var(--color-accent)', margin: '16px 0' }} />
                <SummaryBlock label="Total Transactions" value={summary.count} color="var(--color-text-primary)" index={2} />
            </motion.div>

            {/* Table */}
            <motion.div variants={fadeUp} className="card-surface" style={{ overflow: 'hidden', cursor: 'default' }}>
                <table className="dark-table">
                    <thead><tr><th>Date</th><th>Client</th><th>Quote</th><th style={{ textAlign: 'right' }}>Amount</th><th>Method</th><th>Reference</th><th>Status</th></tr></thead>
                    <tbody>
                        {payments.map((p, i) => (
                            <motion.tr key={p.id} variants={fadeUp} custom={i}>
                                <td>{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                                <td>{p.quotation?.client?.name || '-'}</td>
                                <td style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{p.quotation?.quoteNumber || '-'}</td>
                                <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-status-accepted)' }}>{formatINR(p.amountPaid)}</td>
                                <td style={{ color: 'var(--color-text-secondary)' }}>{p.paymentMethod}</td>
                                <td style={{ color: 'var(--color-text-muted)' }}>{p.referenceNumber || '-'}</td>
                                <td><StatusBadge status={p.status} /></td>
                            </motion.tr>
                        ))}
                        {payments.length === 0 && (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>No payments recorded yet</td></tr>
                        )}
                    </tbody>
                </table>
            </motion.div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div variants={modalOverlay} initial="hidden" animate="visible" exit="exit"
                        style={{ position: 'fixed', inset: 0, background: 'rgba(7,12,24,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setShowModal(false)}>
                        <motion.div variants={modalContent} initial="hidden" animate="visible" exit="exit" onClick={e => e.stopPropagation()}
                            style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)', borderTop: '2px solid var(--color-status-accepted)', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 20px 80px rgba(0,0,0,0.5)' }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
                                <h3 className="font-display" style={{ fontSize: 20, fontWeight: 600 }}>Add Payment</h3>
                                <button onClick={() => setShowModal(false)} style={{ padding: 6, background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                            <div className="space-y-3">
                                <div><label className="label">Quotation</label><select value={form.quotationId} onChange={e => setForm({ ...form, quotationId: e.target.value })} className="input-dark"><option value="">Select</option>{quotations.map(q => <option key={q.id} value={q.id}>{q.quoteNumber} — {q.client?.name}</option>)}</select></div>
                                <div><label className="label">Amount (₹)</label><input type="number" value={form.amountPaid} onChange={e => setForm({ ...form, amountPaid: e.target.value })} className="input-dark" /></div>
                                <div><label className="label">Date</label><input type="date" value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })} className="input-dark" /></div>
                                <div><label className="label">Method</label><select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="input-dark"><option value="BANK_TRANSFER">Bank Transfer</option><option value="UPI">UPI</option><option value="CASH">Cash</option><option value="CHEQUE">Cheque</option></select></div>
                                <div><label className="label">Reference</label><input type="text" value={form.referenceNumber} onChange={e => setForm({ ...form, referenceNumber: e.target.value })} className="input-dark" /></div>
                            </div>
                            <div className="flex gap-3" style={{ marginTop: 24 }}>
                                <button onClick={() => setShowModal(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button onClick={handleSave} className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'var(--color-status-accepted)' }}>Save Payment</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
