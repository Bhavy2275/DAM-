import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, Landmark, FileText, Users, Plus, Trash2, Save, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { fadeUp, staggerContainer, modalOverlay, modalContent } from '../lib/animations';
import { useAuth } from '../hooks/useAuth';

const TABS = [
    { key: 'company', label: 'Company Info', icon: Building },
    { key: 'bank', label: 'Bank Details', icon: Landmark },
    { key: 'terms', label: 'Terms & Conditions', icon: FileText },
    { key: 'users', label: 'User Management', icon: Users },
];

export default function Settings() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('company');
    const [settings, setSettings] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '', role: 'STAFF' });

    useEffect(() => { loadSettings(); loadUsers(); }, []);

    const loadSettings = async () => {
        try { const { data } = await api.get('/settings'); setSettings(data); }
        catch (e) { }
        finally { setLoading(false); }
    };

    const loadUsers = async () => { try { const { data } = await api.get('/users'); setUsers(data); } catch (e) { } };

    const handleSave = async () => {
        try { await api.put('/settings', settings); toast.success('Settings saved'); }
        catch (err) { toast.error('Failed to save'); }
    };

    const handleInvite = async () => {
        try { await api.post('/users/invite', inviteForm); toast.success('User created'); setShowInviteModal(false); setInviteForm({ name: '', email: '', password: '', role: 'STAFF' }); loadUsers(); }
        catch (err) { toast.error(err.response?.data?.error || 'Failed to create user'); }
    };

    const handleDeleteUser = async (uid) => {
        if (!confirm('Delete user?')) return;
        try { await api.delete(`/users/${uid}`); toast.success('User deleted'); loadUsers(); }
        catch (err) { toast.error('Failed to delete'); }
    };

    const handleRoleChange = async (uid, role) => {
        try { await api.put(`/users/${uid}/role`, { role }); toast.success('Role updated'); loadUsers(); }
        catch (err) { toast.error('Failed to update'); }
    };

    const handleDownloadBackup = async () => {
        try {
            const response = await api.get('/settings/backup', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `DAM-backup-${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            toast.success('Backup downloaded');
        } catch (err) {
            toast.error('Failed to download backup');
        }
    };

    if (loading) return <div style={{ padding: 32 }}><div className="skeleton" style={{ height: 400 }} /></div>;

    return (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
            <motion.div variants={fadeUp} style={{ marginBottom: 32 }}>
                <h1 className="font-display heading-underline" style={{ fontSize: '2.4rem', fontWeight: 700 }}>Settings</h1>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 12 }}>Configure your workspace</p>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24 }}>
                {/* Tab Nav */}
                <motion.div variants={fadeUp} className="space-y-1">
                    {TABS.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className="flex items-center gap-2 w-full"
                            style={{
                                padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                                background: activeTab === tab.key ? 'var(--color-accent-glow)' : 'transparent',
                                color: activeTab === tab.key ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                borderLeft: activeTab === tab.key ? '3px solid var(--color-accent)' : '3px solid transparent',
                                fontSize: 13, fontWeight: 500, textAlign: 'left', transition: 'all 0.2s',
                                boxShadow: activeTab === tab.key ? 'inset 0 0 30px var(--color-accent-glow)' : 'none'
                            }}>
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}

                    {user?.role === 'ADMIN' && (
                        <button onClick={handleDownloadBackup}
                            className="flex items-center gap-2 w-full"
                            style={{
                                marginTop: 24, padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border)',
                                cursor: 'pointer', background: 'transparent', color: 'var(--color-text-secondary)',
                                fontSize: 13, fontWeight: 500, textAlign: 'left', transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
                            <Download size={16} /> Download Backup
                        </button>
                    )}
                </motion.div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>

                        {activeTab === 'company' && settings && (
                            <div className="card-surface" style={{ padding: 32, cursor: 'default' }}>
                                <h3 className="font-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Company Information</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    {[
                                        { key: 'companyName', label: 'Company Name' },
                                        { key: 'gstNumber', label: 'GST Number' },
                                        { key: 'address', label: 'Address' },
                                        { key: 'phone', label: 'Phone' },
                                        { key: 'email', label: 'Email' },
                                        { key: 'website', label: 'Website' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label htmlFor={`settings-${f.key}`} className="label">{f.label}</label>
                                            <input id={`settings-${f.key}`} name={f.key} type="text" value={settings[f.key] || ''} onChange={e => setSettings({ ...settings, [f.key]: e.target.value })} className="input-dark" />
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleSave} className="btn-primary" style={{ marginTop: 24 }}><Save size={16} /> Save Changes</button>
                            </div>
                        )}

                        {activeTab === 'bank' && settings && (
                            <div className="card-surface" style={{ padding: 32, cursor: 'default' }}>
                                <h3 className="font-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Bank Details</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    {[
                                        { key: 'accountName', label: 'Account Name' },
                                        { key: 'bankName', label: 'Bank Name' },
                                        { key: 'accountNumber', label: 'Account Number' },
                                        { key: 'ifscCode', label: 'IFSC Code' },
                                        { key: 'bankAddress', label: 'Bank Address' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label htmlFor={`settings-${f.key}`} className="label">{f.label}</label>
                                            <input id={`settings-${f.key}`} name={f.key} type="text" value={settings[f.key] || ''} onChange={e => setSettings({ ...settings, [f.key]: e.target.value })} className="input-dark" />
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleSave} className="btn-primary" style={{ marginTop: 24 }}><Save size={16} /> Save Changes</button>
                            </div>
                        )}

                        {activeTab === 'terms' && settings && (
                            <div className="card-surface" style={{ padding: 32, cursor: 'default' }}>
                                <h3 className="font-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Default Terms & Conditions</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="settings-defaultGst" className="label">Default GST Rate (%)</label>
                                        <input id="settings-defaultGst" name="defaultGst" type="number" value={settings.defaultGst || ''} onChange={e => setSettings({ ...settings, defaultGst: parseFloat(e.target.value) || 0 })} className="input-dark" style={{ width: 120 }} />
                                    </div>
                                    <div>
                                        <label htmlFor="settings-defaultTerms" className="label">Default Terms</label>
                                        <textarea id="settings-defaultTerms" name="defaultTerms" value={settings.defaultTerms || ''} onChange={e => setSettings({ ...settings, defaultTerms: e.target.value })} className="input-dark" style={{ height: 260, resize: 'none' }} />
                                    </div>
                                </div>
                                <button onClick={handleSave} className="btn-primary" style={{ marginTop: 24 }}><Save size={16} /> Save Changes</button>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="card-surface" style={{ overflow: 'hidden', cursor: 'default' }}>
                                <div className="flex items-center justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                                    <h3 className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>Team Members</h3>
                                    <button onClick={() => setShowInviteModal(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}><Plus size={14} /> Invite</button>
                                </div>
                                <table className="dark-table">
                                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id}>
                                                <td style={{ fontWeight: 600 }}>{u.name}</td>
                                                <td style={{ color: 'var(--color-text-secondary)' }}>{u.email}</td>
                                                <td>
                                                    <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} disabled={u.id === user?.id}
                                                        className="input-dark" style={{ padding: '4px 8px', fontSize: 12, width: 100 }}>
                                                        <option value="ADMIN">Admin</option>
                                                        <option value="MEMBER">Member</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    {u.id !== user?.id && (
                                                        <button onClick={() => handleDeleteUser(u.id)} style={{ padding: 6, borderRadius: 6, background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Invite Modal */}
            <AnimatePresence>
                {showInviteModal && (
                    <motion.div variants={modalOverlay} initial="hidden" animate="visible" exit="exit"
                        style={{ position: 'fixed', inset: 0, background: 'rgba(7,12,24,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setShowInviteModal(false)}>
                        <motion.div variants={modalContent} initial="hidden" animate="visible" exit="exit" onClick={e => e.stopPropagation()}
                            style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)', borderTop: '2px solid var(--color-accent)', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 20px 80px rgba(0,0,0,0.5)' }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
                                <h3 className="font-display" style={{ fontSize: 20, fontWeight: 600 }}>Invite User</h3>
                                <button onClick={() => setShowInviteModal(false)} style={{ padding: 6, background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                            <div className="space-y-3">
                                <div><label htmlFor="invite-name" className="label">Name</label><input id="invite-name" name="name" type="text" value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} className="input-dark" autoComplete="off" /></div>
                                <div><label htmlFor="invite-email" className="label">Email</label><input id="invite-email" name="email" type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} className="input-dark" autoComplete="off" /></div>
                                <div><label htmlFor="invite-password" className="label">Password</label><input id="invite-password" name="password" type="password" value={inviteForm.password} onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })} className="input-dark" autoComplete="new-password" /></div>
                                <div><label htmlFor="invite-role" className="label">Role</label><select id="invite-role" name="role" value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })} className="input-dark"><option value="ADMIN">Admin</option><option value="STAFF">Staff</option></select></div>
                            </div>
                            <div className="flex gap-3" style={{ marginTop: 24 }}>
                                <button onClick={() => setShowInviteModal(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button onClick={handleInvite} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Send Invite</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
