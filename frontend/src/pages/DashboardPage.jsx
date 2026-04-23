import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, weatherAPI } from '../services/api';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function AnimatedNumber({ value, color = 'var(--primary)' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(value / 20));
    const t = setInterval(() => {
      cur += step;
      if (cur >= value) { setDisplay(value); clearInterval(t); }
      else setDisplay(cur);
    }, 30);
    return () => clearInterval(t);
  }, [value]);
  return <span style={{ color, fontVariantNumeric: 'tabular-nums' }}>{display}</span>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [stats, setStats]           = useState(null);
  const [weather, setWeather]       = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [geoCity, setGeoCity]       = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, actRes] = await Promise.all([dashboardAPI.getStats(), dashboardAPI.getActivity(7)]);
        setStats(statsRes.data);
        setActivities(actRes.data?.activities?.slice(0, 5) || []);
      } catch { /* ignore */ }

      const tryWeather = async (cityOrCoord) => {
        try {
          const res = typeof cityOrCoord === 'object'
            ? await weatherAPI.getByLocation(cityOrCoord.lat, cityOrCoord.lon)
            : await weatherAPI.getCurrent(cityOrCoord);
          if (res.data && !res.data.error) { setWeather(res.data); setGeoCity(res.data.city || ''); }
        } catch { /* ignore */ }
      };

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => { await tryWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setLoading(false); },
          async () => { await tryWeather(user?.location?.city || 'Delhi'); setLoading(false); },
          { timeout: 5000 }
        );
      } else {
        await tryWeather(user?.location?.city || 'Delhi');
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const firstName = user?.name?.split(' ')[0] || 'Farmer';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const statItems = [
    { label: 'Chat Queries',  value: stats?.total_chats        || 0, color: '#1a7a3a', icon: '💬' },
    { label: 'Crop AI',       value: stats?.crop_predictions   || 0, color: '#d97706', icon: '🌾' },
    { label: 'Disease Scans', value: stats?.disease_detections || 0, color: '#dc2626', icon: '🔬' },
    { label: 'Weather',       value: stats?.weather_checks     || 0, color: '#1e88e5', icon: '🌤️' },
    { label: 'Market',        value: stats?.market_searches    || 0, color: '#7c3aed', icon: '📊' },
    { label: 'This Week',     value: stats?.recent_activity    || 0, color: '#0891b2', icon: '📅' },
  ];

  const featureCards = [
    { title: 'Crop Recommendation', path: '/crop-recommendation', accent: '#1a7a3a', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', emoji: '🌾', stat: 'AI-powered for your soil' },
    { title: 'Disease Detection',   path: '/disease-detection',   accent: '#d97706', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', emoji: '🔬', stat: 'Upload leaf for diagnosis' },
    { title: 'AI Assistant',        path: '/chatbot',              accent: '#1e88e5', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', emoji: '💬', stat: '13 Indian languages' },
    { title: 'Market Prices',       path: '/market',               accent: '#7c3aed', bg: 'linear-gradient(135deg,#faf5ff,#ede9fe)', emoji: '📊', stat: 'Live mandi near you' },
  ];

  const quickActions = [
    { label: 'Market',   path: '/market',            emoji: '📊', color: '#7c3aed' },
    { label: 'Weather',  path: '/weather',            emoji: '🌤️', color: '#1e88e5' },
    { label: 'History',  path: '/history',            emoji: '📋', color: '#0891b2' },
    { label: 'Profile',  path: '/profile',            emoji: '👤', color: '#1a7a3a' },
    { label: 'Policies', path: '/gov-policies',       emoji: '🏛️', color: '#d97706' },
    { label: 'Scans',    path: '/disease-detection',  emoji: '🔬', color: '#dc2626' },
  ];

  const typeIcons  = { chat: '💬', crop_prediction: '🌾', disease_detection: '🔬', weather: '🌤️', market: '📊' };
  const typeColors = { chat: '#1a7a3a', crop_prediction: '#d97706', disease_detection: '#dc2626', weather: '#1e88e5', market: '#7c3aed' };
  const typeLabels = { chat: 'Chat', crop_prediction: 'Crop', disease_detection: 'Disease', weather: 'Weather', market: 'Market' };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading your dashboard…</p>
    </div>
  );

  return (
    <div className="animate-fadeIn dash-page">

      {/* ══ HERO BANNER ══════════════════════════════════════════════ */}
      <div className="dash-hero">
        <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '36px 36px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 140, opacity: 0.05, lineHeight: 1, pointerEvents: 'none' }}>🌿</div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="dash-hero-inner">
            {/* Greeting */}
            <div>
              <p style={{ fontSize: 12, color: '#86efac', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {getGreeting()} 👋
              </p>
              <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900, color: 'white', fontFamily: 'Manrope, Outfit, sans-serif', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>
                {firstName}, your farm is ready.
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 5 }}>{today}</p>

              {/* Location / Weather chips */}
              <div style={{ display: 'flex', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
                {[
                  { icon: '📍', text: geoCity || user?.location?.city || 'Your Location' },
                  { icon: '🌤️', text: weather ? `${Math.round(weather.temperature)}°C · ${weather.description}` : 'Fetching…' },
                  { icon: '🌾', text: 'Rabi Season' },
                ].map((chip, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99,
                    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                    fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.9)',
                  }}>{chip.icon} {chip.text}</span>
                ))}
              </div>
            </div>

            {/* Hero mini stats */}
            <div className="dash-hero-stats">
              {[
                { icon: '💬', label: 'Queries', value: stats?.total_chats || 0 },
                { icon: '🔬', label: 'Scans',   value: stats?.disease_detections || 0 },
                { icon: '📊', label: 'Markets', value: stats?.market_searches || 0 },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: '12px 16px', borderRadius: 14, textAlign: 'center',
                  background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)', minWidth: 70,
                }}>
                  <div style={{ fontSize: 18, marginBottom: 3 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ FEATURE CARDS ════════════════════════════════════════════ */}
      <div className="dash-features-grid">
        {featureCards.map((card) => (
          <div key={card.title} onClick={() => navigate(card.path)} style={{
            cursor: 'pointer', borderRadius: 16, overflow: 'hidden',
            background: card.bg, border: `1.5px solid ${card.accent}20`,
            transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 10px 28px ${card.accent}24`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)'; }}
          >
            <div style={{ height: 3, background: `linear-gradient(90deg, ${card.accent}, ${card.accent}66)` }} />
            <div style={{ padding: '16px' }}>
              <div style={{ fontSize: 22, marginBottom: 10, width: 40, height: 40, borderRadius: 12, background: `${card.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${card.accent}18` }}>{card.emoji}</div>
              <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, color: '#181c1b' }}>{card.title}</h3>
              <p style={{ fontSize: 11, color: card.accent, fontWeight: 600 }}>{card.stat}</p>
              <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: card.accent }}>Open →</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ MAIN CONTENT GRID: Activity + Weather side-by-side ══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '55fr 45fr', gap: 14, alignItems: 'stretch' }} className="dash-aw-grid">

        {/* Activity Summary */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg,#f0fdf4,#fff)' }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>📈 Activity Summary</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>All features combined</p>
            </div>
            <span style={{ fontSize: 10, padding: '2px 9px', borderRadius: 99, background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>Live</span>
          </div>
          <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {statItems.map((s) => (
              <div key={s.label} style={{ padding: '12px 8px', borderRadius: 12, textAlign: 'center', background: `${s.color}08`, border: `1.5px solid ${s.color}15` }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, marginBottom: 3 }}>
                  <AnimatedNumber value={s.value} color={s.color} />
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                <div style={{ height: 3, borderRadius: 99, background: `${s.color}20`, overflow: 'hidden', marginTop: 7 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (s.value / 50) * 100)}%`, background: s.color, borderRadius: 99, transition: 'width 1.2s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weather — same height as Activity */}
        <div style={{
          borderRadius: 16, overflow: 'hidden',
          background: weather ? 'linear-gradient(135deg, #1e3a5f, #1565c0)' : 'linear-gradient(135deg, #1b3a26, #1a7a3a)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
          display: 'flex', flexDirection: 'column',
        }}>
          {weather ? (
            <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>☁️ Weather</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>{weather.city}{weather.state ? `, ${weather.state}` : ''}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: 'white', lineHeight: 1 }}>{Math.round(weather.temperature)}°</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>Feels {Math.round(weather.feels_like || weather.temperature)}°</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>{weather.icon || '🌤️'}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600, textTransform: 'capitalize' }}>{weather.description}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                {[
                  { label: 'Humidity', value: `${weather.humidity}%`, icon: '💧' },
                  { label: 'Wind',     value: `${weather.wind_speed}km/h`, icon: '💨' },
                  { label: 'UV',       value: String(weather.uv_index ?? '—'), icon: '☀️' },
                ].map(w => (
                  <div key={w.label} style={{ padding: '8px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.10)', textAlign: 'center' }}>
                    <div style={{ fontSize: 12 }}>{w.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{w.value}</div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 1 }}>{w.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.12)', fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                ✅ Good conditions for field work
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px 18px', textAlign: 'center', color: 'white', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🌤️</div>
              <p style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>Weather unavailable</p>
              <button onClick={() => navigate('/weather')} style={{ padding: '7px 16px', borderRadius: 99, border: '1.5px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Check Weather →</button>
            </div>
          )}
        </div>
      </div>

      {/* ══ QUICK ACTIONS — full-width row ══════════════════════════════════ */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-light)', background: 'linear-gradient(90deg,#f0fdf4,#fff)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>⚡ Quick Actions</h3>
        </div>
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }} className="dash-quick-actions">
          {quickActions.map(a => (
            <button key={a.label} onClick={() => navigate(a.path)} style={{
              padding: '14px 8px', borderRadius: 12, cursor: 'pointer',
              border: `1.5px solid ${a.color}20`, background: `${a.color}07`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = `${a.color}14`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 14px ${a.color}22`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${a.color}07`; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span style={{ fontSize: 22 }}>{a.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: a.color }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>




      {/* ══ RECENT ACTIVITY ══════════════════════════════════════════ */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border-light)', background: 'linear-gradient(90deg,#f0fdf4,#fff)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>📋 Recent Activity</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Latest queries & actions</p>
          </div>
          <button onClick={() => navigate('/history')} style={{ padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, border: '1px solid var(--border)', background: 'white', color: 'var(--text-secondary)', cursor: 'pointer' }}>View all →</button>
        </div>

        {activities.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 280, margin: '0 auto' }}>No activity yet. Start using the features above!</p>
          </div>
        ) : activities.map((act, i) => {
          const accent = typeColors[act.type] || '#1a7a3a';
          const emoji  = typeIcons[act.type]  || '📋';
          const label  = typeLabels[act.type] || 'Activity';
          const q = (act.query || '').replace(/Weather:\s*Lat[\d.,\s]+Lon[\d.,\s]+/i, '🌤️ Weather Check').substring(0, 70);
          return (
            <div key={i} style={{
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: i < activities.length - 1 ? '1px solid var(--border-light)' : 'none',
              borderLeft: `3px solid ${accent}`, transition: 'background 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = `${accent}05`}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{q}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(act.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                </p>
              </div>
              <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${accent}12`, color: accent, flexShrink: 0 }}>{label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ height: 16 }} />
    </div>
  );
}
