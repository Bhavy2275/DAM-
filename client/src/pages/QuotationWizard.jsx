import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Plus, Trash2, X, Save, ChevronDown, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { formatINR } from '../lib/formatCurrency';
import { fadeUp, staggerContainer, scaleIn } from '../lib/animations';
import { calcLPWithGst, calcRate, calcAmount, MACADAM_SPACE, REC_LABELS, emptyRecommendation, recalcRec } from '../lib/calcQuote';
import AttributeTagPills from '../components/AttributeTagPills';
import MacadamBadge from '../components/MacadamBadge';
import { EditableField, FilterField, MacadamTickGroup, ColumnHeaderField } from '../components/FieldArrow';
import { inputStyle, selectStyle } from '../lib/styles';

const BODY_COLOURS = ['BLACK', 'WHITE', 'BRASS', 'COPPER', 'DARK_GREY', 'TITANIUM', 'TITANIUM_SILVER'];
const REFLECTOR_COLOURS = ['BLACK', 'WHITE', 'BRASS', 'COPPER', 'DARK_GREY', 'GOLD', 'MATT_SILVER', 'CHROME', 'TITANIUM_SILVER'];
const COLOUR_TEMPS = ['2700K', '3000K', '3500K', '4000K', '6000K', 'TUNABLE'];
const BEAM_ANGLES = ['05DEG', '10DEG', '15DEG', '24DEG', '36DEG', '38DEG', '40DEG', '55DEG', '60DEG', '90DEG', '110DEG', '120DEG'];
const CRI_OPT = ['>70', '>80', '>90'];
const UNIT_OPTIONS = [{ value: 'NUMBERS', label: 'Nos.' }, { value: 'METERS', label: 'Mtr.' }];
const REC_COLORS = { A: '#F5A623', B: '#10B981', C: '#6c63ff', D: '#f43f5e', E: '#06b6d4', F: '#8b5cf6' };
const STEPS = ['Quote Info', 'Final Quote', 'Recommendations'];

const TAG_COLORS = {
    BLACK: { bg: '#1a1a1a', text: '#fff' },
    WHITE: { bg: '#f0f0f0', text: '#333' },
    BRASS: { bg: '#b5a642', text: '#fff' },
    COPPER: { bg: '#b87333', text: '#fff' },
    DARK_GREY: { bg: '#555', text: '#fff' },
    TITANIUM: { bg: '#878681', text: '#fff' },
    GOLD: { bg: '#FFD700', text: '#333' },
    MATT_SILVER: { bg: '#aaa', text: '#fff' },
    CHROME: { bg: '#d4d4d4', text: '#333' },
    TITANIUM_SILVER: { bg: '#a1a1a1', text: '#fff' },
    '2700K': { bg: '#f5a623', text: '#fff' },
    '3000K': { bg: '#f59e0b', text: '#fff' },
    '3500K': { bg: '#fbbf24', text: '#333' },
    '4000K': { bg: '#34d399', text: '#fff' },
    '6000K': { bg: '#60a5fa', text: '#fff' },
    TUNABLE: { bg: '#a78bfa', text: '#fff' },
};

function getTagStyle(val) {
    const c = TAG_COLORS[val];
    if (c) return { background: c.bg, color: c.text };
    if (val.includes('DEG') || val.includes('°')) return { background: '#6c63ff', color: '#fff' };
    if (val.startsWith('>')) return { background: '#06b6d4', color: '#fff' };
    return { background: 'var(--color-elevated)', color: 'var(--color-text-primary)' };
}

function formatTagLabel(val) {
    if (!val) return '';
    return val.replace('DEG', '°').replace('_', ' ');
}

export function getCustomLabel(customLabels, key, defaultLabel) {
    const entry = customLabels?.[key];
    if (typeof entry === 'object' && entry !== null) return entry.label || defaultLabel;
    return entry || defaultLabel;
}

export function getPlaceholder(customLabels, key, defaultPlaceholder) {
    const entry = customLabels?.[key];
    if (typeof entry === 'object' && entry !== null && entry.placeholder !== undefined) {
        return entry.placeholder;
    }
    return defaultPlaceholder;
}

export function getImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ─── EditableAttributeTags (FULLY FIXED) ────────────────────────────────────
// Fix 1: onMouseDown everywhere (table rows steal onClick before children get it)
// Fix 2: No AnimatePresence on dropdown (exit animation creates invisible click-eating layer)
// Fix 3: zIndex: 99999 on dropdown + capture-phase outside-click listener
function EditableAttributeTags({ values = [], options, onChange, label }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Capture phase so table row handlers don't intercept outside-click detection
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler, true);
        return () => document.removeEventListener('mousedown', handler, true);
    }, [open]);

    const toggle = (opt) => {
        onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt]);
    };

    return (
        // zIndex elevates the whole pill group when open so dropdown clears table rows
        <div ref={ref} style={{ position: 'relative', display: 'inline-block', zIndex: open ? 9999 : 'auto' }}>

            {/* ── Trigger area ── */}
            <div
                onMouseDown={(e) => {
                    e.preventDefault();   // prevent table from stealing focus
                    e.stopPropagation();  // prevent row click handlers
                    setOpen(o => !o);
                }}
                title={`Click to edit ${label}`}
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 3,
                    cursor: 'pointer',
                    padding: '3px 5px',
                    borderRadius: 5,
                    border: open
                        ? '1px solid var(--color-accent)'
                        : '1px solid rgba(255,255,255,0.10)',
                    background: open ? 'rgba(245,166,35,0.08)' : 'rgba(255,255,255,0.02)',
                    transition: 'border-color 0.15s, background 0.15s',
                    minWidth: 36,
                    minHeight: 22,
                    alignItems: 'center',
                    userSelect: 'none',
                }}
            >
                {values.length > 0 ? values.map(v => (
                    <span key={v} style={{
                        ...getTagStyle(v),
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 5px',
                        borderRadius: 4,
                        letterSpacing: 0.3,
                        whiteSpace: 'nowrap',
                    }}>
                        {formatTagLabel(v)}
                    </span>
                )) : (
                    <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        + {label}
                    </span>
                )}
                <ChevronDown size={9} style={{
                    color: open ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    marginLeft: 2,
                    flexShrink: 0,
                    transform: open ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s',
                }} />
            </div>

            {/* ── Dropdown — plain conditional render, NO AnimatePresence ── */}
            {open && (
                <div
                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                    style={{
                        position: 'fixed',   // <-- FIXED, not absolute: escapes ALL overflow:hidden ancestors
                        zIndex: 999999,
                        background: 'var(--color-elevated)',
                        border: '1px solid var(--color-accent)',
                        borderRadius: 8,
                        padding: 8,
                        minWidth: 170,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
                        pointerEvents: 'all',
                    }}
                    // position the fixed dropdown relative to the trigger using a layout effect
                    ref={el => {
                        if (!el || !ref.current) return;
                        const trigger = ref.current.querySelector('[title]') || ref.current.firstChild;
                        if (!trigger) return;
                        const rect = trigger.getBoundingClientRect();
                        el.style.top = (rect.bottom + 4) + 'px';
                        el.style.left = rect.left + 'px';
                    }}
                >
                    <div style={{
                        fontSize: 9, fontWeight: 700, color: 'var(--color-accent)',
                        letterSpacing: 1, textTransform: 'uppercase',
                        marginBottom: 6, paddingBottom: 4,
                        borderBottom: '1px solid var(--color-border)',
                    }}>
                        {label}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {options.map(opt => {
                            const selected = values.includes(opt);
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggle(opt);
                                    }}
                                    style={{
                                        ...getTagStyle(opt),
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: '3px 7px',
                                        borderRadius: 4,
                                        border: selected ? '2px solid var(--color-accent)' : '2px solid transparent',
                                        cursor: 'pointer',
                                        opacity: selected ? 1 : 0.5,
                                        transition: 'opacity 0.12s, border-color 0.12s, box-shadow 0.12s',
                                        outline: 'none',
                                        boxShadow: selected ? '0 0 6px rgba(245,166,35,0.45)' : 'none',
                                        userSelect: 'none',
                                    }}
                                >
                                    {selected && '✓ '}{formatTagLabel(opt)}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{
                        marginTop: 8, paddingTop: 6,
                        borderTop: '1px solid var(--color-border)',
                        display: 'flex', justifyContent: 'flex-end',
                    }}>
                        <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
                            style={{
                                fontSize: 10, padding: '3px 12px', borderRadius: 4,
                                background: 'var(--color-accent)', color: 'var(--color-base)',
                                border: 'none', cursor: 'pointer', fontWeight: 700,
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── EditableAttributeGroup ─────────────────────────────────────────────────
function EditableAttributeGroup({ item, onUpdate }) {
    const updateAttr = (key, val) => onUpdate({ ...item, [key]: val });
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                <EditableAttributeTags
                    values={item.bodyColours || []}
                    options={BODY_COLOURS}
                    onChange={v => updateAttr('bodyColours', v)}
                    label="Body"
                />
                <EditableAttributeTags
                    values={item.reflectorColours || []}
                    options={REFLECTOR_COLOURS}
                    onChange={v => updateAttr('reflectorColours', v)}
                    label="Reflector"
                />
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                <EditableAttributeTags
                    values={item.colourTemps || []}
                    options={COLOUR_TEMPS}
                    onChange={v => updateAttr('colourTemps', v)}
                    label="CCT"
                />
                <EditableAttributeTags
                    values={item.beamAngles || []}
                    options={BEAM_ANGLES}
                    onChange={v => updateAttr('beamAngles', v)}
                    label="Beam"
                />
                <EditableAttributeTags
                    values={item.cri || []}
                    options={CRI_OPT}
                    onChange={v => updateAttr('cri', v)}
                    label="CRI"
                />
            </div>
        </div>
    );
}

// ─── Input utility ──────────────────────────────────────────────────────────
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

// ─── Step 1: Quote Info ─────────────────────────────────────────────────────
function Step3QuoteInfo({ form, setForm, clients, customLabels, onRenameLabel, extraFields, setExtraFields }) {
    const updateField = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const lbl = (key, def) => getCustomLabel(customLabels, key, def);
    return (
        <motion.div variants={fadeUp} className="card-surface" style={{ padding: 32, cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--color-accent)' }}>Quotation Details</h2>
                <button type="button" onClick={() => setExtraFields(prev => [...prev, { id: `ef_${crypto.randomUUID()}`, label: 'Custom Field', value: '' }])} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 11, height: 28, borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
                    <Plus size={14} /> Add Field
                </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {[
                    { key: 'quoteTitle', label: 'Quote Title *', placeholder: 'Ramada Encore — Lighting Quotation' },
                    { key: 'projectName', label: 'Project Name *', placeholder: 'Ground Floor Lighting' },
                    { key: 'validDays', label: 'Valid Days', type: 'number' },
                    { key: 'gstRate', label: 'GST Rate (%)', type: 'number' },
                ].map(field => (
                    <div key={field.key}>
                        <label htmlFor={`qi-${field.key}`} className="label">{lbl(field.key, field.label)}</label>
                        <EditableField
                            style={{ height: 36 }}
                            label={lbl(field.key, field.label)}
                            placeholder={getPlaceholder(customLabels, field.key, field.placeholder || '')}
                            onRenameOptions={opts => onRenameLabel(field.key, opts)}
                        >
                            <input
                                id={`qi-${field.key}`}
                                name={field.key}
                                type={field.type || 'text'}
                                autoComplete="off"
                                value={form[field.key] || ''}
                                onChange={e => updateField(field.key, field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                                style={{ ...inputStyle }}
                                placeholder={getPlaceholder(customLabels, field.key, field.placeholder || '')}
                            />
                        </EditableField>
                    </div>
                ))}
                <div>
                    <label htmlFor="qi-clientId" className="label">{lbl('client', 'Client *')}</label>
                    <FilterField style={{ height: 36 }}>
                        <select id="qi-clientId" name="clientId" autoComplete="off" value={form.clientId} onChange={e => updateField('clientId', e.target.value)} style={{ ...selectStyle }}>
                            <option value="">Select Client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.fullName} — {c.companyName}</option>)}
                        </select>
                    </FilterField>
                </div>
                {extraFields?.map((ef) => (
                    <div key={ef.id} style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                            <label htmlFor={`qi-${ef.id}`} className="label" style={{ marginBottom: 0 }}>{lbl(ef.id, ef.label)}</label>
                            <button type="button" onClick={() => setExtraFields(prev => prev.filter(x => x.id !== ef.id))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                                title="Remove field"><Trash2 size={13} /></button>
                        </div>
                        <EditableField
                            style={{ height: 36 }}
                            label={lbl(ef.id, ef.label)}
                            placeholder={getPlaceholder(customLabels, ef.id, 'Enter value')}
                            onRenameOptions={opts => onRenameLabel(ef.id, opts)}
                        >
                            <input
                                id={`qi-${ef.id}`}
                                name={ef.id}
                                type="text"
                                autoComplete="off"
                                value={ef.value}
                                onChange={e => setExtraFields(prev => prev.map(x => x.id === ef.id ? { ...x, value: e.target.value } : x))}
                                style={{ ...inputStyle }}
                                placeholder={getPlaceholder(customLabels, ef.id, 'Enter value')}
                            />
                        </EditableField>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

// ─── Recommendation Column Cell ─────────────────────────────────────────────
function RecCell({ label, rec, onChange, customLabels = {}, onRenameLabel, itemId }) {
    const color = REC_COLORS[label] || 'var(--color-accent)';
    const handleChange = (key, val) => {
        const updated = { ...rec, [key]: val };
        onChange(recalcRec(updated));
    };

    const editableFields = [
        { key: 'brandName', label: 'Brand', type: 'text' },
        { key: 'productCode', label: 'Prod Code', type: 'text' },
        { key: 'listPrice', label: 'LP (₹)', type: 'number' },
        { key: 'listPriceWithGst', label: 'LP+18%', readOnly: true },
        { key: 'discountPercent', label: 'Disc %', type: 'number' },
        { key: 'rate', label: 'Rate (₹)', readOnly: true },
        { key: 'quantity', label: 'Qty', type: 'number' },
        { key: 'amount', label: 'Amount', readOnly: true },
    ];

    const defaultHeader = (rec.brandName || `REC ${label}`).toUpperCase();
    const headerLabel = getCustomLabel(customLabels, `rec_${itemId}_${label}_header`, defaultHeader);

    return (
        <td style={{ verticalAlign: 'top', padding: '0 4px', minWidth: 140 }}>
            <div style={{ background: 'var(--color-base)', border: `1px solid ${color}33`, borderTop: `3px solid ${color}`, borderRadius: 8, padding: '8px 6px' }}>
                <div style={{ marginBottom: 8, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: 1, textAlign: 'center', width: '100%' }}>
                        {headerLabel}
                    </div>
                </div>
                {editableFields.map(f => (
                    <div key={f.key} style={{ marginBottom: 5 }}>
                        <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginBottom: 2, letterSpacing: 0.3 }}>
                            {getCustomLabel(customLabels, `rec_${itemId}_${label}_${f.key}`, f.label)}
                        </div>
                        {f.readOnly ? (
                            <div style={{ padding: '3px 6px', fontSize: 11, fontWeight: 600, color: f.key === 'amount' ? color : 'var(--color-text-secondary)', background: 'var(--color-elevated)', borderRadius: 4 }}>
                                {f.key === 'listPriceWithGst' || f.key === 'rate' || f.key === 'amount'
                                    ? formatINR(parseFloat(rec[f.key]) || 0) : rec[f.key] || '—'}
                            </div>
                        ) : (
                            <EditableField
                                style={{ height: 28 }}
                                label={getCustomLabel(customLabels, `rec_${itemId}_${label}_${f.key}`, f.label)}
                                placeholder={getPlaceholder(customLabels, `rec_${itemId}_${label}_${f.key}`, '')}
                                onRenameOptions={onRenameLabel ? (opts) => onRenameLabel(`rec_${itemId}_${label}_${f.key}`, opts) : undefined}
                            >
                                <input
                                    type={f.type}
                                    name={`rec_${label}_${f.key}`}
                                    autoComplete="off"
                                    aria-label={getCustomLabel(customLabels, `rec_${itemId}_${label}_${f.key}`, f.label)}
                                    value={rec[f.key] || ''}
                                    onChange={e => handleChange(f.key, e.target.value)}
                                    placeholder={getPlaceholder(customLabels, `rec_${itemId}_${label}_${f.key}`, '')}
                                    style={{ ...inputStyle, fontSize: 11, padding: '0 6px' }}
                                />
                            </EditableField>
                        )}
                    </div>
                ))}
                <div style={{ marginBottom: 5 }}>
                    <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginBottom: 2, letterSpacing: 0.3 }}>Unit</div>
                    <FilterField style={{ height: 28 }}>
                        <select
                            name={`rec_${label}_unit`}
                            autoComplete="off"
                            aria-label="Unit"
                            value={rec.unit || 'NUMBERS'}
                            onChange={e => handleChange('unit', e.target.value)}
                            style={{ ...selectStyle, fontSize: 11, padding: '0 6px' }}
                        >
                            <option value="NUMBERS">Nos.</option>
                            <option value="METERS">Mtr.</option>
                        </select>
                    </FilterField>
                </div>
                <div style={{ marginBottom: 5 }}>
                    <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginBottom: 4, letterSpacing: 0.3 }}>Macadam</div>
                    <MacadamTickGroup value={rec.macadamStep || ''} onChange={val => handleChange('macadamStep', val)} />
                </div>
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}>
                    <MacadamBadge step={rec.macadamStep} showSpace />
                </div>
            </div>
        </td>
    );
}


// ─── Colour / attribute maps (mirrors AttributeTagPills) ──────────────────
const COLOUR_MAP_MODAL = {
    BLACK: '#1a1a1a', WHITE: '#f0f0f0', BRASS: '#b5913a', COPPER: '#b87333',
    DARK_GREY: '#555', TITANIUM: '#7a7a7a', GOLD: '#d4af37', MATT_SILVER: '#b0b0b0', CHROME: '#c8d0d8',
};
const CCT_MAP_MODAL = {
    '2700K': '#ff9a3c', '3000K': '#ffb347', '3500K': '#ffd280', '4000K': '#fffde7',
    '6000K': '#e3f2fd', TUNABLE: 'linear-gradient(90deg,#ff9a3c,#e3f2fd)',
};
const BEAM_MAP_MODAL = {
    '05DEG': '#6c63ff', '10DEG': '#7b74ff', '15DEG': '#8a84ff', '24DEG': '#9c94ff',
    '36DEG': '#ae9eff', '38DEG': '#b9a8ff', '40DEG': '#c4b2ff', '55DEG': '#d0bcff',
    '60DEG': '#dcc6ff', '90DEG': '#e8d1ff', '110DEG': '#f3dbff', '120DEG': '#fde4ff',
};
const CRI_MAP_MODAL = { '>70': '#f59e0b', '>80': '#10b981', '>90': '#06b6d4' };

function fmtAttr(v) {
    return v.replace('DEG', '°').replace(/_/g, ' ').replace('TUNABLE', '🌡 Tunable');
}

// ─── Product Attribute Editor Modal ─────────────────────────────────────────
function ProductAttributeModal({ product, initialAttrs, editingItem, onConfirm, onCancel }) {
    // initialAttrs = { bodyColours, reflectorColours, colourTemps, beamAngles, cri }
    const productAttrs = product ? {
        bodyColours: product.bodyColours || [],
        reflectorColours: product.reflectorColours || [],
        colourTemps: product.colourTemps || [],
        beamAngles: product.beamAngles || [],
        cri: product.cri || [],
    } : initialAttrs;

    const [selected, setSelected] = useState(initialAttrs);

    const toggle = (key, value) => {
        setSelected(prev => ({
            ...prev,
            [key]: prev[key].includes(value)
                ? prev[key].filter(v => v !== value)
                : [...prev[key], value],
        }));
    };
    const selectAll = (key) => setSelected(prev => ({ ...prev, [key]: productAttrs[key] }));
    const clearAll  = (key) => setSelected(prev => ({ ...prev, [key]: [] }));

    const SECTIONS = [
        { key: 'bodyColours',     label: 'Body Colours',      map: COLOUR_MAP_MODAL,  textFn: v => v === 'WHITE' ? '#111' : '#fff' },
        { key: 'reflectorColours', label: 'Reflector Colours', map: COLOUR_MAP_MODAL,  textFn: v => v === 'WHITE' ? '#111' : '#fff' },
        { key: 'colourTemps',     label: 'Colour Temperature', map: CCT_MAP_MODAL,     textFn: v => ['4000K','3500K','6000K'].includes(v) ? '#222' : '#222' },
        { key: 'beamAngles',      label: 'Beam Angles',       map: BEAM_MAP_MODAL,    textFn: () => '#fff' },
        { key: 'cri',             label: 'CRI',               map: CRI_MAP_MODAL,     textFn: () => '#fff' },
    ];

    const productCode = product ? product.productCode : (editingItem ? editingItem.productCode : '');

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(7,12,24,0.88)', backdropFilter: 'blur(10px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={e => e.target === e.currentTarget && onCancel()}
        >
            <motion.div
                initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 600, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderTop: '3px solid var(--color-accent)' }}
            >
                {/* Header */}
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--color-accent)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Configure Attributes</div>
                        <h3 className="font-display" style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>{productCode}</h3>
                        {product && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.4 }}>{(product.description || '').slice(0, 90)}</div>}
                    </div>
                    <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, borderRadius: 4, transition: 'color 0.15s', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                    ><X size={18} /></button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                    {SECTIONS.map(({ key, label, map, textFn }) => {
                        const available = productAttrs[key] || [];
                        if (available.length === 0) return null;
                        const isAllSel = selected[key].length === available.length;
                        return (
                            <div key={key} style={{ marginBottom: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: 0.4 }}>{label}</span>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button type="button" onClick={() => selectAll(key)}
                                            style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--color-border)', background: isAllSel ? 'var(--color-accent)' : 'transparent', color: isAllSel ? '#fff' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s' }}
                                        >All</button>
                                        <button type="button" onClick={() => clearAll(key)}
                                            style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-danger)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                                        >Clear</button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {available.map(v => {
                                        const isSel = selected[key].includes(v);
                                        const bg = map[v] || (key === 'beamAngles' ? '#6c63ff' : key === 'cri' ? '#10b981' : '#1E2D47');
                                        return (
                                            <button key={v} type="button" onClick={() => toggle(key, v)}
                                                style={{
                                                    padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                                                    border: `2px solid ${isSel ? bg : 'var(--color-border)'}`,
                                                    background: isSel ? bg : 'var(--color-base)',
                                                    color: isSel ? textFn(v) : 'var(--color-text-secondary)',
                                                    opacity: isSel ? 1 : 0.55,
                                                    transform: isSel ? 'scale(1.05)' : 'scale(1)',
                                                    boxShadow: isSel ? `0 2px 8px ${bg}55` : 'none',
                                                }}
                                            >
                                                {fmtAttr(v)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    {SECTIONS.every(s => (productAttrs[s.key] || []).length === 0) && (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                            This product has no attribute variants defined.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button type="button" onClick={onCancel} className="btn-ghost" style={{ fontSize: 12 }}>Cancel</button>
                    <button type="button" onClick={() => onConfirm(selected)} className="btn-primary" style={{ fontSize: 12, minWidth: 100 }}>
                        Confirm &amp; Add
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Step 3: Recommendations ────────────────────────────────────────────────
function Step4Recommendations({ items, setItems, activeLabels, toggleLabel, gstRate, products, quotationId, customLabels, onRenameLabel, customCols, setCustomCols }) {
    const [productSearch, setProductSearch] = useState('');
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [filterAttr, setFilterAttr] = useState({ bodyColour: '', cct: '', beamAngle: '', cri: '' });

    // ── Attribute editor modal state ──
    const [pendingProduct, setPendingProduct] = useState(null);   // product selected from picker, awaiting attr edit
    const [editingAttrIdx, setEditingAttrIdx] = useState(null);   // index of existing row being re-edited
    const [attrModalInitial, setAttrModalInitial] = useState(null); // initial attrs for modal

    const lbl = (key, def) => getCustomLabel(customLabels, key, def);

    const filteredProducts = products.filter(p => {
        const s = productSearch.toLowerCase();
        if (s && !p.productCode.toLowerCase().includes(s) && !p.description.toLowerCase().includes(s)) return false;
        if (filterAttr.bodyColour && !(p.bodyColours || []).includes(filterAttr.bodyColour)) return false;
        if (filterAttr.cct && !(p.colourTemps || []).includes(filterAttr.cct)) return false;
        if (filterAttr.beamAngle && !(p.beamAngles || []).includes(filterAttr.beamAngle)) return false;
        if (filterAttr.cri && !(p.cri || []).includes(filterAttr.cri)) return false;
        return true;
    });

    // Called when user picks a product from the library picker
    const openAttrModal = (product) => {
        setShowProductPicker(false);
        setProductSearch('');
        setPendingProduct(product);
        setEditingAttrIdx(null);
        setAttrModalInitial({
            bodyColours: product.bodyColours || [],
            reflectorColours: product.reflectorColours || [],
            colourTemps: product.colourTemps || [],
            beamAngles: product.beamAngles || [],
            cri: product.cri || [],
        });
    };

    // Called when user clicks pencil icon on an existing row
    const openAttrModalForRow = (idx) => {
        const item = items[idx];
        const src = products.find(p => p.id === item.productId) || null;
        setPendingProduct(src);
        setEditingAttrIdx(idx);
        setAttrModalInitial({
            bodyColours: item.bodyColours || [],
            reflectorColours: item.reflectorColours || [],
            colourTemps: item.colourTemps || [],
            beamAngles: item.beamAngles || [],
            cri: item.cri || [],
        });
    };

    // Confirm from modal: either add new row or update existing
    const handleAttrConfirm = (selected) => {
        if (editingAttrIdx !== null) {
            // Update existing row's attribute arrays
            setItems(prev => prev.map((it, i) => i === editingAttrIdx ? {
                ...it,
                bodyColours: selected.bodyColours,
                reflectorColours: selected.reflectorColours,
                colourTemps: selected.colourTemps,
                beamAngles: selected.beamAngles,
                cri: selected.cri,
            } : it));
        } else if (pendingProduct) {
            // Add new row using the user's chosen attribute subset
            const newItem = {
                _tempId: crypto.randomUUID(),
                productId: pendingProduct.id,
                productCode: pendingProduct.productCode,
                layoutCode: pendingProduct.layoutCode || '',
                description: pendingProduct.description,
                polarDiagramUrl: pendingProduct.polarDiagramUrl,
                productImageUrl: pendingProduct.productImageUrl,
                bodyColours: selected.bodyColours,
                reflectorColours: selected.reflectorColours,
                colourTemps: selected.colourTemps,
                beamAngles: selected.beamAngles,
                cri: selected.cri,
                unit: 'NUMBERS',
                recommendations: REC_LABELS.reduce((acc, l) => { acc[l] = emptyRecommendation(l); return acc; }, {}),
            };
            setItems(prev => [...prev, newItem]);
        }
        setPendingProduct(null);
        setEditingAttrIdx(null);
        setAttrModalInitial(null);
    };

    const handleAttrCancel = () => {
        setPendingProduct(null);
        setEditingAttrIdx(null);
        setAttrModalInitial(null);
    };

    const addCustomRow = () => {
        setItems(prev => [...prev, {
            _tempId: crypto.randomUUID(),
            productId: null, productCode: 'CUSTOM', layoutCode: '',
            description: 'Custom product',
            bodyColours: [], reflectorColours: [], colourTemps: [], beamAngles: [], cri: [],
            unit: 'NUMBERS',
            recommendations: REC_LABELS.reduce((acc, l) => { acc[l] = emptyRecommendation(l); return acc; }, {}),
        }]);
    };

    const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
    const updateItemField = (idx, key, val) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));
    const updateRec = (itemIdx, label, rec) => setItems(prev => prev.map((it, i) => i === itemIdx ? { ...it, recommendations: { ...it.recommendations, [label]: rec } } : it));

    const colTotals = activeLabels.map(label => {
        const sum = items.reduce((acc, item) => acc + (parseFloat(item.recommendations[label]?.amount) || 0), 0);
        const gst = sum * (gstRate / 100);
        return { label, sum, gst, total: sum + gst };
    });

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginRight: 4 }}>Active Columns:</span>
                {REC_LABELS.map(label => (
                    <button key={label} onClick={() => toggleLabel(label)}
                        style={{
                            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                            border: `2px solid ${REC_COLORS[label]}`,
                            background: activeLabels.includes(label) ? REC_COLORS[label] : 'transparent',
                            color: activeLabels.includes(label) ? '#fff' : REC_COLORS[label]
                        }}>
                        Rec {label}
                    </button>
                ))}
            </div>

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

            <div style={{ overflowX: 'auto', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
                    <thead>
                        <tr style={{ background: 'var(--color-base)', borderBottom: '1px solid var(--color-border)' }}>
                            <th style={{ padding: '10px 12px', fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 600, letterSpacing: 0.5, minWidth: 280 }}>PRODUCT</th>
                            <th style={{ padding: '10px 6px', fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', minWidth: 80 }}>UNIT</th>
                            {customCols?.map(col => (
                                <th key={col.id} style={{ padding: '10px 8px', fontSize: 10, color: 'var(--color-accent)', fontWeight: 600, letterSpacing: 0.4, textAlign: 'left', minWidth: 110, position: 'relative', overflow: 'visible' }}>
                                    <ColumnHeaderField col={{ ...col, label: lbl(col.id, col.label) }}
                                        onUpdate={updated => { onRenameLabel(updated.id, updated.label); setCustomCols(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c)); }}
                                        onDelete={() => setCustomCols(prev => prev.filter(c => c.id !== col.id))} />
                                </th>
                            ))}
                            <th style={{ padding: '10px 8px', textAlign: 'center' }}>
                                <button type="button" onClick={() => setCustomCols(prev => [...prev, { id: `cc_${crypto.randomUUID()}`, label: 'New Col', type: 'text', options: [] }])} className="btn-ghost" style={{ padding: '4px 8px', fontSize: 10, height: 24, border: '1px dashed var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <Plus size={12} /> Add Col
                                </button>
                            </th>
                            {activeLabels.map(label => (
                                <th key={label} style={{ padding: '10px 4px', fontSize: 10, color: REC_COLORS[label], textAlign: 'center', minWidth: 130, fontWeight: 800 }}>
                                    <div style={{ width: '100%', textAlign: 'center' }}>
                                        {getCustomLabel(customLabels, `rec_${label}_header`, `REC ${label}`)}
                                    </div>
                                </th>
                            ))}
                            <th style={{ width: 40 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence>
                            {items.map((item, idx) => {
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
                                        <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                                            <div style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                                                <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-accent)' }}>{item.productCode}</span>
                                                {item.layoutCode && <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{item.layoutCode}</span>}
                                                <button
                                                    type="button"
                                                    title="Edit Attributes"
                                                    onClick={() => openAttrModalForRow(idx)}
                                                    style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 4, cursor: 'pointer', color: 'var(--color-text-muted)', padding: '1px 5px', marginLeft: 2, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, letterSpacing: 0.3, transition: 'all 0.15s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                                                >
                                                    ✏ ATTRS
                                                </button>
                                            </div>
                                            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 6, maxWidth: 260 }}>{item.description}</p>
                                            <AttributeTagPills bodyColours={item.bodyColours} colourTemps={item.colourTemps} beamAngles={item.beamAngles} cri={item.cri} small />
                                        </td>
                                        <td style={{ padding: '10px 6px', verticalAlign: 'top', textAlign: 'center' }}>
                                            <FilterField style={{ height: 28 }}>
                                                <select value={item.unit} onChange={e => updateItemField(idx, 'unit', e.target.value)} style={{ ...selectStyle, fontSize: 11, padding: '0 6px' }}>
                                                    {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </FilterField>
                                        </td>
                                        {customCols?.map(col => {
                                            const cfVal = (item.customFields || {})[col.id];
                                            const setCF = (v) => updateItemField(idx, 'customFields', { ...(item.customFields || {}), [col.id]: v });
                                            return (
                                                <td key={col.id} style={{ padding: '10px 6px', verticalAlign: 'top' }}>
                                                    {col.type === 'checkbox' ? (
                                                        <input type="checkbox" checked={cfVal === 'true' || cfVal === true} onChange={e => setCF(String(e.target.checked))} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
                                                    ) : col.type === 'dropdown' ? (
                                                        <select value={cfVal || ''} onChange={e => setCF(e.target.value)} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4, color: 'var(--color-text-primary)', fontSize: 11, padding: '3px 6px', width: 100 }}>
                                                            <option value="">-- select --</option>
                                                            {(col.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                                                        </select>
                                                    ) : (
                                                        <input type={col.type === 'number' ? 'number' : 'text'} className="input-dark" style={{ padding: '3px 6px', fontSize: 11, width: 90 }} value={cfVal || ''} onChange={e => setCF(e.target.value)} />
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td></td>
                                        {activeLabels.map(label => (
                                            <RecCell key={label} label={label}
                                                itemId={item._tempId || item.id}
                                                rec={item.recommendations[label] || emptyRecommendation(label)}
                                                onChange={rec => updateRec(idx, label, rec)}
                                                customLabels={customLabels} onRenameLabel={onRenameLabel} />
                                        ))}
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
                                            <td key={label} style={{ padding: '8px 4px', fontSize: 11, fontWeight: row.bold ? 700 : 500, color: row.bold ? 'var(--color-base)' : 'var(--color-text-primary)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
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

            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                <button onClick={() => setShowProductPicker(true)} className="btn-primary" style={{ fontSize: 12 }}>
                    <Plus size={14} /> Add from Library
                </button>
                <button onClick={addCustomRow} className="btn-ghost" style={{ fontSize: 12 }}>
                    <Plus size={14} /> Custom Row
                </button>
            </div>

            {/* ── Attribute Editor Modal ── */}
            <AnimatePresence>
                {(pendingProduct || editingAttrIdx !== null) && attrModalInitial && (
                    <ProductAttributeModal
                        product={pendingProduct}
                        initialAttrs={attrModalInitial}
                        editingItem={editingAttrIdx !== null ? items[editingAttrIdx] : null}
                        onConfirm={handleAttrConfirm}
                        onCancel={handleAttrCancel}
                    />
                )}
            </AnimatePresence>

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
                                <input
                                    id="product-picker-search"
                                    name="productPickerSearch"
                                    type="text"
                                    autoComplete="off"
                                    aria-label="Search library products"
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                    placeholder="Search products..."
                                    className="input-dark"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ overflow: 'auto', flex: 1, padding: '0 16px 16px' }}>
                                {filteredProducts.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)', fontSize: 13 }}>No products found</div>
                                ) : filteredProducts.map(p => (
                                    <div key={p.id} onClick={() => openAttrModal(p)}
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

// ─── Step 2: Final Working Quotation ────────────────────────────────────────
function Step5FinalQuotation({ items, setItems, gstRate, activeLabels, notes, setNotes, settings, products = [], searches, setSearches, customLabels, onRenameLabel, customCols, setCustomCols, hiddenCols, setHiddenCols }) {
    const [openSearch, setOpenSearch] = useState(null);
    const [rowInputs, setRowInputs] = useState({});
    const lbl = (key, def) => getCustomLabel(customLabels, key, def);

    const importFromRec = (label) => {
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
        const customHeader = getCustomLabel(customLabels, `rec_${label}_header`, `Rec ${label}`);
        toast.success(`Imported ${customHeader} into Final Quotation`);
    };

    const applyProduct = (idx, product) => {
        const lp = parseFloat(product.listPrice) || 0;
        const disc = parseFloat(product.discountPercent) || 0;
        const rate = parseFloat((lp * (1 - disc / 100)).toFixed(2));
        const qty = parseFloat(items[idx]?.finalQuantity) || 1;
        const finalAmount = parseFloat((rate * qty).toFixed(2));
        const finalBrandName = product.brandName || '';
        const finalUnit = product.unit || 'NUMBERS';

        // Sync price input field immediately
        setRowInputs(prev => ({ ...prev, [idx]: lp.toString() }));

        setItems(prev => prev.map((it, i) => {
            if (i !== idx) return it;
            const recA = recalcRec({
                ...it.recommendations['A'],
                brandName: finalBrandName,
                productCode: product.productCode || '',
                listPrice: lp,
                discountPercent: disc,
                rate: rate,
                quantity: qty,
                amount: finalAmount,
                unit: finalUnit,
            });
            return {
                ...it,
                productId: product.id,
                productCode: product.productCode || '',
                layoutCode: product.layoutCode || '',
                description: product.description || '',
                polarDiagramUrl: product.polarDiagramUrl || '',
                productImageUrl: product.productImageUrl || '',
                bodyColours: product.bodyColours || [],
                reflectorColours: product.reflectorColours || [],
                colourTemps: product.colourTemps || [],
                beamAngles: product.beamAngles || [],
                cri: product.cri || [],
                unit: finalUnit,
                finalBrandName,
                finalListPrice: lp,
                finalPriceType: 'LP', // Default to LP for new selection
                finalDiscount: disc,
                finalRate: rate,
                finalUnit,
                finalQuantity: qty,
                finalAmount,
                finalMacadamStep: '',
                recommendations: {
                    ...it.recommendations,
                    A: recA
                }
            };
        }));
        setSearches(s => ({ ...s, [idx]: product.productCode }));
        setOpenSearch(null);
        if (!product.listPrice) {
            toast('No list price set for this product. Go to Products → Edit to add pricing.', { icon: '⚠️' });
        }
    };

    const addRow = () => {
        const newIdx = items.length;
        setItems(prev => [...prev, {
            _tempId: crypto.randomUUID(),
            productId: null, productCode: 'CUSTOM', layoutCode: '',
            description: '', bodyColours: [], reflectorColours: [],
            colourTemps: [], beamAngles: [], cri: [],
            unit: 'NUMBERS',
            recommendations: REC_LABELS.reduce((acc, l) => { acc[l] = emptyRecommendation(l); return acc; }, {}),
            finalBrandName: '', finalListPrice: 0, finalDiscount: 0,
            finalRate: 0, finalUnit: 'NUMBERS', finalQuantity: 1, finalAmount: 0, finalMacadamStep: '',
            finalPriceType: 'LP',
        }]);
        setSearches(s => ({ ...s, [newIdx]: '' }));
    };

    const updateFinal = (idx, key, val) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const updated = { ...item, [key]: val };
            if (key === 'finalListPrice' || key === 'finalDiscount' || key === 'finalQuantity' || key === 'finalPriceType') {
                const lp = parseFloat(key === 'finalListPrice' ? val : item.finalListPrice) || 0;
                const disc = parseFloat(key === 'finalDiscount' ? val : item.finalDiscount) || 0;
                const qty = parseFloat(key === 'finalQuantity' ? val : item.finalQuantity) || 0;
                updated.finalRate = calcRate(lp, disc);
                updated.finalAmount = calcAmount(updated.finalRate, qty);
            }
            
            // Auto-sync to Rec A
            const recKeyMap = {
                finalBrandName: 'brandName', finalProductCode: 'productCode',
                finalListPrice: 'listPrice', finalDiscount: 'discountPercent',
                finalUnit: 'unit', finalQuantity: 'quantity', finalMacadamStep: 'macadamStep',
            };
            const rKey = recKeyMap[key];
            if (rKey) {
                updated.recommendations = {
                    ...updated.recommendations,
                    A: recalcRec({
                        ...updated.recommendations['A'],
                        [rKey]: val,
                        ...(key === 'finalListPrice' || key === 'finalDiscount' || key === 'finalQuantity' ? {
                            rate: updated.finalRate,
                            amount: updated.finalAmount,
                            listPrice: updated.finalListPrice || 0,
                            discountPercent: updated.finalDiscount || 0,
                            quantity: updated.finalQuantity || 0
                        } : {})
                    })
                };
            }
            return updated;
        }));
    };

    // ── KEY FIX: updateItemAttrs handles attribute tag changes from EditableAttributeGroup ──
    const updateItemAttrs = (idx, updatedItem) => {
        setItems(prev => prev.map((it, i) => i !== idx ? it : { ...it, ...updatedItem }));
    };

    const subtotal = items.reduce((acc, it) => acc + (parseFloat(it.finalAmount) || 0), 0);
    const gstAmt = subtotal * (gstRate / 100);
    const grandTotal = subtotal + gstAmt;

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={addRow} className="btn-primary" style={{ fontSize: 12, padding: '6px 16px' }}>
                    <Plus size={14} /> Add Row
                </button>
                {activeLabels.map(label => {
                    const customHeader = getCustomLabel(customLabels, `rec_${label}_header`, `Rec ${label}`);
                    return (
                        <button key={label} onClick={() => importFromRec(label)}
                            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${REC_COLORS[label]}`, background: 'transparent', color: REC_COLORS[label], transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = REC_COLORS[label]; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = REC_COLORS[label]; }}>
                            Import {customHeader}
                        </button>
                    );
                })}
                {/* PDF Image Toggles */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: 0.5 }}>PDF IMAGES:</span>
                    {[
                        { key: 'Polar Diagram', label: '📐 Polar' },
                        { key: 'Product Image', label: '🖼 Photo' },
                    ].map(({ key, label }) => {
                        const hidden = hiddenCols[key];
                        return (
                            <button key={key} type="button"
                                onClick={() => setHiddenCols(prev => ({ ...prev, [key]: !prev[key] }))}
                                style={{
                                    padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                                    border: `1px solid ${hidden ? 'var(--color-error)' : 'var(--color-border)'}`,
                                    background: hidden ? 'rgba(239,68,68,0.1)' : 'var(--color-surface)',
                                    color: hidden ? 'var(--color-error)' : 'var(--color-text-secondary)',
                                    display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
                                }}
                                title={`${hidden ? 'Show' : 'Hide'} ${key} in PDF`}>
                                {hidden ? <EyeOff size={11} /> : <Eye size={11} />} {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/*
        ── FIX: Two nested divs:
           Outer = overflowX:auto  (horizontal scroll only)
           Inner = overflow:visible (lets attribute dropdowns escape the table boundary)
        ── Without this split, a single overflowX:auto also clips vertically,
           making the fixed-position dropdown invisible or unclickable.
      */}
            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'visible' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1100 }}>
                        <thead>
                            <tr style={{ background: 'var(--color-base)' }}>
                                {['S.No', 'Code', 'Description / Attributes', 'Layout', 'Brand', 'LP (₹)', 'Disc %', 'Rate (₹)', 'Unit', 'Qty', 'Amount'].map(h => {
                                    const isHidden = hiddenCols[h];
                                    return (
                                        <th key={h} style={{ padding: '10px 8px', fontSize: 10, color: isHidden ? 'var(--color-border)' : 'var(--color-text-muted)', fontWeight: 600, letterSpacing: 0.4, textAlign: 'left', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ textDecoration: isHidden ? 'line-through' : 'none' }}>{h}</span>
                                                <button type="button" onClick={() => setHiddenCols(prev => ({ ...prev, [h]: !prev[h] }))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: isHidden ? 'var(--color-error)' : 'var(--color-text-muted)', opacity: isHidden ? 1 : 0.5 }} title="Toggle visibility in PDF">
                                                    {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                                                </button>
                                            </div>
                                        </th>
                                    );
                                })}
                                {customCols?.map(col => (
                                    <th key={col.id} style={{ padding: '10px 8px', fontSize: 10, color: 'var(--color-accent)', fontWeight: 600, letterSpacing: 0.4, textAlign: 'left', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap', minWidth: 110, position: 'relative', overflow: 'visible' }}>
                                        <ColumnHeaderField col={{ ...col, label: lbl(col.id, col.label) }}
                                            onUpdate={updated => { onRenameLabel(updated.id, updated.label); setCustomCols(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c)); }}
                                            onDelete={() => setCustomCols(prev => prev.filter(c => c.id !== col.id))} />
                                    </th>
                                ))}
                                <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--color-border)', width: 36 }}>
                                    <button type="button" onClick={() => setCustomCols(prev => [...prev, { id: `cc_${crypto.randomUUID()}`, label: 'New Col', type: 'text', options: [] }])} className="btn-ghost" style={{ padding: '4px 8px', fontSize: 10, height: 24, border: '1px dashed var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                                        <Plus size={12} /> Add Col
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => {
                                const lpGst = item.finalListPrice ? calcLPWithGst(parseFloat(item.finalListPrice)) : null;
                                const searchVal = searches[idx] !== undefined ? searches[idx] : (item.productCode || '');
                                const filteredProd = searchVal
                                    ? products.filter(p =>
                                        p.productCode.toLowerCase().includes(searchVal.toLowerCase()) ||
                                        p.description.toLowerCase().includes(searchVal.toLowerCase()))
                                    : products.slice(0, 10);

                                return (
                                    <tr key={item._tempId || item.id || idx} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-base)' }}>
                                        <td style={{ padding: '8px 8px', fontSize: 12, textAlign: 'center', verticalAlign: 'middle' }}>{idx + 1}</td>
                                        <td style={{ padding: '8px 8px', position: 'relative', minWidth: 160, verticalAlign: 'middle' }}>
                                            <input
                                                type="text"
                                                id={`fq-code-${idx}`}
                                                name={`fq_code_${idx}`}
                                                autoComplete="off"
                                                aria-label="Product code search"
                                                value={searchVal}
                                                placeholder="Search product..."
                                                onChange={e => { setSearches(s => ({ ...s, [idx]: e.target.value })); setOpenSearch(idx); }}
                                                onFocus={(e) => {
                                                    const rect = e.target.getBoundingClientRect();
                                                    e.target.dataset.rectBottom = rect.bottom;
                                                    e.target.dataset.rectLeft = rect.left;
                                                    e.target.dataset.rectWidth = rect.width;
                                                    setOpenSearch(idx);
                                                }}
                                                onBlur={() => setTimeout(() => setOpenSearch(null), 200)}
                                                className="input-dark"
                                                style={{ padding: '3px 8px', fontSize: 11, width: '100%' }}
                                            />
                                            {openSearch === idx && filteredProd.length > 0 && createPortal((
                                                <div 
                                                    ref={el => {
                                                        if (!el) return;
                                                        const input = document.getElementById(`fq-code-${idx}`);
                                                        if (input) {
                                                            const rect = input.getBoundingClientRect();
                                                            el.style.top = (rect.bottom + 4) + 'px';
                                                            el.style.left = rect.left + 'px';
                                                            el.style.width = Math.max(rect.width, 240) + 'px';
                                                        }
                                                    }}
                                                    onMouseDown={e => e.stopPropagation()}
                                                    style={{ position: 'fixed', zIndex: 999999, background: 'var(--color-elevated)', border: '1px solid var(--color-border)', borderRadius: 8, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                                                >
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
                                            ), document.body)}
                                        </td>

                                        <td style={{ padding: '8px 8px', maxWidth: 240, overflow: 'visible', position: 'relative', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                {/* Images Section */}
                                                {(item.polarDiagramUrl || item.productImageUrl) && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, marginTop: 4 }}>
                                                        {item.productImageUrl && (
                                                            <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--color-border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <img
                                                                    src={getImageUrl(item.productImageUrl)}
                                                                    alt="Product"
                                                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                                    onError={(e) => e.target.style.display = 'none'}
                                                                />
                                                            </div>
                                                        )}
                                                        {item.polarDiagramUrl && (
                                                            <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--color-border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <img
                                                                    src={getImageUrl(item.polarDiagramUrl)}
                                                                    alt="Polar Curve"
                                                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                                    onError={(e) => e.target.style.display = 'none'}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Text / Attributes Section */}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6, lineHeight: 1.4 }}>
                                                        {(item.description || '').substring(0, 100)}
                                                    </div>
                                                    <EditableAttributeGroup
                                                        item={item}
                                                        onUpdate={(updatedItem) => updateItemAttrs(idx, updatedItem)}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 4px', verticalAlign: 'middle' }}>
                                            <EditableField style={{ height: 28 }}>
                                                <input
                                                    value={item.layoutCode || ''}
                                                    onChange={e => updateFinal(idx, 'layoutCode', e.target.value)}
                                                    placeholder="Layout"
                                                    style={{ ...inputStyle, fontSize: 11, padding: '0 6px' }}
                                                />
                                            </EditableField>
                                        </td>
                                        <td style={{ padding: '8px 4px', verticalAlign: 'middle' }}>
                                            <EditableField style={{ height: 28 }}>
                                                <input
                                                    id={`fq-brand-${idx}`}
                                                    name={`fq_brand_${idx}`}
                                                    autoComplete="off"
                                                    aria-label="Brand"
                                                    value={item.finalBrandName ?? ''}
                                                    onChange={e => updateFinal(idx, 'finalBrandName', e.target.value)}
                                                    placeholder="Brand"
                                                    style={{ ...inputStyle, fontSize: 11, padding: '0 6px' }}
                                                />
                                            </EditableField>
                                        </td>
                                        <td style={{ padding: '8px 4px', minWidth: 160, verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <div style={{ display: 'flex' }}>
                                                    <FilterField style={{ height: 28, width: 90, borderRadius: '6px 0 0 6px', borderRight: 'none' }}>
                                                        <select
                                                            value={item.finalPriceType || 'LP'}
                                                            onChange={e => {
                                                                const newType = e.target.value;
                                                                const currentVal = rowInputs[idx] || (item.finalPriceType === 'LP' ? (item.finalListPrice || 0) : (parseFloat(item.finalListPrice || 0) * 1.18).toFixed(2));
                                                                updateFinal(idx, 'finalPriceType', newType);
                                                                // Convert current input value to new mode if needed
                                                                let newVal;
                                                                if (newType === 'LP') {
                                                                    newVal = (parseFloat(currentVal) / 1.18).toFixed(2);
                                                                } else {
                                                                    newVal = (parseFloat(currentVal) * 1.18).toFixed(2);
                                                                }
                                                                setRowInputs(prev => ({ ...prev, [idx]: newVal }));
                                                            }}
                                                            style={{ ...selectStyle, fontSize: 9, padding: '0 4px', border: 'none' }}
                                                        >
                                                            <option value="LP">LP</option>
                                                            <option value="LP_INC">LP + 18% (INC)</option>
                                                        </select>
                                                    </FilterField>
                                                    <EditableField style={{ height: 28, flex: 1, borderRadius: '0 6px 6px 0' }}>
                                                        <input
                                                            id={`fq-lp-${idx}`}
                                                            name={`fq_lp_${idx}`}
                                                            type="number"
                                                            autoComplete="off"
                                                            aria-label="Price"
                                                            value={rowInputs[idx] ?? (item.finalPriceType === 'LP' ? (item.finalListPrice || '') : (parseFloat(item.finalListPrice || 0) * 1.18).toFixed(2))}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setRowInputs(prev => ({ ...prev, [idx]: val }));
                                                                const netPrice = item.finalPriceType === 'LP' ? val : (parseFloat(val || 0) / 1.18).toFixed(2);
                                                                updateFinal(idx, 'finalListPrice', netPrice);
                                                            }}
                                                            placeholder="0.00"
                                                            style={{ ...inputStyle, fontSize: 11, padding: '0 6px', borderLeft: 'none' }}
                                                        />
                                                    </EditableField>
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'right', paddingRight: 4, fontWeight: 600 }}>
                                                    {item.finalPriceType === 'LP' 
                                                        ? `INC: ₹${(parseFloat(item.finalListPrice || 0) * 1.18).toFixed(2)}`
                                                        : `NET: ₹${(parseFloat(item.finalListPrice || 0)).toFixed(2)}`
                                                    }
                                                </div>
                                            </div>
                                        </td>

                                        <td style={{ padding: '8px 4px', verticalAlign: 'middle' }}>
                                            <EditableField style={{ height: 28 }}>
                                                <input
                                                    id={`fq-disc-${idx}`}
                                                    name={`fq_disc_${idx}`}
                                                    type="number"
                                                    autoComplete="off"
                                                    aria-label="Discount %"
                                                    value={item.finalDiscount != null ? item.finalDiscount : ''}
                                                    onChange={e => updateFinal(idx, 'finalDiscount', e.target.value)}
                                                    placeholder={getPlaceholder(customLabels, 'colDisc', '0')}
                                                    style={{ ...inputStyle, fontSize: 11, padding: '0 6px', fontVariantNumeric: 'tabular-nums' }}
                                                />
                                            </EditableField>
                                        </td>
                                        <td style={{ padding: '8px 6px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                            {item.finalRate ? formatINR(parseFloat(item.finalRate)) : '—'}
                                        </td>
                                        <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                                            <FilterField style={{ height: 28 }}>
                                                <select
                                                    id={`fq-unit-${idx}`}
                                                    name={`fq_unit_${idx}`}
                                                    autoComplete="off"
                                                    aria-label="Unit"
                                                    value={item.finalUnit || item.unit || 'NUMBERS'}
                                                    onChange={e => updateFinal(idx, 'finalUnit', e.target.value)}
                                                    style={{ ...selectStyle, fontSize: 11, padding: '0 6px' }}
                                                >
                                                    {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </FilterField>
                                        </td>
                                        <td style={{ padding: '8px 4px', verticalAlign: 'middle' }}>
                                            <EditableField style={{ height: 28 }}>
                                                <input
                                                    id={`fq-qty-${idx}`}
                                                    name={`fq_qty_${idx}`}
                                                    type="number"
                                                    autoComplete="off"
                                                    aria-label="Quantity"
                                                    value={item.finalQuantity != null ? item.finalQuantity : ''}
                                                    onChange={e => updateFinal(idx, 'finalQuantity', e.target.value)}
                                                    placeholder={getPlaceholder(customLabels, 'colQty', '0')}
                                                    style={{ ...inputStyle, fontSize: 11, padding: '0 6px' }}
                                                />
                                            </EditableField>
                                        </td>
                                        <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--color-accent)', fontSize: 12, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                            {item.finalAmount ? formatINR(parseFloat(item.finalAmount)) : '—'}
                                        </td>
                                        {customCols?.map(col => {
                                            const cfVal = (item.customFields || {})[col.id];
                                            const setCF = (v) => updateFinal(idx, 'customFields', { ...(item.customFields || {}), [col.id]: v });
                                            return (
                                                <td key={col.id} style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                    {col.type === 'checkbox' ? (
                                                        <input
                                                            type="checkbox"
                                                            id={`fq-cf-${col.id}-${idx}`}
                                                            name={`fq_cf_${col.id}_${idx}`}
                                                            aria-label={col.label}
                                                            checked={cfVal === 'true' || cfVal === true}
                                                            onChange={e => setCF(String(e.target.checked))}
                                                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-accent)' }}
                                                        />
                                                    ) : col.type === 'dropdown' ? (
                                                        <select
                                                            id={`fq-cf-${col.id}-${idx}`}
                                                            name={`fq_cf_${col.id}_${idx}`}
                                                            autoComplete="off"
                                                            aria-label={col.label}
                                                            value={cfVal || ''}
                                                            onChange={e => setCF(e.target.value)}
                                                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4, color: 'var(--color-text-primary)', fontSize: 11, padding: '3px 6px', width: 100 }}
                                                        >
                                                            <option value="">-- select --</option>
                                                            {(col.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            id={`fq-cf-${col.id}-${idx}`}
                                                            name={`fq_cf_${col.id}_${idx}`}
                                                            type={col.type === 'number' ? 'number' : 'text'}
                                                            autoComplete="off"
                                                            aria-label={col.label}
                                                            className="input-dark"
                                                            style={{ padding: '3px 6px', fontSize: 11, width: 90 }}
                                                            value={cfVal || ''}
                                                            onChange={e => setCF(e.target.value)}
                                                        />
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                                            <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                                                title="Remove row"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                                                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                                            ><Trash2 size={13} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {subtotal > 0 && (() => {
                                // 13 fixed cols + customCols + 1 delete = 14 + n total
                                // label spans cols 1-11 (S.No → Qty), value spans the rest
                                const valSpan = 1 + (customCols?.length || 0) + 1; // Amount + custom + delete
                                return (
                                    <tfoot>
                                        <tr style={{ background: 'var(--color-base)', borderTop: '1px solid var(--color-border)' }}>
                                            <td colSpan={11} style={{ padding: '8px 8px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sub-Total</td>
                                            <td colSpan={valSpan} style={{ padding: '8px 8px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatINR(subtotal)}</td>
                                        </tr>
                                        <tr style={{ background: 'var(--color-base)' }}>
                                            <td colSpan={11} style={{ padding: '4px 8px', textAlign: 'right', fontSize: 12, color: 'var(--color-text-secondary)' }}>GST {gstRate}%</td>
                                            <td colSpan={valSpan} style={{ padding: '4px 8px', fontSize: 12, color: 'var(--color-text-secondary)' }}>{formatINR(gstAmt)}</td>
                                        </tr>
                                        <tr style={{ background: 'var(--color-accent)' }}>
                                            <td colSpan={11} style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: 'var(--color-base)' }}>GRAND TOTAL</td>
                                            <td colSpan={valSpan} style={{ padding: '10px 8px', fontSize: 13, fontWeight: 800, color: 'var(--color-base)' }}>{formatINR(grandTotal)}</td>
                                        </tr>
                                    </tfoot>
                                );
                            })()}

                    </table>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="card-surface" style={{ padding: 20, cursor: 'default' }}>
                    <label htmlFor="fq-terms" className="label" style={{ marginBottom: 8 }}>Terms &amp; Conditions</label>
                    <textarea
                        id="fq-terms"
                        name="termsAndConditions"
                        autoComplete="off"
                        aria-label="Terms & Conditions"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="input-dark"
                        style={{ height: 160, resize: 'none', fontSize: 12 }}
                        placeholder="Enter T&C..."
                    />
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
    const [customLabels, setCustomLabels] = useState({});
    const [extraFields, setExtraFields] = useState([]);
    const [customCols, setCustomCols] = useState([]);
    const [hiddenCols, setHiddenCols] = useState({});
    const [searches, setSearches] = useState({});

    const setCustomLabel = (key, value) => setCustomLabels(prev => ({ ...prev, [key]: value }));

    useEffect(() => {
        loadClients();
        loadProducts();
        loadSettings();
        if (id && id !== 'new' && id !== 'undefined') {
            loadExisting();
        }
    }, []);

    const loadClients = async () => { try { const { data } = await api.get('/clients'); setClients(data); } catch { } };
    const loadProducts = async () => { try { const { data } = await api.get('/products'); setProducts(data); } catch { } };

    const loadSettings = async () => {
        try {
            const { data } = await api.get('/settings');
            setSettings(data);
            if (!id || id === 'new') setNotes(data.defaultTerms || '');
        } catch { }
    };

    const loadExisting = async () => {
        try {
            const { data } = await api.get(`/quotations/${id}`);
            setForm({
                quoteTitle: data.quoteTitle || '',
                clientId: data.clientId || '',
                projectName: data.projectName || '',
                city: data.city || '',
                state: data.state || '',
                validDays: data.validDays || 30,
                gstRate: data.gstRate || 18,
            });
            setNotes(data.notes || '');
            try {
                const parsed = JSON.parse(data.customLabels || '{}');
                setExtraFields(parsed.__extraFields || []);
                setCustomCols(parsed.__customCols || []);
                setHiddenCols(parsed.__hiddenCols || {});
                delete parsed.__extraFields;
                delete parsed.__customCols;
                delete parsed.__hiddenCols;
                setCustomLabels(parsed);
            } catch {
                setCustomLabels({});
                setExtraFields([]);
                setCustomCols([]);
                setHiddenCols({});
            }

            const loadedItems = (data.lineItems || []).map(item => {
                const recMap = {};
                REC_LABELS.forEach(l => {
                    const found = (item.recommendations || []).find(r => r.label === l);
                    recMap[l] = found ? { ...found } : emptyRecommendation(l);
                });
                return {
                    ...item,
                    _tempId: item.id,
                    recommendations: recMap,
                    finalBrandName: item.finalBrandName ?? '',
                    finalProductCode: item.finalProductCode ?? '',
                    finalListPrice: item.finalListPrice ?? 0,
                    finalDiscount: item.finalDiscount ?? 0,
                    finalRate: item.finalRate ?? 0,
                    finalUnit: item.finalUnit || item.unit || 'NUMBERS',
                    finalQuantity: item.finalQuantity ?? 0,
                    finalAmount: item.finalAmount ?? 0,
                    finalMacadamStep: item.finalMacadamStep ?? '',
                    finalPriceType: item.finalPriceType || 'LP',
                    customFields: (() => {
                        try { return typeof item.customFields === 'string' ? JSON.parse(item.customFields) : (item.customFields || {}); }
                        catch { return {}; }
                    })(),
                };
            });

            setItems(loadedItems);

            const initialSearches = {};
            loadedItems.forEach((item, idx) => { initialSearches[idx] = item.productCode || ''; });
            setSearches(initialSearches);

            const usedLabels = new Set();
            loadedItems.forEach(item => {
                REC_LABELS.forEach(l => { if (item.recommendations[l]?.brandName) usedLabels.add(l); });
            });
            if (usedLabels.size > 0) setActiveLabels([...usedLabels]);

        } catch (err) {
            console.error('loadExisting failed:', { id, status: err.response?.status, message: err.response?.data?.error || err.message });
            toast.error(`Failed to load quotation: ${err.response?.data?.error || err.message}`);
        }
    };

    const toggleLabel = (label) => {
        setActiveLabels(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label].sort());
    };

    const saveFinalDraft = async () => {
        if (!quotationId) return true;
        const updatedItems = await saveRecommendations();
        if (!updatedItems) return false;

        setSaving(true);
        try {
            // Always save customLabels (includes hiddenCols, customCols, etc.) regardless of items
            const labelsJson = JSON.stringify({ ...customLabels, __extraFields: extraFields, __customCols: customCols, __hiddenCols: hiddenCols });
            await api.put(`/quotations/${quotationId}`, { ...form, notes, customLabels: labelsJson });

            const itemsWithIds = updatedItems.filter(it => it.id && (it.finalBrandName || it.finalRate || it.finalAmount));
            if (itemsWithIds.length === 0) return true;
            await api.put(`/quotations/${quotationId}/final`, {
                notes,
                items: itemsWithIds.map(it => ({
                    id: it.id,
                    productId: it.productId,
                    productCode: it.productCode,
                    description: it.description,
                    layoutCode: it.layoutCode,
                    productImageUrl: it.productImageUrl,
                    polarDiagramUrl: it.polarDiagramUrl,
                    finalBrandName: it.finalBrandName,
                    finalProductCode: it.finalProductCode || it.productCode,
                    finalListPrice: it.finalListPrice,
                    finalDiscount: it.finalDiscount,
                    finalRate: it.finalRate,
                    finalQuantity: it.finalQuantity,
                    finalAmount: it.finalAmount,
                    finalMacadamStep: it.finalMacadamStep,
                    finalUnit: it.finalUnit,
                    customFields: it.customFields || {},
                    // ── CRITICAL: save edited attribute arrays so PDF reflects changes ──
                    bodyColours: it.bodyColours || [],
                    reflectorColours: it.reflectorColours || [],
                    colourTemps: it.colourTemps || [],
                    beamAngles: it.beamAngles || [],
                    cri: it.cri || [],
                }))
            });
            return true;
        } catch (err) {
            toast.error('Failed to save Final Quote');
            return false;
        } finally { setSaving(false); }
    };

    const saveHeader = async () => {
        if (!form.quoteTitle || !form.clientId || !form.projectName) {
            toast.error('Please fill in Quote Title, Client, and Project Name');
            return false;
        }
        setSaving(true);
        try {
            const labelsJson = JSON.stringify({ ...customLabels, __extraFields: extraFields, __customCols: customCols });
            if (!quotationId) {
                const { data } = await api.post('/quotations', { ...form, notes, customLabels: labelsJson });
                setQuotationId(data.id);
            } else {
                await api.put(`/quotations/${quotationId}`, { ...form, notes, customLabels: labelsJson });
            }
            return true;
        } catch (err) {
            toast.error('Failed to save quotation info');
            return false;
        } finally { setSaving(false); }
    };

    const saveRecommendations = async () => {
        if (!quotationId) return items;
        setSaving(true);
        let currentItems = [...items];
        try {
            for (let i = 0; i < currentItems.length; i++) {
                let item = currentItems[i];
                let itemId = item.id;
                if (!itemId) {
                    const { data: createdItem } = await api.post(`/quotations/${quotationId}/items`, {
                        productId: item.productId,
                        productCode: item.productCode,
                        layoutCode: item.layoutCode,
                        description: item.description,
                        polarDiagramUrl: item.polarDiagramUrl || null,
                        productImageUrl: item.productImageUrl || null,
                        bodyColours: item.bodyColours,
                        reflectorColours: item.reflectorColours,
                        colourTemps: item.colourTemps,
                        beamAngles: item.beamAngles,
                        cri: item.cri,
                        unit: item.unit,
                        customFields: item.customFields,
                        finalPriceType: item.finalPriceType || 'LP',
                    });
                    itemId = createdItem.id;
                    item = { ...item, id: itemId };
                    currentItems[i] = item;
                    setItems(prev => prev.map(it => it._tempId === item._tempId ? { ...it, id: itemId } : it));
                }
                const recs = activeLabels.map(label => {
                    const rec = item.recommendations[label];
                    return rec && rec.brandName ? { ...rec, label } : null;
                }).filter(Boolean);
                await api.put(`/quotations/${quotationId}/items/${itemId}/recommendations`, { recommendations: recs });
            }
            return currentItems;
        } catch (err) {
            console.error(err);
            toast.error('Failed to save recommendations');
            return false;
        } finally { setSaving(false); }
    };

    const saveFinal = async () => {
        const updatedItems = await saveRecommendations();
        if (!updatedItems) return;
        setSaving(true);
        try {
            const labelsJson = JSON.stringify({ ...customLabels, __extraFields: extraFields, __customCols: customCols, __hiddenCols: hiddenCols });
            await api.put(`/quotations/${quotationId}`, { ...form, notes, customLabels: labelsJson });
            const itemsWithIds = updatedItems.filter(it => it.id);
            await api.put(`/quotations/${quotationId}/final`, {
                notes,
                items: itemsWithIds.map(it => ({
                    id: it.id,
                    productId: it.productId,
                    productCode: it.productCode,
                    description: it.description,
                    layoutCode: it.layoutCode,
                    productImageUrl: it.productImageUrl,
                    polarDiagramUrl: it.polarDiagramUrl,
                    finalBrandName: it.finalBrandName,
                    finalProductCode: it.finalProductCode,
                    finalListPrice: it.finalListPrice,
                    finalDiscount: it.finalDiscount,
                    finalRate: it.finalRate,
                    finalQuantity: it.finalQuantity,
                    finalAmount: it.finalAmount,
                    finalMacadamStep: it.finalMacadamStep,
                    finalUnit: it.finalUnit,
                    finalPriceType: it.finalPriceType || 'LP',
                    customFields: it.customFields || {},
                    // ── CRITICAL: save edited attribute arrays so PDF reflects changes ──
                    bodyColours: it.bodyColours || [],
                    reflectorColours: it.reflectorColours || [],
                    colourTemps: it.colourTemps || [],
                    beamAngles: it.beamAngles || [],
                    cri: it.cri || [],
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
            const ok = await saveFinalDraft();
            if (ok) setStep(2);
        }
    };

    const handleBack = () => setStep(Math.max(0, step - 1));

    return (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ padding: 32, maxWidth: 1600, margin: '0 auto' }}>
            <motion.div variants={fadeUp} className="flex items-center justify-between" style={{ marginBottom: 24 }}>
                <div>
                    <h1 className="font-display" style={{ fontSize: '2.2rem', fontWeight: 700 }}>
                        {id && id !== 'new' ? 'Edit Quotation' : 'New Quotation'}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4 }}>Step {step + 1} of {STEPS.length}</p>
                </div>
                <button onClick={() => navigate('/quotations')} className="btn-ghost"><ArrowLeft size={16} /> Back</button>
            </motion.div>

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

            <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                    {step === 0 && (
                        <Step3QuoteInfo
                            form={form} setForm={setForm} clients={clients}
                            customLabels={customLabels} onRenameLabel={setCustomLabel}
                            extraFields={extraFields} setExtraFields={setExtraFields}
                        />
                    )}
                    {step === 1 && (
                        <Step5FinalQuotation
                            items={items} setItems={setItems}
                            gstRate={form.gstRate} activeLabels={activeLabels}
                            notes={notes} setNotes={setNotes}
                            settings={settings} products={products}
                            searches={searches} setSearches={setSearches}
                            customLabels={customLabels} onRenameLabel={setCustomLabel}
                            customCols={customCols} setCustomCols={setCustomCols}
                            hiddenCols={hiddenCols} setHiddenCols={setHiddenCols}
                        />
                    )}
                    {step === 2 && (
                        <Step4Recommendations
                            items={items} setItems={setItems}
                            activeLabels={activeLabels} toggleLabel={toggleLabel}
                            gstRate={form.gstRate} products={products}
                            quotationId={quotationId}
                            customLabels={customLabels} onRenameLabel={setCustomLabel}
                            customCols={customCols} setCustomCols={setCustomCols}
                        />
                    )}
                </motion.div>
            </AnimatePresence>

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