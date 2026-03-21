import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Plus, Trash2, X, ChevronDown, Save, Download, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { formatINR } from '../lib/formatCurrency';
import { fadeUp, staggerContainer, scaleIn } from '../lib/animations';
import { calcLPWithGst, calcRate, calcAmount, MACADAM_SPACE, REC_LABELS, emptyRecommendation, recalcRec } from '../lib/calcQuote';
import AttributeTagPills from '../components/AttributeTagPills';
import MacadamBadge from '../components/MacadamBadge';

const BODY_COLOURS = ['BLACK', 'WHITE', 'BRASS', 'COPPER', 'DARK_GREY', 'TITANIUM'];
const COLOUR_TEMPS = ['2700K', '3000K', '3500K', '4000K', '6000K', 'TUNABLE'];
const BEAM_ANGLES = ['05DEG', '10DEG', '15DEG', '24DEG', '36DEG', '38DEG', '40DEG', '55DEG', '60DEG', '90DEG', '110DEG', '120DEG'];
const CRI_OPT = ['>70', '>80', '>90'];
const UNIT_OPTIONS = [{ value: 'NUMBERS', label: 'Nos.' }, { value: 'METERS', label: 'Mtr.' }];
const REC_COLORS = { A: '#F5A623', B: '#10B981', C: '#6c63ff', D: '#f43f5e', E: '#06b6d4', F: '#8b5cf6' };
const STEPS = ['Quote Info', 'Final Quote', 'Recommendations'];

// ─── Input utility ─────────────────────────────────────────────────────────
function InlineInput({ value, onChange, type = 'text', placeholder = '', style = {}, disabled = false }) {
    return (
        <input
            type={type}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="input-dark"
            style={{ padding: '4px 6px', fontSize: 11, width: '100%', ...style }}
        />
    );
}

// ─── Step 3: Quote Info ─────────────────────────────────────────────────────
function Step3QuoteInfo({ form, setForm, clients }) {
    const updateField = (k, v) => setForm(f => ({ ...f, [k]: v }));
    return (
        <motion.div variants={fadeUp} className="card-surface" style={{ padding: 32, cursor: 'default' }}>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: 'var(--color-accent)' }}>Quotation Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {[
                    { key: 'quoteTitle', label: 'Quote Title *', placeholder: 'Ramada Encore — Lighting Quotation' },
                    { key: 'clientId', label: 'Client *', type: 'select' },
                    { key: 'projectName', label: 'Project Name *', placeholder: 'Ground Floor Lighting' },
                    { key: 'validDays', label: 'Valid Days', type: 'number' },
                    { key: 'gstRate', label: 'GST Rate (%)', type: 'number' },
                ].map(field => (
                    <div key={field.key}>
                        <label htmlFor={`qi-${field.key}`} className="label">{field.label}</label>
                        {field.type === 'select' ? (
                            <select id="qi-clientId" name="clientId" value={form.clientId} onChange={e => updateField('clientId', e.target.value)} className="input-dark">
                                <option value="">Select Client</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.fullName} — {c.companyName}</option>)}
                            </select>
                        ) : (
                            <input id={`qi-${field.key}`} name={field.key} type={field.type || 'text'} value={form[field.key] || ''}
                                onChange={e => updateField(field.key, field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                                className="input-dark" placeholder={field.placeholder || ''} />
                        )}
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

// ─── Recommendation Column Cell ─────────────────────────────────────────────
function RecCell({ label, rec, onChange }) {
    const color = REC_COLORS[label] || 'var(--color-accent)';
    const handleChange = (key, val) => {
        const updated = { ...rec, [key]: val };
        // Always recalculate so that rate & amount are guaranteed to be evaluated
        // even if the user only types a brandName while listPrice was set by a template
        const recalculated = recalcRec(updated);
        onChange(recalculated);
    };

    const fields = [
        { key: 'brandName', label: 'Brand', type: 'text' },
        { key: 'productCode', label: 'Prod Code', type: 'text' },
        { key: 'listPrice', label: 'LP (₹)', type: 'number' },
        { key: 'listPriceWithGst', label: 'LP+18%', type: 'number', readOnly: true },
        { key: 'discountPercent', label: 'Disc %', type: 'number' },
        { key: 'rate', label: 'Rate (₹)', type: 'number', readOnly: true },
        { key: 'quantity', label: 'Qty', type: 'number' },
        { key: 'amount', label: 'Amount', type: 'number', readOnly: true },
        { key: 'macadamStep', label: 'Macadam', type: 'select' },
    ];

    return (
        <td style={{ verticalAlign: 'top', padding: '0 4px', minWidth: 130 }}>
            <div style={{ background: 'var(--color-base)', border: `1px solid ${color}33`, borderTop: `3px solid ${color}`, borderRadius: 8, padding: '8px 6px' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: 1, textAlign: 'center', marginBottom: 8 }}>REC {label}</div>
                {fields.map(f => (
                    <div key={f.key} style={{ marginBottom: 5 }}>
                        <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginBottom: 2, letterSpacing: 0.3 }}>{f.label}</div>
                        {f.type === 'select' ? (
                            <select value={rec[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)}
                                style={{ width: '100%', padding: '3px 6px', borderRadius: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: 11 }}>
                                <option value="">—</option>
                                {Object.keys(MACADAM_SPACE).map(k => <option key={k} value={k}>{k} ({MACADAM_SPACE[k]}%)</option>)}
                            </select>
                        ) : f.readOnly ? (
                            <div style={{ padding: '3px 6px', fontSize: 11, fontWeight: 600, color: f.key === 'amount' ? color : 'var(--color-text-secondary)', background: 'var(--color-elevated)', borderRadius: 4 }}>
                                {f.key === 'listPriceWithGst' || f.key === 'rate' || f.key === 'amount'
                                    ? formatINR(parseFloat(rec[f.key]) || 0)
                                    : rec[f.key] || '—'}
                            </div>
                        ) : (
                            <input type={f.type} value={rec[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)}
                                style={{ width: '100%', padding: '3px 6px', borderRadius: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: 11, outline: 'none' }}
                                onFocus={e => e.target.style.borderColor = color}
                                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                            />
                        )}
                    </div>
                ))}
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}>
                    <MacadamBadge step={rec.macadamStep} showSpace />
                </div>
            </div>
        </td>
    );
}

// ─── Step 4: Recommendation Table ─────────────────────────────────────────
function Step4Recommendations({ items, setItems, activeLabels, toggleLabel, gstRate, products, quotationId }) {
    const [productSearch, setProductSearch] = useState('');
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [filterAttr, setFilterAttr] = useState({ bodyColour: '', cct: '', beamAngle: '', cri: '' });

    const filteredProducts = products.filter(p => {
        const s = productSearch.toLowerCase();
        if (s && !p.productCode.toLowerCase().includes(s) && !p.description.toLowerCase().includes(s)) return false;
        if (filterAttr.bodyColour && !(p.bodyColours || []).includes(filterAttr.bodyColour)) return false;
        if (filterAttr.cct && !(p.colourTemps || []).includes(filterAttr.cct)) return false;
        if (filterAttr.beamAngle && !(p.beamAngles || []).includes(filterAttr.beamAngle)) return false;
        if (filterAttr.cri && !(p.cri || []).includes(filterAttr.cri)) return false;
        return true;
    });

    const addProductRow = (product) => {
        const newItem = {
            _tempId: Date.now(),
            productId: product.id,
            productCode: product.productCode,
            layoutCode: product.layoutCode || '',
            description: product.description,
            polarDiagramUrl: product.polarDiagramUrl,
            productImageUrl: product.productImageUrl,
            bodyColours: product.bodyColours || [],
            reflectorColours: product.reflectorColours || [],
            colourTemps: product.colourTemps || [],
            beamAngles: product.beamAngles || [],
            cri: product.cri || [],
            unit: 'NUMBERS',
            recommendations: REC_LABELS.reduce((acc, l) => { acc[l] = emptyRecommendation(l); return acc; }, {}),
        };
        setItems(prev => [...prev, newItem]);
        setShowProductPicker(false);
        setProductSearch('');
    };

    const addCustomRow = () => {
        const newItem = {
            _tempId: Date.now(),
            productId: null,
            productCode: 'CUSTOM',
            layoutCode: '',
            description: 'Custom product',
            bodyColours: [], reflectorColours: [], colourTemps: [], beamAngles: [], cri: [],
            unit: 'NUMBERS',
            recommendations: REC_LABELS.reduce((acc, l) => { acc[l] = emptyRecommendation(l); return acc; }, {}),
        };
        setItems(prev => [...prev, newItem]);
    };

    const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
    const updateItemField = (idx, key, val) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));
    const updateRec = (itemIdx, label, rec) => setItems(prev => prev.map((it, i) => i === itemIdx ? { ...it, recommendations: { ...it.recommendations, [label]: rec } } : it));

    // Per-column totals
    const colTotals = activeLabels.map(label => {
        const sum = items.reduce((acc, item) => acc + (parseFloat(item.recommendations[label]?.amount) || 0), 0);
        const gst = sum * (gstRate / 100);
        return { label, sum, gst, total: sum + gst };
    });

    return (
        <div>
            {/* Active recommendation toggles */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginRight: 4 }}>Active Columns:</span>
                {REC_LABELS.map(label => (
                    <button key={label} onClick={() => toggleLabel(label)}
                        style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                            border: `2px solid ${REC_COLORS[label]}`,
                            background: activeLabels.includes(label) ? REC_COLORS[label] : 'transparent',
                            color: activeLabels.includes(label) ? '#fff' : REC_COLORS[label] }}>
                        Rec {label}
                    </button>
                ))}
            </div>

            {/* Product row filter (filter rows already added) */}
            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                {[
                    { key: 'bodyColour', opts: BODY_COLOURS },
                    { key: 'cct', opts: COLOUR_TEMPS },
                    { key: 'beamAngle', opts: BEAM_ANGLES },
                    { key: 'cri', opts: CRI_OPT },
                ].map(({ key, opts }) => (
                    <select key={key} value={filterAttr[key]} onChange={e => setFilterAttr(f => ({ ...f, [key]: e.target.value }))}
                        style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 11 }}>
                        <option value="">{key.replace('Colour', ' Colour').replace('Angle', ' Angle')}: All</option>
                        {opts.map(o => <option key={o} value={o}>{o.replace('DEG', '°')}</option>)}
                    </select>
                ))}
            </div>

            {/* Wide scrollable table */}
            <div style={{ overflowX: 'auto', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
                    <thead>
                        <tr style={{ background: 'var(--color-base)', borderBottom: '1px solid var(--color-border)' }}>
                            <th style={{ padding: '10px 12px', fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 600, letterSpacing: 0.5, minWidth: 280 }}>PRODUCT</th>
                            <th style={{ padding: '10px 6px', fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', minWidth: 80 }}>UNIT</th>
                            {activeLabels.map(label => (
                                <th key={label} style={{ padding: '10px 4px', fontSize: 10, color: REC_COLORS[label], textAlign: 'center', minWidth: 130, fontWeight: 800 }}>
                                    REC {label}
                                </th>
                            ))}
                            <th style={{ width: 40 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence>
                            {items.map((item, idx) => {
                                // Filter rows by attribute if filter is active
                                const show = (
                                    (!filterAttr.bodyColour || (item.bodyColours || []).includes(filterAttr.bodyColour)) &&
                                    (!filterAttr.cct || (item.colourTemps || []).includes(filterAttr.cct)) &&
                                    (!filterAttr.beamAngle || (item.beamAngles || []).includes(filterAttr.beamAngle)) &&
                                    (!filterAttr.cri || (item.cri || []).includes(filterAttr.cri))
                                );
                                if (!show) return null;
                                return (
                                    <motion.tr key={item._tempId || item.id || idx}
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                                        style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-base)' }}>
                                        {/* Product info */}
                                        <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                                            <div style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                                                <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-accent)' }}>{item.productCode}</span>
                                                {item.layoutCode && <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{item.layoutCode}</span>}
                                            </div>
                                            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 6, maxWidth: 260 }}>{item.description}</p>
                                            <AttributeTagPills bodyColours={item.bodyColours} colourTemps={item.colourTemps} beamAngles={item.beamAngles} cri={item.cri} small />
                                        </td>
                                        {/* Unit */}
                                        <td style={{ padding: '10px 6px', verticalAlign: 'top', textAlign: 'center' }}>
                                            <select value={item.unit} onChange={e => updateItemField(idx, 'unit', e.target.value)}
                                                style={{ padding: '3px 6px', borderRadius: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: 11 }}>
                                                {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </td>
                                        {/* Recommendation columns */}
                                        {activeLabels.map(label => (
                                            <RecCell
                                                key={label}
                                                label={label}
                                                rec={item.recommendations[label] || emptyRecommendation(label)}
                                                onChange={rec => updateRec(idx, label, rec)}
                                            />
                                        ))}
                                        {/* Delete */}
                                        <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>
                                            <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, borderRadius: 4, transition: 'color 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                                                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                                            ><Trash2 size={14} /></button>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </AnimatePresence>
                    </tbody>
                    {/* Column totals */}
                    {colTotals.some(t => t.sum > 0) && (
                        <tfoot>
                            {[
                                { label: 'SUB-TOTAL', key: 'sum' },
                                { label: `GST ${gstRate}%`, key: 'gst' },
                                { label: 'GRAND TOTAL', key: 'total', bold: true },
                            ].map(row => (
                                <tr key={row.label} style={{ background: row.bold ? 'var(--color-accent)' : 'var(--color-base)', borderTop: '1px solid var(--color-border)' }}>
                                    <td colSpan={2} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: row.bold ? 'var(--color-base)' : 'var(--color-text-secondary)', textAlign: 'right' }}>{row.label}</td>
                                    {activeLabels.map(label => {
                                        const t = colTotals.find(c => c.label === label);
                                        return (
                                            <td key={label} colSpan={1} style={{ padding: '8px 4px', fontSize: 11, fontWeight: row.bold ? 700 : 500, color: row.bold ? 'var(--color-base)' : 'var(--color-text-primary)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                                                {formatINR(t[row.key])}
                                            </td>
                                        );
                                    })}
                                    <td></td>
                                </tr>
                            ))}
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Add product row buttons */}
            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                <button onClick={() => setShowProductPicker(true)} className="btn-primary" style={{ fontSize: 12 }}>
                    <Plus size={14} /> Add from Library
                </button>
                <button onClick={addCustomRow} className="btn-ghost" style={{ fontSize: 12 }}>
                    <Plus size={14} /> Custom Row
                </button>
            </div>

            {/* Product picker modal */}
            <AnimatePresence>
                {showProductPicker && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(7,12,24,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                        onClick={e => e.target === e.currentTarget && setShowProductPicker(false)}>
                        <motion.div variants={scaleIn} initial="hidden" animate="visible" exit="hidden"
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 640, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderTop: '3px solid var(--color-accent)' }}>
                            <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>Select Product from Library</h3>
                                <button onClick={() => setShowProductPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={18} /></button>
                            </div>
                            <div style={{ padding: 16 }}>
                                <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                    placeholder="Search products..." className="input-dark" style={{ width: '100%' }} />
                            </div>
                            <div style={{ overflow: 'auto', flex: 1, padding: '0 16px 16px' }}>
                                {filteredProducts.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)', fontSize: 13 }}>No products found</div>
                                ) : filteredProducts.map(p => (
                                    <div key={p.id} onClick={() => addProductRow(p)}
                                        style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: 6, cursor: 'pointer', border: '1px solid var(--color-border)', background: 'var(--color-base)', transition: 'all 0.15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.background = 'var(--color-accent-glow)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-base)'; }}>
                                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-accent)', fontSize: 15 }}>{p.productCode}</div>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 3, lineHeight: 1.4 }}>{p.description.substring(0, 80)}...</div>
                                        <div style={{ marginTop: 6 }}>
                                            <AttributeTagPills colourTemps={p.colourTemps} beamAngles={p.beamAngles} cri={p.cri} small />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Step 5: Final Working Quotation ─────────────────────────────────────────
function Step5FinalQuotation({ items, setItems, gstRate, activeLabels, notes, setNotes, settings, products = [] }) {
    const [importing, setImporting] = useState(null);
    const [searches, setSearches] = useState({});
    const [openSearch, setOpenSearch] = useState(null);

    const importFromRec = (label) => {
        setImporting(label);
        setItems(prev => prev.map(item => {
            const rec = item.recommendations[label];
            if (!rec || !rec.brandName) return item;
            return {
                ...item,
                finalBrandName: rec.brandName,
                finalProductCode: rec.productCode,
                finalListPrice: rec.listPrice,
                finalDiscount: rec.discountPercent,
                finalRate: rec.rate,
                finalQuantity: rec.quantity,
                finalAmount: rec.amount,
                finalMacadamStep: rec.macadamStep,
                finalUnit: rec.unit || item.unit,
            };
        }));
        toast.success(`Imported Rec ${label} into Final Quotation`);
        setImporting(null);
    };

    // Auto-fill row from product library
    const applyProduct = (idx, product) => {
        const lp   = product.listPrice       || 0;
        const disc = product.discountPercent  || 0;
        const rate = parseFloat((lp * (1 - disc / 100)).toFixed(2));
        const qty  = parseFloat(items[idx]?.finalQuantity) || 1;
        setItems(prev => prev.map((it, i) => i !== idx ? it : {
            ...it,
            productId:       product.id,
            productCode:     product.productCode     || '',
            layoutCode:      product.layoutCode      || '',
            description:     product.description     || '',
            polarDiagramUrl: product.polarDiagramUrl || '',
            productImageUrl: product.productImageUrl || '',
            bodyColours:     product.bodyColours     || [],
            reflectorColours:product.reflectorColours|| [],
            colourTemps:     product.colourTemps     || [],
            beamAngles:      product.beamAngles      || [],
            cri:             product.cri             || [],
            unit:            product.unit            || 'NUMBERS',
            finalBrandName:  product.brandName       || '',
            finalListPrice:  lp,
            finalDiscount:   disc,
            finalRate:       rate,
            finalUnit:       product.unit            || 'NUMBERS',
            finalQuantity:   qty,
            finalAmount:     parseFloat((rate * qty).toFixed(2)),
            finalMacadamStep:'',
        }));
        setSearches(s => ({ ...s, [idx]: product.productCode }));
        setOpenSearch(null);
        if (!product.listPrice) {
            toast('No list price set for this product. Go to Products → Edit to add pricing.', { icon: '⚠️' });
        }
    };

    // Add a fresh empty row (no product pre-selected)
    const addRow = () => {
        setItems(prev => [...prev, {
            _tempId: Date.now(),
            productId: null, productCode: 'CUSTOM', layoutCode: '',
            description: '', bodyColours: [], reflectorColours: [],
            colourTemps: [], beamAngles: [], cri: [],
            unit: 'NUMBERS',
            recommendations: REC_LABELS.reduce((acc, l) => { acc[l] = emptyRecommendation(l); return acc; }, {}),
            finalBrandName: '', finalListPrice: 0, finalDiscount: 0,
            finalRate: 0, finalUnit: 'NUMBERS', finalQuantity: 1, finalAmount: 0, finalMacadamStep: '',
        }]);
    };

    const updateFinal = (idx, key, val) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const updated = { ...item, [key]: val };
            // Recalculate if pricing field changes
            if (key === 'finalListPrice' || key === 'finalDiscount' || key === 'finalQuantity') {
                const lp = parseFloat(key === 'finalListPrice' ? val : item.finalListPrice) || 0;
                const disc = parseFloat(key === 'finalDiscount' ? val : item.finalDiscount) || 0;
                const qty = parseFloat(key === 'finalQuantity' ? val : item.finalQuantity) || 0;
                updated.finalRate = calcRate(lp, disc);
                updated.finalAmount = calcAmount(updated.finalRate, qty);
            }
            return updated;
        }));
    };

    const subtotal = items.reduce((acc, it) => acc + (parseFloat(it.finalAmount) || 0), 0);
    const gstAmt = subtotal * (gstRate / 100);
    const grandTotal = subtotal + gstAmt;

    return (
        <div>
            {/* Toolbar */}
            <div style={{ marginBottom: 16 }}>
                <button onClick={addRow} className="btn-primary" style={{ fontSize: 12, padding: '6px 16px' }}>
                    <Plus size={14} /> Add Row
                </button>
            </div>

            {/* Final table */}
            <div style={{ overflowX: 'auto', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', marginBottom: 20 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1100 }}>
                    <thead>
                        <tr style={{ background: 'var(--color-base)' }}>
                            {['S.No', 'Code', 'Description / Attributes', 'Layout', 'Brand', 'LP (₹)', 'LP+18%', 'Disc %', 'Rate (₹)', 'Unit', 'Qty', 'Amount', 'Macadam'].map(h => (
                                <th key={h} style={{ padding: '10px 8px', fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: 0.4, textAlign: 'left', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => {
                            const lpGst = item.finalListPrice ? calcLPWithGst(parseFloat(item.finalListPrice)) : null;
                            const searchVal = searches[idx] ?? '';
                            const filteredProd = searchVal
                                ? products.filter(p =>
                                    p.productCode.toLowerCase().includes(searchVal.toLowerCase()) ||
                                    p.description.toLowerCase().includes(searchVal.toLowerCase()))
                                : products.slice(0, 10);
                            return (
                                <tr key={item._tempId || item.id || idx} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-base)' }}>
                                    <td style={{ padding: '8px 8px', fontSize: 12, textAlign: 'center' }}>{idx + 1}</td>
                                    <td style={{ padding: '8px 8px', position: 'relative', minWidth: 160 }}>
                                        <input
                                            type="text"
                                            value={searchVal || item.productCode || ''}
                                            placeholder="Search product..."
                                            onChange={e => { setSearches(s => ({ ...s, [idx]: e.target.value })); setOpenSearch(idx); }}
                                            onFocus={() => setOpenSearch(idx)}
                                            className="input-dark"
                                            style={{ padding: '3px 8px', fontSize: 11, width: '100%' }}
                                        />
                                        {openSearch === idx && filteredProd.length > 0 && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                                                background: 'var(--color-elevated)', border: '1px solid var(--color-border)',
                                                borderRadius: 8, maxHeight: 220, overflowY: 'auto',
                                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                                                {filteredProd.map(p => (
                                                    <div key={p.id}
                                                        onMouseDown={e => { e.preventDefault(); applyProduct(idx, p); }}
                                                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-accent-glow)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                        <div style={{ fontWeight: 700, color: 'var(--color-accent)', fontSize: 12 }}>{p.productCode}</div>
                                                        <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                                                            {(p.description || '').slice(0, 60)}…
                                                            {p.listPrice ? ` | LP: ₹${p.listPrice.toLocaleString('en-IN')}` : ''}
                                                            {p.discountPercent ? ` | ${p.discountPercent}% off` : ''}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '8px 8px', maxWidth: 220 }}>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{item.description.substring(0, 70)}</div>
                                        <AttributeTagPills bodyColours={item.bodyColours} colourTemps={item.colourTemps} beamAngles={item.beamAngles} cri={item.cri} small />
                                    </td>
                                    <td style={{ padding: '8px 6px', fontSize: 10, color: 'var(--color-text-muted)' }}>{item.layoutCode || '—'}</td>
                                    <td style={{ padding: '8px 6px' }}>
                                        <InlineInput value={item.finalBrandName || ''} onChange={v => updateFinal(idx, 'finalBrandName', v)} placeholder="Brand" />
                                    </td>
                                    <td style={{ padding: '8px 6px' }}>
                                        <InlineInput type="number" value={item.finalListPrice || ''} onChange={v => updateFinal(idx, 'finalListPrice', v)} placeholder="0" />
                                    </td>
                                    <td style={{ padding: '8px 6px', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                                        {lpGst ? formatINR(lpGst) : '—'}
                                    </td>
                                    <td style={{ padding: '8px 6px' }}>
                                        <InlineInput type="number" value={item.finalDiscount || ''} onChange={v => updateFinal(idx, 'finalDiscount', v)} placeholder="0" />
                                    </td>
                                    <td style={{ padding: '8px 6px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                                        {item.finalRate ? formatINR(parseFloat(item.finalRate)) : '—'}
                                    </td>
                                    <td style={{ padding: '8px 6px' }}>
                                        <select value={item.finalUnit || item.unit || 'NUMBERS'} onChange={e => updateFinal(idx, 'finalUnit', e.target.value)}
                                            style={{ padding: '3px 6px', borderRadius: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: 11 }}>
                                            {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ padding: '8px 6px' }}>
                                        <InlineInput type="number" value={item.finalQuantity || ''} onChange={v => updateFinal(idx, 'finalQuantity', v)} placeholder="0" />
                                    </td>
                                    <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--color-accent)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                        {item.finalAmount ? formatINR(parseFloat(item.finalAmount)) : '—'}
                                    </td>
                                    <td style={{ padding: '8px 6px' }}>
                                        <select value={item.finalMacadamStep || ''} onChange={e => updateFinal(idx, 'finalMacadamStep', e.target.value)}
                                            style={{ padding: '3px 6px', borderRadius: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: 11 }}>
                                            <option value="">—</option>
                                            {Object.keys(MACADAM_SPACE).map(k => <option key={k} value={k}>{k}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: 'var(--color-base)', borderTop: '1px solid var(--color-border)' }}>
                            <td colSpan={11} style={{ padding: '8px 8px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sub-Total</td>
                            <td colSpan={2} style={{ padding: '8px 8px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatINR(subtotal)}</td>
                        </tr>
                        <tr style={{ background: 'var(--color-base)' }}>
                            <td colSpan={11} style={{ padding: '4px 8px', textAlign: 'right', fontSize: 12, color: 'var(--color-text-secondary)' }}>GST {gstRate}%</td>
                            <td colSpan={2} style={{ padding: '4px 8px', fontSize: 12, color: 'var(--color-text-secondary)' }}>{formatINR(gstAmt)}</td>
                        </tr>
                        <tr style={{ background: 'var(--color-accent)' }}>
                            <td colSpan={11} style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: 'var(--color-base)' }}>GRAND TOTAL</td>
                            <td colSpan={2} style={{ padding: '10px 8px', fontSize: 13, fontWeight: 800, color: 'var(--color-base)' }}>{formatINR(grandTotal)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Terms */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="card-surface" style={{ padding: 20, cursor: 'default' }}>
                    <label className="label" style={{ marginBottom: 8 }}>Terms &amp; Conditions</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-dark" style={{ height: 160, resize: 'none', fontSize: 12 }} placeholder="Enter T&C..." />
                </div>
                {settings && (
                    <div className="card-surface" style={{ padding: 20, cursor: 'default', borderTop: '2px solid var(--color-accent)' }}>
                        <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Bank Details</h3>
                        {[
                            ['Account Name', settings.accountName],
                            ['Bank', settings.bankName],
                            ['Account No', settings.accountNumber],
                            ['IFSC', settings.ifscCode],
                            ['GST No', settings.gstNumber],
                        ].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12 }}>
                                <span style={{ color: 'var(--color-text-muted)', minWidth: 90 }}>{k}:</span>
                                <span style={{ fontWeight: 600 }}>{v || '—'}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────
export default function QuotationWizard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    const [settings, setSettings] = useState(null);
    const [quotationId, setQuotationId] = useState(id || null);
    const [activeLabels, setActiveLabels] = useState(['A', 'B']);

    const [form, setForm] = useState({ quoteTitle: '', clientId: '', projectName: '', city: '', state: '', validDays: 30, gstRate: 18 });
    const [items, setItems] = useState([]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        loadClients();
        loadProducts();
        loadSettings();
        if (id) loadExisting();
    }, [id]);

    const loadClients = async () => { try { const { data } = await api.get('/clients'); setClients(data); } catch { } };
    const loadProducts = async () => { try { const { data } = await api.get('/products'); setProducts(data); } catch { } };
    const loadSettings = async () => {
        try {
            const { data } = await api.get('/settings');
            setSettings(data);
            if (!id) setNotes(data.defaultTerms || '');
        } catch { }
    };
    const loadExisting = async () => {
        try {
            const { data } = await api.get(`/quotations/${id}`);
            setForm({ quoteTitle: data.quoteTitle, clientId: data.clientId, projectName: data.projectName, city: data.city || '', state: data.state || '', validDays: data.validDays, gstRate: data.gstRate });
            setNotes(data.notes || '');
            // Rebuild items with recommendations as map
            const loadedItems = (data.lineItems || []).map(item => {
                const recMap = {};
                REC_LABELS.forEach(l => {
                    const found = item.recommendations.find(r => r.label === l);
                    recMap[l] = found ? { ...found } : emptyRecommendation(l);
                });
                return {
                    ...item,
                    _tempId: item.id,
                    recommendations: recMap,
                };
            });
            setItems(loadedItems);
            // Detect which labels are active
            const usedLabels = new Set();
            loadedItems.forEach(item => {
                REC_LABELS.forEach(l => { if (item.recommendations[l]?.brandName) usedLabels.add(l); });
            });
            if (usedLabels.size > 0) setActiveLabels([...usedLabels]);
        } catch { toast.error('Failed to load quotation'); }
    };

    const toggleLabel = (label) => {
        setActiveLabels(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label].sort());
    };

    // Save final-quote items without navigating (step 1 → 2 transition)
    const saveFinalDraft = async () => {
        if (!quotationId) return true;
        setSaving(true);
        try {
            // Only send items that actually have final quote data — never wipe records the user hasn't touched
            const itemsWithIds = items.filter(it => it.id && (it.finalBrandName || it.finalRate || it.finalAmount));
            if (itemsWithIds.length === 0) return true; // nothing to save yet
            await api.put(`/quotations/${quotationId}/final`, {
                notes,
                items: itemsWithIds.map(it => ({
                    id: it.id,
                    finalBrandName:   it.finalBrandName,
                    finalProductCode: it.finalProductCode || it.productCode,
                    finalListPrice:   it.finalListPrice,
                    finalDiscount:    it.finalDiscount,
                    finalRate:        it.finalRate,
                    finalQuantity:    it.finalQuantity,
                    finalAmount:      it.finalAmount,
                    finalMacadamStep: it.finalMacadamStep,
                    finalUnit:        it.finalUnit,
                }))
            });
            return true;
        } catch (err) {
            toast.error('Failed to save Final Quote');
            return false;
        } finally { setSaving(false); }
    };

    // Save Step 3 (header)
    const saveHeader = async () => {
        if (!form.quoteTitle || !form.clientId || !form.projectName) {
            toast.error('Please fill in Quote Title, Client, and Project Name');
            return false;
        }
        setSaving(true);
        try {
            if (!quotationId) {
                const { data } = await api.post('/quotations', { ...form, notes });
                setQuotationId(data.id);
            } else {
                await api.put(`/quotations/${quotationId}`, { ...form, notes });
            }
            return true;
        } catch (err) {
            toast.error('Failed to save quotation info');
            return false;
        } finally { setSaving(false); }
    };

    // Save Step 4 (recommendations)
    const saveRecommendations = async () => {
        if (!quotationId) return true; // Will be saved when we save header first
        setSaving(true);
        try {
            // First, ensure all items are saved (create or sync)
            for (const item of items) {
                let itemId = item.id;
                if (!itemId) {
                    const { data: createdItem } = await api.post(`/quotations/${quotationId}/items`, {
                        productId:        item.productId,
                        productCode:      item.productCode,
                        layoutCode:       item.layoutCode,
                        description:      item.description,
                        polarDiagramUrl:  item.polarDiagramUrl  || null,
                        productImageUrl:  item.productImageUrl  || null,
                        bodyColours:      item.bodyColours,
                        reflectorColours: item.reflectorColours,
                        colourTemps:      item.colourTemps,
                        beamAngles:       item.beamAngles,
                        cri:              item.cri,
                        unit:             item.unit,
                    });
                    itemId = createdItem.id;
                    // Update local item with real id
                    setItems(prev => prev.map(it => it._tempId === item._tempId ? { ...it, id: itemId } : it));
                }
                // Save recommendations for this item
                const recs = activeLabels.map(label => {
                    const rec = item.recommendations[label];
                    return rec && rec.brandName ? { ...rec, label } : null;
                }).filter(Boolean);
                await api.put(`/quotations/${quotationId}/items/${itemId}/recommendations`, { recommendations: recs });
            }
            return true;
        } catch (err) {
            console.error(err);
            toast.error('Failed to save recommendations');
            return false;
        } finally { setSaving(false); }
    };

    // Save Step 5 (final)
    const saveFinal = async () => {
        // Wait! We are on Step 2 (Recommendations). The user just filled it out.
        // We MUST save their recommendations before finishing the quote!
        const ok = await saveRecommendations();
        if (!ok) return;

        setSaving(true);
        try {
            const itemsWithIds = items.filter(it => it.id);
            await api.put(`/quotations/${quotationId}/final`, {
                notes,
                items: itemsWithIds.map(it => ({
                    id: it.id,
                    finalBrandName: it.finalBrandName,
                    finalProductCode: it.finalProductCode,
                    finalListPrice: it.finalListPrice,
                    finalDiscount: it.finalDiscount,
                    finalRate: it.finalRate,
                    finalQuantity: it.finalQuantity,
                    finalAmount: it.finalAmount,
                    finalMacadamStep: it.finalMacadamStep,
                    finalUnit: it.finalUnit,
                }))
            });
            toast.success('Quotation saved successfully!');
            navigate(`/quotations/${quotationId}`);
        } catch (err) {
            toast.error('Failed to save final quotation');
        } finally { setSaving(false); }
    };

    const handleNext = async () => {
        if (step === 0) {
            const ok = await saveHeader();
            if (ok) setStep(1);
        } else if (step === 1) {
            // Step 1 is now Final Quote — save draft then go to Recommendations
            const ok = await saveFinalDraft();
            if (ok) setStep(2);
        }
    };

    const handleBack = () => setStep(Math.max(0, step - 1));

    return (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ padding: 32, maxWidth: 1600, margin: '0 auto' }}>
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center justify-between" style={{ marginBottom: 24 }}>
                <div>
                    <h1 className="font-display" style={{ fontSize: '2.2rem', fontWeight: 700 }}>
                        {id ? 'Edit Quotation' : 'New Quotation'}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4 }}>Step {step + 1} of {STEPS.length}</p>
                </div>
                <button onClick={() => navigate('/quotations')} className="btn-ghost"><ArrowLeft size={16} /> Back</button>
            </motion.div>

            {/* Step progress */}
            <motion.div variants={fadeUp} className="flex items-center gap-2" style={{ marginBottom: 28 }}>
                {STEPS.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <button onClick={() => i <= step && setStep(i)}
                            style={{
                                padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
                                border: 'none', cursor: i <= step ? 'pointer' : 'default', transition: 'all 0.2s',
                                background: i === step ? 'var(--color-accent)' : i < step ? 'rgba(16,185,129,0.15)' : 'var(--color-surface)',
                                color: i === step ? 'var(--color-base)' : i < step ? '#10B981' : 'var(--color-text-muted)',
                                boxShadow: i === step ? '0 0 20px var(--color-accent-glow)' : 'none',
                            }}>
                            {s}
                        </button>
                        {i < STEPS.length - 1 && <div style={{ width: 40, height: 1, background: 'var(--color-border)' }} />}
                    </div>
                ))}
            </motion.div>

            {/* Step content */}
            <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                    {step === 0 && <Step3QuoteInfo form={form} setForm={setForm} clients={clients} />}
                    {step === 1 && (
                        <Step5FinalQuotation
                            items={items} setItems={setItems}
                            gstRate={form.gstRate} activeLabels={activeLabels}
                            notes={notes} setNotes={setNotes}
                            settings={settings}
                            products={products}
                        />
                    )}
                    {step === 2 && (
                        <Step4Recommendations
                            items={items} setItems={setItems}
                            activeLabels={activeLabels} toggleLabel={toggleLabel}
                            gstRate={form.gstRate} products={products}
                            quotationId={quotationId}
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between" style={{ marginTop: 32 }}>
                <button onClick={handleBack} disabled={step === 0} className="btn-ghost" style={{ opacity: step === 0 ? 0.3 : 1 }}>
                    <ArrowLeft size={16} /> Previous
                </button>
                {step < STEPS.length - 1 ? (
                    <button onClick={handleNext} disabled={saving} className="btn-primary">
                        {saving ? 'Saving...' : 'Next'} <ArrowRight size={16} />
                    </button>
                ) : (
                    <button onClick={saveFinal} disabled={saving} className="btn-primary" style={{ padding: '10px 32px' }}>
                        <Save size={16} /> {saving ? 'Saving...' : 'Save & Finish'}
                    </button>
                )}
            </div>
        </motion.div>
    );
}
