import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, ArrowLeft, ArrowRight, Plus, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { formatINR } from '../lib/formatCurrency';
import { fadeUp, staggerContainer } from '../lib/animations';

const BRAND_COLUMNS = ['HYBEC_ELITE', 'HYBEC_ECO_PRO', 'JAGUAR', 'PHILIPS'];
const BRAND_LABELS = { HYBEC_ELITE: 'Hybec Elite', HYBEC_ECO_PRO: 'Hybec Eco Pro', JAGUAR: 'Jaguar', PHILIPS: 'Philips', CUSTOM: 'Custom' };
const STEPS = ['Header Info', 'Line Items', 'Recommendations', 'Terms & Conditions'];

const emptyItem = () => ({
    productCode: '', description: '', unit: 'Nos.', qtyApprox: 0, polarImageUrl: '',
    brands: BRAND_COLUMNS.map(bc => ({ brandColumn: bc, macadamStep: '', rate: 0, amount: 0, spaceMatch: 0 }))
});

export default function CreateQuotation() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [clients, setClients] = useState([]);
    const [settings, setSettings] = useState(null);

    const [form, setForm] = useState({
        title: '', clientId: '', projectName: '', projectLocation: '',
        validDays: 30, gstRate: 18, notes: '',
        lineItems: [emptyItem()],
        recommendations: []
    });

    useEffect(() => { loadClients(); loadSettings(); if (id) loadQuotation(); }, [id]);

    const loadClients = async () => { try { const { data } = await api.get('/clients'); setClients(data); } catch (e) { } };
    const loadSettings = async () => { try { const { data } = await api.get('/settings'); setSettings(data); if (!id) setForm(f => ({ ...f, notes: data.defaultTerms || '' })); } catch (e) { } };
    const loadQuotation = async () => {
        try {
            const { data } = await api.get(`/quotations/${id}`);
            setForm({
                title: data.title, clientId: data.clientId, projectName: data.projectName,
                projectLocation: data.projectLocation, validDays: data.validDays, gstRate: data.gstRate,
                notes: data.notes || '',
                lineItems: data.lineItems.map(item => ({
                    ...item,
                    brands: BRAND_COLUMNS.map(bc => {
                        const existing = item.brands.find(b => b.brandColumn === bc);
                        return existing || { brandColumn: bc, macadamStep: '', rate: 0, amount: 0, spaceMatch: 0 };
                    })
                })),
                recommendations: data.recommendations || []
            });
        } catch (e) { }
    };

    const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }));
    const updateLineItem = (idx, field, value) => {
        setForm(f => {
            const items = [...f.lineItems];
            items[idx] = { ...items[idx], [field]: value };
            if (field === 'qtyApprox') {
                items[idx].brands = items[idx].brands.map(b => ({ ...b, amount: (parseFloat(value) || 0) * (b.rate || 0) }));
            }
            return { ...f, lineItems: items };
        });
    };
    const updateBrand = (itemIdx, brandIdx, field, value) => {
        setForm(f => {
            const items = [...f.lineItems];
            const brands = [...items[itemIdx].brands];
            brands[brandIdx] = { ...brands[brandIdx], [field]: value };
            if (field === 'rate') brands[brandIdx].amount = (items[itemIdx].qtyApprox || 0) * (parseFloat(value) || 0);
            items[itemIdx] = { ...items[itemIdx], brands };
            return { ...f, lineItems: items };
        });
    };
    const addLineItem = () => setForm(f => ({ ...f, lineItems: [...f.lineItems, emptyItem()] }));
    const removeLineItem = (idx) => setForm(f => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== idx) }));

    const buildRecommendations = () => {
        const recs = [];
        const recMap = { 0: 'RECOMMENDATION A', 1: 'RECOMMENDATION B', 2: 'RECOMMENDATION C', 3: 'RECOMMENDATION D' };
        form.lineItems.forEach((item, itemIdx) => {
            item.brands.forEach((brand, bIdx) => {
                if (bIdx < 4 && brand.rate > 0) {
                    recs.push({ label: recMap[bIdx], sno: itemIdx + 1, productCode: item.productCode, qty: item.qtyApprox, unit: item.unit, brandName: BRAND_LABELS[brand.brandColumn], amount: brand.amount || 0 });
                }
            });
        });
        return recs;
    };

    const recommendations = step >= 2 ? buildRecommendations() : form.recommendations;
    const recLabels = ['RECOMMENDATION A', 'RECOMMENDATION B', 'RECOMMENDATION C', 'RECOMMENDATION D'];
    const recTotals = recLabels.map(label => {
        const items = recommendations.filter(r => r.label === label);
        const sum = items.reduce((s, r) => s + r.amount, 0);
        const gst = sum * (form.gstRate / 100);
        return { label, sum, gst, total: sum + gst };
    });

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...form,
                lineItems: form.lineItems.map((item, idx) => ({
                    sno: idx + 1, productCode: item.productCode, description: item.description,
                    polarImageUrl: item.polarImageUrl, unit: item.unit, qtyApprox: parseFloat(item.qtyApprox) || 0,
                    brands: item.brands.filter(b => b.rate > 0).map(b => ({
                        brandColumn: b.brandColumn, macadamStep: b.macadamStep,
                        rate: parseFloat(b.rate) || 0, amount: parseFloat(b.amount) || 0, spaceMatch: parseFloat(b.spaceMatch) || 0
                    }))
                })),
                recommendations: buildRecommendations()
            };
            if (id) await api.put(`/quotations/${id}`, payload);
            else await api.post('/quotations', payload);
            toast.success(id ? 'Quotation updated' : 'Quotation created');
            navigate('/quotations');
        } catch (err) { toast.error('Failed to save quotation'); }
        finally { setSaving(false); }
    };

    return (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center justify-between" style={{ marginBottom: 24 }}>
                <div>
                    <h1 className="font-display" style={{ fontSize: '2.2rem', fontWeight: 700 }}>{id ? 'Edit' : 'New'} Quotation</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4 }}>Step {step + 1} of {STEPS.length}</p>
                </div>
                <button onClick={() => navigate('/quotations')} className="btn-ghost"><ArrowLeft size={16} /> Back</button>
            </motion.div>

            {/* Step Progress */}
            <motion.div variants={fadeUp} className="flex items-center gap-2" style={{ marginBottom: 32 }}>
                {STEPS.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <button
                            onClick={() => setStep(i)}
                            className="flex items-center gap-2"
                            style={{
                                padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
                                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                background: i === step ? 'var(--color-accent)' : i < step ? 'rgba(16,185,129,0.15)' : 'var(--color-surface)',
                                color: i === step ? 'var(--color-base)' : i < step ? 'var(--color-status-accepted)' : 'var(--color-text-muted)',
                                boxShadow: i === step ? '0 0 20px var(--color-accent-glow)' : 'none',
                            }}
                        >
                            {i < step && <Check size={14} />}
                            {s}
                        </button>
                        {i < STEPS.length - 1 && <div style={{ width: 40, height: 1, background: 'var(--color-border)' }} />}
                    </div>
                ))}
            </motion.div>

            {/* Step 1: Header */}
            {step === 0 && (
                <motion.div variants={fadeUp} className="card-surface" style={{ padding: 32, cursor: 'default' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {[
                            { key: 'title', label: 'Quote Title', placeholder: 'Ramada Encore — Lighting Quotation' },
                            { key: 'clientId', label: 'Client', type: 'select' },
                            { key: 'projectName', label: 'Project Name', placeholder: 'Ground Floor Lighting' },
                            { key: 'projectLocation', label: 'Location', placeholder: 'Noida, UP' },
                            { key: 'validDays', label: 'Valid Days', type: 'number' },
                            { key: 'gstRate', label: 'GST Rate (%)', type: 'number' },
                        ].map(f => (
                            <div key={f.key}>
                                <label className="label">{f.label}</label>
                                {f.type === 'select' ? (
                                    <select value={form.clientId} onChange={e => updateField('clientId', e.target.value)} className="input-dark">
                                        <option value="">Select Client</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
                                    </select>
                                ) : (
                                    <input type={f.type || 'text'} value={form[f.key]} onChange={e => updateField(f.key, f.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                        className="input-dark" placeholder={f.placeholder || ''} />
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Step 2: Line Items */}
            {step === 1 && (
                <div className="space-y-4">
                    <AnimatePresence>
                        {form.lineItems.map((item, idx) => (
                            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                                className="card-surface" style={{ padding: 24, cursor: 'default' }}>
                                <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                                    <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-accent)' }}>Item #{idx + 1}</h3>
                                    {form.lineItems.length > 1 && (
                                        <button onClick={() => removeLineItem(idx)} style={{ padding: 6, borderRadius: 6, background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                    )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 16 }}>
                                    <div><label className="label">Code</label><input type="text" value={item.productCode} onChange={e => updateLineItem(idx, 'productCode', e.target.value)} className="input-dark" placeholder="C1" /></div>
                                    <div style={{ gridColumn: 'span 2' }}><label className="label">Description</label><input type="text" value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} className="input-dark" /></div>
                                    <div><label className="label">Unit</label><select value={item.unit} onChange={e => updateLineItem(idx, 'unit', e.target.value)} className="input-dark"><option value="Nos.">Nos.</option><option value="Mtr.">Mtr.</option></select></div>
                                    <div><label className="label">Qty</label><input type="number" value={item.qtyApprox} onChange={e => updateLineItem(idx, 'qtyApprox', e.target.value)} className="input-dark" /></div>
                                    <div><label className="label">Polar URL</label><input type="text" value={item.polarImageUrl} onChange={e => updateLineItem(idx, 'polarImageUrl', e.target.value)} className="input-dark" placeholder="Optional" /></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                    {item.brands.map((brand, bIdx) => (
                                        <div key={bIdx} style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--color-base)', border: '1px solid var(--color-border)' }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', marginBottom: 8, letterSpacing: 0.5 }}>{BRAND_LABELS[brand.brandColumn]}</div>
                                            <div className="space-y-2">
                                                <div><label style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Macadam</label><input type="text" value={brand.macadamStep} onChange={e => updateBrand(idx, bIdx, 'macadamStep', e.target.value)} className="input-dark" style={{ padding: '6px 10px', fontSize: 12 }} /></div>
                                                <div><label style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Rate (₹)</label><input type="number" value={brand.rate} onChange={e => updateBrand(idx, bIdx, 'rate', e.target.value)} className="input-dark" style={{ padding: '6px 10px', fontSize: 12 }} /></div>
                                                <div><label style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Amount</label><div className="tabular-nums" style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', fontSize: 12, fontWeight: 600, color: 'var(--color-accent)' }}>{formatINR(brand.amount)}</div></div>
                                                <div><label style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Space %</label><input type="number" value={brand.spaceMatch} onChange={e => updateBrand(idx, bIdx, 'spaceMatch', e.target.value)} className="input-dark" style={{ padding: '6px 10px', fontSize: 12 }} /></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <button onClick={addLineItem} style={{ width: '100%', padding: 20, borderRadius: 'var(--radius-lg)', border: '2px dashed var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                        <Plus size={16} /> Add Line Item
                    </button>
                </div>
            )}

            {/* Step 3: Recommendations */}
            {step === 2 && (
                <motion.div variants={fadeUp} className="card-surface" style={{ overflow: 'hidden', cursor: 'default' }}>
                    <div style={{ padding: '14px 20px', background: 'var(--color-base)', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, letterSpacing: 2, borderBottom: '2px solid var(--color-accent)' }}>RECOMMENDATIONS SUMMARY</div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="dark-table">
                            <thead><tr>
                                <th>S.No</th><th>Qty</th><th>Unit</th><th>Code</th>
                                {recLabels.map(l => <th key={l} colSpan="2" style={{ textAlign: 'center', color: 'var(--color-accent)' }}>REC {l.split(' ')[1]}</th>)}
                            </tr></thead>
                            <tbody>
                                {form.lineItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{idx + 1}</td><td>{item.qtyApprox}</td><td>{item.unit}</td><td style={{ fontWeight: 700 }}>{item.productCode}</td>
                                        {recLabels.map((label, lIdx) => {
                                            const rec = recommendations.find(r => r.label === label && r.productCode === item.productCode);
                                            return [
                                                <td key={`${label}-b`} style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{rec?.brandName || '-'}</td>,
                                                <td key={`${label}-a`} className="tabular-nums" style={{ fontWeight: 600, textAlign: 'right' }}>{rec ? formatINR(rec.amount) : '-'}</td>
                                            ];
                                        })}
                                    </tr>
                                ))}
                                <tr style={{ background: 'var(--color-base)' }}>
                                    <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700 }}>SUM</td>
                                    {recTotals.map(r => <td key={r.label} colSpan="2" className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(r.sum)}</td>)}
                                </tr>
                                <tr style={{ background: 'var(--color-base)' }}>
                                    <td colSpan="4" style={{ textAlign: 'right', fontWeight: 600 }}>GST {form.gstRate}%</td>
                                    {recTotals.map(r => <td key={r.label} colSpan="2" className="tabular-nums" style={{ textAlign: 'right' }}>{formatINR(r.gst)}</td>)}
                                </tr>
                                <tr style={{ background: 'var(--color-accent)', color: 'var(--color-base)' }}>
                                    <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                                    {recTotals.map(r => <td key={r.label} colSpan="2" className="tabular-nums" style={{ textAlign: 'right', fontWeight: 700 }}>{formatINR(r.total)}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Step 4: Terms */}
            {step === 3 && (
                <div className="space-y-6">
                    <motion.div variants={fadeUp} className="card-surface" style={{ padding: 32, cursor: 'default' }}>
                        <label className="label">Terms & Conditions</label>
                        <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)}
                            className="input-dark" style={{ height: 240, resize: 'none' }} placeholder="Enter terms..." />
                    </motion.div>
                    {settings && (
                        <motion.div variants={fadeUp} className="card-surface" style={{ padding: 32, borderTop: '2px solid var(--color-accent)', cursor: 'default' }}>
                            <h3 className="font-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Bank Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                                <div><span style={{ color: 'var(--color-text-muted)' }}>Account:</span> <strong>{settings.accountName}</strong></div>
                                <div><span style={{ color: 'var(--color-text-muted)' }}>Bank:</span> <strong>{settings.bankName}</strong></div>
                                <div><span style={{ color: 'var(--color-text-muted)' }}>A/C No:</span> <strong>{settings.accountNumber}</strong></div>
                                <div><span style={{ color: 'var(--color-text-muted)' }}>IFSC:</span> <strong>{settings.ifscCode}</strong></div>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between" style={{ marginTop: 32 }}>
                <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn-ghost" style={{ opacity: step === 0 ? 0.3 : 1 }}>
                    <ArrowLeft size={16} /> Previous
                </button>
                {step < STEPS.length - 1 ? (
                    <button onClick={() => setStep(step + 1)} className="btn-primary"><span>Next</span> <ArrowRight size={16} /></button>
                ) : (
                    <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ padding: '10px 32px' }}>
                        <Save size={16} /> {saving ? 'Saving...' : 'Save Quotation'}
                    </button>
                )}
            </div>
        </motion.div>
    );
}
