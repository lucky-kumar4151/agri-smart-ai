import { useState, useEffect, useRef, useCallback } from 'react';
import { predictAPI, weatherAPI } from '../services/api';
import { useToast } from '../components/Toast';

/* ─── Window width hook ────────────────────────────────────────────────────── */
function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

/* ─── Dataset attribution info ────────────────────────────────────────────── */
const DATASETS = [
  {
    name: 'Crop Recommendation Dataset',
    source: 'Kaggle — Atharva Ingle',
    url: 'https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset',
    desc: 'N, P, K, temp, humidity, pH, rainfall → 22 crop labels',
  },
  {
    name: 'Indian Agriculture Crop Data',
    source: 'Kaggle — Samyak Jain',
    url: 'https://www.kaggle.com/datasets/samyakjain2/indian-agriculture-crop-data',
    desc: 'State-wise seasonal crop statistics',
  },
  {
    name: 'Soil Quality Dataset',
    source: 'data.gov.in — ICAR',
    url: 'https://data.gov.in/catalog/soil-health-card-data',
    desc: 'Soil health card parameters across India',
  },
];

/* ─── Static data ─────────────────────────────────────────────────────────── */
const LOCATION_PRESETS = {
  Punjab:         { nitrogen:100, phosphorus:55, potassium:35, temperature:20, humidity:60, ph:7.0, rainfall:80  },
  Haryana:        { nitrogen:100, phosphorus:55, potassium:35, temperature:22, humidity:55, ph:7.1, rainfall:75  },
  Maharashtra:    { nitrogen:90,  phosphorus:40, potassium:50, temperature:27, humidity:70, ph:6.8, rainfall:600 },
  Bihar:          { nitrogen:75,  phosphorus:35, potassium:30, temperature:26, humidity:72, ph:6.5, rainfall:150 },
  Rajasthan:      { nitrogen:60,  phosphorus:25, potassium:30, temperature:30, humidity:35, ph:7.8, rainfall:40  },
  Tamil_Nadu:     { nitrogen:85,  phosphorus:40, potassium:45, temperature:29, humidity:78, ph:6.2, rainfall:300 },
  Gujarat:        { nitrogen:80,  phosphorus:35, potassium:45, temperature:28, humidity:60, ph:7.2, rainfall:70  },
  West_Bengal:    { nitrogen:90,  phosphorus:45, potassium:35, temperature:28, humidity:80, ph:6.0, rainfall:250 },
  Madhya_Pradesh: { nitrogen:85,  phosphorus:40, potassium:40, temperature:25, humidity:55, ph:6.8, rainfall:100 },
};

const STATE_PRESET_MAP = {
  'punjab':'Punjab','haryana':'Haryana','maharashtra':'Maharashtra','bihar':'Bihar',
  'rajasthan':'Rajasthan','tamil nadu':'Tamil_Nadu','gujarat':'Gujarat',
  'west bengal':'West_Bengal','madhya pradesh':'Madhya_Pradesh',
  'uttar pradesh':'Bihar','andhra pradesh':'Tamil_Nadu','telangana':'Tamil_Nadu','karnataka':'Tamil_Nadu',
};

const QUICK_PRESETS = [
  { label:'🌾 Rice', key:'rice',       v:{ nitrogen:80,  phosphorus:48, potassium:40,  temperature:28, humidity:82, ph:6.5, rainfall:200 }},
  { label:'🌿 Wheat',key:'wheat',      v:{ nitrogen:100, phosphorus:55, potassium:35,  temperature:18, humidity:55, ph:7.0, rainfall:80  }},
  { label:'🌸 Cotton',key:'cotton',    v:{ nitrogen:120, phosphorus:45, potassium:50,  temperature:30, humidity:50, ph:7.3, rainfall:70  }},
  { label:'🌽 Maize', key:'maize',     v:{ nitrogen:90,  phosphorus:40, potassium:35,  temperature:25, humidity:65, ph:6.8, rainfall:110 }},
  { label:'🍌 Banana',key:'banana',    v:{ nitrogen:150, phosphorus:70, potassium:120, temperature:28, humidity:80, ph:6.2, rainfall:180 }},
  { label:'🥜 Groundnut',key:'gnut',  v:{ nitrogen:25,  phosphorus:45, potassium:55,  temperature:28, humidity:65, ph:6.3, rainfall:90  }},
];

const FIELDS = [
  { key:'nitrogen',    label:'Nitrogen (N)',   unit:'kg/ha', min:0,   max:200, step:1,   icon:'🧪' },
  { key:'phosphorus',  label:'Phosphorus (P)', unit:'kg/ha', min:0,   max:200, step:1,   icon:'⚗️' },
  { key:'potassium',   label:'Potassium (K)',  unit:'kg/ha', min:0,   max:200, step:1,   icon:'🔬' },
  { key:'temperature', label:'Temperature',    unit:'°C',    min:-10, max:60,  step:0.1, icon:'🌡️' },
  { key:'humidity',    label:'Humidity',       unit:'%',     min:0,   max:100, step:1,   icon:'💧' },
  { key:'ph',          label:'Soil pH',        unit:'',      min:0,   max:14,  step:0.1, icon:'🧫' },
  { key:'rainfall',    label:'Rainfall',       unit:'mm',    min:0,   max:500, step:1,   icon:'🌧️' },
];

const EMPTY_FORM = { nitrogen:'', phosphorus:'', potassium:'', temperature:'', humidity:'', ph:'', rainfall:'' };

const CROP_EMOJIS = {
  rice:'🌾', wheat:'🌿', maize:'🌽', cotton:'🌸', sugarcane:'🎋', mustard:'🌼',
  chickpea:'🫘', soybean:'🫘', groundnut:'🥜', potato:'🥔', tomato:'🍅', onion:'🧅',
  barley:'🌾', sorghum:'🌾', lentil:'🫘', moong:'🫛', pigeonpea:'🫛', sunflower:'🌻',
  jute:'🪢', garlic:'🧄', banana:'🍌', mango:'🥭',
};

/* ─── Utility: normalise scores relative to the top crop ─────────────────── */
// Maps raw ML probabilities to a 0-100 "suitability index" where
// the top crop = 95-100 and others are relative to it.
function normaliseScores(crops) {
  if (!crops || crops.length === 0) return [];
  const top = crops[0].confidence;
  if (top <= 0) return crops.map(c => ({ ...c, score: 0 }));
  return crops.map((c, i) => ({
    ...c,
    score: i === 0
      ? Math.min(96, Math.max(80, Math.round(Math.min(top * 1.2, 96))))
      : Math.round((c.confidence / top) * (Math.min(96, Math.max(80, Math.round(Math.min(top * 1.2, 96)))) - 10)),
    rawPct: c.confidence,
  }));
}

/* ─── Animated ring SVG ─────────────────────────────────────────────────────  */
function ScoreRing({ score, size = 70, stroke = 6, color = '#16a34a', animated = true }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const label = score >= 80 ? 'High' : score >= 55 ? 'Good' : score >= 35 ? 'Fair' : 'Low';
  const labelColor = score >= 80 ? '#16a34a' : score >= 55 ? '#d97706' : '#6b7280';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={animated ? { transition: 'stroke-dasharray 1.4s cubic-bezier(.2,1.4,.5,1)' } : {}} />
        <text x={size/2} y={size/2 - 5} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.2} fontWeight="800" fill={color}>{score}</text>
        <text x={size/2} y={size/2 + 10} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.13} fill="#9ca3af">pts</text>
      </svg>
      <span style={{ fontSize: 10, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    </div>
  );
}

/* ─── Top pick banner ────────────────────────────────────────────────────────  */
function TopPickBanner({ crop, weatherInfo }) {
  const emoji    = CROP_EMOJIS[crop?.name?.toLowerCase()] || '🌱';
  const isMobile = useWindowWidth() < 768;
  return (
    <div style={{
      borderRadius: 20,
      background: 'linear-gradient(135deg,#052e16 0%,#14532d 40%,#166534 70%,#15803d 100%)',
      padding: isMobile ? '18px 16px' : '28px 32px',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      animation: 'fadeSlideUp 0.4s ease-out both',
    }}>
      {/* decorative circles */}
      {[{w:220,h:220,t:-60,r:-60,o:0.06},{w:140,h:140,b:-40,l:30,o:0.05}].map((c,i)=>(
        <div key={i} style={{
          position:'absolute', width:c.w, height:c.h, borderRadius:'50%',
          background:'white', opacity:c.o, pointerEvents:'none',
          top:c.t, right:c.r, bottom:c.b, left:c.l,
        }}/>
      ))}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: isMobile ? 10 : 16 }}>
          <span style={{ fontSize:11, fontWeight:800, letterSpacing:'0.14em', color:'#86efac', textTransform:'uppercase', padding:'3px 10px', borderRadius:99, border:'1px solid rgba(134,239,172,0.4)', background:'rgba(134,239,172,0.1)' }}>
            ⭐ Best Match
          </span>
          {crop.season && (
            <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.7)', padding:'3px 10px', borderRadius:99, background:'rgba(255,255,255,0.08)' }}>
              🗓️ {crop.season}
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'flex-start', gap: isMobile ? 12 : 20, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <span style={{ fontSize: isMobile ? 40 : 56, lineHeight:1, filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>{emoji}</span>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize: isMobile ? 22 : 34, fontWeight:900, margin:0, letterSpacing:'-0.02em', color:'white' }}>{crop.name}</h2>
            <p style={{ fontSize: isMobile ? 12 : 13, color:'rgba(255,255,255,0.8)', marginTop:6, lineHeight:1.55,
              display:'-webkit-box', WebkitLineClamp: isMobile ? 3 : 10, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              {crop.description}
            </p>
            {weatherInfo && (
              <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
                {[
                  `🌡️ ${Math.round(weatherInfo.temperature)}°C`,
                  `💧 ${Math.round(weatherInfo.humidity)}% humidity`,
                  weatherInfo.description,
                ].map((t,i)=>(
                  <span key={i} style={{ fontSize:12, padding:'4px 12px', borderRadius:99, background:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.9)', fontWeight:600 }}>{t}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ textAlign:'center', flexShrink:0 }}>
            <ScoreRing score={crop.score} size={isMobile ? 56 : 80} stroke={isMobile ? 5 : 7} color="#86efac" />
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', marginTop:6, fontWeight:600 }}>SUITABILITY</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Other crop row ─────────────────────────────────────────────────────────  */
function CropRow({ crop, rank, delay }) {
  const emoji = CROP_EMOJIS[crop?.name?.toLowerCase()] || '🌱';
  const score = crop.score || 0;
  const barColor = score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : score >= 30 ? '#3b82f6' : '#9ca3af';
  const ringColor = score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : score >= 30 ? '#3b82f6' : '#9ca3af';

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:16,
      padding:'14px 20px', borderRadius:14,
      background:'white', border:'1.5px solid #f0f0f0',
      boxShadow:'0 1px 6px rgba(0,0,0,0.04)',
      animation:`fadeSlideUp 0.4s ease-out ${delay}s both`,
      transition:'box-shadow 0.2s, transform 0.2s',
    }}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 6px 22px rgba(0,0,0,0.09)';e.currentTarget.style.transform='translateY(-1px)';}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 6px rgba(0,0,0,0.04)';e.currentTarget.style.transform='translateY(0)';}}
    >
      {/* Rank */}
      <div style={{
        width:28, height:28, borderRadius:99, flexShrink:0,
        background:'#f4f4f4', display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:12, fontWeight:800, color:'#6b7280',
      }}>#{rank}</div>

      {/* Emoji */}
      <span style={{ fontSize:26, flexShrink:0 }}>{emoji}</span>

      {/* Name + bar + description */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
          <span style={{ fontSize:15, fontWeight:800, color:'#111827' }}>{crop.name}</span>
          {crop.season && (
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99, background:'#f0fdf4', color:'#166534', border:'1px solid #bbf7d0' }}>
              {crop.season}
            </span>
          )}
        </div>
        {/* Bar */}
        <div style={{ height:5, borderRadius:99, background:'#f0f0f0', overflow:'hidden', marginBottom:6 }}>
          <div style={{
            height:'100%', borderRadius:99, width:`${score}%`,
            background:`linear-gradient(90deg,${barColor}99,${barColor})`,
            transition:'width 1.3s cubic-bezier(.2,1.4,.5,1)',
          }}/>
        </div>
        <p style={{ fontSize:12, color:'#6b7280', lineHeight:1.55, margin:0, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
          {crop.description}
        </p>
      </div>

      {/* Score ring */}
      <ScoreRing score={score} size={56} stroke={5} color={ringColor} />
    </div>
  );
}

/* ─── Soil analysis cards ────────────────────────────────────────────────────  */
function SoilGrid({ analysis }) {
  if (!analysis) return null;
  const items = [
    { key:'nitrogen_status',   label:'Nitrogen',    icon:'🧪' },
    { key:'phosphorus_status', label:'Phosphorus', icon:'⚗️' },
    { key:'potassium_status',  label:'Potassium',  icon:'🔬' },
    { key:'ph_status',         label:'Soil pH',    icon:'🧫' },
    { key:'overall_fertility', label:'Fertility',  icon:'🌱' },
  ];
  const statusColor = {
    High:   {bg:'#dcfce7',border:'#86efac',text:'#166534'},
    Medium: {bg:'#fef9c3',border:'#fde047',text:'#854d0e'},
    Low:    {bg:'#fee2e2',border:'#fca5a5',text:'#991b1b'},
    Neutral:{bg:'#f0fdf4',border:'#bbf7d0',text:'#166534'},
    Acidic: {bg:'#fffbeb',border:'#fde68a',text:'#92400e'},
    Alkaline:{bg:'#ede9fe',border:'#c4b5fd',text:'#5b21b6'},
  };
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:10 }}>
      {items.map(it=>{
        const val = analysis[it.key];
        if (!val) return null;
        const c = statusColor[val] || {bg:'#f9f9f9',border:'#e5e5e5',text:'#374151'};
        return (
          <div key={it.key} style={{
            textAlign:'center', padding:'14px 10px', borderRadius:14,
            background:c.bg, border:`1.5px solid ${c.border}`,
          }}>
            <div style={{ fontSize:20, marginBottom:6 }}>{it.icon}</div>
            <div style={{ fontSize:11, fontWeight:700, color:c.text, opacity:.7, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4 }}>{it.label}</div>
            <div style={{ fontSize:14, fontWeight:900, color:c.text }}>{val}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Dataset Attribution Panel ──────────────────────────────────────────────  */
function DatasetPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius:14, border:'1.5px solid #dbeafe', background:'#eff6ff',
      overflow:'hidden', marginTop:20,
    }}>
      <button
        onClick={()=>setOpen(o=>!o)}
        style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'13px 18px', background:'none', border:'none', cursor:'pointer', textAlign:'left',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>📚</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#1e40af' }}>Training Dataset Sources</div>
            <div style={{ fontSize:11, color:'#3b82f6' }}>Training data sources · Click to expand</div>
          </div>
        </div>
        <span style={{ fontSize:18, color:'#3b82f6', transition:'transform 0.2s', transform: open ? 'rotate(180deg)':'rotate(0deg)' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding:'0 18px 18px', display:'flex', flexDirection:'column', gap:10 }}>
          {DATASETS.map((d,i)=>(
            <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
              style={{
                display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px',
                borderRadius:10, background:'white', border:'1px solid #bfdbfe',
                textDecoration:'none', transition:'box-shadow 0.15s',
              }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(59,130,246,0.15)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}
            >
              <span style={{ fontSize:20, flexShrink:0 }}>🔗</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#1e40af', marginBottom:2 }}>{d.name}</div>
                <div style={{ fontSize:11, color:'#6b7280', marginBottom:4 }}>Source: {d.source}</div>
                <div style={{ fontSize:11, color:'#374151', lineHeight:1.5 }}>{d.desc}</div>
              </div>
              <span style={{ marginLeft:'auto', flexShrink:0, fontSize:14, color:'#3b82f6' }}>↗</span>
            </a>
          ))}
          <div style={{ fontSize:11, color:'#6b7280', textAlign:'center', marginTop:4 }}>
            Dataset augmented with agronomic parameters from ICAR and FAO publications.
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────────  */
export default function CropRecommendationPage() {
  const windowWidth = useWindowWidth();
  const isMobile    = windowWidth < 768;

  const [form, setForm]           = useState(EMPTY_FORM);
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [geoStatus, setGeoStatus] = useState('');
  const [geoInfo, setGeoInfo]     = useState(null);
  const [weatherInfo, setWeather] = useState(null);
  const [locationNote, setNote]   = useState('');
  const [activePreset, setActive] = useState(null);
  const resultRef = useRef(null);
  const toast = useToast();

  useEffect(()=>{ detectLocation(); }, []);

  useEffect(()=>{
    if (result && resultRef.current) {
      setTimeout(()=> resultRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 120);
    }
  }, [result]);

  const detectLocation = () => {
    if (!('geolocation' in navigator)) return;
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const d = await r.json();
          const stateRaw = (d.address?.state || '').toLowerCase();
          const city = d.address?.city || d.address?.town || d.address?.village || '';
          const pk = Object.keys(STATE_PRESET_MAP).find(k => stateRaw.includes(k));
          const preset = pk ? LOCATION_PRESETS[STATE_PRESET_MAP[pk]] : null;
          let wx = null;
          try { const wr = await weatherAPI.getByLocation(pos.coords.latitude, pos.coords.longitude); if (wr.data && !wr.data.error) wx = wr.data; } catch {}
          setGeoInfo({ state: d.address?.state || '', city, preset });
          setWeather(wx);
          setGeoStatus('done');
          if (preset) {
            setForm({
              nitrogen: String(preset.nitrogen), phosphorus: String(preset.phosphorus),
              potassium: String(preset.potassium),
              temperature: wx ? String(Math.round(wx.temperature)) : String(preset.temperature),
              humidity: wx ? String(Math.round(wx.humidity)) : String(preset.humidity),
              ph: String(preset.ph), rainfall: String(preset.rainfall),
            });
            toast.success(`📍 Auto-filled for ${city || d.address?.state}`);
          }
        } catch { setGeoStatus('denied'); }
      },
      () => setGeoStatus('denied'),
      { timeout: 8000, maximumAge: 300000 }
    );
  };

  const applyPreset = (key, values) => {
    setForm(Object.fromEntries(Object.entries(values).map(([k,v]) => [k, String(v)])));
    setActive(key); setResult(null); setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true); setResult(null);
    try {
      const data = {};
      for (const [k, v] of Object.entries(form)) {
        if (!v && v !== 0) { setError(`Please fill in: ${k}`); setLoading(false); return; }
        data[k] = parseFloat(v);
      }
      let lastErr;
      for (let i = 1; i <= 3; i++) {
        try {
          const res = await predictAPI.cropRecommendation(data);
          const crops = normaliseScores(res.data?.recommended_crops || res.data?.crops || []);
          setResult({ ...res.data, _crops: crops });
          toast.success('✅ Recommendation ready!');
          return;
        } catch (err) { lastErr = err; if (i < 3) await new Promise(r => setTimeout(r, 900 * i)); }
      }
      setError(lastErr?.response?.data?.detail || 'Prediction failed. Please try again.');
    } catch (err) { setError(err.response?.data?.detail || 'Prediction failed.'); }
    finally { setLoading(false); }
  };

  const crops = result?._crops || [];
  const [best, ...rest] = crops;

  return (
    <div className="animate-fadeIn" style={{ maxWidth:'100%' }}>

      {/* ── Page title ── */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:900, letterSpacing:'-0.03em', margin:0, color:'#052e16' }}>
          🌾 Crop Recommendation
        </h1>
        <p style={{ color:'#6b7280', marginTop:4, fontSize:13 }}>
          Enter your soil &amp; climate parameters to get AI-powered crop suggestions for your field.
        </p>
      </div>

      {/* ── Location Banner ── */}
      {geoStatus === 'detecting' && (
        <div style={{ display:'flex', gap:10, alignItems:'center', padding:'12px 18px', borderRadius:12, background:'#f0fdf4', border:'1.5px solid #bbf7d0', marginBottom:14, fontSize:13, color:'#166534', fontWeight:600 }}>
          <span style={{ animation:'rotate 1s linear infinite', display:'inline-block' }}>📡</span>
          Detecting your location to auto-fill parameters…
        </div>
      )}
      {geoStatus === 'done' && geoInfo && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', borderRadius:12, background:'#f0fdf4', border:'1.5px solid #86efac', marginBottom:14, flexWrap:'wrap' }}>
          <span style={{ fontSize:20 }}>📍</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#166534' }}>
              {geoInfo.city ? `${geoInfo.city}, ${geoInfo.state}` : geoInfo.state || 'Location detected'}
            </div>
            {locationNote && <div style={{ fontSize:11, color:'#4ade80', marginTop:2 }}>💡 {locationNote}</div>}
          </div>
          {weatherInfo && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {[`🌡️ ${Math.round(weatherInfo.temperature)}°C`, `💧 ${Math.round(weatherInfo.humidity)}%`].map((t,i)=>(
                <span key={i} style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:'white', border:'1px solid #bbf7d0', color:'#166534', fontWeight:600 }}>{t}</span>
              ))}
            </div>
          )}
          <button onClick={detectLocation} style={{ padding:'5px 14px', borderRadius:99, border:'1.5px solid #16a34a', background:'white', color:'#16a34a', fontSize:11, cursor:'pointer', fontWeight:700 }}>🔄 Re-detect</button>
        </div>
      )}
      {geoStatus === 'denied' && (
        <div style={{ padding:'10px 16px', borderRadius:10, background:'#fffbeb', border:'1px solid #fde68a', marginBottom:14, fontSize:12, color:'#92400e' }}>
          ⚠️ Location denied. Pick a region preset or fill values manually.
        </div>
      )}

      {/* ── Main two-column layout ── */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '360px 1fr', gap: isMobile ? 16 : 24, alignItems:'start' }}>

        {/* ════ LEFT: Form panel ════ */}
        <div style={{
          background:'white', borderRadius:20, border:'1.5px solid #e5e7eb',
          boxShadow:'0 4px 24px rgba(0,0,0,0.06)', overflow:'hidden',
          position: isMobile ? 'static' : 'sticky', top:80,
        }}>
          {/* Form header */}
          <div style={{ padding:'16px 20px', background:'linear-gradient(135deg,#f0fdf4,#ecfdf5)', borderBottom:'1px solid #d1fae5' }}>
            <h3 style={{ fontSize:14, fontWeight:800, margin:0, color:'#052e16' }}>🌱 Soil &amp; Climate Parameters</h3>
            <p style={{ fontSize:11, color:'#6b7280', marginTop:3 }}>Enter values or pick a quick preset</p>
          </div>

          {/* Quick preset chips */}
          <div style={{ padding:'12px 20px', borderBottom:'1px solid #f0f0f0', display:'flex', flexWrap:'wrap', gap:6 }}>
            {QUICK_PRESETS.map(p=>(
              <button key={p.key} onClick={()=>applyPreset(p.key, p.v)} style={{
                padding:'5px 12px', borderRadius:99, fontSize:11, fontWeight:700, cursor:'pointer',
                border: activePreset===p.key ? '1.5px solid #16a34a' : '1.5px solid #e5e7eb',
                background: activePreset===p.key ? '#dcfce7' : 'white',
                color: activePreset===p.key ? '#166534' : '#374151',
                transition:'all 0.15s',
              }}>{p.label}</button>
            ))}
            <div style={{ width:'100%', height:0 }}/>
            {Object.entries(LOCATION_PRESETS).slice(0,4).map(([key,p])=>(
              <button key={key} onClick={()=>{ applyPreset(key, Object.fromEntries(Object.entries(p).filter(([k])=>FIELDS.some(f=>f.key===k)))); setNote(p.note||''); toast.success(`📍 Preset: ${key.replace('_',' ')}`); }} style={{
                padding:'4px 10px', borderRadius:99, fontSize:11, fontWeight:600, cursor:'pointer',
                border:'1.5px solid #dbeafe', background:'#eff6ff', color:'#1e40af', transition:'all 0.15s',
              }}>📍 {key.replace('_',' ')}</button>
            ))}
          </div>

          {/* Fields */}
          <form onSubmit={handleSubmit} style={{ padding:'16px 20px' }}>
            {FIELDS.map(f=>(
              <div key={f.key} style={{ marginBottom:12 }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                  {f.unit && <span style={{ fontWeight:400, color:'#9ca3af', fontSize:11 }}>({f.unit})</span>}
                  {(f.key==='temperature'||f.key==='humidity')&&weatherInfo&&(
                    <span style={{ marginLeft:'auto', fontSize:9, color:'#16a34a', fontWeight:700, padding:'1px 6px', borderRadius:99, background:'#dcfce7' }}>📡 LIVE</span>
                  )}
                </label>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input className="input-field" type="number" step={f.step} min={f.min} max={f.max}
                    placeholder={`${f.min} – ${f.max}`} value={form[f.key]}
                    onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                    style={{
                      flex:1, fontSize:14, fontWeight:600,
                      background:(f.key==='temperature'||f.key==='humidity')&&weatherInfo?'#f0fdf4':undefined,
                      borderColor:(f.key==='temperature'||f.key==='humidity')&&weatherInfo?'#86efac':undefined,
                    }}/>
                  <span style={{ fontSize:11, color:'#9ca3af', whiteSpace:'nowrap', minWidth:40, textAlign:'right' }}>
                    {form[f.key]||'—'} {f.unit}
                  </span>
                </div>
              </div>
            ))}

            {error && (
              <div style={{ padding:'10px 14px', borderRadius:10, background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', fontSize:12, marginBottom:10 }}>
                ❌ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'15px', borderRadius:12, fontSize:14, fontWeight:800,
              background: loading ? '#e5e7eb' : 'linear-gradient(135deg,#052e16,#14532d,#16a34a)',
              color: loading ? '#9ca3af' : 'white', border:'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 6px 24px rgba(22,163,74,0.35)',
              transition:'all 0.25s', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            }}>
              {loading ? (
                <><span className="spinner" style={{ width:17, height:17, borderWidth:2, borderTopColor:'white', borderColor:'rgba(255,255,255,0.25)' }}/><span>Analyzing…</span></>
              ) : <><span>🌾</span><span>Get Recommendation</span></>}
            </button>
          </form>
        </div>

        {/* ════ RIGHT: Results or placeholder ════ */}
        <div ref={resultRef} style={{ scrollMarginTop:80 }}>
          {!result && !loading && (
            <div style={{
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              minHeight:420, borderRadius:20, border:'2px dashed #d1fae5',
              background:'linear-gradient(135deg,#f0fdf4,#ecfdf5)',
              padding:'48px 32px', textAlign:'center',
            }}>
              <div style={{ fontSize:64, marginBottom:20 }}>🌱</div>
              <h3 style={{ fontSize:20, fontWeight:800, color:'#052e16', marginBottom:8 }}>Smart Crop Advisor</h3>
              <p style={{ fontSize:14, color:'#6b7280', maxWidth:420, lineHeight:1.8 }}>
                Fill in your soil &amp; climate parameters and click <strong style={{ color:'#16a34a' }}>"Get Recommendation"</strong> to get the best crop predictions for your field.
              </p>
            </div>
          )}

          {loading && (
            <div style={{
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              minHeight:420, borderRadius:20, background:'#f9fafb', border:'1.5px solid #e5e7eb',
            }}>
              <div className="spinner" style={{ width:48, height:48, borderWidth:4, borderTopColor:'#16a34a', borderColor:'rgba(22,163,74,0.15)', marginBottom:20 }}/>
              <p style={{ fontSize:14, color:'#374151', fontWeight:700 }}>Analysing your field parameters…</p>
              <p style={{ fontSize:12, color:'#9ca3af', marginTop:4, maxWidth:300, textAlign:'center' }}>This usually takes a few seconds</p>
            </div>
          )}

          {result && crops.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

              {/* Model badge */}
              {result.model_used && (
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <span style={{ fontSize:11, padding:'4px 12px', borderRadius:99, background:'#f0fdf4', color:'#166534', fontWeight:700, border:'1px solid #bbf7d0' }}>
                    🤖 {result.model_used}
                  </span>
                </div>
              )}

              {/* Best pick banner */}
              {best && <TopPickBanner crop={best} weatherInfo={weatherInfo} />}

              {/* Soil analysis + other picks */}
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12 }}>
                {/* Soil analysis */}
                <div style={{ background:'white', borderRadius:16, border:'1.5px solid #e5e7eb', overflow:'hidden', boxShadow:'0 2px 10px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid #f0f0f0', background:'linear-gradient(90deg,#f0fdf4,white)' }}>
                    <h3 style={{ fontSize:13, fontWeight:800, margin:0, color:'#052e16' }}>🧪 Soil Analysis</h3>
                  </div>
                  <div style={{ padding:14 }}>
                    <SoilGrid analysis={result.soil_analysis} />
                    {result.soil_analysis?.recommendations?.length > 0 && (
                      <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
                        {result.soil_analysis.recommendations.map((r,i)=>(
                          <div key={i} style={{ display:'flex', gap:8, fontSize:11, color:'#374151', lineHeight:1.55 }}>
                            <span style={{ color:'#16a34a', flexShrink:0 }}>✓</span>{r}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick rank summary */}
                <div style={{ background:'white', borderRadius:16, border:'1.5px solid #e5e7eb', overflow:'hidden', boxShadow:'0 2px 10px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid #f0f0f0', background:'linear-gradient(90deg,#f0fdf4,white)' }}>
                    <h3 style={{ fontSize:13, fontWeight:800, margin:0, color:'#052e16' }}>📊 All Predictions</h3>
                  </div>
                  <div style={{ padding:'12px 0' }}>
                    {crops.map((c,i)=>{
                      const emoji = CROP_EMOJIS[c.name?.toLowerCase()] || '🌱';
                      const score = c.score || 0;
                      const bar = score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : score >= 30 ? '#3b82f6' : '#e5e7eb';
                      return (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px' }}>
                          <span style={{ fontSize:11, color:'#9ca3af', fontWeight:700, width:16, textAlign:'center' }}>#{i+1}</span>
                          <span style={{ fontSize:16 }}>{emoji}</span>
                          <span style={{ flex:1, fontSize:12, fontWeight:700, color:'#111827', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                          <div style={{ width:60, height:5, borderRadius:99, background:'#f0f0f0', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${score}%`, background:bar, borderRadius:99, transition:'width 1s ease' }}/>
                          </div>
                          <span style={{ fontSize:11, fontWeight:800, color:bar, width:30, textAlign:'right' }}>{score}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Ranked list of other crops */}
              {rest.length > 0 && (
                <div>
                  <h3 style={{ fontSize:13, fontWeight:800, color:'#374151', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
                    Other Suitable Crops
                  </h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {rest.map((c,i)=>(
                      <CropRow key={i} crop={c} rank={i+2} delay={(i+1)*0.07} />
                    ))}
                  </div>
                </div>
              )}

              {/* Farming tips */}
              {(result.farming_tips||result.tips)?.length > 0 && (
                <div style={{ borderRadius:18, background:'linear-gradient(135deg,#052e16,#14532d)', padding: isMobile ? '18px 16px' : '24px 28px' }}>
                  <h3 style={{ fontSize:14, fontWeight:800, color:'white', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                    💡 Farming Tips &amp; Soil Advice
                  </h3>
                  <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(240px,1fr))', gap:8 }}>
                    {(result.farming_tips||result.tips).map((tip,i)=>(
                      <div key={i} style={{ padding:'12px 16px', borderRadius:12, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(134,239,172,0.2)', fontSize:13, color:'rgba(255,255,255,0.9)', lineHeight:1.65 }}>
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dataset attribution */}
              <DatasetPanel />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes rotate { to { transform: rotate(360deg); } }
        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  );
}
