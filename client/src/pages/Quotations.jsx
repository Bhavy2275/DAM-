import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Eye, Edit, Download, Copy, Trash2, Loader2, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { formatINR } from '../lib/formatCurrency';
import { fadeUp, staggerContainer } from '../lib/animations';
import StatusBadge from '../components/StatusBadge';
import * as XLSX from 'xlsx';

// Simple debounce hook
function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

export default function Quotations() {
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [downloadingId, setDownloadingId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        api.get('/quotations/recalculate-all').catch(() => {});
    }, []);

    useEffect(() => {
        loadQuotations();
    }, [debouncedSearch, statusFilter]);

    const loadQuotations = async () => {
        try {
            const params = {};
            if (debouncedSearch) params.search = debouncedSearch;
            if (statusFilter) params.status = statusFilter;
            const { data } = await api.get('/quotations', { params });
            setQuotations(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/quotations/${deleteTarget.id}`);
            toast.success(`${deleteTarget.quoteNumber} deleted`);
            setDeleteTarget(null);
            loadQuotations();
        } catch (err) { toast.error('Failed to delete'); }
        finally { setDeleting(false); }
    };

    const handleDuplicate = async (id, e) => {
        e.stopPropagation();
        if (!id) return toast.error('Invalid quotation ID');
        try {
            const res = await api.post(`/quotations/${id}/duplicate`);
            toast.success(`Duplicated as ${res.data.quoteNumber}`);
            loadQuotations();
        } catch (err) { toast.error('Failed to duplicate'); }
    };

    const handleDownloadPDF = async (id, quoteNumber, e) => {
        e.stopPropagation();
        if (!id) return toast.error('Cannot download — quotation ID missing');
        setDownloadingId(id);
        try {
            const response = await api.get(`/quotations/${id}/pdf?mode=final`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${quoteNumber}.pdf`);
            document.body.appendChild(link); link.click(); link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('PDF downloaded successfully');
        } catch (err) { toast.error('PDF generation failed'); console.error(err); }
        finally { setDownloadingId(null); }
    };

    const handleExportExcel = () => {
        if (!quotations.length) return toast.error('No quotations to export');
        const rows = quotations.map(q => ({
            'Quote #':      q.quoteNumber || '—',
            'Title':        q.quoteTitle  || '—',
            'Project':      q.projectName || '—',
            'Client':       q.client?.companyName || q.client?.fullName || '—',
            'City':         q.client?.city || '—',
            'Status':       q.status,
            'GST %':        q.gstRate,
            'Grand Total':  q.grandTotal || 0,
            'Created':      new Date(q.createdAt).toLocaleDateString('en-IN'),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Quotations');
        // Auto column widths
        const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length, 16) }));
        ws['!cols'] = colWidths;
        XLSX.writeFile(wb, `DAM-Quotations-${new Date().toISOString().slice(0,10)}.xlsx`);
        toast.success('Exported to Excel!');
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
                <div className="flex gap-3">
                    <button onClick={handleExportExcel} className="btn-ghost" title="Export to Excel">
                        <FileSpreadsheet size={16} /> Export
                    </button>
                    <Link to="/quotations/new" className="btn-primary"><Plus size={16} /> New Quotation</Link>
                </div>
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
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{q.quoteTitle || q.projectName}</div>
                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                        {q.client?.fullName || q.client?.name} {q.client?.companyName ? `· ${q.client.companyName}` : ''}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                                        {new Date(q.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="font-display tabular-nums" style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                        {formatINR(q.grandTotal || 0)}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1" style={{ marginLeft: 12 }}>
                                    {/* View */}
                                    <button onClick={(e) => { e.stopPropagation(); if (!q.id) return toast.error('Invalid ID'); navigate(`/quotations/${q.id}`); }}
                                        title="View" style={{ padding: 8, borderRadius: 8, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', transition: 'all 0.15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-info)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                        <Eye size={16} />
                                    </button>
                                    {/* Edit */}
                                    <button onClick={(e) => { e.stopPropagation(); navigate(`/quotations/${q.id}/edit`); }}
                                        title="Edit" style={{ padding: 8, borderRadius: 8, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', transition: 'all 0.15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                        <Edit size={16} />
                                    </button>
                                    {/* Download */}
                                    <button onClick={(e) => handleDownloadPDF(q.id, q.quoteNumber, e)} disabled={downloadingId === q.id}
                                        title="Download PDF" style={{ padding: 8, borderRadius: 8, color: downloadingId === q.id ? 'var(--color-accent)' : 'var(--color-text-muted)', background: 'none', border: 'none', cursor: downloadingId === q.id ? 'wait' : 'pointer', display: 'flex', transition: 'all 0.15s' }}
                                        onMouseEnter={e => { if (downloadingId !== q.id) { e.currentTarget.style.color = 'var(--color-status-accepted)'; e.currentTarget.style.transform = 'scale(1.15)'; } }}
                                        onMouseLeave={e => { e.currentTarget.style.color = downloadingId === q.id ? 'var(--color-accent)' : 'var(--color-text-muted)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                        {downloadingId === q.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} />}
                                    </button>
                                    {/* Duplicate */}
                                    <button onClick={(e) => handleDuplicate(q.id, e)}
                                        title="Duplicate" style={{ padding: 8, borderRadius: 8, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', transition: 'all 0.15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-status-invoiced)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                        <Copy size={16} />
                                    </button>
                                    {/* Delete */}
                                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(q); }}
                                        title="Delete" style={{ padding: 8, borderRadius: 8, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', transition: 'all 0.15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                        <Trash2 size={16} />
                                    </button>
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

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(7,12,24,0.88)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => !deleting && setDeleteTarget(null)}>
                        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)', borderTop: '3px solid var(--color-danger)', borderRadius: 'var(--radius-xl)', padding: 32, width: '100%', maxWidth: 440 }}>
                            <h3 className="font-display" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Delete Quotation?</h3>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 6 }}>
                                Are you sure you want to delete <strong style={{ color: 'var(--color-text-primary)' }}>{deleteTarget.quoteNumber}</strong>?
                            </p>
                            <p style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 24 }}>
                                This will permanently delete the quotation and all its line items. This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteTarget(null)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} disabled={deleting}>Cancel</button>
                                <button onClick={handleDelete} disabled={deleting}
                                    style={{ flex: 1, justifyContent: 'center', padding: '10px 20px', background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: deleting ? 'wait' : 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {deleting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                                    Yes, Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
