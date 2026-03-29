import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Mail, ArrowLeft, Edit, X, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { formatINR } from '../lib/formatCurrency';
import { fadeUp, staggerContainer, scaleIn } from '../lib/animations';
import StatusBadge from '../components/StatusBadge';
import MacadamBadge from '../components/MacadamBadge';
import AttributeTagPills from '../components/AttributeTagPills';

const REC_COLORS = { A: '#F5A623', B: '#10B981', C: '#6c63ff', D: '#f43f5e', E: '#06b6d4', F: '#8b5cf6' };

// ─── Column widths (px) — defined once, used in both <colgroup> and cells ───
const COL = {
    sno:   44,
    code:  100,
    desc:  170,
    unit:  60,
    // per-recommendation sub-columns
    brand: 90,
    qty:   60,
    rate:  90,
    amt:   95,
    mac:   80,
};

export default function QuotationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(null);

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
            window.URL.revokeObjectURL(url);
            toast.success('PDF downloaded');
            setShowPdfModal(false);
        } catch { toast.error('PDF generation failed'); }
        finally { setPdfLoading(null); }
    };

    const handleSendEmail = async () => {
        try { await api.post(`/quotations/${id}/send-email`); toast.success('Marked as sent'); loadQuotation(); }
        catch { toast.error('Failed'); }
    };

    if (loading) return (
        <div style={{ padding: 32 }}>
            <div className="skeleton" style={{ height: 40, width: 240, marginBottom: 24 }} />
            {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 200, marginBottom: 16 }} />)}
        </div>
    );
    if (!quotation) return (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>Quotation not found</div>
    );

    // Active recommendation labels that have at least one item with data
    const usedLabels = ['A', 'B', 'C', 'D', 'E', 'F'].filter(label =>
        quotation.lineItems.some(item =>
            (item.recommendations || []).some(r => r.label === label && r.brandName)
        )
    );

    // Totals per recommendation label
    const recTotals = usedLabels.map(label => {
        const sum = quotation.lineItems.reduce((acc, item) => {
            const rec = (item.recommendations || []).find(r => r.label === label);
            return acc + (rec?.amount || 0);
        }, 0);
        const gst = sum * (quotation.gstRate / 100);
        return { label, sum, gst, total: sum + gst };
    });

    const customCols = (() => {
        try {
            const cl = typeof quotation.customLabels === 'string' ? JSON.parse(quotation.customLabels) : quotation.customLabels || {};
            return cl.__customCols || [];
        } catch { return []; }
    })();


    // Final quote totals
    const finalSubtotal = quotation.lineItems.reduce((acc, i) => acc + (i.finalAmount || 0), 0);
    const finalGst      = finalSubtotal * (quotation.gstRate / 100);
    const finalGrandTotal = finalSubtotal + finalGst;

    const totalPaid  = (quotation.payments || []).reduce((s, p) => s + p.amountPaid, 0);
    const grandTotal = finalGrandTotal || recTotals[0]?.total || 0;
    const balance    = grandTotal - totalPaid;

    // ── How many sub-cols per recommendation ──────────────────────────────
    // We show: Brand | Qty | Rate | Amount | Macadam  → 5 sub-cols
    const SUB_COLS   = 5;
    const subHeaders = ['Brand', 'Qty', 'Rate', 'Amount', 'Macadam'];

    // Total table width for the recommendation table
    const fixedCols  = COL.sno + COL.code + COL.desc + COL.unit;
    const recColW    = [COL.brand, COL.qty, COL.rate, COL.amt, COL.mac];
    const recGroupW  = recColW.reduce((s, w) => s + w, 0);
    const recTableW  = fixedCols + (customCols.length * 85) + recGroupW * usedLabels.length;

    return (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible"
            style={{ padding: 32, maxWidth: 1600, margin: '0 auto' }}>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <motion.div variants={fadeUp}>
                <button onClick={() => navigate('/quotations')} className="btn-ghost"
                    style={{ marginBottom: 12, padding: '6px 12px', fontSize: 12 }}>
                    <ArrowLeft size={14} /> Back
                </button>
                <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
                    <div>
                        <h1 className="font-display" style={{ fontSize: '2.2rem', fontWeight: 700 }}>
                            {quotation.quoteNumber}
                        </h1>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4 }}>
                            {quotation.quoteTitle}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={quotation.status} />
                        <Link to={`/quotations/${id}/edit`} className="btn-ghost" style={{ padding: '8px 14px' }}>
                            <Edit size={14} /> Edit
                        </Link>
                        <button onClick={() => setShowPdfModal(true)} className="btn-primary" style={{ padding: '8px 14px' }}>
                            <Download size={14} /> PDF
                        </button>
                        <button onClick={handleSendEmail} className="btn-ghost"
                            style={{ padding: '8px 14px', borderColor: 'var(--color-info)', color: 'var(--color-info)' }}>
                            <Mail size={14} /> Email
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* ── Status Actions ─────────────────────────────────────────── */}
            <motion.div variants={fadeUp} className="flex gap-2" style={{ marginBottom: 24 }}>
                {['SENT', 'ACCEPTED', 'REJECTED', 'INVOICED'].map(s => (
                    <button key={s} onClick={() => handleStatusChange(s)}
                        style={{
                            padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontSize: 11,
                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                            textTransform: 'uppercase', letterSpacing: 1,
                            background: quotation.status === s ? 'var(--color-accent)' : 'var(--color-surface)',
                            color: quotation.status === s ? 'var(--color-base)' : 'var(--color-text-muted)',
                            border: `1px solid ${quotation.status === s ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        }}>
                        {s}
                    </button>
                ))}
            </motion.div>

            {/* ── Info Cards ─────────────────────────────────────────────── */}
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
                <motion.div variants={fadeUp} className="card-surface"
                    style={{ padding: 20, borderTop: '2px solid var(--color-accent)', cursor: 'default' }}>
                    <div className="label" style={{ color: 'var(--color-accent)' }}>Payment Status</div>
                    <div className="font-display tabular-nums"
                        style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                        {formatINR(grandTotal)}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                        Paid: <span style={{ color: 'var(--color-status-accepted)', fontWeight: 600 }}>{formatINR(totalPaid)}</span>
                    </div>
                    <div style={{ fontSize: 12 }}>
                        Balance: <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{formatINR(balance)}</span>
                    </div>
                </motion.div>

            </div>

            {/* ══════════════════════════════════════════════════════════════
                RECOMMENDATION COLUMNS TABLE  — FIXED ALIGNMENT
            ══════════════════════════════════════════════════════════════ */}
            {usedLabels.length > 0 && (
                <motion.div variants={fadeUp} className="card-surface"
                    style={{ overflow: 'hidden', marginBottom: 24, cursor: 'default' }}>

                    <div style={{
                        padding: '14px 20px', background: 'var(--color-base)',
                        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                        letterSpacing: 1.5, borderBottom: '2px solid var(--color-accent)'
                    }}>
                        RECOMMENDATION COLUMNS
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            borderCollapse: 'collapse',
                            tableLayout: 'fixed',
                            width: recTableW,
                            minWidth: recTableW,
                            fontSize: 12,
                        }}>
                            {/* ── colgroup: every column width declared explicitly ── */}
                            <colgroup>
                                <col style={{ width: COL.sno }} />
                                <col style={{ width: COL.code }} />
                                <col style={{ width: COL.desc }} />
                                <col style={{ width: COL.unit }} />
                                {customCols.map(c => <col key={c.id} style={{ width: 85 }} />)}
                                {usedLabels.flatMap(() =>
                                    recColW.map((w, i) => <col key={i} style={{ width: w }} />)
                                )}
                            </colgroup>

                            <thead>
                                {/* ROW 1: Fixed cols + grouped "Rec X" headers */}
                                <tr style={{ background: 'var(--color-base)' }}>
                                    <th rowSpan={2} style={thStyle({ textAlign: 'center', borderRight: '1px solid var(--color-border)' })}>S.No</th>
                                    <th rowSpan={2} style={thStyle({ borderRight: '1px solid var(--color-border)' })}>Code</th>
                                    <th rowSpan={2} style={thStyle({ borderRight: '1px solid var(--color-border)' })}>Description</th>
                                    <th rowSpan={2} style={thStyle({ textAlign: 'center', borderRight: '2px solid var(--color-border)' })}>Unit</th>
                                    {customCols.map(c => (
                                        <th key={c.id} rowSpan={2} style={thStyle({
                                            textAlign: 'center', color: 'var(--color-accent)', background: 'rgba(59, 130, 246, 0.05)',
                                            borderRight: '2px solid var(--color-border)',
                                        })}>
                                            {c.label}
                                        </th>
                                    ))}
                                    {usedLabels.map(label => (
                                        <th key={label} colSpan={SUB_COLS}
                                            style={{
                                                ...thStyle({ textAlign: 'center', borderRight: '2px solid var(--color-border)' }),
                                                color: REC_COLORS[label],
                                                background: `${REC_COLORS[label]}14`,
                                                letterSpacing: 2,
                                                fontSize: 11,
                                            }}>
                                            REC {label}
                                        </th>
                                    ))}
                                </tr>

                                {/* ROW 2: Sub-headers for each rec group */}
                                <tr style={{ background: 'var(--color-base)' }}>
                                    {usedLabels.flatMap(label =>
                                        subHeaders.map((sh, i) => (
                                            <th key={`${label}-${sh}`}
                                                style={thStyle({
                                                    textAlign: i >= 2 ? 'right' : 'left',
                                                    borderRight: i === SUB_COLS - 1
                                                        ? '2px solid var(--color-border)'
                                                        : '1px solid var(--color-border)',
                                                    fontSize: 10,
                                                    color: 'var(--color-text-muted)',
                                                    fontWeight: 500,
                                                })}>
                                                {sh}
                                            </th>
                                        ))
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {quotation.lineItems.map((item) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={tdStyle({ textAlign: 'center', borderRight: '1px solid var(--color-border)' })}>{item.sno}</td>
                                        <td style={tdStyle({ fontWeight: 700, color: 'var(--color-accent)', borderRight: '1px solid var(--color-border)' })}>{item.productCode}</td>
                                        <td style={tdStyle({
                                            color: 'var(--color-text-muted)', fontSize: 11,
                                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                            borderRight: '1px solid var(--color-border)',
                                        })} title={item.description}>
                                            {item.description || '—'}
                                        </td>
                                        <td style={tdStyle({ textAlign: 'center', borderRight: '2px solid var(--color-border)' })}>
                                            {item.unit === 'METERS' ? 'Mtr.' : 'Nos.'}
                                        </td>

                                        {customCols.map(c => {
                                            const cf = (() => {
                                                try { return typeof item.customFields === 'string' ? JSON.parse(item.customFields) : item.customFields || {}; }
                                                catch { return {}; }
                                            })();
                                            const val = cf[c.id];
                                            const display = (val === 'true' || val === true) ? '✓' : (val === 'false' || val === false) ? '✗' : (val != null && val !== '' ? String(val) : '—');
                                            return (
                                                <td key={c.id} style={tdStyle({ textAlign: 'center', borderRight: '2px solid var(--color-border)' })}>
                                                    {display}
                                                </td>
                                            );
                                        })}

                                        {usedLabels.flatMap(label => {
                                            const rec = (item.recommendations || []).find(r => r.label === label);
                                            return [
                                                <td key={`${label}-brand`} style={tdStyle({ fontSize: 11, borderRight: '1px solid var(--color-border)' })}>{rec?.brandName || '—'}</td>,
                                                <td key={`${label}-qty`} style={tdStyle({ textAlign: 'center', borderRight: '1px solid var(--color-border)' })}>{rec?.quantity ?? '—'}</td>,
                                                <td key={`${label}-rate`} style={tdStyle({ textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid var(--color-border)' })}>{rec?.rate != null ? formatINR(rec.rate) : '—'}</td>,
                                                <td key={`${label}-amt`} style={tdStyle({ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', borderRight: '1px solid var(--color-border)' })}>{rec?.amount != null ? formatINR(rec.amount) : '—'}</td>,
                                                <td key={`${label}-mac`} style={tdStyle({ borderRight: '2px solid var(--color-border)' })}>
                                                    {rec?.macadamStep
                                                        ? <MacadamBadge step={rec.macadamStep} showSpace />
                                                        : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                                                </td>,
                                            ];
                                        })}
                                    </tr>
                                ))}

                                {/* Totals rows */}
                                {[
                                    { rowLabel: 'Sub-Total', key: 'sum',   bold: false, highlight: false },
                                    { rowLabel: `GST ${quotation.gstRate}%`, key: 'gst', bold: false, highlight: false },
                                    { rowLabel: 'GRAND TOTAL', key: 'total', bold: true, highlight: true },
                                ].map(({ rowLabel, key, bold, highlight }) => (
                                    <tr key={rowLabel} style={{
                                        background: highlight ? 'var(--color-accent)' : 'var(--color-base)',
                                        borderTop: bold ? '2px solid var(--color-border)' : undefined,
                                    }}>
                                        <td colSpan={4 + customCols.length} style={{
                                            padding: '10px 14px', textAlign: 'right',
                                            fontWeight: bold ? 800 : 600, fontSize: 12,
                                            color: highlight ? 'var(--color-base)' : 'var(--color-text-primary)',
                                            borderRight: '2px solid var(--color-border)',
                                        }}>
                                            {rowLabel}
                                        </td>
                                        {usedLabels.flatMap(label => {
                                            const t = recTotals.find(r => r.label === label);
                                            return subHeaders.map((sh, i) => {
                                                const isAmt = sh === 'Amount';
                                                return (
                                                    <td key={`${label}-${sh}-tot`} style={{
                                                        padding: '10px 14px', textAlign: 'right',
                                                        fontWeight: bold ? 800 : 500, fontVariantNumeric: 'tabular-nums', fontSize: 12,
                                                        color: highlight ? 'var(--color-base)' : 'var(--color-text-primary)',
                                                        borderRight: i === SUB_COLS - 1 ? '2px solid var(--color-border)' : '1px solid var(--color-border)',
                                                    }}>
                                                        {isAmt && t ? formatINR(t[key]) : ''}
                                                    </td>
                                                );
                                            });
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                FINAL WORKING QUOTATION TABLE
            ══════════════════════════════════════════════════════════════ */}
            {finalSubtotal > 0 && (
                <motion.div variants={fadeUp} className="card-surface"
                    style={{ overflow: 'hidden', marginBottom: 24, cursor: 'default' }}>
                    <div style={{
                        padding: '14px 20px', background: 'var(--color-base)',
                        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                        letterSpacing: 1.5, borderBottom: '2px solid var(--color-accent)',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <CheckCircle size={16} style={{ color: '#10B981' }} /> FINAL WORKING QUOTATION
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            borderCollapse: 'collapse', tableLayout: 'fixed',
                            minWidth: 1200, width: '100%', fontSize: 11,
                        }}>
                            <colgroup>
                                <col style={{ width: 44 }} />
                                <col style={{ width: 100 }} />
                                <col style={{ width: 175 }} />
                                <col style={{ width: 90 }} />
                                <col style={{ width: 85 }} />
                                <col style={{ width: 95 }} />
                                <col style={{ width: 65 }} />
                                <col style={{ width: 95 }} />
                                <col style={{ width: 65 }} />
                                <col style={{ width: 65 }} />
                                <col style={{ width: 100 }} />
                                <col style={{ width: 105 }} />
                                {customCols.map(c => <col key={c.id} style={{ width: 85 }} />)}
                            </colgroup>
                            <thead>
                                <tr style={{ background: 'var(--color-base)' }}>
                                    {['S.No','Code','Description','Brand','LP','LP+18%','Disc%','Rate','Unit','Qty','Amount','Macadam'].map((h, i) => (
                                        <th key={h} rowSpan={customCols.length ? 2 : 1} style={thStyle({
                                            textAlign: [4,5,7,11].includes(i) ? 'right' : [0,6,8,9,10].includes(i) ? 'center' : 'left',
                                            borderRight: '1px solid var(--color-border)',
                                        })}>
                                            {h}
                                        </th>
                                    ))}
                                    {customCols.length > 0 && (
                                        <th colSpan={customCols.length} style={thStyle({
                                            textAlign: 'center', color: 'var(--color-accent)', background: 'rgba(59, 130, 246, 0.05)', letterSpacing: 1.5,
                                            borderRight: 'none'
                                        })}>
                                            ADD-ONS
                                        </th>
                                    )}
                                </tr>
                                {customCols.length > 0 && (
                                    <tr style={{ background: 'var(--color-base)' }}>
                                        {customCols.map((c, i) => (
                                            <th key={c.id} style={thStyle({
                                                textAlign: 'center', color: 'var(--color-accent)', background: 'rgba(59, 130, 246, 0.05)',
                                                borderRight: i === customCols.length - 1 ? 'none' : '1px solid var(--color-border)',
                                            })}>
                                                {c.label}
                                            </th>
                                        ))}
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {quotation.lineItems.map((item) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={tdStyle({ textAlign: 'center' })}>{item.sno}</td>
                                        <td style={tdStyle({ fontWeight: 700, color: 'var(--color-accent)' })}>{item.productCode}</td>
                                        <td style={tdStyle({ color: 'var(--color-text-muted)', fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' })} title={item.description}>
                                            {item.description || '—'}
                                        </td>
                                        <td style={tdStyle()}>{item.finalBrandName || '—'}</td>
                                        <td style={tdStyle({ textAlign: 'right', fontVariantNumeric: 'tabular-nums' })}>{item.finalListPrice != null ? formatINR(item.finalListPrice) : '—'}</td>
                                        <td style={tdStyle({ textAlign: 'right', fontVariantNumeric: 'tabular-nums' })}>{item.finalListPrice != null ? formatINR(item.finalListPrice * (1 + (quotation.gstRate || 18) / 100)) : '—'}</td>
                                        <td style={tdStyle({ textAlign: 'center' })}>{item.finalDiscount != null ? `${item.finalDiscount}%` : '—'}</td>
                                        <td style={tdStyle({ textAlign: 'right', fontVariantNumeric: 'tabular-nums' })}>{item.finalRate != null ? formatINR(item.finalRate) : '—'}</td>
                                        <td style={tdStyle({ textAlign: 'center' })}>{item.finalUnit === 'METERS' ? 'Mtr.' : 'Nos.'}</td>
                                        <td style={tdStyle({ textAlign: 'center' })}>{item.finalQuantity != null ? item.finalQuantity : '—'}</td>
                                        <td style={tdStyle({ textAlign: 'center', borderRight: '1px solid var(--color-border)' })}><MacadamBadge step={item.finalMacadamStep} showSpace /></td>
                                        <td style={tdStyle({ textAlign: 'right', fontWeight: 700, color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums', borderRight: customCols.length ? '1px solid var(--color-border)' : 'none' })}>{item.finalAmount != null ? formatINR(item.finalAmount) : '—'}</td>
                                        {customCols.map((c, i) => {
                                            const cf = (() => {
                                                try { return typeof item.customFields === 'string' ? JSON.parse(item.customFields) : item.customFields || {}; }
                                                catch { return {}; }
                                            })();
                                            const val = cf[c.id];
                                            const display = (val === 'true' || val === true) ? '✓' : (val === 'false' || val === false) ? '✗' : (val != null && val !== '' ? String(val) : '—');
                                            return (
                                                <td key={c.id} style={tdStyle({ textAlign: 'center', borderRight: i === customCols.length - 1 ? 'none' : '1px solid var(--color-border)' })}>
                                                    {display}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--color-base)', borderTop: '1px solid var(--color-border)' }}>
                                    <td colSpan={10} style={{ textAlign: 'right', fontWeight: 600, padding: '8px 14px', fontSize: 12 }}>Sub-Total</td>
                                    <td colSpan={2 + customCols.length} style={{ textAlign: 'left', paddingLeft: 18, fontWeight: 700, padding: '8px 14px', fontVariantNumeric: 'tabular-nums' }}>{formatINR(finalSubtotal)}</td>
                                </tr>
                                <tr style={{ background: 'var(--color-base)' }}>
                                    <td colSpan={10} style={{ textAlign: 'right', padding: '4px 14px', fontSize: 12 }}>GST {quotation.gstRate}%</td>
                                    <td colSpan={2 + customCols.length} style={{ textAlign: 'left', paddingLeft: 18, padding: '4px 14px', fontVariantNumeric: 'tabular-nums' }}>{formatINR(finalGst)}</td>
                                </tr>
                                <tr style={{ background: 'var(--color-accent)' }}>
                                    <td colSpan={10} style={{ textAlign: 'right', fontWeight: 800, padding: '10px 14px', color: 'var(--color-base)', fontSize: 13 }}>GRAND TOTAL</td>
                                    <td colSpan={2 + customCols.length} style={{ textAlign: 'left', paddingLeft: 18, fontWeight: 800, padding: '10px 14px', color: 'var(--color-base)', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{formatINR(finalGrandTotal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* ── Payments ───────────────────────────────────────────────── */}
            {quotation.payments?.length > 0 && (
                <motion.div variants={fadeUp} className="card-surface"
                    style={{ overflow: 'hidden', marginBottom: 24, cursor: 'default' }}>

                    <div style={{
                        padding: '14px 20px',
                        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15,
                        borderBottom: '2px solid var(--color-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <span>Payment History</span>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                            {quotation.payments.length} transaction{quotation.payments.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', fontSize: 13 }}>
                        <colgroup>
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '18%' }} />
                            <col style={{ width: '30%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '17%' }} />
                        </colgroup>
                        <thead>
                            <tr style={{ background: 'var(--color-base)', borderBottom: '1px solid var(--color-border)' }}>
                                {[
                                    { label: 'Date',      align: 'left'  },
                                    { label: 'Method',    align: 'left'  },
                                    { label: 'Reference', align: 'left'  },
                                    { label: 'Amount',    align: 'right' },
                                    { label: 'Status',    align: 'left'  },
                                ].map(({ label, align }) => (
                                    <th key={label} style={{
                                        padding: '11px 20px', textAlign: align,
                                        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                                        letterSpacing: 0.8, color: 'var(--color-text-muted)', whiteSpace: 'nowrap',
                                    }}>
                                        {label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {quotation.payments.map((p, idx) => (
                                <tr key={p.id}
                                    style={{ borderBottom: idx < quotation.payments.length - 1 ? '1px solid var(--color-border)' : 'none', transition: 'background 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-elevated)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                        {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{
                                            display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                                            fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
                                            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                            color: 'var(--color-text-primary)', whiteSpace: 'nowrap',
                                        }}>
                                            {p.paymentMethod.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px', color: 'var(--color-text-muted)', fontSize: 12, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        {p.referenceNumber || '—'}
                                    </td>
                                    <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 700, fontSize: 14, fontVariantNumeric: 'tabular-nums', color: 'var(--color-status-accepted)', whiteSpace: 'nowrap' }}>
                                        {formatINR(p.amountPaid)}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <StatusBadge status={p.status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-base)' }}>
                                <td colSpan={3} style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textAlign: 'right' }}>Total Paid</td>
                                <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 800, fontSize: 15, fontVariantNumeric: 'tabular-nums', color: 'var(--color-status-accepted)', whiteSpace: 'nowrap' }}>
                                    {formatINR(totalPaid)}
                                </td>
                                <td style={{ padding: '12px 20px' }} />
                            </tr>
                            {balance > 0 && (
                                <tr style={{ background: 'var(--color-base)' }}>
                                    <td colSpan={3} style={{ padding: '6px 20px 12px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textAlign: 'right' }}>Balance Due</td>
                                    <td style={{ padding: '6px 20px 12px', textAlign: 'right', fontWeight: 800, fontSize: 15, fontVariantNumeric: 'tabular-nums', color: 'var(--color-danger)', whiteSpace: 'nowrap' }}>
                                        {formatINR(balance)}
                                    </td>
                                    <td style={{ padding: '6px 20px 12px' }} />
                                </tr>
                            )}
                        </tfoot>
                    </table>
                </motion.div>
            )}




            {/* ── PDF Export Modal ───────────────────────────────────────── */}
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
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 24 }}>
                                Choose how you'd like to export this quotation:
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[
                                    { mode: 'all_recs', icon: <FileText size={20} />, color: 'var(--color-accent)', title: 'All Recommendations (A–F)', sub: 'Wide comparison table — all brand options side-by-side', btnLabel: 'Export All Recs PDF' },
                                    { mode: 'final', icon: <CheckCircle size={20} />, color: '#10B981', title: 'Final Working Quotation Only', sub: 'Clean single-brand version — ready to send to client', btnLabel: 'Export Final PDF' },
                                ].map(({ mode, icon, color, title, sub, btnLabel }) => (
                                    <button key={mode} onClick={() => handleDownloadPDF(mode)} disabled={pdfLoading !== null}
                                        style={{ padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = color}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ color, flexShrink: 0 }}>{icon}</span>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{title}</div>
                                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{sub}</div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: 12, textAlign: 'right' }}>
                                            <span style={{ background: color, color: mode === 'final' ? '#fff' : 'var(--color-base)', padding: '4px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                                {pdfLoading === mode ? 'Generating...' : btnLabel}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Style helpers ────────────────────────────────────────────────────────────
function thStyle(extra = {}) {
    return {
        padding: '10px 12px',
        textAlign: 'left',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: 'var(--color-text-muted)',
        background: 'var(--color-base)',
        borderBottom: '1px solid var(--color-border)',
        whiteSpace: 'nowrap',
        ...extra,
    };
}

function tdStyle(extra = {}) {
    return {
        padding: '11px 12px',
        fontSize: 12,
        color: 'var(--color-text-primary)',
        verticalAlign: 'top',
        ...extra,
    };
}
