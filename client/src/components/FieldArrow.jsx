import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// ── Blue ▶ Edit Arrow ──────────────────────────────────────────────────────
export function BlueArrow({ onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title="Click to rename this label"
            style={{
                width: 26,
                minWidth: 26,
                height: '100%',
                background: '#1E40AF',
                border: 'none',
                borderLeft: '1px solid #1E3A8A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s',
                padding: 0,
                borderRadius: '0 4px 4px 0',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#2563EB'}
            onMouseLeave={e => e.currentTarget.style.background = '#1E40AF'}
        >
            <svg width="9" height="9" viewBox="0 0 9 9">
                <polygon points="1,1 8,4.5 1,8" fill="#ffffff" />
            </svg>
        </button>
    );
}

// ── Red ▼ Filter Arrow ─────────────────────────────────────────────────────
export function RedArrow({ onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title="Filter / Select"
            style={{
                width: 26,
                minWidth: 26,
                height: '100%',
                background: '#B91C1C',
                border: 'none',
                borderLeft: '1px solid #991B1B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s',
                padding: 0,
                borderRadius: '0 4px 4px 0',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#DC2626'}
            onMouseLeave={e => e.currentTarget.style.background = '#B91C1C'}
        >
            <svg width="9" height="9" viewBox="0 0 9 9">
                <polygon points="1,2 8,2 4.5,8" fill="#ffffff" />
            </svg>
        </button>
    );
}

// ── Green ☑ Tick Box ───────────────────────────────────────────────────────
export function GreenTickBox({ checked, onChange, label }) {
    return (
        <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            fontSize: 10,
            color: checked ? '#16A34A' : 'var(--color-text-muted)',
            userSelect: 'none',
        }}>
            <div
                onClick={onChange}
                style={{
                    width: 14,
                    height: 14,
                    border: `1.5px solid ${checked ? '#16A34A' : 'var(--color-border)'}`,
                    borderRadius: 2,
                    background: checked ? '#16A34A' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                }}
            >
                {checked && (
                    <svg width="9" height="9" viewBox="0 0 9 9">
                        <polyline points="1.5,4.5 3.5,7 7.5,2" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    </svg>
                )}
            </div>
            {label}
        </label>
    );
}

// ── Macadam radio tick group — exclusive selection ─────────────────────────
const MACADAM_OPTIONS = [
    { key: '1A', label: '1A (40%)' },
    { key: '2A', label: '2A (50%)' },
    { key: '3A', label: '3A (75%)' },
    { key: '4A', label: '4A (90%)' },
    { key: '5A', label: '5A (100%)' },
];

export function MacadamTickGroup({ value, onChange }) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 130 }}>
            {MACADAM_OPTIONS.map(opt => (
                <GreenTickBox
                    key={opt.key}
                    checked={value === opt.key}
                    onChange={() => onChange(value === opt.key ? '' : opt.key)}
                    label={opt.label}
                />
            ))}
        </div>
    );
}

// Removed exported styles to lib/styles.js to fix Vite Fast Refresh

// ── Label Rename Popover ───────────────────────────────────────────────────
function RenamePopover({ currentLabel, onSave, onClose }) {
    const [draft, setDraft] = useState(currentLabel || '');
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') { onSave(draft.trim() || currentLabel); }
        if (e.key === 'Escape') { onClose(); }
        e.stopPropagation();
    };

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: 0,
                zIndex: 9999,
                background: '#152035',
                border: '1px solid #1E40AF',
                borderRadius: 6,
                padding: '8px 10px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                minWidth: 220,
                whiteSpace: 'nowrap',
            }}
            onMouseDown={e => e.stopPropagation()}
        >
            <span style={{ fontSize: 10, color: '#7B91B0', flexShrink: 0 }}>Rename:</span>
            <input
                id="rename-label-input"
                name="renameLabelInput"
                autoComplete="off"
                aria-label="Rename label"
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                    flex: 1,
                    background: '#0E1629',
                    border: '1px solid #1E3A8A',
                    borderRadius: 4,
                    color: '#EDF2FF',
                    fontSize: 12,
                    padding: '3px 7px',
                    outline: 'none',
                    fontFamily: 'Outfit, sans-serif',
                    minWidth: 0,
                }}
            />
            <button
                type="button"
                onClick={() => onSave(draft.trim() || currentLabel)}
                style={{
                    background: '#1E40AF',
                    border: 'none',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: 11,
                    padding: '3px 8px',
                    cursor: 'pointer',
                    flexShrink: 0,
                }}
            >✓</button>
            <button
                type="button"
                onClick={onClose}
                style={{
                    background: 'transparent',
                    border: '1px solid #1E3A8A',
                    borderRadius: 4,
                    color: '#7B91B0',
                    fontSize: 11,
                    padding: '3px 6px',
                    cursor: 'pointer',
                    flexShrink: 0,
                }}
            >✕</button>
        </div>
    );
}

// ── EditableField — wraps any input with blue ▶ arrow + optional label rename
export function EditableField({ children, inputRef, style = {}, label, onRenameLabel }) {
    const [renaming, setRenaming] = useState(false);
    const wrapperRef = useRef(null);

    // Close popover on outside click
    useEffect(() => {
        if (!renaming) return;
        const handler = (e) => {
            if (!wrapperRef.current?.contains(e.target)) setRenaming(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [renaming]);

    const handleArrowClick = () => {
        if (onRenameLabel) {
            setRenaming(true);
        } else if (inputRef?.current) {
            inputRef.current.focus();
        } else if (wrapperRef.current) {
            const childInput = wrapperRef.current.querySelector('input, select, textarea');
            if (childInput) childInput.focus();
        }
    };

    const handleSave = (newLabel) => {
        onRenameLabel?.(newLabel);
        setRenaming(false);
    };

    return (
        <div
            ref={wrapperRef}
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'stretch',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                overflow: 'visible',
                background: 'var(--color-surface)',
                transition: 'border-color 0.2s',
                height: 36,
                ...style,
            }}
            onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
            onBlurCapture={e => { if (!renaming) e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden', borderRadius: '6px 0 0 6px' }}>
                {children}
            </div>
            <BlueArrow onClick={handleArrowClick} />
            {renaming && (
                <RenamePopover
                    currentLabel={label || ''}
                    onSave={handleSave}
                    onClose={() => setRenaming(false)}
                />
            )}
        </div>
    );
}

// ── FilterField — wraps any select with red ▼ arrow ───────────────────────
export function FilterField({ children, inputRef, style = {} }) {
    const wrapperRef = useRef(null);

    const handleArrowClick = () => {
        if (inputRef?.current) {
            inputRef.current.focus();
            if (typeof inputRef.current.showPicker === 'function') {
                try { inputRef.current.showPicker(); } catch {}
            } else {
                inputRef.current.click();
            }
        } else if (wrapperRef.current) {
            const childInput = wrapperRef.current.querySelector('input, select, textarea');
            if (childInput) {
                childInput.focus();
                if (typeof childInput.showPicker === 'function') {
                    try { childInput.showPicker(); } catch {}
                }
            }
        }
    };

    return (
        <div
            ref={wrapperRef}
            style={{
                display: 'flex',
                alignItems: 'stretch',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                overflow: 'hidden',
                background: 'var(--color-surface)',
                transition: 'border-color 0.2s',
                height: 36,
                ...style,
            }}
            onFocusCapture={e => e.currentTarget.style.borderColor = '#B91C1C'}
            onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
        >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                {children}
            </div>
            <RedArrow onClick={handleArrowClick} />
        </div>
    );
}

// Called with a `pos` object {top, left} from getBoundingClientRect so it can
// escape table overflow:auto clipping via position:fixed
export function ColumnConfigPopover({ col, pos, onSave, onClose }) {
    const [label, setLabel] = useState(col.label || '');
    const [type, setType] = useState(col.type || 'text');
    const [optionsStr, setOptionsStr] = useState((col.options || []).join(', '));
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') onClose();
        e.stopPropagation();
    };

    const handleSave = () => {
        const opts = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
        onSave({ ...col, label: label.trim() || col.label, type, options: opts });
    };

    const popStyle = {
        position: 'fixed',
        top: pos ? pos.top : 80,
        left: pos ? pos.left : 200,
        zIndex: 999999,
        background: '#0F1928',
        border: '1px solid #1E40AF',
        borderRadius: 10,
        padding: '14px 14px 12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 260,
        whiteSpace: 'nowrap',
    };

    const lblStyle = { fontSize: 10, color: '#7B91B0', width: 58, flexShrink: 0 };
    const fieldStyle = {
        flex: 1, background: '#152035', border: '1px solid #1E3A8A', borderRadius: 5,
        color: '#EDF2FF', fontSize: 12, padding: '5px 8px', outline: 'none',
        fontFamily: 'Outfit, sans-serif', minWidth: 0,
    };

    const TYPE_OPTIONS = [
        { value: 'text',     label: 'Text / String' },
        { value: 'number',   label: 'Number only' },
        { value: 'checkbox', label: 'Checkbox (Yes / No)' },
        { value: 'dropdown', label: 'Dropdown list' },
    ];

    return createPortal(
        <div style={popStyle} onMouseDown={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', marginBottom: 2, letterSpacing: 0.4 }}>
                Configure Column
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={lblStyle}>Name</span>
                <input
                    id="col-config-name"
                    name="columnConfigName"
                    autoComplete="off"
                    aria-label="Column Name"
                    ref={inputRef} value={label} onChange={e => setLabel(e.target.value)}
                    onKeyDown={handleKeyDown} style={fieldStyle} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={lblStyle}>Type</span>
                <select
                    id="col-config-type"
                    name="columnConfigType"
                    autoComplete="off"
                    aria-label="Column Type"
                    value={type} onChange={e => setType(e.target.value)}
                    style={{ ...fieldStyle, cursor:'pointer' }}>
                    {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>
            {type === 'dropdown' && (
                <>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={lblStyle}>Options</span>
                        <input
                            id="col-config-opts"
                            name="columnConfigOptions"
                            autoComplete="off"
                            aria-label="Column Options"
                            value={optionsStr} onChange={e => setOptionsStr(e.target.value)}
                            onKeyDown={handleKeyDown} placeholder="e.g. Good, Better, Best"
                            style={fieldStyle} />
                    </div>
                    <div style={{ fontSize:9, color:'#4B6080', paddingLeft:66 }}>Separate options by commas</div>
                </>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:6, marginTop:4 }}>
                <button type="button" onClick={onClose}
                    style={{ background:'transparent', border:'1px solid #1E3A8A', borderRadius:5,
                        color:'#7B91B0', fontSize:11, padding:'4px 12px', cursor:'pointer' }}>
                    Cancel
                </button>
                <button type="button" onClick={handleSave}
                    style={{ background:'#1E40AF', border:'none', borderRadius:5,
                        color:'#fff', fontSize:11, padding:'4px 14px', cursor:'pointer', fontWeight:600 }}>
                    Save
                </button>
            </div>
        </div>,
        document.body
    );
}

//  ColumnHeaderField  shows label + blue arrow, opens ColumnConfigPopover 
export function ColumnHeaderField({ col, onUpdate, onDelete }) {
    const [open, setOpen] = useState(false);
    const [popPos, setPopPos] = useState({ top: 80, left: 200 });
    const wrapperRef = useRef(null);
    const btnRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (!wrapperRef.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleOpenToggle = (e) => {
        e.stopPropagation();
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            // Place below the button, aligned to its left edge but clamp to viewport
            const panelWidth = 270;
            let left = rect.left;
            if (left + panelWidth > window.innerWidth - 8) {
                left = window.innerWidth - panelWidth - 8;
            }
            setPopPos({ top: rect.bottom + 6, left });
        }
        setOpen(p => !p);
    };

    return (
        <div ref={wrapperRef} style={{ position:'relative', display:'inline-flex', alignItems:'center', gap:4, width:'100%' }}>
            <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', fontWeight:700, color:'var(--color-accent)', fontSize:10, letterSpacing:0.5 }}>
                {col.label}
            </span>
            {col.type && col.type !== 'text' && (
                <span style={{ fontSize:8, color:'#4B6080', border:'1px solid #1E3A8A', borderRadius:3, padding:'1px 4px', whiteSpace:'nowrap', flexShrink:0 }}>
                    {col.type}
                </span>
            )}
            <button ref={btnRef} type="button" onClick={handleOpenToggle}
                title="Configure column"
                style={{ width:18, height:18, minWidth:18, background:'#1E40AF', border:'none', borderRadius:3,
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='#2563EB'}
                onMouseLeave={e => e.currentTarget.style.background='#1E40AF'}
            >
                <svg width="7" height="7" viewBox="0 0 9 9"><polygon points="1,1 8,4.5 1,8" fill="#fff" /></svg>
            </button>
            {onDelete && (
                <button type="button" onClick={e => { e.stopPropagation(); onDelete(); }}
                    title="Delete column"
                    style={{ width:18, height:18, minWidth:18, background:'transparent', border:'1px solid #3A1C1C', borderRadius:3,
                        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                        color:'#B91C1C', transition:'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background='#7F1D1D'; e.currentTarget.style.color='#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#B91C1C'; }}
                >
                    <svg width="7" height="7" viewBox="0 0 10 10">
                        <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </button>
            )}
            {open && (
                <ColumnConfigPopover
                    col={col}
                    pos={popPos}
                    onSave={updated => { onUpdate(updated); setOpen(false); }}
                    onClose={() => setOpen(false)}
                />
            )}
        </div>
    );
}
