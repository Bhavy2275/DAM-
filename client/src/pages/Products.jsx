import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Upload, Check, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { fadeUp, scaleIn, staggerContainer } from '../lib/animations';
import AttributeTagPills from '../components/AttributeTagPills';
import { SkeletonCard } from '../components/SkeletonCard';

const BODY_COLOURS = ['BLACK', 'WHITE', 'BRASS', 'COPPER', 'DARK_GREY', 'TITANIUM'];
const REFLECTOR_COLOURS = ['BLACK', 'WHITE', 'BRASS', 'COPPER', 'DARK_GREY', 'GOLD', 'MATT_SILVER', 'CHROME'];
const COLOUR_TEMPS = ['2700K', '3000K', '3500K', '4000K', '6000K', 'TUNABLE'];
const BEAM_ANGLES = ['05DEG', '10DEG', '15DEG', '24DEG', '36DEG', '38DEG', '40DEG', '55DEG', '60DEG', '90DEG', '110DEG', '120DEG'];
const CRI_OPTIONS = ['>70', '>80', '>90'];

const emptyForm = {
    productCode: '', layoutCode: '', description: '', basePrice: '',
    bodyColours: [], reflectorColours: [], colourTemps: [], beamAngles: [], cri: [],
    customAttributes: [], // Array of { key: '', value: '' }
};

function MultiCheckGroup({ label, options, selected, onChange, formatLabel }) {
    const [customValue, setCustomValue] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Combine standard options with any custom options currently selected
    const allOptions = Array.from(new Set([...options, ...selected]));

    const handleAddCustom = (e) => {
        e.preventDefault();
        const val = customValue.trim().toUpperCase();
        if (val && !selected.includes(val)) {
            onChange([...selected, val]);
        }
        setCustomValue('');
        setIsAdding(false);
    };

    return (
        <div style={{ marginBottom: 16 }}>
            <div className="label" style={{ marginBottom: 8 }}>{label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {allOptions.map(opt => {
                    const isSelected = selected.includes(opt);
                    return (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onChange(isSelected ? selected.filter(s => s !== opt) : [...selected, opt])}
                            style={{
                                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                background: isSelected ? 'var(--color-accent-glow)' : 'transparent',
                                color: isSelected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', gap: 4
                            }}
                        >
                            {isSelected && <Check size={10} />}
                            {formatLabel ? formatLabel(opt) : opt.replace('DEG', '°').replace(/_/g, ' ')}
                        </button>
                    );
                })}
                
                {isAdding ? (
                    <form onSubmit={handleAddCustom} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                            type="text"
                            autoFocus
                            value={customValue}
                            onChange={(e) => setCustomValue(e.target.value)}
                            onBlur={() => { if (!customValue) setIsAdding(false); }}
                            placeholder="Type & Enter..."
                            style={{
                                background: 'var(--color-surface)', border: '1px solid var(--color-accent)',
                                color: 'var(--color-text-primary)', borderRadius: 20, padding: '4px 10px',
                                fontSize: 11, outline: 'none', width: 100
                            }}
                        />
                    </form>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsAdding(true)}
                        style={{
                            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            border: '1px dashed var(--color-border)', background: 'transparent',
                            color: 'var(--color-text-muted)', transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', gap: 4
                        }}
                    >
                        <Plus size={10} /> Other
                    </button>
                )}
            </div>
        </div>
    );
}

export default function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ bodyColour: '', reflectorColour: '', cct: '', beamAngle: '', cri: '' });
    const [showFilters, setShowFilters] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [polarFile, setPolarFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    useEffect(() => { loadProducts(); }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/products');
            setProducts(data);
        } catch { toast.error('Failed to load products'); }
        finally { setLoading(false); }
    };

    const openAdd = () => {
        setEditProduct(null);
        setForm(emptyForm);
        setPolarFile(null);
        setShowModal(true);
    };

    const openEdit = (p) => {
        setEditProduct(p);
        setForm({
            productCode: p.productCode, layoutCode: p.layoutCode || '', description: p.description,
            basePrice: p.basePrice || '',
            bodyColours: Array.isArray(p.bodyColours) ? p.bodyColours : [], 
            reflectorColours: Array.isArray(p.reflectorColours) ? p.reflectorColours : [],
            colourTemps: Array.isArray(p.colourTemps) ? p.colourTemps : [], 
            beamAngles: Array.isArray(p.beamAngles) ? p.beamAngles : [], 
            cri: Array.isArray(p.cri) ? p.cri : [],
            customAttributes: Array.isArray(p.customAttributes) ? p.customAttributes : [],
        });
        setPolarFile(null);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.productCode.trim() || !form.description.trim()) {
            toast.error('Product code and description are required');
            return;
        }
        setSaving(true);
        let savedProductId = null;

        try {
            if (editProduct) {
                await api.put(`/products/${editProduct.id}`, form);
                savedProductId = editProduct.id;
                toast.success('Product updated');
            } else {
                const { data } = await api.post('/products', form);
                savedProductId = data.id;
                toast.success('Product created');
            }

            // Upload polar file if present
            if (polarFile && savedProductId) {
                const formData = new FormData();
                formData.append('polar', polarFile);
                await api.post(`/products/${savedProductId}/polar`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Polar diagram uploaded');
            }

            setShowModal(false);
            loadProducts();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save product');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/products/${id}`);
            toast.success('Product deleted');
            setDeleteConfirm(null);
            loadProducts();
        } catch { toast.error('Failed to delete product'); }
    };

    // Filter products locally
    const filtered = products.filter(p => {
        if (search) {
            const s = search.toLowerCase();
            if (!p.productCode.toLowerCase().includes(s) && !p.description.toLowerCase().includes(s) && !(p.layoutCode || '').toLowerCase().includes(s)) return false;
        }
        if (filters.bodyColour && !(p.bodyColours || []).includes(filters.bodyColour)) return false;
        if (filters.cct && !(p.colourTemps || []).includes(filters.cct)) return false;
        if (filters.beamAngle && !(p.beamAngles || []).includes(filters.beamAngle)) return false;
        if (filters.cri && !(p.cri || []).includes(filters.cri)) return false;
        return true;
    });

    const updateField = (key, val) => setForm(f => ({ ...f, [key]: val }));
    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    return (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center justify-between" style={{ marginBottom: 24 }}>
                <div>
                    <h1 className="font-display" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Product Library</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4 }}>
                        {filtered.length} product{filtered.length !== 1 ? 's' : ''} · Add once, reuse across all quotations
                    </p>
                </div>
                <button onClick={openAdd} className="btn-primary">
                    <Plus size={16} /> Add Product
                </button>
            </motion.div>

            {/* Search + Filter Bar */}
            <motion.div variants={fadeUp} style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search product code or description..."
                        className="input-dark" style={{ paddingLeft: 36 }}
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                        padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
                        border: `1px solid ${activeFilterCount > 0 ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: activeFilterCount > 0 ? 'var(--color-accent-glow)' : 'var(--color-surface)',
                        color: activeFilterCount > 0 ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                    }}
                >
                    <Filter size={14} />
                    Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </button>
                {activeFilterCount > 0 && (
                    <button onClick={() => setFilters({ bodyColour: '', reflectorColour: '', cct: '', beamAngle: '', cri: '' })} className="btn-ghost" style={{ fontSize: 12 }}>
                        Clear All
                    </button>
                )}
            </motion.div>

            {/* Filter Drawer */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                        className="card-surface" style={{ marginBottom: 20, padding: 20, overflow: 'hidden', cursor: 'default' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
                            {[
                                { key: 'bodyColour', label: 'Body Colour', opts: BODY_COLOURS },
                                { key: 'reflectorColour', label: 'Reflector', opts: REFLECTOR_COLOURS },
                                { key: 'cct', label: 'Colour Temp', opts: COLOUR_TEMPS },
                                { key: 'beamAngle', label: 'Beam Angle', opts: BEAM_ANGLES },
                                { key: 'cri', label: 'CRI', opts: CRI_OPTIONS },
                            ].map(({ key, label, opts }) => (
                                <div key={key}>
                                    <div className="label" style={{ marginBottom: 6 }}>{label}</div>
                                    <select value={filters[key]} onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))} className="input-dark" style={{ fontSize: 12 }}>
                                        <option value="">All</option>
                                        {opts.map(o => <option key={o} value={o}>{o.replace('DEG', '°').replace('_', ' ')}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Product Grid */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : filtered.length === 0 ? (
                <motion.div variants={fadeUp} className="card-surface" style={{ textAlign: 'center', padding: '60px 24px', cursor: 'default' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>💡</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>No Products Found</div>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20, fontSize: 13 }}>
                        {search || activeFilterCount ? 'Try different search terms or clear filters.' : 'Start adding products to your master library.'}
                    </p>
                    <button onClick={openAdd} className="btn-primary"><Plus size={14} /> Add First Product</button>
                </motion.div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    <AnimatePresence>
                        {filtered.map((product, i) => (
                            <motion.div
                                key={product.id}
                                custom={i}
                                variants={fadeUp}
                                className="card-surface"
                                style={{ padding: 20, position: 'relative', overflow: 'hidden', cursor: 'default' }}
                                whileHover={{ y: -4, boxShadow: '0 0 0 1px var(--color-accent), 0 8px 30px var(--color-accent-glow)' }}
                                transition={{ duration: 0.2 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                {/* Amber glow corner */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--color-accent)', opacity: 0.5, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />

                                <div className="flex items-start justify-between" style={{ marginBottom: 10 }}>
                                    <div>
                                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--color-accent)' }}>
                                            {product.productCode}
                                        </div>
                                        {product.layoutCode && (
                                            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2, letterSpacing: 1 }}>
                                                Layout: {product.layoutCode}
                                            </div>
                                        )}
                                        {product.basePrice > 0 && (
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 4 }}>
                                                ₹{product.basePrice.toLocaleString('en-IN')}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button onClick={() => openEdit(product)} style={{ padding: 6, borderRadius: 6, border: 'none', background: 'var(--color-elevated)', color: 'var(--color-text-secondary)', cursor: 'pointer', transition: 'all 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-accent)'}
                                            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                                        ><Edit2 size={14} /></button>
                                        <button onClick={() => setDeleteConfirm(product.id)} style={{ padding: 6, borderRadius: 6, border: 'none', background: 'var(--color-elevated)', color: 'var(--color-text-secondary)', cursor: 'pointer', transition: 'all 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                                            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                                        ><Trash2 size={14} /></button>
                                    </div>
                                </div>

                                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {product.description}
                                </p>

                                <AttributeTagPills
                                    bodyColours={product.bodyColours}
                                    colourTemps={product.colourTemps}
                                    beamAngles={product.beamAngles}
                                    cri={product.cri}
                                    small
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(7,12,24,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                        onClick={e => e.target === e.currentTarget && setShowModal(false)}
                    >
                        <motion.div
                            variants={scaleIn} initial="hidden" animate="visible" exit="hidden"
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto', borderTop: '3px solid var(--color-accent)' }}
                        >
                            <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 className="font-display" style={{ fontSize: 22, fontWeight: 700 }}>{editProduct ? 'Edit Product' : 'Add New Product'}</h2>
                                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}><X size={20} /></button>
                            </div>

                            <div style={{ padding: 24 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                                    <div>
                                        <label className="label">Product Code *</label>
                                        <input type="text" value={form.productCode} onChange={e => updateField('productCode', e.target.value)}
                                            className="input-dark" placeholder="e.g. C1, PF1, W1" />
                                    </div>
                                    <div>
                                        <label className="label">Layout Code</label>
                                        <input type="text" value={form.layoutCode} onChange={e => updateField('layoutCode', e.target.value)}
                                            className="input-dark" placeholder="e.g. LC-01" />
                                    </div>
                                    <div>
                                        <label className="label">Base Price (₹)</label>
                                        <input type="number" min="0" step="0.01" value={form.basePrice} onChange={e => updateField('basePrice', e.target.value)}
                                            className="input-dark tabular-nums" placeholder="0.00" />
                                    </div>
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <label className="label">Description *</label>
                                    <textarea value={form.description} onChange={e => updateField('description', e.target.value)}
                                        className="input-dark" style={{ height: 100, resize: 'none' }}
                                        placeholder="Full specification paragraph..." />
                                </div>
                                <div style={{ marginBottom: 24, padding: 16, border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-elevated)' }}>
                                    <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                        <Upload size={14} /> Polar Diagram (Optional)
                                    </label>
                                    <input 
                                        type="file" 
                                        accept="image/png, image/jpeg, application/pdf"
                                        onChange={e => setPolarFile(e.target.files[0])}
                                        style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}
                                    />
                                    {editProduct?.polarDiagramUrl && !polarFile && (
                                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-accent)' }}>
                                            <a href={`http://localhost:5000${editProduct.polarDiagramUrl}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                                                View Current Polar Diagram
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <MultiCheckGroup label="Body Colour" options={BODY_COLOURS} selected={form.bodyColours} onChange={v => updateField('bodyColours', v)} />
                                <MultiCheckGroup label="Reflector Colour" options={REFLECTOR_COLOURS} selected={form.reflectorColours} onChange={v => updateField('reflectorColours', v)} />
                                <MultiCheckGroup label="Colour Temperature" options={COLOUR_TEMPS} selected={form.colourTemps} onChange={v => updateField('colourTemps', v)} />
                                <MultiCheckGroup label="Beam Angle" options={BEAM_ANGLES} selected={form.beamAngles} onChange={v => updateField('beamAngles', v)} />
                                <MultiCheckGroup label="CRI" options={CRI_OPTIONS} selected={form.cri} onChange={v => updateField('cri', v)} />

                                {/* Dynamic Custom Attributes */}
                                <div style={{ marginTop: 24, padding: 16, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
                                    <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                                        <label className="label" style={{ marginBottom: 0 }}>Extra Specifications (Optional)</label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('customAttributes', [...form.customAttributes, { key: '', value: '' }])}
                                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            <Plus size={12} /> Add Field
                                        </button>
                                    </div>
                                    
                                    {(!Array.isArray(form.customAttributes) || form.customAttributes.length === 0) ? (
                                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>No extra fields added. E.g. "Wattage", "Cutout", "Driver Type".</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {(Array.isArray(form.customAttributes) ? form.customAttributes : []).map((attr, idx) => (
                                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, alignItems: 'center' }}>
                                                    <input 
                                                        type="text" className="input-dark" placeholder="Field Name (e.g. Cutout)" 
                                                        value={attr.key} 
                                                        onChange={e => {
                                                            const newAttrs = [...form.customAttributes];
                                                            newAttrs[idx].key = e.target.value;
                                                            updateField('customAttributes', newAttrs);
                                                        }} 
                                                    />
                                                    <input 
                                                        type="text" className="input-dark" placeholder="Value (e.g. 75mm)" 
                                                        value={attr.value} 
                                                        onChange={e => {
                                                            const newAttrs = [...form.customAttributes];
                                                            newAttrs[idx].value = e.target.value;
                                                            updateField('customAttributes', newAttrs);
                                                        }} 
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => updateField('customAttributes', form.customAttributes.filter((_, i) => i !== idx))}
                                                        style={{ padding: 8, background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 justify-end" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
                                    <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                                    <button onClick={handleSave} disabled={saving} className="btn-primary">
                                        {saving ? 'Saving...' : editProduct ? 'Save Changes' : 'Create Product'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirm */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(7,12,24,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div variants={scaleIn} initial="hidden" animate="visible" exit="hidden"
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-xl)', padding: 32, maxWidth: 380, width: '90%', textAlign: 'center' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                            <h3 className="font-display" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Delete Product?</h3>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 24 }}>This will permanently remove the product from the library. Existing quotations using this product will not be affected (snapshots are preserved).</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setDeleteConfirm(null)} className="btn-ghost">Cancel</button>
                                <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '8px 20px', background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
