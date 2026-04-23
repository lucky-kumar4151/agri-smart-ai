import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { useToast } from '../components/Toast';

const STATES = ['Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab',
    'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal'];

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const toast = useToast();
    const [form, setForm] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        language: user?.language || 'en',
        location: {
            state: user?.location?.state || '',
            district: user?.location?.district || '',
            city: user?.location?.city || '',
        },
        farm_details: {
            farm_size: user?.farm_details?.farm_size || '',
            farm_size_unit: user?.farm_details?.farm_size_unit || 'acres',
            crops: user?.farm_details?.crops || [],
            soil_type: user?.farm_details?.soil_type || '',
            irrigation_type: user?.farm_details?.irrigation_type || '',
        },
    });

    const handleSave = async () => {
        setLoading(true); setError(''); setSuccess('');
        try {
            await authAPI.updateProfile(form);
            updateUser(form);
            setSuccess('Profile updated successfully!');
            toast.success('Profile updated successfully!');
            setEditing(false);
        } catch (err) {
            const msg = err.response?.data?.detail || 'Failed to update profile.';
            setError(msg);
            toast.error(msg);
        } finally { setLoading(false); }
    };

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <h1>👤 My Profile</h1>
                <p>Manage your account details and farm information</p>
            </div>

            {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}
            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 20 }}>
                {/* Profile Info */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 28, fontWeight: 700, color: 'white'
                        }}>
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{user?.name || 'Farmer'}</h2>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.email}</p>
                            <span className="badge badge-success" style={{ marginTop: 4, textTransform: 'capitalize' }}>
                                {user?.role || 'farmer'}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        <button
                            className={`btn ${editing ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                            onClick={() => setEditing(!editing)}
                        >
                            {editing ? 'Cancel' : '✏️ Edit Profile'}
                        </button>
                    </div>

                    <div style={{ display: 'grid', gap: 14 }}>
                        <div className="input-group">
                            <label>Full Name</label>
                            <input className="input-field" value={form.name}
                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                disabled={!editing} />
                        </div>
                        <div className="input-group">
                            <label>Phone</label>
                            <input className="input-field" value={form.phone}
                                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                disabled={!editing} />
                        </div>
                        <div className="input-group">
                            <label>Language</label>
                            <select className="input-field" value={form.language}
                                onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                                disabled={!editing}>
                                <option value="en">English</option>
                                <option value="hi">Hindi</option>
                                <option value="pa">Punjabi</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Farm Details */}
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>🌾 Farm Details</h3>

                    <div style={{ display: 'grid', gap: 14 }}>
                        <div className="input-group">
                            <label>State</label>
                            <select className="input-field"
                                value={form.location.state}
                                onChange={e => setForm(p => ({ ...p, location: { ...p.location, state: e.target.value } }))}
                                disabled={!editing}>
                                <option value="">Select State</option>
                                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                            <div className="input-group">
                                <label>District</label>
                                <input className="input-field" value={form.location.district}
                                    onChange={e => setForm(p => ({ ...p, location: { ...p.location, district: e.target.value } }))}
                                    disabled={!editing} />
                            </div>
                            <div className="input-group">
                                <label>City / Village</label>
                                <input className="input-field" value={form.location.city}
                                    onChange={e => setForm(p => ({ ...p, location: { ...p.location, city: e.target.value } }))}
                                    disabled={!editing} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                            <div className="input-group">
                                <label>Farm Size</label>
                                <input className="input-field" type="number" value={form.farm_details.farm_size}
                                    onChange={e => setForm(p => ({ ...p, farm_details: { ...p.farm_details, farm_size: e.target.value } }))}
                                    disabled={!editing} />
                            </div>
                            <div className="input-group">
                                <label>Unit</label>
                                <select className="input-field" value={form.farm_details.farm_size_unit}
                                    onChange={e => setForm(p => ({ ...p, farm_details: { ...p.farm_details, farm_size_unit: e.target.value } }))}
                                    disabled={!editing}>
                                    <option value="acres">Acres</option>
                                    <option value="hectares">Hectares</option>
                                    <option value="bigha">Bigha</option>
                                </select>
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Soil Type</label>
                            <select className="input-field" value={form.farm_details.soil_type}
                                onChange={e => setForm(p => ({ ...p, farm_details: { ...p.farm_details, soil_type: e.target.value } }))}
                                disabled={!editing}>
                                <option value="">Select Soil Type</option>
                                {['Alluvial', 'Black (Regur)', 'Red', 'Laterite', 'Sandy', 'Clay', 'Loamy', 'Saline'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Irrigation Type</label>
                            <select className="input-field" value={form.farm_details.irrigation_type}
                                onChange={e => setForm(p => ({ ...p, farm_details: { ...p.farm_details, irrigation_type: e.target.value } }))}
                                disabled={!editing}>
                                <option value="">Select Type</option>
                                {['Canal', 'Tube Well', 'Open Well', 'Drip', 'Sprinkler', 'Rain-fed'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {editing && (
                        <button
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%', marginTop: 20 }}
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : '💾 Save Changes'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
