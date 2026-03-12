import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Mail, ArrowLeft, Edit, CreditCard, X, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { formatINR } from '../lib/formatCurrency';
import { fadeUp, staggerContainer, scaleIn } from '../lib/animations';
import StatusBadge from '../components/StatusBadge';
import MacadamBadge from '../components/MacadamBadge';
import AttributeTagPills from '../components/AttributeTagPills';

const REC_COLORS = { A: '#F5A623', B: '#10B981', C: '#6c63ff', D: '#f43f5e', E: '#06b6d4', F: '#8b5cf6' };

export default function QuotationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(null);
    const [paymentForm, setPaymentForm] = useState({ amountPaid: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'BANK_TRANSFER', referenceNumber: '', notes: '' });

    useEffect(() => { loadQuotation(); }, [id]);

    const loadQuotation = async () => {
        try { const { data } = await api.get(`/quotations/${id}`); setQuotation(data); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleStatusChange = async (status) => {
        try { await api.put(`/quotations/${id}`, { status }); toast.success(`Status: ${status}`); loadQuotation(); }
        catch { toast.error('Failed to update status'); }
    };

    const handleDownloadPDF = async (mode) => {
        setPdfLoading(mode);
        try {
            const response = await api.get(`/quotations/${id}/pdf?mode=${mode}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${quotation.quoteNumber}-${mode}.pdf`);
            document.body.appendChild(link); link.click(); link.remove();
            toast.success('PDF downloaded');
            setShowPdfModal(false);
        } catch { toast.error('PDF generation failed'); }
        finally { setPdfLoading(null); }
    };

    const handleSendEmail = async () => {
        try { await api.post(`/quotations/${id}/send-email`); toast.success('Marked as sent'); loadQuotation(); }
        catch { toast.error('Failed'); }
    };

    const handleAddPayment = async () => {
        try {
            await api.post('/payments', {
                quotationId: id, clientId: quotation.clientId,
                amountPaid: parseFloat(paymentForm.amountPaid),
                paymentDate: paymentForm.paymentDate,
                paymentMethod: paymentForm.paymentMethod,
                referenceNumber: paymentForm.referenceNumber, notes: paymentForm.notes
            });
            toast.success('Payment added');
            setShowPaymentModal(false); loadQuotation();
        } catch { toast.error('Failed to add payment'); }
    };

    if (loading) return <div style={{ padding: 32 }}><div className="skeleton" style={{ height: 40, width: 240, marginBottom: 24 }} />{[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 200, marginBottom: 16 }} />)}</div>;
    if (!quotation) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>Quotation not found</div>;

    // Determine active recommendation labels
    const usedLabels = ['A', 'B', 'C', 'D', 'E', 'F'].filter(label =>
        quotation.lineItems.some(item => (item.recommendations || []).some(r => r.label === label && r.brandName))
    );

    // Totals per recommendation label
    const recTotals = usedLabels.map(label => {
        const sum = quotation.lineItems.reduce((acc, item) => {
            const rec = (item.recommendations || []).find(r => r.label === label);
            return acc + (rec ? rec.amount : 0);
        }, 0);
        const gst = sum * (quotation.gstRate / 100);
        return { label, sum, gst, total: sum + gst };
    });

    // Final quote totals
    const finalSubtotal = quotation.lineItems.reduce((acc, i) => acc + (i.finalAmount || 0), 0);
    const finalGst = finalSubtotal * (quotation.gstRate / 100);
    const finalGrandTotal = finalSubtotal + finalGst;

    const totalPaid = (quotation.payments || []).reduce((s, p) => s + p.amountPaid, 0);
    const grandTotal = finalGrandTotal || recTotals[0]?.total || 0;
    const balance = grandTotal - totalPaid;

    return (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <motion.div variants={fadeUp}>
                <button onClick={() => navigate('/quotations')} className="btn-ghost" style={{ marginBottom: 12, padding: '6px 12px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
                    <div>
                        <h1 className="font-display" style={{ fontSize: '2.2rem', fontWeight: 700 }}>{quotation.quoteNumber}</h1>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4 }}>{quotation.quoteTitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={quotation.status} />
                        <Link to={`/quotations/${id}/edit`} className="btn-ghost" style={{ padding: '8px 14px' }}><Edit size={14} /> Edit</Link>
                        <button onClick={() => setShowPdfModal(true)} className="btn-primary" style={{ padding: '8px 14px' }}><Download size={14} /> PDF</button>
                        <button onClick={handleSendEmail} className="btn-ghost" style={{ padding: '8px 14px', borderColor: 'var(--color-info)', color: 'var(--color-info)' }}><Mail size={14} /> Email</button>
                        <button onClick={() => setShowPaymentModal(true)} className="btn-ghost" style={{ padding: '8px 14px', borderColor: 'var(--color-status-accepted)', color: 'var(--color-status-accepted)' }}><CreditCard size={14} /> Payment</button>
                    </div>
                </div>
            </motion.div>

            {/* Status Actions */}
            <motion.div variants={fadeUp} className="flex gap-2" style={{ marginBottom: 24 }}>
                {['SENT', 'ACCEPTED', 'REJECTED', 'INVOICED'].map(s => (
                    <button key={s} onClick={() => handleStatusChange(s)}
                        style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 600,
                            background: quotation.status === s ? 'var(--color-accent)' : 'var(--color-surface)',
                            color: quotation.status === s ? 'var(--color-base)' : 'var(--color-text-muted)',
                            border: `1px solid ${quotation.status === s ? 'var(--color-accent)' : 'var(--color-border)'}`,
                            cursor: 'pointer', transition: 'all 0.15s', textTransform: 'uppercase', letterSpacing: 1 }}>
                        {s}
                    </button>
                ))}
            </motion.div>

            {/* Info Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
                <motion.div variants={fadeUp} className="card-surface" style={{ padding: 20, cursor: 'default' }}>
                    <div className="label">Client</div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{quotation.client?.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{quotation.client?.companyName}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{quotation.client?.city}</div>
                </motion.div>
                <motion.div variants={fadeUp} className="card-surface" style={{ padding: 20, cursor: 'default' }}>
                    <div className="label">Project</div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{quotation.projectName}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{quotation.city}, {quotation.state}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Valid {quotation.validDays} days · GST {quotation.gstRate}%</div>
                </motion.div>
                <motion.div variants={fadeUp} className="card-surface" style={{ padding: 20, borderTop: '2px solid var(--color-accent)', cursor: 'default' }}>
                    <div className="label" style={{ color: 'var(--color-accent)' }}>Payment Status</div>
                    <div className="font-display tabular-nums" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-accent)' }}>{formatINR(grandTotal)}</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>Paid: <span style={{ color: 'var(--color-status-accepted)', fontWeight: 600 }}>{formatINR(totalPaid)}</span></div>
                    <div style={{ fontSize: 12 }}>Balance: <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{formatINR(balance)}</span></div>
                </motion.div>
            </div>

            {/* Recommendation Summary */}
            {usedLabels.length > 0 && (
                <motion.div variants={fadeUp} className="card-surface" style={{ overflow: 'hidden', marginBottom: 24, cursor: 'default' }}>
                    <div style={{ padding: '14px 20px', background: 'var(--color-base)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, letterSpacing: 1.5, borderBottom: '2px solid var(--color-accent)' }}>RECOMMENDATION COLUMNS</div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="dark-table" style={{ fontSize: 12 }}>
                            <thead><tr>
                                <th style={{ width: 60, textAlign: 'center' }}>S.No</th>
                                <th style={{ width: 120 }}>Code</th>
                                <th style={{ width: 220, minWidth: 220, maxWidth: 220 }}>Description</th>
                                <th style={{ width: 80, textAlign: 'center' }}>Unit</th>
                                {usedLabels.map(label => <th key={label} colSpan={3} style={{ textAlign: 'center', color: REC_COLORS[label], borderLeft: '1px solid var(--color-border)', width: 260 }}>Rec {label}</th>)}
                            </tr></thead>
                            <tbody>
                                {quotation.lineItems.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td style={{ textAlign: 'center' }}>{item.sno}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{item.productCode}</td>
                                        <td style={{ color: 'var(--color-text-muted)', width: 220, maxWidth: 220, minWidth: 220, fontSize: 11, wordBreak: 'break-all', whiteSpace: 'normal' }}>{item.description || '—'}</td>
                                        <td style={{ textAlign: 'center' }}>{item.unit === 'METERS' ? 'Mtr.' : 'Nos.'}</td>
                                        {usedLabels.map(label => {
                                            const rec = (item.recommendations || []).find(r => r.label === label);
                                            return [
                                                <td key={`${label}-brand`} style={{ borderLeft: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-text-muted)' }}>{rec?.brandName || '—'}</td>,
                                                <td key={`${label}-rate`} className="tabular-nums" style={{ fontSize: 11 }}>{rec ? formatINR(rec.rate) : '—'}</td>,
                                                <td key={`${label}-amt`} className="tabular-nums" style={{ fontWeight: 600 }}>{rec ? formatINR(rec.amount) : '—'}</td>,
                                            ];
                                        })}
                                    </tr>
                                ))}
                                {/* Totals */}
                                {[
                                    { label: 'Sub-Total', key: 'sum' },
                                    { label: `GST ${quotation.gstRate}%`, key: 'gst' },
                                    { label: 'TOTAL', key: 'total', bold: true, highlight: true },
                                ].map(row => (
                                    <tr key={row.label} style={{ background: row.highlight ? 'var(--color-accent)' : 'var(--color-base)', borderTop: row.bold ? '2px solid var(--color-border)' : undefined }}>
                                        <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, color: row.highlight ? 'var(--color-base)' : undefined }}>{row.label}</td>
                                        {recTotals.map(t => (
                                            <td key={t.label} colSpan={3} className="tabular-nums" style={{ textAlign: 'right', fontWeight: row.bold ? 700 : 500, fontSize: 12, color: row.highlight ? 'var(--color-base)' : undefined }}>
                                                {formatINR(t[row.key])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Final Working Quotation */}
            {finalSubtotal > 0 && (
                <motion.div variants={fadeUp} className="card-surface" style={{ overflow: 'hidden', marginBottom: 24, cursor: 'default' }}>
                    <div style={{ padding: '14px 20px', background: 'var(--color-base)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, letterSpacing: 1.5, borderBottom: '2px solid var(--color-accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle size={16} style={{ color: '#10B981' }} /> FINAL WORKING QUOTATION
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="dark-table" style={{ fontSize: 11 }}>
                            <thead><tr>
                                <th style={{ width: 60, textAlign: 'center' }}>S.No</th>
                                <th style={{ width: 120 }}>Code</th>
                                <th style={{ width: 180, minWidth: 180, maxWidth: 180 }}>Description</th>
                                <th style={{ width: 100 }}>Brand</th>
                                <th style={{ width: 90 }}>LP</th>
                                <th style={{ width: 90 }}>LP+18%</th>
                                <th style={{ width: 70, textAlign: 'center' }}>Disc%</th>
                                <th style={{ width: 90 }}>Rate</th>
                                <th style={{ width: 70, textAlign: 'center' }}>Unit</th>
                                <th style={{ width: 60, textAlign: 'center' }}>Qty</th>
                                <th style={{ width: 110 }}>Amount</th>
                                <th style={{ width: 100 }}>Macadam</th>
                            </tr></thead>
                            <tbody>
                                {quotation.lineItems.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td style={{ textAlign: 'center' }}>{item.sno}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{item.productCode}</td>
                                        <td style={{ color: 'var(--color-text-muted)', width: 180, maxWidth: 180, minWidth: 180, fontSize: 10, wordBreak: 'break-all', whiteSpace: 'normal' }}>{item.description ? item.description.substring(0, 80) : '—'}</td>
                                        <td>{item.finalBrandName || '—'}</td>
                                        <td className="tabular-nums">{item.finalListPrice != null ? formatINR(item.finalListPrice) : '—'}</td>
                                        <td className="tabular-nums">{item.finalListPrice != null ? formatINR(item.finalListPrice * 1.18) : '—'}</td>
                                        <td style={{ textAlign: 'center' }}>{item.finalDiscount != null ? `${item.finalDiscount}%` : '—'}</td>
                                        <td className="tabular-nums">{item.finalRate != null ? formatINR(item.finalRate) : '—'}</td>
                                        <td style={{ textAlign: 'center' }}>{item.finalUnit === 'METERS' ? 'Mtr.' : 'Nos.'}</td>
                                        <td style={{ textAlign: 'center' }}>{item.finalQuantity != null ? item.finalQuantity : '—'}</td>
                                        <td className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{item.finalAmount != null ? formatINR(item.finalAmount) : '—'}</td>
                                        <td><MacadamBadge step={item.finalMacadamStep} showSpace /></td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--color-base)' }}>
                                    <td colSpan={10} style={{ textAlign: 'right', fontWeight: 600, padding: '8px' }}>Sub-Total</td>
                                    <td colSpan={2} className="tabular-nums" style={{ fontWeight: 700, padding: '8px' }}>{formatINR(finalSubtotal)}</td>
                                </tr>
                                <tr style={{ background: 'var(--color-base)' }}>
                                    <td colSpan={10} style={{ textAlign: 'right', padding: '4px 8px' }}>GST {quotation.gstRate}%</td>
                                    <td colSpan={2} className="tabular-nums" style={{ padding: '4px 8px' }}>{formatINR(finalGst)}</td>
                                </tr>
                                <tr style={{ background: 'var(--color-accent)' }}>
                                    <td colSpan={10} style={{ textAlign: 'right', fontWeight: 800, padding: '10px 8px', color: 'var(--color-base)' }}>GRAND TOTAL</td>
                                    <td colSpan={2} className="tabular-nums" style={{ fontWeight: 800, padding: '10px 8px', color: 'var(--color-base)' }}>{formatINR(finalGrandTotal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Payments */}
            {quotation.payments?.length > 0 && (
                <motion.div variants={fadeUp} className="card-surface" style={{ overflow: 'hidden', marginBottom: 24, cursor: 'default' }}>
                    <div style={{ padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, borderBottom: '1px solid var(--color-border)' }}>Payment History</div>
                    <table className="dark-table">
                        <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th></tr></thead>
                        <tbody>
                            {quotation.payments.map(p => (
                                <tr key={p.id}>
                                    <td>{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                                    <td>{p.paymentMethod}</td>
                                    <td style={{ color: 'var(--color-text-muted)' }}>{p.referenceNumber || '—'}</td>
                                    <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-status-accepted)' }}>{formatINR(p.amountPaid)}</td>
                                    <td><StatusBadge status={p.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>
            )}

            {/* PDF Export Modal */}
            <AnimatePresence>
                {showPdfModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(7,12,24,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setShowPdfModal(false)}>
                        <motion.div variants={scaleIn} initial="hidden" animate="visible" exit="hidden"
                            onClick={e => e.stopPropagation()}
                            style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)', borderTop: '3px solid var(--color-accent)', borderRadius: 'var(--radius-xl)', padding: 32, width: '100%', maxWidth: 480 }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                                <h3 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>Export PDF</h3>
                                <button onClick={() => setShowPdfModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={18} /></button>
                            </div>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 24 }}>Choose how you'd like to export this quotation:</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <button onClick={() => handleDownloadPDF('all_recs')} disabled={pdfLoading !== null}
                                    style={{ padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <FileText size={20} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>All Recommendations (A–F)</div>
                                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Wide comparison table — all brand options side-by-side</div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 12, textAlign: 'right' }}>
                                        <span className="btn-primary" style={{ fontSize: 11, padding: '4px 14px' }}>
                                            {pdfLoading === 'all_recs' ? 'Generating...' : 'Export All Recs PDF'}
                                        </span>
                                    </div>
                                </button>
                                <button onClick={() => handleDownloadPDF('final')} disabled={pdfLoading !== null}
                                    style={{ padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = '#10B981'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <CheckCircle size={20} style={{ color: '#10B981', flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>Final Working Quotation Only</div>
                                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Clean single-brand version — ready to send to client</div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 12, textAlign: 'right' }}>
                                        <span style={{ background: '#10B981', color: '#fff', padding: '4px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                            {pdfLoading === 'final' ? 'Generating...' : 'Export Final PDF'}
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Payment Modal */}
            <AnimatePresence>
                {showPaymentModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(7,12,24,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setShowPaymentModal(false)}>
                        <motion.div variants={scaleIn} initial="hidden" animate="visible" exit="hidden"
                            onClick={e => e.stopPropagation()}
                            style={{ background: 'var(--color-elevated)', border: '2px solid var(--color-status-accepted)', borderRadius: 'var(--radius-xl)', padding: 32, width: '100%', maxWidth: 440 }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
                                <h3 className="font-display" style={{ fontSize: 20, fontWeight: 600 }}>Add Payment</h3>
                                <button onClick={() => setShowPaymentModal(false)} style={{ padding: 6, background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                            <div className="space-y-3">
                                <div><label className="label">Amount (₹)</label><input type="number" value={paymentForm.amountPaid} onChange={e => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })} className="input-dark" /></div>
                                <div><label className="label">Date</label><input type="date" value={paymentForm.paymentDate} onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} className="input-dark" /></div>
                                <div><label className="label">Method</label><select value={paymentForm.paymentMethod} onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} className="input-dark">
                                    <option value="BANK_TRANSFER">Bank Transfer</option><option value="UPI">UPI</option><option value="CASH">Cash</option><option value="CHEQUE">Cheque</option>
                                </select></div>
                                <div><label className="label">Reference</label><input type="text" value={paymentForm.referenceNumber} onChange={e => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })} className="input-dark" /></div>
                            </div>
                            <div className="flex gap-3" style={{ marginTop: 24 }}>
                                <button onClick={() => setShowPaymentModal(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button onClick={handleAddPayment} className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'var(--color-status-accepted)' }}>Save Payment</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
