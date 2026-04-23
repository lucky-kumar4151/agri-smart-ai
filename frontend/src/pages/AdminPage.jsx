import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { weatherAPI } from '../services/api';
import { authAPI } from '../services/api';
import { useToast } from '../components/Toast';

const STATES = ['Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab',
  'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal'];

export default function AdminPage() {
  const { user, updateUser } = useAuth();
  const [params] = useSearchParams();
  const sec = params.get('s') || 'dashboard';
  const toast = useToast();

  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [chatbotStats, setChatbotStats] = useState(null);
  const [recentActivity, setRecent] = useState([]);
  const [chatLogs, setChatLogs] = useState([]);
  const [feedbackList, setFeedback] = useState([]);
  const [sysSettings, setSysSets] = useState({});
  const [weatherCity, setWCity] = useState('Delhi');
  const [weatherData, setWData] = useState(null);
  const [marketCrop, setMCrop] = useState('wheat');
  const [marketData, setMData] = useState(null);
  const [stateFilter, setStateF] = useState('');
  const [cropFilter, setCropF] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  // Profile
  const [profEdit, setProfEdit] = useState(false);
  const [profLoading, setProfLoad] = useState(false);
  const [profSuccess, setProfOK] = useState('');
  const [profError, setProfErr] = useState('');
  const [profForm, setProfForm] = useState({
    name: user?.name || '', phone: user?.phone || '', language: user?.language || 'en',
    location: { state: user?.location?.state || '', city: user?.location?.city || '', district: user?.location?.district || '' },
  });

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (sec === 'chatbot-monitoring' && chatLogs.length === 0)
      api.get('/dashboard/admin/chatbot-logs?limit=100').then(r => setChatLogs(r.data?.logs || [])).catch(() => { });
    if (sec === 'feedback' && feedbackList.length === 0)
      api.get('/feedback?limit=100').then(r => setFeedback(r.data?.feedback || [])).catch(() => { });
    if (sec === 'settings')
      api.get('/dashboard/admin/settings').then(r => setSysSets(r.data?.settings || {})).catch(() => { });
  }, [sec]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sR, uR, cR, aR] = await Promise.all([
        api.get('/dashboard/admin/stats'),
        api.get('/dashboard/admin/users'),
        api.get('/dashboard/admin/chatbot-stats'),
        api.get('/dashboard/admin/recent-activity'),
      ]);
      setStats(sR.data || {});
      setUsers(uR.data?.users || []);
      setChatbotStats(cR.data);
      setRecent(aR.data?.activities || []);
    } catch { }
    setLoading(false);
  };

  const loadUsers = async () => {
    const p = new URLSearchParams();
    if (stateFilter) p.append('state', stateFilter);
    if (cropFilter) p.append('crop', cropFilter);
    try { const r = await api.get(`/dashboard/admin/users?${p}`); setUsers(r.data?.users || []); } catch { }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user and all their data? This cannot be undone.')) return;
    setBusy(id);
    try { await api.delete(`/dashboard/admin/users/${id}`); setUsers(p => p.filter(u => u._id !== id)); }
    catch (e) { toast.error('Failed: ' + (e.response?.data?.detail || e.message)); }
    setBusy('');
  };

  const toggleRole = async (id) => {
    setBusy(id);
    try { const r = await api.put(`/dashboard/admin/users/${id}/role`); setUsers(p => p.map(u => u._id === id ? { ...u, role: r.data.new_role } : u)); }
    catch (e) { toast.error('Failed: ' + (e.response?.data?.detail || e.message)); }
    setBusy('');
  };

  const deleteFeedback = async (id) => {
    try { await api.delete(`/dashboard/admin/feedback/${id}`); setFeedback(p => p.filter(f => f._id !== id)); toast.success('Feedback deleted.'); }
    catch { toast.error('Failed to delete'); }
  };

  const saveSettings = async () => {
    try { await api.put('/dashboard/admin/settings', sysSettings); toast.success('Settings saved!'); }
    catch { toast.error('Failed to save settings'); }
  };

  const saveProfile = async () => {
    setProfLoad(true); setProfErr(''); setProfOK('');
    try { await authAPI.updateProfile(profForm); updateUser(profForm); setProfOK('Profile updated!'); toast.success('Profile updated!'); setProfEdit(false); }
    catch (e) { setProfErr(e.response?.data?.detail || 'Failed to update.'); }
    setProfLoad(false);
  };

  const fetchWeather = async () => {
    if (!weatherCity.trim()) return;
    try {
      const r = await weatherAPI.getCurrent(weatherCity);
      setWData(r.data.error ? { error: true, msg: r.data.error } : r.data);
    } catch (e) { setWData({ error: true, msg: e.response?.data?.detail || 'City not found.' }); }
  };

  const fetchMarket = async () => {
    try { const r = await api.get(`/market-prices?crop=${marketCrop}`); setMData(r.data); }
    catch { setMData({ error: true }); }
  };

  const filtered = users.filter(u => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.location?.city?.toLowerCase().includes(q);
  });

  const fmtId = id => (id ? id.toString().slice(-7).toUpperCase() : '0000000');
  const ago = ts => {
    if (!ts) return 'N/A';
    const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  // ── Reusable helpers ───────────────────────────────────
  const StatCard = ({ title, value, sub, color = 'var(--primary)' }) => (
    <div className="card" style={{ padding: 20, borderTop: `3px solid ${color}` }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>{title}</p>
      <p style={{ fontSize: 32, fontWeight: 800, color, marginBottom: 4 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );

  const Btn = ({ children, onClick, primary, danger, small, disabled }) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '5px 12px' : '8px 18px', borderRadius: 8,
      fontSize: small ? 12 : 13, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', fontFamily: 'Inter',
      background: danger ? '#e53935' : primary ? 'var(--primary)' : '#f0f5f0',
      color: (danger || primary) ? 'white' : 'var(--primary)',
      opacity: disabled ? 0.5 : 1, transition: 'all 0.15s',
    }}>{children}</button>
  );

  const TH = ({ children }) => (
    <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-input)', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );
  const TD = ({ children, style }) => (
    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)', ...style }}>
      {children}
    </td>
  );

  const SH = ({ title, right }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a2e1a', fontFamily: 'Outfit', margin: 0 }}>{title}</h2>
      {right}
    </div>
  );

  const Field = ({ label, value, onChange, type = 'text', disabled, as: As = 'input', children, placeholder }) => (
    <div className="input-group">
      <label style={{ fontSize: 13, fontWeight: 600 }}>{label}</label>
      {As === 'select'
        ? <select className="input-field" value={value} onChange={onChange} disabled={disabled}>{children}</select>
        : <input className="input-field" type={type} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} />}
    </div>
  );

  // ── Static Datasets ─────────────────────────────────────
  const CROPS = [
    { name: 'Rice', ph: '5.5–6.5', n: '80–120 kg/ha', temp: '20–35°C', water: 'High' },
    { name: 'Wheat', ph: '6.0–7.5', n: '60–80 kg/ha', temp: '12–25°C', water: 'Medium' },
    { name: 'Maize', ph: '5.8–7.0', n: '80–120 kg/ha', temp: '18–30°C', water: 'Medium' },
    { name: 'Sugarcane', ph: '6.0–8.0', n: '150–250 kg/ha', temp: '25–35°C', water: 'High' },
    { name: 'Cotton', ph: '5.5–8.0', n: '40–60 kg/ha', temp: '20–30°C', water: 'Medium' },
    { name: 'Soybean', ph: '6.0–7.0', n: '20–40 kg/ha', temp: '20–30°C', water: 'Medium' },
    { name: 'Potato', ph: '5.0–6.5', n: '80–120 kg/ha', temp: '15–25°C', water: 'Medium' },
    { name: 'Tomato', ph: '6.0–7.0', n: '100–150 kg/ha', temp: '18–30°C', water: 'Medium' },
    { name: 'Onion', ph: '6.0–7.0', n: '80–100 kg/ha', temp: '13–24°C', water: 'Medium' },
    { name: 'Chickpea', ph: '6.0–8.0', n: '10–20 kg/ha', temp: '15–25°C', water: 'Low' },
    { name: 'Mustard', ph: '6.0–7.5', n: '60–80 kg/ha', temp: '10–25°C', water: 'Low' },
    { name: 'Groundnut', ph: '5.5–7.0', n: '20–30 kg/ha', temp: '20–30°C', water: 'Medium' },
  ];

  const DISEASES = [
    { name: 'Apple Scab', crop: 'Apple', pathogen: 'Venturia inaequalis', type: 'Fungal' },
    { name: 'Apple Black Rot', crop: 'Apple', pathogen: 'Botryosphaeria obtusa', type: 'Fungal' },
    { name: 'Cedar Apple Rust', crop: 'Apple', pathogen: 'Gymnosporangium juniperi', type: 'Fungal' },
    { name: 'Cercospora Leaf Spot', crop: 'Corn', pathogen: 'Cercospora zeae-maydis', type: 'Fungal' },
    { name: 'Common Rust', crop: 'Corn', pathogen: 'Puccinia sorghi', type: 'Fungal' },
    { name: 'Northern Leaf Blight', crop: 'Corn', pathogen: 'Exserohilum turcicum', type: 'Fungal' },
    { name: 'Grape Black Rot', crop: 'Grape', pathogen: 'Guignardia bidwellii', type: 'Fungal' },
    { name: 'Esca (Black Measles)', crop: 'Grape', pathogen: 'Pleurostomophora richardsiae', type: 'Fungal' },
    { name: 'Leaf Blight', crop: 'Grape', pathogen: 'Isariopsis clavispora', type: 'Fungal' },
    { name: 'Citrus Greening (HLB)', crop: 'Orange', pathogen: 'Candidatus Liberibacter', type: 'Bacterial' },
    { name: 'Early Blight', crop: 'Potato', pathogen: 'Alternaria solani', type: 'Fungal' },
    { name: 'Late Blight', crop: 'Potato', pathogen: 'Phytophthora infestans', type: 'Oomycete' },
    { name: 'Bacterial Spot', crop: 'Tomato', pathogen: 'Xanthomonas spp.', type: 'Bacterial' },
    { name: 'Early Blight', crop: 'Tomato', pathogen: 'Alternaria solani', type: 'Fungal' },
    { name: 'Late Blight', crop: 'Tomato', pathogen: 'Phytophthora infestans', type: 'Oomycete' },
    { name: 'Leaf Mold', crop: 'Tomato', pathogen: 'Passalora fulva', type: 'Fungal' },
    { name: 'Septoria Leaf Spot', crop: 'Tomato', pathogen: 'Septoria lycopersici', type: 'Fungal' },
    { name: 'Spider Mites', crop: 'Tomato', pathogen: 'Tetranychus urticae', type: 'Mite' },
    { name: 'Target Spot', crop: 'Tomato', pathogen: 'Corynespora cassiicola', type: 'Fungal' },
    { name: 'Yellow Leaf Curl Virus', crop: 'Tomato', pathogen: 'TYLCV (Begomovirus)', type: 'Viral' },
    { name: 'Mosaic Virus', crop: 'Tomato', pathogen: 'Tomato mosaic virus', type: 'Viral' },
    { name: 'Powdery Mildew', crop: 'Squash', pathogen: 'Podosphaera xanthii', type: 'Fungal' },
    { name: 'Powdery Mildew', crop: 'Cherry', pathogen: 'Podosphaera clandestina', type: 'Fungal' },
    { name: 'Bacterial Spot', crop: 'Peach', pathogen: 'Xanthomonas arboricola', type: 'Bacterial' },
    { name: 'Bacterial Spot', crop: 'Pepper', pathogen: 'Xanthomonas campestris', type: 'Bacterial' },
    { name: 'Leaf Scorch', crop: 'Strawberry', pathogen: 'Diplocarpon earlianum', type: 'Fungal' },
  ];

  // ══════════════════════════════════════════════════════
  // SECTION RENDERS
  // ══════════════════════════════════════════════════════

  const renderDashboard = () => (
    <div className="animate-fadeIn">
      <SH title="Admin Dashboard" right={<Btn onClick={loadAll} small>↻ Refresh</Btn>} />
      <div className="admin-stats-grid" style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
        <StatCard title="👨‍🌾 Total Farmers" value={stats.total_farmers || 0} sub={`+${stats.new_this_month || 0} this month`} color="#2d7a3a" />
        <StatCard title="💬 Chatbot Queries" value={stats.chatbot_queries_month || 0} sub={`${stats.today_queries || 0} today`} color="#1565c0" />
        <StatCard title="🌾 Crop Predictions" value={stats.total_predictions || 0} sub={`${stats.crop_predictions_today || 0} today`} color="#7b1fa2" />
        <StatCard title="🔬 Disease Detections" value={stats.total_disease_detections || 0} sub="AI + YOLO powered" color="#e65100" />
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', fontWeight: 800, fontSize: 17, color: '#1a2e1a', display: 'flex', alignItems: 'center', gap: 8 }}>
          📋 Recent Platform Activity
        </div>
        {(recentActivity.length > 0
          ? recentActivity
          : [{ text: 'No recent activity yet.', time: '' }]
        ).map((a, i) => {
          const accent = ['#2d7a3a', '#1565c0', '#7b1fa2', '#e65100', '#e53935'][i % 5];
          // Pick emoji based on activity text content
          const emoji =
            a.text?.toLowerCase().includes('disease') ? '🔬' :
            a.text?.toLowerCase().includes('crop')   ? '🌾' :
            a.text?.toLowerCase().includes('chat')   ? '💬' :
            a.text?.toLowerCase().includes('weather')? '🌤️' :
            a.text?.toLowerCase().includes('market') ? '📊' :
            a.text?.toLowerCase().includes('farmer') ? '👨‍🌾' :
            a.text?.toLowerCase().includes('admin')  ? '🛡️' : '📋';
          return (
            <div key={i} style={{
              padding: '13px 20px', borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border-light)' : 'none',
              display: 'flex', alignItems: 'center', gap: 14,
              borderLeft: `3px solid ${accent}`, transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, background: `${accent}14`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>{emoji}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2e1a', margin: 0 }}>{a.text}</p>
                {a.time && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{ago(a.time)}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFarmers = () => (
    <div className="animate-fadeIn">
      <SH title="👨‍🌾 Farmers Management" right={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={stateFilter} onChange={e => setStateF(e.target.value)} className="input-field" style={{ width: 140, padding: '6px 10px', fontSize: 12 }}>
            <option value="">All States</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={cropFilter} onChange={e => setCropF(e.target.value)} className="input-field" style={{ width: 130, padding: '6px 10px', fontSize: 12 }}>
            <option value="">All Crops</option>
            {['Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Soybean', 'Potato', 'Tomato'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Btn onClick={loadUsers} small>Apply Filter</Btn>
          <div style={{ position: 'relative' }}>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search farmers…" className="input-field" style={{ paddingLeft: 32, width: 190, fontSize: 12 }} />
            <svg style={{ position: 'absolute', left: 10, top: 9 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a9a7a" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          </div>
          <Btn primary small onClick={async () => {
            try {
              const r = await api.get('/dashboard/admin/users/export-csv', { responseType: 'blob' });
              const url = URL.createObjectURL(new Blob([r.data]));
              const a = document.createElement('a'); a.href = url; a.download = 'farmers.csv'; a.click();
            } catch { alert('Export failed'); }
          }}>⬇ Export CSV</Btn>
        </div>
      } />
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['ID', 'Name', 'Email', 'Phone', 'Location', 'Crops', 'Role', 'Actions'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading farmers…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No farmers found.</td></tr>
              ) : filtered.map((f, i) => {
                const crops = Array.isArray(f.farm_details?.crops) ? f.farm_details.crops.slice(0, 2).join(', ') : (f.farm_details?.crops || '—');
                const loc = [f.location?.city, f.location?.state].filter(Boolean).join(', ') || '—';
                return (
                  <tr key={i} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <TD><code style={{ fontSize: 11, background: '#f0f5f0', padding: '2px 6px', borderRadius: 4 }}>{fmtId(f._id)}</code></TD>
                    <TD>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: f.role === 'admin' ? '#e53935' : 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{f.name?.charAt(0)?.toUpperCase() || '?'}</div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#1a2e1a' }}>{f.name || 'Unknown'}</span>
                      </div>
                    </TD>
                    <TD style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.email}</TD>
                    <TD>{f.phone || '—'}</TD>
                    <TD>{loc}</TD>
                    <TD><span className="badge badge-success" style={{ fontSize: 11 }}>{crops || '—'}</span></TD>
                    <TD><span className={`badge ${f.role === 'admin' ? 'badge-error' : 'badge-success'}`} style={{ textTransform: 'uppercase', fontSize: 10 }}>{f.role}</span></TD>
                    <TD>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn small onClick={() => toggleRole(f._id)} disabled={busy === f._id}>{f.role === 'admin' ? 'Make Farmer' : 'Make Admin'}</Btn>
                        <Btn small danger onClick={() => deleteUser(f._id)} disabled={busy === f._id}>🗑 Delete</Btn>
                      </div>
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCropDataset = () => (
    <div className="animate-fadeIn">
      <SH title="🌾 Crop Dataset" right={<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{CROPS.length} crops</span>} />
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Crop Name', 'Soil pH', 'Nitrogen Req.', 'Temperature', 'Water Need'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {CROPS.map((c, i) => (
                <tr key={i} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <TD style={{ fontWeight: 700, color: '#1a2e1a' }}>{c.name}</TD>
                  <TD>{c.ph}</TD>
                  <TD>{c.n}</TD>
                  <TD>{c.temp}</TD>
                  <TD><span className={`badge ${c.water === 'High' ? 'badge-error' : c.water === 'Low' ? 'badge-warning' : 'badge-success'}`}>{c.water}</span></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDiseaseDataset = () => (
    <div className="animate-fadeIn">
      <SH title="🔬 Disease Dataset" right={<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>PlantVillage — {DISEASES.length} classes</span>} />
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Disease Name', 'Affected Crop', 'Pathogen', 'Type'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {DISEASES.map((d, i) => (
                <tr key={i} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <TD style={{ fontWeight: 600, color: d.name.startsWith('Healthy') ? '#2d7a3a' : '#c62828' }}>{d.name}</TD>
                  <TD>{d.crop}</TD>
                  <TD style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 12 }}>{d.pathogen}</TD>
                  <TD><span className={`badge ${d.type === 'Bacterial' ? 'badge-error' : d.type === 'Viral' ? 'badge-warning' : d.type === 'Mite' ? 'badge-warning' : 'badge-success'}`}>{d.type}</span></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderWeather = () => (
    <div className="animate-fadeIn">
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a2e1a', fontFamily: 'Outfit', margin: 0 }}>🌤️ Weather</h2>
      </div>

      {/* Search bar — rendered directly (NOT inside a helper component) to prevent focus loss */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <input
            value={weatherCity}
            onChange={e => setWCity(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchWeather()}
            placeholder="Enter city name…"
            className="input-field"
            style={{ paddingLeft: 36, width: '100%' }}
            autoComplete="off"
          />
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7a9a7a" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        </div>
        <Btn onClick={() => fetchWeather()} primary>🔍 Get Weather</Btn>
      </div>

      {/* City quick-pick */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {['Delhi', 'Mumbai', 'Chandigarh', 'Jaipur', 'Lucknow', 'Bengaluru', 'Hyderabad', 'Patna', 'Ludhiana'].map(c => (
          <button key={c} onClick={() => { setWCity(c); fetchWeather(); }}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              border: `1px solid ${weatherCity === c ? '#2d7a3a' : 'var(--border)'}`,
              background: weatherCity === c ? '#e8f5e9' : 'white',
              color: weatherCity === c ? '#2d7a3a' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}>📍 {c}</button>
        ))}
      </div>

      {!weatherData ? (
        <div className="card" style={{ padding: 64, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🌤️</p>
          <p style={{ fontSize: 14, fontWeight: 600 }}>Search for a city to see live weather</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>Powered by Open-Meteo — free, no API key needed</p>
        </div>
      ) : weatherData.error ? (
        <div className="alert alert-error">❌ {weatherData.msg || 'Could not fetch weather. Try another city name.'}</div>
      ) : (
        <div className="admin-weather-grid" style={{ display: 'grid', gap: 14 }}>
          <StatCard title="🌡️ Temperature" value={`${weatherData.temperature ?? '--'}°C`} sub={weatherData.description || ''} color="#e65100" />
          <StatCard title="💧 Humidity" value={`${weatherData.humidity ?? '--'}%`} sub={`Feels like ${weatherData.feels_like ?? '--'}°C`} color="#1565c0" />
          <StatCard title="🌬️ Wind Speed" value={`${weatherData.wind_speed ?? '--'} km/h`} sub={`${weatherData.city || weatherCity}${weatherData.state ? ', ' + weatherData.state : ''}`} color="#2d7a3a" />
        </div>
      )}
    </div>
  );

  const renderMarket = () => (
    <div className="animate-fadeIn">
      <SH title="📈 Market Prices" right={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={marketCrop} onChange={e => setMCrop(e.target.value)} className="input-field" style={{ width: 170 }}>
            {['wheat', 'rice', 'maize', 'cotton', 'sugarcane', 'soybean', 'potato', 'tomato', 'onion'].map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <Btn onClick={fetchMarket} primary>Fetch Prices</Btn>
        </div>
      } />
      {!marketData ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>📈</p>
          <p style={{ fontSize: 14 }}>Select a crop and click Fetch to see current mandi prices.</p>
        </div>
      ) : marketData.error ? (
        <div className="alert alert-error">❌ Failed to fetch prices. Please try again.</div>
      ) : marketData.prices && Array.isArray(marketData.prices) ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Market', 'State', 'Min (₹/qtl)', 'Max (₹/qtl)', 'Modal (₹/qtl)'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {marketData.prices.slice(0, 15).map((p, i) => (
                <tr key={i} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <TD style={{ fontWeight: 600 }}>{p.market || p.district || '—'}</TD>
                  <TD>{p.state || '—'}</TD>
                  <TD>₹{p.min_price ?? '—'}</TD>
                  <TD>₹{p.max_price ?? '—'}</TD>
                  <TD style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{p.modal_price ?? '—'}</TD>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Data: {JSON.stringify(marketData).slice(0, 200)}</p>
      )}
    </div>
  );

  const renderChatbotMonitor = () => (
    <div className="animate-fadeIn">
      <SH title="💬 Chatbot Monitoring" right={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{chatLogs.length} logs</span>
          <Btn onClick={() => api.get('/dashboard/admin/chatbot-logs?limit=100').then(r => setChatLogs(r.data?.logs || []))} small>↻ Refresh</Btn>
        </div>
      } />
      {chatbotStats && (
        <div className="admin-stats-3" style={{ display: 'grid', gap: 14, marginBottom: 16 }}>
          <StatCard title="📊 Queries (7 days)" value={chatbotStats.daily_queries?.reduce((s, d) => s + d.count, 0) || 0} color="#7b1fa2" />
          <StatCard title="🌐 Languages Used" value={chatbotStats.language_distribution?.length || 0} color="#1565c0" />
          <StatCard title="🔬 Disease Scans (7d)" value={chatbotStats.disease_daily?.reduce((s, d) => s + d.count, 0) || 0} color="#e65100" />
        </div>
      )}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          {chatLogs.length === 0 ? (
            <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No chatbot conversations logged yet.</p>
          ) : chatLogs.map((log, i) => (
            <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 12 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: log.role === 'user' ? '#e3f2fd' : '#e8f5e9', fontWeight: 700, fontSize: 12, color: log.role === 'user' ? '#1565c0' : '#2d7a3a' }}>
                {log.role === 'user' ? '👤' : '🤖'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: log.role === 'user' ? '#1565c0' : '#2d7a3a' }}>{log.role === 'user' ? 'User' : 'Assistant'}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ago(log.created_at)}</span>
                  {log.language && log.language !== 'en' && <span className="badge" style={{ fontSize: 9, background: '#e3f2fd', color: '#1565c0' }}>{log.language}</span>}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.message || log.content || '(empty)'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFeedback = () => {
    // Real date+time formatter (IST-friendly)
    const fmtDate = (ts) => {
      if (!ts) return 'Unknown time';
      try {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return ts;
        return d.toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true,
        });
      } catch { return ts; }
    };

    const TYPE_COLOR = { bug: '#e53935', suggestion: '#1565c0', praise: '#f59e0b', general: '#2d7a3a' };
    const TYPE_ICON  = { bug: '🐞', suggestion: '💡', praise: '⭐', general: '💬' };
    const TYPE_LABEL = { bug: 'Bug', suggestion: 'Suggestion', praise: 'Praise', general: 'General' };

    // Star bar component
    const StarBar = ({ rating }) => {
      if (!rating) return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No rating</span>;
      const colors = ['', '#e53935', '#f5a623', '#f59e0b', '#4caf50', '#2d7a3a'];
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[1,2,3,4,5].map(n => (
            <span key={n} style={{
              fontSize: 15,
              color: n <= rating ? colors[rating] : '#d1d5db',
              filter: n <= rating ? 'drop-shadow(0 0 2px rgba(0,0,0,0.15))' : 'none',
            }}>
              {n <= rating ? '★' : '☆'}
            </span>
          ))}
          <span style={{
            marginLeft: 4, fontSize: 11, fontWeight: 700,
            color: colors[rating], background: `${colors[rating]}18`,
            padding: '2px 6px', borderRadius: 6,
          }}>
            {rating}/5
          </span>
        </div>
      );
    };

    return (
      <div className="animate-fadeIn">
        <SH title="📋 Feedback & Reports" right={
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {feedbackList.length} submission{feedbackList.length !== 1 ? 's' : ''}
          </span>
        } />
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {feedbackList.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>📋</p>
              <p style={{ fontSize: 14, fontWeight: 600 }}>No feedback received yet.</p>
              <p style={{ fontSize: 12, marginTop: 6 }}>Submissions from users will appear here.</p>
            </div>
          ) : feedbackList.map((fb, i) => {
            const color = TYPE_COLOR[fb.type] || '#2d7a3a';
            const icon  = TYPE_ICON[fb.type]  || '💬';
            const label = TYPE_LABEL[fb.type] || 'Feedback';
            // Use created_at if available (more accurate), fall back to timestamp
            const displayTs = fb.created_at || fb.timestamp;

            return (
              <div key={fb._id || i}
                style={{
                  padding: '16px 20px',
                  borderBottom: i < feedbackList.length - 1 ? '1px solid var(--border-light)' : 'none',
                  borderLeft: `3px solid ${color}`,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>

                {/* Top row: badge · rating · time · delete */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Type badge */}
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: `${color}14`, color,
                    }}>
                      {icon} {label}
                    </span>

                    {/* Star rating */}
                    <StarBar rating={fb.rating} />

                    {/* Page tag */}
                    {fb.page && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 6 }}>
                        📄 {fb.page}
                      </span>
                    )}
                  </div>

                  <Btn small danger onClick={() => deleteFeedback(fb._id)}>🗑 Delete</Btn>
                </div>

                {/* Feedback content */}
                <p style={{ fontSize: 13, color: '#1a2e1a', margin: '0 0 10px', lineHeight: 1.65, fontStyle: 'italic' }}>
                  "{fb.content}"
                </p>

                {/* Bottom row: user info + real timestamp */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* User */}
                  {(fb.user_name || fb.user_email) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', background: `${color}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color,
                      }}>
                        {(fb.user_name || fb.user_email || '?')[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {fb.user_name || fb.user_email}
                      </span>
                    </div>
                  )}

                  {/* Real date + time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>🕐</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                      {fmtDate(displayTs)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAnalytics = () => (
    <div className="animate-fadeIn">
      <SH title="📊 System Analytics" />
      <div className="admin-stats-grid" style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
        <StatCard title="👥 Total Users" value={stats.total_users || 0} color="#1565c0" />
        <StatCard title="💬 Total Chats" value={stats.total_chats || 0} color="#7b1fa2" />
        <StatCard title="🌾 Total Predictions" value={stats.total_predictions || 0} color="#2d7a3a" />
        <StatCard title="🔬 Disease Detections" value={stats.total_disease_detections || 0} color="#e65100" />
      </div>
      {chatbotStats && (
        <div className="admin-2col" style={{ display: 'grid', gap: 18 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#1a2e1a' }}>📈 Daily Queries (7 days)</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130 }}>
              {(chatbotStats.daily_queries || []).map((d, i) => {
                const max = Math.max(...(chatbotStats.daily_queries || []).map(x => x.count), 1);
                const h = Math.max((d.count / max) * 110, 6);
                return (
                  <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <div title={`${d.count} queries`} style={{ height: h, background: 'var(--gradient-primary)', borderRadius: '4px 4px 0 0', cursor: 'default' }} />
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{d.date?.split(' ')[1] || ''}</p>
                    <p style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>{d.count}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#1a2e1a' }}>🌐 Language Distribution</h3>
            {(chatbotStats.language_distribution || []).length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No language data yet.</p>
            ) : (chatbotStats.language_distribution || []).map((l, i) => {
              const total = chatbotStats.language_distribution.reduce((s, x) => s + x.count, 0) || 1;
              const pct = Math.round((l.count / total) * 100);
              const names = { en: 'English', hi: 'Hindi', pa: 'Punjabi', mr: 'Marathi', ta: 'Tamil', te: 'Telugu', bn: 'Bengali', kn: 'Kannada', gu: 'Gujarati', ml: 'Malayalam' };
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{names[l.language] || l.language}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{l.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 3 }}>
                    <div style={{ height: 6, background: 'var(--primary)', borderRadius: 3, width: `${pct}%`, transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="animate-fadeIn">
      <SH title="👤 My Profile" />
      {profSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}>✅ {profSuccess}</div>}
      {profError && <div className="alert alert-error" style={{ marginBottom: 16 }}>❌ {profError}</div>}
      <div className="admin-2col" style={{ display: 'grid', gap: 20 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: 'white' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{user?.name || 'Admin'}</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.email}</p>
              <span className="badge badge-error" style={{ marginTop: 4 }}>🛡️ Administrator</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Btn onClick={() => { setProfEdit(!profEdit); setProfOK(''); setProfErr(''); }}>
              {profEdit ? '✕ Cancel' : '✏️ Edit Profile'}
            </Btn>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Full Name" value={profForm.name} onChange={e => setProfForm(p => ({ ...p, name: e.target.value }))} disabled={!profEdit} />
            <Field label="Phone Number" value={profForm.phone} onChange={e => setProfForm(p => ({ ...p, phone: e.target.value }))} disabled={!profEdit} />
            <Field label="Preferred Language" value={profForm.language} onChange={e => setProfForm(p => ({ ...p, language: e.target.value }))} disabled={!profEdit} as="select">
              <option value="en">English</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
            </Field>
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📍 Location Details</h3>
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="State" value={profForm.location.state} onChange={e => setProfForm(p => ({ ...p, location: { ...p.location, state: e.target.value } }))} disabled={!profEdit} as="select">
              <option value="">Select State</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </Field>
            <Field label="District" value={profForm.location.district} onChange={e => setProfForm(p => ({ ...p, location: { ...p.location, district: e.target.value } }))} disabled={!profEdit} placeholder="Enter district" />
            <Field label="City / Town" value={profForm.location.city} onChange={e => setProfForm(p => ({ ...p, location: { ...p.location, city: e.target.value } }))} disabled={!profEdit} placeholder="Enter city" />
          </div>
          {profEdit && (
            <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 24 }} onClick={saveProfile} disabled={profLoading}>
              {profLoading ? 'Saving…' : '💾 Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="animate-fadeIn">
      <SH title="⚙️ System Settings" right={<Btn onClick={saveSettings} primary>💾 Save Settings</Btn>} />
      <div className="admin-2col" style={{ display: 'grid', gap: 20 }}>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🌐 General</h3>
          <div style={{ display: 'grid', gap: 14 }}>
            {[
              { key: 'site_name', label: 'Site Name', ph: 'AgriSmart' },
              { key: 'support_email', label: 'Support Email', ph: 'support@agrismart.com' },
              { key: 'max_chat_history', label: 'Max Chat History', ph: '100' },
              { key: 'default_language', label: 'Default Language', ph: 'en' },
            ].map(f => (
              <Field key={f.key} label={f.label} placeholder={f.ph}
                value={sysSettings[f.key] || ''}
                onChange={e => setSysSets(p => ({ ...p, [f.key]: e.target.value }))} />
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🤖 AI Model Settings</h3>
          <div style={{ display: 'grid', gap: 14 }}>
            {[
              { key: 'chatbot_model', label: 'Text Chat Model', ph: 'llama-3.3-70b-versatile' },
              { key: 'vision_model', label: 'Vision/Image Model', ph: 'llama-4-scout-17b-16e-instruct' },
              { key: 'max_upload_size_mb', label: 'Max Upload Size (MB)', ph: '10' },
              { key: 'maintenance_mode', label: 'Maintenance Mode', ph: 'false' },
            ].map(f => (
              <Field key={f.key} label={f.label} placeholder={f.ph}
                value={sysSettings[f.key] || ''}
                onChange={e => setSysSets(p => ({ ...p, [f.key]: e.target.value }))} />
            ))}
          </div>
        </div>
      </div>
      {sysSettings.updated_at && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>Last updated {ago(sysSettings.updated_at)}</p>
      )}
    </div>
  );

  const SECTIONS = {
    dashboard: renderDashboard,
    farmers: renderFarmers,
    'crop-dataset': renderCropDataset,
    'disease-dataset': renderDiseaseDataset,
    weather: renderWeather,
    market: renderMarket,
    'chatbot-monitoring': renderChatbotMonitor,
    feedback: renderFeedback,
    'system-analytics': renderAnalytics,
    profile: renderProfile,
    settings: renderSettings,
  };

  return (
    <div className="animate-fadeIn">
      {SECTIONS[sec]?.() ?? <p style={{ color: 'var(--text-muted)' }}>Section not found.</p>}
    </div>
  );
}
