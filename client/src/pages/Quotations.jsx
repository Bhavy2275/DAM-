import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Eye, Edit, Download, Copy, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { formatINR } from '../lib/formatCurrency';
import { fadeUp, staggerContainer } from '../lib/animations';
import StatusBadge from '../components/StatusBadge';

export default function Quotations() {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => { loadQuotations(); }, [search, statusFilter]);

    const loadQuotations = async () => {
        try {
            const params = {};
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            const { data } = await api.get('/quotations', { params });
            setQuotations(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this quotation?')) return;
        try { await api.delete(`/quotations/${id}`); toast.success('Quotation deleted'); loadQuotations(); }
        catch (err) { toast.error('Failed to delete'); }
    };

    const handleDuplicate = async (id) => {
        try { await api.post(`/quotations/${id}/duplicate`); toast.success('Quotation duplicated'); loadQuotations(); }
        catch (err) { toast.error('Failed to duplicate'); }
    };

    const handleDownloadPDF = async (id, quoteNumber) => {
        try {
            const response = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url; link.setAttribute('download', `${quoteNumber}.pdf`);
            document.body.appendChild(link); link.click(); link.remove();
            toast.success('PDF downloaded');
        } catch (err) { toast.error('PDF generation failed'); }
    };

    const getQuoteTotal = (q) => {
        const recA = (q.recommendations || []).filter(r => r.label === 'RECOMMENDATION A');
        return recA.reduce((s, r) => s + r.amount, 0);
    };

    if (loading) {
        return (
            <div style={{ padding: 32 }}>
                <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 24 }} />
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, marginBottom: 12 }} />)}
            </div>
        );
    }

    return (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center justify-between" style={{ marginBottom: 32 }}>
                <div>
                    <h1 className="font-display heading-underline" style={{ fontSize: '2.4rem', fontWeight: 700 }}>Quotations</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 12 }}>Manage your lighting quotations</p>
                </div>
                <Link to="/quotations/new" className="btn-primary"><Plus size={16} /> New Quotation</Link>
            </motion.div>

            {/* Filters */}
            <motion.div variants={fadeUp} className="flex gap-3" style={{ marginBottom: 24 }}>
                <div className="flex-1 relative">
                    <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-accent)' }} />
                    <input type="text" placeholder="Search by quote number, project, or client..." value={search} onChange={e => setSearch(e.target.value)}
                        className="input-dark" style={{ paddingLeft: 40, height: 44 }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-dark" style={{ width: 160, height: 44 }}>
                    <option value="">All Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="INVOICED">Invoiced</option>
                </select>
            </motion.div>

            {/* Quotation Cards */}
            <div className="space-y-3">
                {quotations.map((q, i) => (
                    <motion.div key={q.id} variants={fadeUp} custom={i} className="card-surface" style={{ padding: 20, cursor: 'default' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                                <div>
                                    <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
                                        <span className="tabular-nums" style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 14, letterSpacing: 0.5 }}>{q.quoteNumber}</span>
                                        <StatusBadge status={q.status} />
                                    </div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{q.title || q.projectName}</div>
                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                        {q.client?.name} · {q.client?.company}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                                        {new Date(q.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="font-display tabular-nums" style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatINR(getQuoteTotal(q))}</div>
                                </div>

                                <div className="flex items-center gap-1" style={{ marginLeft: 12 }}>
                                    {[
                                        { icon: Eye, to: `/quotations/${q.id}`, color: 'var(--color-info)', tip: 'View' },
                                        { icon: Edit, to: `/quotations/${q.id}/edit`, color: 'var(--color-accent)', tip: 'Edit' },
                                    ].map(({ icon: I, to, color, tip }) => (
                                        <Link key={tip} to={to} title={tip} style={{ padding: 8, borderRadius: 8, color: 'var(--color-text-muted)', display: 'flex', transition: 'all 0.15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.color = color; e.currentTarget.style.transform = 'scale(1.15)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                            <I size={16} />
                                        </Link>
                                    ))}
                                    {[
                                        { icon: Download, action: () => handleDownloadPDF(q.id, q.quoteNumber), color: 'var(--color-status-accepted)', tip: 'PDF' },
                                        { icon: Copy, action: () => handleDuplicate(q.id), color: 'var(--color-status-invoiced)', tip: 'Duplicate' },
                                        { icon: Trash2, action: () => handleDelete(q.id), color: 'var(--color-danger)', tip: 'Delete' },
                                    ].map(({ icon: I, action, color, tip }) => (
                                        <button key={tip} onClick={action} title={tip} style={{ padding: 8, borderRadius: 8, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', transition: 'all 0.15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.color = color; e.currentTarget.style.transform = 'scale(1.15)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                            <I size={16} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
                {quotations.length === 0 && (
                    <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: 80 }}>
                        <h3 className="font-display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>No quotations found</h3>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 16 }}>Create your first quotation</p>
                        <Link to="/quotations/new" className="btn-primary"><Plus size={16} /> New Quotation</Link>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}
