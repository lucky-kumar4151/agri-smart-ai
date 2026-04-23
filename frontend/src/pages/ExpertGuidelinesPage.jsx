import { useState, useEffect, useCallback } from 'react';
import { expertGuidelinesAPI } from '../services/api';
import { useToast } from '../components/Toast';

/* ─── Priority badge ─────────────────────────────────────────────────────── */
const PriorityBadge = ({ priority }) => {
  const map = {
    critical: { label: 'Critical', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    high:     { label: 'High',     bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    medium:   { label: 'Medium',   bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  };
  const s = map[priority] || map.medium;
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 700,
      padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      {s.label}
    </span>
  );
};

/* ─── Step item with index number ──────────────────────────────────────────── */
const StepItem = ({ step, index, accentColor }) => (
  <div style={{
    display: 'flex', gap: 14, alignItems: 'flex-start',
    padding: '12px 16px', borderRadius: 12,
    background: '#fafafa', border: '1px solid #f0f0f0',
    transition: 'background 0.15s',
  }}
    onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5'; }}
    onMouseLeave={e => { e.currentTarget.style.background = '#fafafa'; }}
  >
    <div style={{
      flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: accentColor, color: 'white', fontSize: 11, fontWeight: 800,
    }}>
      {index + 1}
    </div>
    <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.7 }}>{step}</p>
  </div>
);

/* ─── Guideline topic accordion ────────────────────────────────────────────── */
function GuidelineTopic({ topic, accentColor, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      borderRadius: 14, border: '1.5px solid #e5e7eb',
      overflow: 'hidden', transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '14px 18px',
          background: open ? '#fafafa' : 'white', border: 'none',
          cursor: 'pointer', textAlign: 'left', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: accentColor,
          }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
            {topic.title}
          </span>
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 99,
            background: '#f3f4f6', color: '#6b7280', fontWeight: 600,
          }}>
            {topic.steps.length} steps
          </span>
        </div>
        <span style={{
          fontSize: 16, color: accentColor, flexShrink: 0,
          transition: 'transform 0.22s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topic.steps.map((step, i) => (
            <StepItem key={i} step={step} index={i} accentColor={accentColor} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Full category detail modal/panel ─────────────────────────────────────── */
function CategoryDetail({ data, onBack }) {
  const accentColor = data.color;

  return (
    <div style={{ animation: 'fadeSlideUp 0.3s ease-out both' }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          background: 'none', border: '1.5px solid #e5e7eb', borderRadius: 10,
          padding: '8px 14px', cursor: 'pointer', fontSize: 13,
          fontWeight: 600, color: '#374151', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
      >
        ← Back
      </button>

      {/* Header banner */}
      <div style={{
        borderRadius: 16, padding: 'clamp(16px, 4vw, 28px) clamp(14px, 4vw, 32px)',
        marginBottom: 20,
        background: `linear-gradient(135deg, ${data.color}18, ${data.color}08)`,
        border: `1.5px solid ${data.border}`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -20, top: -20,
          fontSize: 'clamp(60px, 15vw, 120px)', opacity: 0.07, userSelect: 'none',
        }}>
          {data.icon}
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'clamp(24px, 6vw, 36px)' }}>{data.icon}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                color: accentColor, textTransform: 'uppercase',
                padding: '3px 10px', borderRadius: 99,
                background: `${accentColor}18`, border: `1px solid ${data.border}`,
              }}>
                {data.category}
              </span>
              <PriorityBadge priority={data.priority} />
            </div>
          </div>
          <h2 style={{ fontSize: 'clamp(18px, 5vw, 26px)', fontWeight: 900, margin: '0 0 8px', color: '#111827', letterSpacing: '-0.02em' }}>
            {data.title}
          </h2>
          <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.7, margin: 0 }}>
            {data.introduction}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: 'white', color: '#374151', fontWeight: 600, border: '1px solid #e5e7eb' }}>
              📋 {data.guidelines?.length || 0} Topics
            </span>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: 'white', color: '#374151', fontWeight: 600, border: '1px solid #e5e7eb' }}>
              💡 {data.quick_tips?.length || 0} Tips
            </span>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: 'white', color: '#374151', fontWeight: 600, border: '1px solid #e5e7eb' }}>
              📚 ICAR / FAO
            </span>
          </div>
        </div>
      </div>

      {/* Guidelines topics */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
          📋 Detailed Guidelines
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(data.guidelines || []).map((topic, i) => (
            <GuidelineTopic key={i} topic={topic} accentColor={accentColor} defaultOpen={i === 0} />
          ))}
        </div>
      </div>

      {/* Quick tips */}
      {data.quick_tips?.length > 0 && (
        <div style={{
          borderRadius: 16,
          background: `linear-gradient(135deg, #052e16, #14532d)`,
          padding: 'clamp(16px, 4vw, 24px) clamp(14px, 4vw, 28px)',
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            💡 Quick Tips &amp; Practical Insights
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {data.quick_tips.map((tip, i) => (
              <div key={i} style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(134,239,172,0.2)',
                fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 1.65,
              }}>
                ✓ {tip}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>
            {data.source || 'AgriSmart Expert Knowledge Base — ICAR / FAO / SAUs'}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Category summary card ─────────────────────────────────────────────────── */
function CategoryCard({ item, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 18, padding: '22px 22px 18px',
        background: 'white', border: `1.5px solid ${item.border}`,
        cursor: 'pointer', transition: 'all 0.2s',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 10px 30px ${item.color}22`;
        e.currentTarget.style.borderColor = item.color;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)';
        e.currentTarget.style.borderColor = item.border;
      }}
    >
      {/* Background icon */}
      <div style={{
        position: 'absolute', right: -10, bottom: -10,
        fontSize: 72, opacity: 0.07, userSelect: 'none',
        pointerEvents: 'none',
      }}>
        {item.icon}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Icon + priority */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `${item.color}15`, border: `1.5px solid ${item.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>
            {item.icon}
          </div>
          <PriorityBadge priority={item.priority} />
        </div>

        {/* Category label */}
        <div style={{ fontSize: 10, fontWeight: 700, color: item.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          {item.category}
        </div>

        {/* Title */}
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: '0 0 8px', lineHeight: 1.35 }}>
          {item.title}
        </h3>

        {/* Intro snippet */}
        <p style={{
          fontSize: 12, color: '#6b7280', lineHeight: 1.6, margin: '0 0 16px',
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {item.introduction}
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 99,
            background: item.bg, color: item.color, fontWeight: 700,
            border: `1px solid ${item.border}`,
          }}>
            {item.topic_count} Topics
          </span>
          <span style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 99,
            background: '#f3f4f6', color: '#6b7280', fontWeight: 600,
          }}>
            {item.quick_tip_count} Tips
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 18, color: item.color, fontWeight: 700 }}>→</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Search results ─────────────────────────────────────────────────────────── */
function SearchResults({ results, query, onCategoryClick }) {
  if (results.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <p style={{ fontSize: 14, fontWeight: 600 }}>No results found for "{query}"</p>
        <p style={{ fontSize: 12 }}>Try searching for: disease, soil, water, pest, organic, seed</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
        Found <strong>{results.length}</strong> categories matching "{query}"
      </p>
      {results.map(r => (
        <div
          key={r.id}
          onClick={() => onCategoryClick(r.id)}
          style={{
            padding: '16px 20px', borderRadius: 14,
            background: 'white', border: '1.5px solid #e5e7eb',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#16a34a'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>{r.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{r.title}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{r.category}</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 18, color: '#16a34a' }}>→</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {r.matches?.slice(0, 3).map((m, i) => (
              <div key={i} style={{
                fontSize: 12, color: '#374151', padding: '6px 10px',
                borderRadius: 8, background: '#f9fafb',
                borderLeft: '3px solid #16a34a',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', marginRight: 6, textTransform: 'uppercase' }}>
                  {m.type}
                </span>
                {m.text}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
export default function ExpertGuidelinesPage() {
  const [categories,      setCategories]      = useState([]);
  const [selected,        setSelected]        = useState(null); // full detail object
  const [loading,         setLoading]         = useState(true);
  const [detailLoading,   setDetailLoading]   = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [searchResults,   setSearchResults]   = useState(null);
  const [searchLoading,   setSearchLoading]   = useState(false);
  const [error,           setError]           = useState('');
  const toast = useToast();

  // Load all categories on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await expertGuidelinesAPI.getAll();
        setCategories(res.data.categories || []);
      } catch (e) {
        setError('Failed to load expert guidelines. Please try again.');
        toast.error('Could not load guidelines');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load full detail for a category
  const openCategory = useCallback(async (id) => {
    setDetailLoading(true);
    setSelected(null);
    setSearchResults(null);
    setSearchQuery('');
    try {
      const res = await expertGuidelinesAPI.getDetail(id);
      setSelected(res.data);
    } catch (e) {
      toast.error('Failed to load guideline details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await expertGuidelinesAPI.search(searchQuery.trim());
        setSearchResults(res.data.results || []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 380);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const goBack = () => { setSelected(null); setSearchResults(null); setSearchQuery(''); };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fadeIn">
      {/* Page header */}
      <div className="page-header">
        <h1>📚 Expert Agricultural Guidelines</h1>
        <p>
          Professional, evidence-based agricultural guidelines sourced from ICAR, FAO, and State Agricultural Universities —
          covering disease management, soil health, IPM, water management, post-harvest, organic farming, and seed selection.
        </p>
      </div>

      {/* If showing detail view */}
      {selected ? (
        <CategoryDetail data={selected} onBack={goBack} />
      ) : (
        <>
          {/* Search bar */}
          <div style={{ marginBottom: 18 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px',
              borderRadius: 12, border: '1.5px solid #e5e7eb',
              background: 'white', boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{searchLoading ? '⏳' : '🔍'}</span>
              <input
                type="text"
                placeholder="Search — fungicide, soil, drip, organic…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  fontSize: 13, background: 'transparent', color: '#111827',
                  minWidth: 0,
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, flexShrink: 0 }}
                >✕</button>
              )}
            </div>
          </div>

          {/* Detail loading */}
          {detailLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, borderTopColor: '#16a34a', borderColor: 'rgba(22,163,74,0.15)', margin: '0 auto 16px' }} />
                <p style={{ color: '#6b7280', fontSize: 14 }}>Loading guidelines…</p>
              </div>
            </div>
          )}

          {/* Search results */}
          {searchResults !== null && !detailLoading && (
            <SearchResults results={searchResults} query={searchQuery} onCategoryClick={openCategory} />
          )}

          {/* Categories grid */}
          {searchResults === null && !detailLoading && (
            <>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, borderTopColor: '#16a34a', borderColor: 'rgba(22,163,74,0.15)', margin: '0 auto 16px' }} />
                    <p style={{ color: '#6b7280', fontSize: 14 }}>Loading expert guidelines…</p>
                  </div>
                </div>
              ) : error ? (
                <div className="alert alert-error" style={{ fontSize: 14 }}>⚠️ {error}</div>
              ) : (
                <>
                  {/* Info strip */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 20px', borderRadius: 14,
                    background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
                    border: '1.5px solid #bbf7d0', marginBottom: 22, flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: 24 }}>🏛️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#052e16' }}>
                        {categories.length} Expert Knowledge Modules Available
                      </div>
                      <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>
                        Curated from ICAR, FAO, and State Agricultural University publications · Click any module to read full guidelines
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['Disease', 'IPM', 'Soil', 'Water', 'PostHarvest', 'Organic'].map(tag => (
                        <span key={tag} style={{
                          fontSize: 10, padding: '3px 10px', borderRadius: 99,
                          background: 'white', color: '#16a34a',
                          border: '1.5px solid #bbf7d0', fontWeight: 700,
                        }}>{tag}</span>
                      ))}
                    </div>
                  </div>

                  {/* Category cards grid - 1 col on mobile, 2 on tablet, 3 on desktop */}
                  <div className="eg-grid">
                    {categories.map(item => (
                      <CategoryCard
                        key={item.id}
                        item={item}
                        onClick={() => openCategory(item.id)}
                      />
                    ))}
                  </div>

                  {/* Footer attribution */}
                  <div style={{
                    marginTop: 32, padding: '16px 20px', borderRadius: 14,
                    background: '#f9fafb', border: '1px solid #e5e7eb',
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: 20 }}>📖</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Knowledge Base Sources</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                        Indian Council of Agricultural Research (ICAR) · Food and Agriculture Organization (FAO) · State Agricultural Universities (SAUs) ·
                        National Horticulture Mission (NHM) · PM Krishi Sinchayee Yojana (PMKSY)
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                      Version 2025-Q1
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Expert Guidelines responsive grid */
        .eg-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        @media (max-width: 640px) {
          .eg-grid { grid-template-columns: 1fr; gap: 12px; }
        }
        @media (min-width: 641px) and (max-width: 1024px) {
          .eg-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}
