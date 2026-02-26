import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Eye, X, MapPin, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { fadeUp, staggerContainer, scaleIn, modalOverlay, modalContent, getAvatarColor, getInitials } from '../lib/animations';

export default function Clients() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [form, setForm] = useState({ name: '', company: '', address: '', city: '', state: '', pincode: '', email: '', phone: '' });

    useEffect(() => { loadClients(); }, []);

    const loadClients = async () => {
        try { const { data } = await api.get('/clients'); setClients(data); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        try {
            if (editingClient) {
                await api.put(`/clients/${editingClient.id}`, form);
                toast.success('Client updated');
            } else {
                await api.post('/clients', form);
                toast.success('Client created');
            }
            setShowModal(false); setEditingClient(null);
            setForm({ name: '', company: '', address: '', city: '', state: '', pincode: '', email: '', phone: '' });
            loadClients();
        } catch (err) { toast.error('Failed to save client'); }
    };

    const handleEdit = (client) => {
        setEditingClient(client);
        setForm({ name: client.name, company: client.company, address: client.address, city: client.city, state: client.state, pincode: client.pincode, email: client.email || '', phone: client.phone || '' });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this client?')) return;
        try { await api.delete(`/clients/${id}`); toast.success('Client deleted'); loadClients(); }
        catch (e) { toast.error('Failed to delete'); }
    };

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.city.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div style={{ padding: 32 }}>
                <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 24 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 160 }} />)}
                </div>
            </div>
        );
    }

    return (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center justify-between" style={{ marginBottom: 32 }}>
                <div>
                    <h1 className="font-display heading-underline" style={{ fontSize: '2.4rem', fontWeight: 700 }}>Clients</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 12 }}>Manage your client database</p>
                </div>
                <button onClick={() => { setEditingClient(null); setForm({ name: '', company: '', address: '', city: '', state: '', pincode: '', email: '', phone: '' }); setShowModal(true); }} className="btn-primary">
                    <Plus size={16} /> Add Client
                </button>
            </motion.div>

            {/* Search */}
            <motion.div variants={fadeUp} style={{ marginBottom: 24 }}>
                <div className="relative">
                    <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-accent)' }} />
                    <input type="text" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)}
                        className="input-dark" style={{ paddingLeft: 40, height: 44 }} />
                </div>
            </motion.div>

            {/* Client Cards Grid */}
            {filtered.length === 0 ? (
                <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: 80 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32 }}>
                        💡
                    </div>
                    <h3 className="font-display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>No clients found</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 16 }}>Add your first client to get started</p>
                    <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Add Client</button>
                </motion.div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {filtered.map((c, i) => (
                        <motion.div key={c.id} variants={fadeUp} custom={i} className="card-surface group" style={{ padding: 20, cursor: 'default' }}>
                            <div className="flex items-start gap-4">
                                {/* Avatar */}
                                <div style={{
                                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                    background: getAvatarColor(c.name), color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 15, fontWeight: 700
                                }}>
                                    {getInitials(c.name)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>{c.name}</div>
                                            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{c.company}</div>
                                        </div>
                                        {/* Actions — show on hover */}
                                        <div className="flex items-center gap-1" style={{ opacity: 0, transition: 'opacity 0.2s' }}>
                                            <Link to={`/clients/${c.id}`} style={{ padding: 6, borderRadius: 6, color: 'var(--color-text-muted)', display: 'flex', transition: 'all 0.15s' }}
                                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-info)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                                <Eye size={16} />
                                            </Link>
                                            <button onClick={() => handleEdit(c)} style={{ padding: 6, borderRadius: 6, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', transition: 'all 0.15s' }}
                                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} style={{ padding: 6, borderRadius: 6, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', transition: 'all 0.15s' }}
                                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 flex-wrap" style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>
                                        {c.city && <span className="flex items-center gap-1"><MapPin size={12} /> {c.city}</span>}
                                        {c.phone && <span className="flex items-center gap-1"><Phone size={12} /> {c.phone}</span>}
                                        {c.email && <span className="flex items-center gap-1"><Mail size={12} /> {c.email}</span>}
                                    </div>

                                    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                        Quotes: <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{c._count?.quotations || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div variants={modalOverlay} initial="hidden" animate="visible" exit="exit"
                        style={{ position: 'fixed', inset: 0, background: 'rgba(7,12,24,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div variants={modalContent} initial="hidden" animate="visible" exit="exit"
                            onClick={e => e.stopPropagation()}
                            style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)', borderTop: '2px solid var(--color-accent)', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 520, boxShadow: '0 20px 80px rgba(0,0,0,0.5)' }}
                        >
                            <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
                                <h3 className="font-display" style={{ fontSize: 22, fontWeight: 600 }}>{editingClient ? 'Edit' : 'New'} Client</h3>
                                <button onClick={() => setShowModal(false)} style={{ padding: 8, borderRadius: 8, background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {[
                                    { key: 'name', label: 'Full Name', span: 1 },
                                    { key: 'company', label: 'Company', span: 1 },
                                    { key: 'address', label: 'Address', span: 2 },
                                    { key: 'city', label: 'City', span: 1 },
                                    { key: 'state', label: 'State', span: 1 },
                                    { key: 'pincode', label: 'Pincode', span: 1 },
                                    { key: 'phone', label: 'Phone', span: 1 },
                                    { key: 'email', label: 'Email', span: 2 },
                                ].map(f => (
                                    <div key={f.key} style={{ gridColumn: f.span === 2 ? 'span 2' : 'auto' }}>
                                        <label className="label">{f.label}</label>
                                        <input type={f.key === 'email' ? 'email' : 'text'} value={form[f.key]}
                                            onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="input-dark" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3" style={{ marginTop: 24 }}>
                                <button onClick={() => setShowModal(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button onClick={handleSave} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Save Client</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CSS for hover-reveal actions */}
            <style>{`.group:hover .flex.items-center.gap-1 { opacity: 1 !important; }`}</style>
        </motion.div>
    );
}
