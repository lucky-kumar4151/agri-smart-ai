import { useState, useEffect, useMemo } from 'react';
import { dashboardAPI, feedbackAPI } from '../services/api';

const TYPE_META = {
  chat:              { icon: '💬', color: '#2d7a3a', label: 'Chat' },
  crop_prediction:   { icon: '🌾', color: '#4caf50', label: 'Crop' },
  disease_detection: { icon: '🔬', color: '#f5a623', label: 'Disease' },
  weather:           { icon: '🌤️', color: '#1e88e5', label: 'Weather' },
  market:            { icon: '📊', color: '#e53935', label: 'Market' },
};

function formatDateTime(isoStr) {
  if (!isoStr) return 'Unknown time';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return isoStr; }
}

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(isoStr);
}

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

// ── Clean up raw query strings for display ──────────────────────────────────
function formatQueryDisplay(query, type) {
  if (!query) return 'Unknown query';

  // Clean up weather coordinate queries: "Weather: Lat 31.26, Lon 75.70"
  const coordMatch = query.match(/Weather:\s*Lat\s*([\d.]+),\s*Lon\s*([\d.]+)/i);
  if (coordMatch) {
    return `🌤️ Weather Check (location detected)`;
  }

  // Clean up market price queries with raw params
  if (type === 'market' && query.toLowerCase().includes('price')) {
    return query.replace(/[{}“”"]/g, '').replace(/,\s*/g, ' | ').trim();
  }

  // Truncate very long queries
  if (query.length > 120) return query.slice(0, 117) + '…';
  return query;
}

// ── Extract crop/keyword from a query string ──────────────────────────────────
function extractCropKeyword(query) {
  const CROPS = [
    'wheat', 'rice', 'paddy', 'maize', 'corn', 'cotton', 'soybean', 'groundnut',
    'sugarcane', 'bajra', 'jowar', 'barley', 'millet', 'mustard', 'sunflower',
    'tomato', 'potato', 'onion', 'garlic', 'chickpea', 'lentil', 'pigeon pea',
    'moong', 'urad', 'arhar', 'dal', 'turmeric', 'ginger', 'mango', 'banana',
    'apple', 'grape', 'sugarcane', 'tea', 'coffee', 'rubber', 'jute', 'flax',
  ];
  const q = (query || '').toLowerCase();
  for (const c of CROPS) {
    if (q.includes(c)) return c.charAt(0).toUpperCase() + c.slice(1);
  }
  return null;
}

// ── Group history by extracted keyword ───────────────────────────────────────
function groupHistoryByCrop(history) {
  const groups = {};
  const ungrouped = [];

  history.forEach(item => {
    const keyword = extractCropKeyword(item.query);
    if (keyword) {
      if (!groups[keyword]) groups[keyword] = [];
      groups[keyword].push(item);
    } else {
      ungrouped.push(item);
    }
  });

  return { groups, ungrouped };
}

// ── Crop Group Card ───────────────────────────────────────────────────────────
function CropGroupCard({ cropName, items, onDelete, deleting }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[items[0]?.type] || { icon: '📋', color: '#7a9a7a', label: 'Activity' };
  const typeCount = {};
  items.forEach(it => { const lbl = TYPE_META[it.type]?.label || 'Other'; typeCount[lbl] = (typeCount[lbl] || 0) + 1; });
  const displayItems = expanded ? items : items.slice(0, 10);

  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden', border: '1.5px solid var(--border-light)',
      marginBottom: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      transition: 'box-shadow 0.2s',
    }}>
      {/* ── Group Header ── */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
          background: expanded ? 'linear-gradient(90deg,#e8f5e9,#f1f8e9)' : 'white',
          cursor: 'pointer', transition: 'background 0.2s',
          borderBottom: expanded ? '1px solid #c8e6c9' : 'none',
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = '#f9fdf9'; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'white'; }}
      >
        {/* Crop icon circle */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>🌾</div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1a2e1a' }}>{cropName}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#e8f5e9', color: '#2d7a3a', fontWeight: 700 }}>
              {items.length} queries
            </span>
            {Object.entries(typeCount).map(([lbl, cnt]) => (
              <span key={lbl} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#f5f5f5', color: '#555' }}>
                {lbl}: {cnt}
              </span>
            ))}
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Last: {timeAgo(items[0]?.timestamp)}
            </span>
          </div>
        </div>

        {/* Expand chevron */}
        <div style={{
          fontSize: 18, color: '#2d7a3a', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s', userSelect: 'none',
        }}>▾</div>
      </div>

      {/* ── Expanded Items ── */}
      {expanded && (
        <div style={{ background: '#fafafa' }}>
          {displayItems.map((item, idx) => {
            const m = TYPE_META[item.type] || { icon: '📋', color: '#7a9a7a', label: 'Activity' };
            return (
              <div key={item._id || idx} style={{
                display: 'flex', gap: 10, padding: '11px 16px', alignItems: 'flex-start',
                borderBottom: idx < displayItems.length - 1 ? '1px solid var(--border-light)' : 'none',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Index number */}
                <div style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                  background: `${m.color}15`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 11, fontWeight: 700, color: m.color,
                }}>{idx + 1}</div>

                {/* Type icon */}
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: `${m.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>{m.icon}</div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1a2e1a', wordBreak: 'break-word', lineHeight: 1.4, margin: 0 }}>
                    {formatQueryDisplay(item.query, item.type)}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ padding: '1px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: `${m.color}12`, color: m.color }}>{m.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🕐 {formatDateTime(item.timestamp)}</span>
                    {item.timestamp && <span style={{ fontSize: 10, color: '#aaa' }}>({timeAgo(item.timestamp)})</span>}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(item._id); }}
                  disabled={deleting === item._id}
                  style={{
                    width: 26, height: 26, borderRadius: 6, border: 'none', background: '#fef2f2', color: '#e53935',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, flexShrink: 0, opacity: deleting === item._id ? 0.5 : 1,
                  }}
                  title="Delete">🗑</button>
              </div>
            );
          })}

          {/* Show more */}
          {!expanded || items.length > 10 ? null : null}
          {items.length > 10 && !expanded && (
            <div style={{ padding: '10px 16px', textAlign: 'center' }}>
              <button onClick={() => setExpanded(true)} style={{
                padding: '6px 16px', borderRadius: 10, border: '1px solid #2d7a3a',
                background: 'transparent', color: '#2d7a3a', fontSize: 12, cursor: 'pointer', fontWeight: 600,
              }}>Show all {items.length} queries ↓</button>
            </div>
          )}
          {items.length > displayItems.length && (
            <div style={{ padding: '10px 16px', textAlign: 'center' }}>
              <button onClick={() => setExpanded(true)} style={{
                padding: '6px 16px', borderRadius: 10, border: '1px solid #2d7a3a',
                background: 'transparent', color: '#2d7a3a', fontSize: 12, cursor: 'pointer', fontWeight: 600,
              }}>+{items.length - displayItems.length} more queries</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [deleting, setDeleting] = useState('');
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'flat'

  // Feedback modal state
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbType, setFbType]       = useState('general');
  const [fbRating, setFbRating]   = useState(0);
  const [fbHover, setFbHover]     = useState(0);
  const [fbContent, setFbContent] = useState('');
  const [fbPage, setFbPage]       = useState('History');
  const [fbLoading, setFbLoading] = useState(false);
  const [fbSuccess, setFbSuccess] = useState('');
  const [fbError, setFbError]     = useState('');
  const [submittedAt, setSubmittedAt] = useState('');

  useEffect(() => { loadHistory(); }, [filter]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const type = filter === 'all' ? undefined : filter;
      const res = await dashboardAPI.getSearchHistory(type, 100);
      setHistory(res.data?.history || []);
    } catch { setHistory([]); }
    finally { setLoading(false); }
  };

  const deleteItem = async (id) => {
    setDeleting(id);
    try {
      await dashboardAPI.deleteHistoryItem(id);
      setHistory(prev => prev.filter(h => h._id !== id));
    } catch { alert('Failed to delete item'); }
    setDeleting('');
  };

  const clearAll = async () => {
    if (!window.confirm('Clear all history? This cannot be undone.')) return;
    try { await dashboardAPI.clearHistory(); setHistory([]); }
    catch { alert('Failed to clear history'); }
  };

  const openFeedback = () => {
    setFbType('general'); setFbRating(0); setFbHover(0); setFbContent('');
    setFbPage('History'); setFbSuccess(''); setFbError(''); setSubmittedAt('');
    setShowFeedback(true);
  };

  const submitFeedback = async () => {
    if (!fbContent.trim()) { setFbError('Please enter your feedback.'); return; }
    if (fbRating === 0) { setFbError('Please select a rating.'); return; }
    setFbLoading(true); setFbError(''); setFbSuccess('');
    try {
      const res = await feedbackAPI.submit({ type: fbType, rating: fbRating, content: fbContent, page: fbPage });
      const ts = res.data?.submitted_at ? formatDateTime(res.data.submitted_at) : formatDateTime(new Date().toISOString());
      setSubmittedAt(ts); setFbSuccess(`✅ Feedback submitted on ${ts}`);
      setFbContent(''); setFbRating(0); setFbType('general');
      setTimeout(() => { setShowFeedback(false); setFbSuccess(''); setSubmittedAt(''); }, 3500);
    } catch (e) { setFbError(e.response?.data?.detail || 'Submission failed.'); }
    setFbLoading(false);
  };

  const FILTER_TABS = [
    { key: 'all',               label: 'All' },
    { key: 'chat',              label: '💬 Chat' },
    { key: 'crop_prediction',   label: '🌾 Crops' },
    { key: 'disease_detection', label: '🔬 Disease' },
    { key: 'weather',           label: '🌤 Weather' },
    { key: 'market',            label: '📊 Market' },
  ];

  const activeStar = fbHover || fbRating;

  // Group history by crop keyword
  const { groups, ungrouped } = useMemo(() => groupHistoryByCrop(history), [history]);
  const sortedCrops = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);

  // Stats
  const totalCrops = Object.keys(groups).length;
  const totalGrouped = Object.values(groups).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="animate-fadeIn" style={{ overflowX: 'hidden', maxWidth: '100%' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(18px,4vw,22px)', fontWeight: 800, color: '#1a2e1a', margin: 0 }}>📋 Activity History</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Your past queries, predictions and searches — grouped by crop</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={openFeedback} style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid #2d7a3a',
            background: '#f0faf0', color: '#2d7a3a', fontWeight: 600, fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>📝 Feedback</button>
          {history.length > 0 && (
            <button onClick={clearAll} style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid #fecaca',
              background: '#fef2f2', color: '#e53935', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>🗑 Clear All</button>
          )}
        </div>
      </div>

      {/* ── Stats Row ── */}
      {history.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { icon: '📋', label: 'Total Queries', val: history.length, color: '#2d7a3a' },
            { icon: '🌾', label: 'Crop Topics', val: totalCrops, color: '#4caf50' },
            { icon: '🔗', label: 'Grouped', val: totalGrouped, color: '#1e88e5' },
            { icon: '📄', label: 'Other', val: ungrouped.length, color: '#9ca3af' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter Tabs + View Toggle ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, WebkitOverflowScrolling: 'touch' }}>
          {FILTER_TABS.map(tab => (
            <button key={tab.key}
              className={`btn btn-sm ${filter === tab.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={() => setFilter(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>
        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-input)', padding: 3, borderRadius: 8 }}>
          {[{ key: 'grouped', label: '🌾 Grouped' }, { key: 'flat', label: '📋 All' }].map(v => (
            <button key={v.key} onClick={() => setViewMode(v.key)} style={{
              padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: viewMode === v.key ? 'white' : 'transparent',
              boxShadow: viewMode === v.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              color: viewMode === v.key ? 'var(--text-primary)' : 'var(--text-muted)',
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* ── History Content ── */}
      {loading ? (
        <div className="flex-center" style={{ height: '40vh' }}><div className="spinner" /></div>
      ) : history.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ fontSize: 36, marginBottom: 10 }}>📭</p>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a2e1a', marginBottom: 6 }}>No history found</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Use AI assistant, crop recommendations, or disease detection to see history here.</p>
        </div>
      ) : viewMode === 'grouped' ? (
        <div>
          {/* Crop Groups */}
          {sortedCrops.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#1a2e1a' }}>🌾 Queries by Crop</h3>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#e8f5e9', color: '#2d7a3a', fontWeight: 700 }}>{sortedCrops.length} crops</span>
              </div>
              {sortedCrops.map(([cropName, items]) => (
                <CropGroupCard
                  key={cropName}
                  cropName={cropName}
                  items={items}
                  onDelete={deleteItem}
                  deleting={deleting}
                />
              ))}
            </div>
          )}

          {/* Ungrouped items */}
          {ungrouped.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#1a2e1a' }}>📄 Other Activities</h3>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#f5f5f5', color: '#555', fontWeight: 700 }}>{ungrouped.length}</span>
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {ungrouped.slice(0, 20).map((item, i) => {
                  const meta = TYPE_META[item.type] || { icon: '📋', color: '#7a9a7a', label: 'Activity' };
                  return (
                    <div key={item._id || i} style={{
                      padding: '11px 14px', display: 'flex', gap: 10, borderBottom: i < Math.min(ungrouped.length, 20) - 1 ? '1px solid var(--border-light)' : 'none',
                      alignItems: 'flex-start', transition: 'background 0.1s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `${meta.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{meta.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1a2e1a', wordBreak: 'break-word', lineHeight: 1.4, margin: 0 }}>
                          {formatQueryDisplay(item.query, item.type)}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ padding: '1px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: `${meta.color}12`, color: meta.color }}>{meta.label}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🕐 {formatDateTime(item.timestamp)}</span>
                          {item.timestamp && <span style={{ fontSize: 10, color: '#aaa' }}>({timeAgo(item.timestamp)})</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteItem(item._id)} disabled={deleting === item._id}
                        style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#fef2f2', color: '#e53935', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, opacity: deleting === item._id ? 0.5 : 1 }}>🗑</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Flat View ── */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {history.map((item, i) => {
            const meta = TYPE_META[item.type] || { icon: '📋', color: '#7a9a7a', label: 'Activity' };
            const cropKeyword = extractCropKeyword(item.query);
            return (
              <div key={item._id || i} style={{
                padding: '12px 14px', display: 'flex', gap: 10,
                borderBottom: i < history.length - 1 ? '1px solid var(--border-light)' : 'none',
                flexWrap: 'wrap', alignItems: 'flex-start', transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: `${meta.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{meta.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1a2e1a', wordBreak: 'break-word', lineHeight: 1.4, margin: 0 }}>
                    {formatQueryDisplay(item.query, item.type)}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: `${meta.color}12`, color: meta.color }}>{meta.label}</span>
                    {cropKeyword && <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: '#e8f5e9', color: '#2d7a3a' }}>🌾 {cropKeyword}</span>}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🕐 {formatDateTime(item.timestamp)}</span>
                    {item.timestamp && <span style={{ fontSize: 10, color: '#aaa' }}>({timeAgo(item.timestamp)})</span>}
                  </div>
                </div>
                <button onClick={() => deleteItem(item._id)} disabled={deleting === item._id}
                  style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#fef2f2', color: '#e53935', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, opacity: deleting === item._id ? 0.5 : 1, touchAction: 'manipulation' }}
                  title="Delete">🗑</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FEEDBACK MODAL ── */}
      {showFeedback && (
        <>
          <div onClick={() => setShowFeedback(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 'min(480px,calc(100vw - 20px))', background: 'white', borderRadius: 20, zIndex: 301,
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)', maxHeight: '94dvh', overflowY: 'auto',
          }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#f0faf0,#fff)', position: 'sticky', top: 0, zIndex: 1 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a2e1a', margin: 0 }}>📝 Share Your Feedback</h2>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Help us improve AgriSmart</p>
              </div>
              <button onClick={() => setShowFeedback(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999', lineHeight: 1, padding: '4px 8px' }}>×</button>
            </div>
            <div style={{ padding: '18px 22px', display: 'grid', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feedback Type</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[{ val: 'general', icon: '💬', label: 'General' }, { val: 'bug', icon: '🐞', label: 'Bug' }, { val: 'suggestion', icon: '💡', label: 'Suggestion' }, { val: 'praise', icon: '⭐', label: 'Praise' }].map(t => (
                    <button key={t.val} onClick={() => setFbType(t.val)} style={{ padding: '7px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', border: `1.5px solid ${fbType === t.val ? '#2d7a3a' : 'var(--border)'}`, background: fbType === t.val ? '#e8f5e9' : 'white', color: fbType === t.val ? '#2d7a3a' : 'var(--text-secondary)' }}>{t.icon} {t.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Related Feature</label>
                <select className="input-field" value={fbPage} onChange={e => setFbPage(e.target.value)}>
                  {['History', 'AI Chatbot', 'Crop Recommendation', 'Disease Detection', 'Weather', 'Market Prices', 'Community', 'Dashboard', 'Profile', 'General'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rating <span style={{ color: '#e53935' }}>*</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setFbRating(n)} onMouseEnter={() => setFbHover(n)} onMouseLeave={() => setFbHover(0)}
                      style={{ width: 42, height: 42, borderRadius: 10, cursor: 'pointer', border: `2px solid ${n <= activeStar ? '#f59e0b' : '#e5e7eb'}`, background: n <= activeStar ? '#fffbeb' : 'white', fontSize: 22, transition: 'all 0.15s', transform: n <= activeStar ? 'scale(1.1)' : 'scale(1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {n <= activeStar ? '⭐' : '☆'}
                    </button>
                  ))}
                  <div style={{ marginLeft: 10 }}>
                    {activeStar > 0 ? (
                      <><span style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>{activeStar}/5</span><span style={{ fontSize: 12, color: '#6b7280', marginLeft: 6 }}>— {STAR_LABELS[activeStar]}</span></>
                    ) : <span style={{ fontSize: 12, color: '#9ca3af' }}>Tap a star</span>}
                  </div>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Message <span style={{ color: '#e53935' }}>*</span></label>
                <textarea className="input-field" rows={4} placeholder="Tell us what you think, what's broken, or what you'd like to see…"
                  value={fbContent} onChange={e => setFbContent(e.target.value)} style={{ resize: 'vertical', fontFamily: 'Inter', fontSize: 13 }} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{fbContent.length}/2000 characters</p>
              </div>
              {fbError && <div className="alert alert-error" style={{ padding: '10px 14px', fontSize: 13 }}>❌ {fbError}</div>}
              {fbSuccess && <div className="alert alert-success" style={{ padding: '10px 14px', fontSize: 13 }}>{fbSuccess}</div>}
              <button className="btn btn-primary btn-lg" onClick={submitFeedback} disabled={fbLoading || fbRating === 0 || !fbContent.trim()} style={{ borderRadius: 12 }}>
                {fbLoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Submitting…</span> : '🚀 Submit Feedback'}
              </button>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: -8 }}>
                🕐 Will be submitted at: <strong>{formatDateTime(new Date().toISOString())}</strong>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
