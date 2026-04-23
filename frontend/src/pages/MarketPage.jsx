import { useState, useEffect, useRef } from 'react';
import { marketAPI } from '../services/api';

/* ─── Window width hook ─────────────────────────────────────────────────── */
function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

/* ─── Constants ─────────────────────────────────────────────────────────── */
const STATES = [
  'All India','Andhra Pradesh','Bihar','Chhattisgarh','Gujarat','Haryana',
  'Karnataka','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan',
  'Tamil Nadu','Telangana','Uttar Pradesh','West Bengal',
];

const EMOJI = {
  rice:'🌾',wheat:'🌿',maize:'🌽',cotton:'🌸',soybean:'🫘',mustard:'🌼',
  chickpea:'🫘',sugarcane:'🎋',groundnut:'🥜',moong:'🫛',urad:'🫛',tur:'🫛',
  barley:'🌾',jowar:'🌾',bajra:'🌾',ragi:'🌾',lentil:'🫘',sunflower:'🌻',
  sesame:'🌿',jute:'🪢',tomato:'🍅',onion:'🧅',potato:'🥔',
};

const BAR_COLORS = [
  '#16a34a','#0d9488','#2563eb','#7c3aed','#ea580c','#dc2626',
  '#0284c7','#65a30d','#9333ea','#db2777','#0891b2','#d97706',
  '#059669','#4f46e5','#be123c',
];

const getEmoji = n  => EMOJI[n?.toLowerCase()] || '🌱';
const fmtINR   = v  => (v != null && Number(v) > 0) ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
const fmtChg   = v  => v != null ? `${v >= 0 ? '▲' : '▼'} ${Math.abs(v)}%` : '—';

/* ─── SVG Trend Chart ───────────────────────────────────────────────────── */
function TrendChart({ history }) {
  if (!history || history.length < 2) {
    return (
      <div style={{ textAlign:'center', padding:'20px', color:'#9ca3af', fontSize:12 }}>
        No historical data available
      </div>
    );
  }
  const prices = history.map(h => h.modal_price || 0);
  const dates  = history.map(h => h.date || '');
  const hi = Math.max(...prices), lo = Math.min(...prices), rng = hi - lo || 1;
  const isUp = prices[prices.length - 1] >= prices[0];
  const lc   = isUp ? '#16a34a' : '#ef4444';
  const W = 460, H = 110, PX = 44, PY = 18;

  const pts = prices.map((v, i) => ({
    x: PX + (i / Math.max(prices.length - 1, 1)) * (W - PX * 2),
    y: PY + ((hi - v) / rng) * (H - PY * 2),
    v, d: dates[i],
  }));
  const line = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `${line} ${pts[pts.length-1].x},${H-PY} ${pts[0].x},${H-PY}`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 220 }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={lc} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={lc} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = PY + f * (H - PY * 2), val = hi - f * rng;
        return (
          <g key={i}>
            <line x1={PX} y1={y} x2={W-PX} y2={y} stroke="#f0f0f0" strokeWidth={1}/>
            <text x={PX-6} y={y+3.5} fontSize={8} fill="#9ca3af" textAnchor="end">
              ₹{Math.round(val).toLocaleString('en-IN')}
            </text>
          </g>
        );
      })}
      <polygon points={area} fill="url(#cg)"/>
      <polyline points={line} fill="none" stroke={lc} strokeWidth={2.5}
        strokeLinejoin="round" strokeLinecap="round"/>
      {pts.filter((_, i) => i === 0 || i === pts.length - 1).map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill={lc} stroke="white" strokeWidth={1.5}/>
          <text x={p.x} y={p.y - 9} fontSize={8.5} fill={lc} textAnchor="middle" fontWeight="700">
            {fmtINR(p.v)}
          </text>
          <text x={p.x} y={H - 3} fontSize={7.5} fill="#9ca3af" textAnchor="middle">{p.d}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─── Detail Panel ──────────────────────────────────────────────────────── */
function DetailPanel({ data, onClose }) {
  // ⚠️ useWindowWidth MUST be before any conditional return (Rules of Hooks)
  const isMobile = useWindowWidth() < 768;

  if (!data) return null;

  const isLive   = !!data.live;
  const isUp     = data.price_change != null && data.price_change >= 0;
  const aboveMsp = data.vs_msp != null && data.vs_msp >= 0;

  const stats = [
    {
      icon:'🏛️', label:'MSP (Govt.)',
      val: fmtINR(data.msp),
      sub: data.msp ? 'CACP 2024-25' : 'Not applicable',
      bg:'#ede9fe', border:'#c4b5fd', color:'#6d28d9',
    },
    {
      icon:'💰', label:'Modal Price',
      val: fmtINR(data.current_price),
      sub: isLive ? 'Live mandi rate' : 'MSP reference',
      bg: isLive ? '#dcfce7' : '#f0fdf4',
      border: isLive ? '#86efac' : '#bbf7d0',
      color: '#166534',
    },
    {
      icon:'📈', label:'Price Change',
      val: fmtChg(data.price_change),
      sub: 'vs. 6 months ago',
      bg:     data.price_change == null ? '#f9fafb' : isUp ? '#dcfce7' : '#fee2e2',
      border: data.price_change == null ? '#e5e7eb' : isUp ? '#86efac' : '#fca5a5',
      color:  data.price_change == null ? '#9ca3af' : isUp ? '#166534' : '#b91c1c',
    },
    {
      icon:'📊', label:'High / Low',
      val: `${fmtINR(data.max_price)} / ${fmtINR(data.min_price)}`,
      sub: 'Max / Min in current data',
      bg:'#dbeafe', border:'#93c5fd', color:'#1d4ed8',
    },
  ];

  const hp = isMobile ? '14px 16px' : '18px 22px';

  return (
    <div style={{
      borderRadius: 18,
      border: '1.5px solid #d1fae5',
      background: 'white',
      overflow: 'hidden',
      boxShadow: '0 16px 48px rgba(22,163,74,0.12)',
      animation: 'panelIn 0.22s ease-out both',
    }}>
      {/* Header */}
      <div style={{
        padding: hp,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        background: 'linear-gradient(135deg,#052e16 0%,#14532d 55%,#166534 100%)',
      }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'#86efac', textTransform:'uppercase' }}>
              📊 Market Analysis
            </span>
            <span style={{
              fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
              background: isLive ? 'rgba(134,239,172,0.2)' : 'rgba(255,255,255,0.15)',
              color:      isLive ? '#86efac' : 'rgba(255,255,255,0.7)',
              border:     isLive ? '1px solid rgba(134,239,172,0.4)' : '1px solid rgba(255,255,255,0.2)',
            }}>
              {isLive ? '🟢 Live' : '📋 MSP'}
            </span>
          </div>
          <h3 style={{ fontSize: isMobile ? 17 : 21, fontWeight:900, color:'white', margin:0 }}>
            {getEmoji(data.crop)} {data.crop}
          </h3>
          <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
            {data.season && (
              <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:99, background:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.9)' }}>
                🗓️ {data.season}
              </span>
            )}
            {data.vs_msp != null && (
              <span style={{
                fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99,
                background: aboveMsp ? 'rgba(134,239,172,0.2)' : 'rgba(239,68,68,0.2)',
                color:      aboveMsp ? '#86efac' : '#fca5a5',
              }}>
                {aboveMsp ? '▲' : '▼'} {Math.abs(data.vs_msp)}% vs MSP
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} style={{
          width:32, height:32, borderRadius:99, border:'none',
          background:'rgba(255,255,255,0.12)', color:'white', fontSize:18,
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }}>×</button>
      </div>

      {/* Body */}
      <div style={{ padding: hp }}>
        {/* 4 stat tiles */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              padding: isMobile ? '10px 10px' : '13px 14px',
              borderRadius: 13,
              background: s.bg,
              border: `1.5px solid ${s.border}`,
            }}>
              <div style={{ fontSize: isMobile ? 15 : 18, marginBottom:4 }}>{s.icon}</div>
              <div style={{ fontSize:9, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:'0.05em', opacity:0.8, marginBottom:2 }}>{s.label}</div>
              <div style={{ fontSize: isMobile ? 12 : 14, fontWeight:900, color:s.color, lineHeight:1.2, marginBottom:2 }}>{s.val}</div>
              <div style={{ fontSize:9, color:s.color, opacity:0.65 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Mandis in dataset */}
        {data.markets && data.markets.length > 0 && (
          <div style={{ marginBottom:12, padding:'10px 12px', borderRadius:10, background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#166534', marginBottom:7, textTransform:'uppercase', letterSpacing:'0.06em' }}>
              🏪 Mandis in Dataset
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {data.markets.map((m, i) => (
                <span key={i} style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:99, background:'white', border:'1px solid #a7f3d0', color:'#065f46' }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Price trend chart */}
        <div style={{ padding:'12px', borderRadius:12, background:'#f9fafb', border:'1px solid #f0f0f0', marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <h4 style={{ fontSize:12, fontWeight:700, margin:0, color:'#111827' }}>
              📉 Price Trend ({data.price_history?.length || 0} points)
            </h4>
            {!isLive && (
              <span style={{ fontSize:9, color:'#9ca3af', fontStyle:'italic' }}>~6-month estimate</span>
            )}
          </div>
          <TrendChart history={data.price_history || []} />
        </div>

        {/* Recommendation */}
        {data.recommendation && (
          <div style={{ padding:'10px 12px', borderRadius:10, background:'#f0fdf4', border:'1px solid #bbf7d0', marginBottom:10 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#166534', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>💡 Recommendation</div>
            <p style={{ fontSize:11, color:'#166534', lineHeight:1.6, margin:0 }}>{data.recommendation}</p>
          </div>
        )}

        {/* Tips */}
        {data.tips && data.tips.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:6 }}>
            {data.tips.map((t, i) => (
              <div key={i} style={{ padding:'8px 10px', borderRadius:8, background:'#f9fafb', borderLeft:'3px solid #86efac', fontSize:10, color:'#374151', lineHeight:1.55 }}>{t}</div>
            ))}
          </div>
        )}

        <div style={{ marginTop:12, fontSize:9, color:'#9ca3af', textAlign:'right' }}>
          Source: {data.source || 'Agmarknet / CACP'}
        </div>
      </div>
    </div>
  );
}

/* ─── Price Row ─────────────────────────────────────────────────────────── */
function PriceRow({ p, idx, maxVal, isSelected, isMobile, onClick }) {
  const pct   = maxVal ? Math.max(4, (p.modal_price / maxVal) * 100) : 4;
  const msp   = p.msp   > 0        ? p.msp        : null;
  const modal = p.modal_price > 0  ? p.modal_price : null;
  const vMsp  = (msp && modal && Math.abs(modal - msp) > 1)
    ? ((modal - msp) / msp * 100).toFixed(1)
    : null;
  const above = vMsp != null && parseFloat(vMsp) >= 0;
  const color = BAR_COLORS[idx % BAR_COLORS.length];

  return (
    <div
      onClick={onClick}
      style={isMobile ? {
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '12px 13px', borderRadius: 12,
        background: isSelected ? '#f0fdf4' : 'white',
        border: `1.5px solid ${isSelected ? color : '#f3f4f6'}`,
        cursor: 'pointer', transition: 'all 0.18s',
        boxShadow: isSelected ? `0 4px 18px ${color}22` : '0 1px 3px rgba(0,0,0,0.04)',
      } : {
        display: 'grid', gridTemplateColumns: '185px 1fr 110px',
        alignItems: 'center', gap: 14, padding: '11px 18px', borderRadius: 12,
        background: isSelected ? '#f0fdf4' : 'white',
        border: `1.5px solid ${isSelected ? color : '#f3f4f6'}`,
        cursor: 'pointer', transition: 'all 0.18s',
        boxShadow: isSelected ? `0 4px 20px ${color}22` : '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Crop name row */}
      <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
        <span style={{ fontSize: isMobile ? 20 : 22, flexShrink:0 }}>{getEmoji(p.crop)}</span>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.crop}</div>
          <div style={{ fontSize:10, color:'#9ca3af', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {p.market || p.state || '—'}&nbsp;·&nbsp;{p.season || ''}
          </div>
        </div>
        {/* On mobile: show price inline */}
        {isMobile && modal && (
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontSize:15, fontWeight:900, color }}>{fmtINR(modal)}</div>
            <div style={{ fontSize:9, color:'#9ca3af' }}>/quintal</div>
          </div>
        )}
      </div>

      {/* Bar + badges */}
      <div>
        <div style={{ height:8, borderRadius:99, background:'#f3f4f6', overflow:'hidden', marginBottom:6 }}>
          <div style={{
            height:'100%', borderRadius:99, width:`${pct}%`,
            background: color, boxShadow:`0 0 6px ${color}44`,
            transition:'width 0.9s cubic-bezier(.2,1.4,.5,1)',
          }}/>
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
          {modal && (
            <>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#dbeafe', color:'#1d4ed8' }}>
                Min {fmtINR(p.min_price)}
              </span>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#fee2e2', color:'#b91c1c' }}>
                Max {fmtINR(p.max_price)}
              </span>
            </>
          )}
          {msp && (
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#ede9fe', color:'#6d28d9' }}>
              MSP {fmtINR(msp)}
            </span>
          )}
          {vMsp != null && (
            <span style={{
              fontSize:10, fontWeight:800, padding:'2px 7px', borderRadius:99, marginLeft:'auto',
              background: above ? '#dcfce7' : '#fee2e2',
              color:      above ? '#166534' : '#b91c1c',
            }}>{above ? '▲' : '▼'} {Math.abs(parseFloat(vMsp))}%</span>
          )}
        </div>
      </div>

      {/* Price column — desktop only */}
      {!isMobile && (
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:16, fontWeight:900, color }}>{fmtINR(modal)}</div>
          <div style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>per quintal</div>
          <div style={{ fontSize:10, color: isSelected ? color : '#d1d5db', marginTop:4, fontWeight:600 }}>
            {isSelected ? '▸ Details open' : 'Tap for details'}
          </div>
        </div>
      )}
      {isMobile && isSelected && (
        <div style={{ fontSize:10, color, fontWeight:700 }}>▸ Tap again to close details</div>
      )}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function MarketPage() {
  const windowWidth  = useWindowWidth();
  const isMobile     = windowWidth < 768;

  const [prices, setPrices]     = useState([]);
  const [source, setSource]     = useState('');
  const [note, setNote]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [crop, setCrop]         = useState('');
  const [state, setState]       = useState('');
  const [selected, setSelected] = useState(null);
  const [loadingTrend, setLT]   = useState(false);
  const [geoState, setGeoState] = useState('');
  const [geoCity, setGeoCity]   = useState('');
  const [geoStatus, setGs]      = useState('');
  const [mandis, setMandis]     = useState([]);
  const [liveData, setLive]     = useState(false);
  const detailRef = useRef(null);

  useEffect(() => { detectLocation(); }, []);
  useEffect(() => {
    if (selected?.trends && detailRef.current) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior:'smooth', block:'nearest' }), 80);
    }
  }, [selected]);

  const detectLocation = () => {
    if (!('geolocation' in navigator)) { fetchPrices(); return; }
    setGs('detecting');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const d = await r.json();
          const st = d.address?.state || '';
          const matched = STATES.find(s => s !== 'All India' && st.toLowerCase().includes(s.toLowerCase()));
          const det  = matched || 'All India';
          const city = d.address?.city || d.address?.town || d.address?.village || '';
          setGeoCity(city); setGeoState(det); setState(det); setGs('done');
          fetchPrices(undefined, det);
        } catch { setGs('done'); fetchPrices(); }
      },
      () => { setGs('denied'); fetchPrices(); },
      { timeout: 8000, maximumAge: 300000 }
    );
  };

  const fetchPrices = async (cf, sf) => {
    setLoading(true); setError(''); setSelected(null);
    try {
      const res  = await marketAPI.getPrices(
        (cf ?? crop) || undefined,
        ((sf ?? state) === 'All India') ? undefined : ((sf ?? state) || undefined)
      );
      const data = res.data;
      setPrices(data.prices || []);
      setSource(data.source || '');
      setNote(data.note || '');
      setLive(data.live || false);
      setMandis(data.nearby_mandis || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to fetch prices.');
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async p => {
    if (selected?.crop === p.crop) { setSelected(null); return; }
    setSelected({ crop: p.crop, row: p, trends: null });
    setLT(true);
    try {
      const res = await marketAPI.getTrends(p.crop);
      setSelected({ crop: p.crop, row: p, trends: res.data });
    } catch {
      setSelected({ crop: p.crop, row: p, trends: {} });
    } finally {
      setLT(false);
    }
  };

  const maxVal       = prices.length ? Math.max(...prices.map(p => p.modal_price || 0)) : 1;
  const currentState = state || geoState || 'All India';
  const showDetail   = !!selected?.trends;

  return (
    <div className="animate-fadeIn" style={{ maxWidth:'100%' }}>

      {/* Header */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight:900, letterSpacing:'-0.03em', margin:0 }}>
              📊 Market Prices
            </h1>
            <p style={{ color:'#6b7280', marginTop:4, fontSize:12 }}>
              Live Agmarknet mandi rates · Auto-detected by location
            </p>
          </div>
          <span style={{
            marginLeft:'auto', fontSize:11, padding:'4px 11px', borderRadius:99, fontWeight:700,
            background: liveData ? '#dcfce7' : '#fef9c3',
            color:      liveData ? '#166534' : '#854d0e',
            border:     `1px solid ${liveData ? '#bbf7d0' : '#fde047'}`,
          }}>
            {liveData ? '🟢 Live' : '📋 MSP'}
          </span>
        </div>
      </div>

      {/* Location banners */}
      {geoStatus === 'detecting' && (
        <div style={{ display:'flex', gap:10, alignItems:'center', padding:'11px 16px', borderRadius:12, background:'#f0fdf4', border:'1.5px solid #bbf7d0', marginBottom:14, fontSize:13, color:'#166534', fontWeight:600 }}>
          <span style={{ animation:'rotate 1s linear infinite', display:'inline-block' }}>📡</span>
          Detecting your location…
        </div>
      )}
      {geoStatus === 'done' && geoCity && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderRadius:14, background:'#f0fdf4', border:'1.5px solid #86efac', marginBottom:14, flexWrap:'wrap' }}>
          <span style={{ fontSize:20 }}>📍</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#166534' }}>{geoCity}, {geoState}</div>
            <div style={{ fontSize:11, color:'#4ade80', marginTop:1, fontWeight:600 }}>
              {liveData ? '🟢 Showing live Agmarknet rates' : '📋 MSP reference rates'}
            </div>
          </div>
          <button onClick={() => { setGs(''); detectLocation(); }} style={{ padding:'5px 13px', borderRadius:99, border:'1.5px solid #16a34a', background:'white', color:'#16a34a', fontSize:11, cursor:'pointer', fontWeight:700 }}>
            🔄 Refresh
          </button>
        </div>
      )}
      {geoStatus === 'denied' && (
        <div style={{ padding:'10px 14px', borderRadius:10, background:'#fffbeb', border:'1px solid #fde68a', marginBottom:14, fontSize:12, color:'#92400e' }}>
          ⚠️ Location denied — showing all-India prices. Select your state below.
        </div>
      )}

      {/* Nearby mandis */}
      {mandis.length > 0 && (
        <div style={{ borderRadius:14, border:'1.5px solid #d1fae5', background:'linear-gradient(135deg,#ecfdf5,#f0fdf4)', padding:'12px 16px', marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#065f46', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>
            🏪 {liveData ? 'Mandis in Live Data' : 'Nearby Mandis'} — {currentState}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {mandis.slice(0, isMobile ? 5 : 8).map((m, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 11px', borderRadius:99, background:'white', border:'1.5px solid #a7f3d0', fontSize:11, fontWeight:700, color:'#065f46' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background: liveData ? '#10b981' : '#9ca3af', flexShrink:0 }}/>
                {m}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ background:'white', borderRadius:14, border:'1.5px solid #e5e7eb', padding:'12px 16px', marginBottom:14, boxShadow:'0 2px 10px rgba(0,0,0,0.04)' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <input className="input-field"
            placeholder="🔍 Search crop (wheat, rice…)"
            value={crop}
            onChange={e => setCrop(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchPrices()}
            style={{ flex:'1 1 140px', minWidth:0 }}
          />
          <select className="input-field" value={state}
            onChange={e => { setState(e.target.value); fetchPrices(undefined, e.target.value); }}
            style={{ flex:'0 1 180px', minWidth:0 }}>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => fetchPrices()} className="btn btn-primary" disabled={loading} style={{ flex:'0 0 auto' }}>
            {loading ? '⏳' : '🔍'}
          </button>
          <button onClick={() => { setCrop(''); setState(geoState || ''); fetchPrices('', geoState || ''); }}
            className="btn btn-secondary" style={{ flex:'0 0 auto' }}>Reset</button>
        </div>
        {source && <p style={{ fontSize:11, color:'#9ca3af', marginTop:8, marginBottom:0 }}>📎 {source}</p>}
        {note && (
          <div style={{ marginTop:8, padding:'7px 11px', borderRadius:8, background: liveData ? '#f0fdf4' : '#fffbeb', border:`1px solid ${liveData ? '#bbf7d0' : '#fde68a'}`, fontSize:11, color: liveData ? '#166534' : '#92400e' }}>
            {note}
          </div>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom:14 }}>{error}</div>}

      {loading ? (
        <div className="flex-center" style={{ padding:64 }}><div className="spinner"/></div>
      ) : prices.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
            <h3>No data found</h3>
            <p>Try adjusting your filters or selecting a different state.</p>
          </div>
        </div>
      ) : (
        /* Main layout: side-by-side on desktop when panel open, stack on mobile */
        <div style={{
          display: 'grid',
          gridTemplateColumns: (!isMobile && showDetail) ? '1fr 390px' : '1fr',
          gap: 18, alignItems: 'start',
        }}>
          {/* Price list */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:6 }}>
              <div>
                <h3 style={{ fontSize:13, fontWeight:800, margin:0, color:'#111827' }}>
                  Mandi Prices — {prices.length} records
                </h3>
                <p style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>Tap any row for full price analysis</p>
              </div>
              <span style={{ fontSize:11, padding:'3px 9px', borderRadius:99, background:'#f3f4f6', color:'#6b7280', fontWeight:700 }}>₹ / Quintal</span>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {prices.map((p, i) => (
                <PriceRow
                  key={`${p.crop}-${i}`}
                  p={p} idx={i} maxVal={maxVal}
                  isSelected={selected?.crop === p.crop}
                  isMobile={isMobile}
                  onClick={() => handleRowClick(p)}
                />
              ))}
            </div>

            {loadingTrend && (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 16px', borderRadius:12, background:'#f0fdf4', border:'1px solid #a7f3d0', marginTop:10 }}>
                <div className="spinner" style={{ width:17, height:17, borderWidth:2, borderTopColor:'#16a34a', borderColor:'rgba(22,163,74,0.2)' }}/>
                <span style={{ fontSize:13, color:'#166534', fontWeight:600 }}>Fetching price analysis…</span>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {showDetail && (
            <div ref={detailRef} style={isMobile
              ? { marginTop:8 }
              : { position:'sticky', top:80 }
            }>
              <DetailPanel data={selected.trends} onClose={() => setSelected(null)} />
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes rotate  { to { transform:rotate(360deg); } }
        @keyframes panelIn { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
}
