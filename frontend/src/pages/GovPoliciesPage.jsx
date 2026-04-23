import { useState, useEffect } from 'react';
import { govPoliciesAPI } from '../services/api';

export default function GovPoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchPolicies(); }, []);

  const fetchPolicies = async (category) => {
    setLoading(true); setError('');
    try {
      const res = await govPoliciesAPI.getAll(category || undefined);
      setPolicies(res.data.policies || []);
      setCategories(res.data.categories || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load policies.');
    } finally { setLoading(false); }
  };

  const handleCategoryFilter = (cat) => {
    setActiveCategory(cat);
    fetchPolicies(cat || undefined);
    setExpanded(null);
  };

  const filtered = search.trim()
    ? policies.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
      )
    : policies;

  const categoryColors = {
    'Income Support': { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
    'Crop Insurance': { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
    'Solar Energy': { bg: '#fff8e1', color: '#e65100', border: '#ffe082' },
    'Market Access': { bg: '#f3e5f5', color: '#7b1fa2', border: '#ce93d8' },
    'Soil Health': { bg: '#efebe9', color: '#4e342e', border: '#bcaaa4' },
    'Credit & Finance': { bg: '#e8eaf6', color: '#283593', border: '#9fa8da' },
    'Organic Farming': { bg: '#e8f5e9', color: '#1b5e20', border: '#a5d6a7' },
    'Food Security': { bg: '#fff3e0', color: '#bf360c', border: '#ffcc80' },
    'Pension': { bg: '#e0f2f1', color: '#00695c', border: '#80cbc4' },
    'Infrastructure': { bg: '#fce4ec', color: '#880e4f', border: '#f48fb1' },
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>🏛️ Government Policies & Schemes</h1>
        <p>All major Indian government agricultural schemes and benefits for farmers — Updated 2025-26</p>
      </div>

      {/* Search & Filter */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <input
            className="input-field"
            placeholder="Search schemes by name, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => handleCategoryFilter('')}
            className={`btn btn-sm ${activeCategory === '' ? 'btn-primary' : 'btn-secondary'}`}
          >All Schemes</button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryFilter(cat)}
              className={`btn btn-sm ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
            >{cat}</button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="flex-center" style={{ padding: 48 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏛️</div>
            <h3>No schemes found</h3>
            <p>Try a different search or category filter.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map((policy) => {
            const isExpanded = expanded === policy.id;
            const catStyle = categoryColors[policy.category] || { bg: '#f5f5f5', color: '#333', border: '#ddd' };

            return (
              <div
                key={policy.id}
                className="card card-hover"
                onClick={() => setExpanded(isExpanded ? null : policy.id)}
                style={{
                  cursor: 'pointer',
                  borderLeft: `4px solid ${catStyle.color}`,
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: catStyle.bg, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, flexShrink: 0,
                  }}>
                    {policy.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>
                      {policy.name}
                    </h3>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        background: catStyle.bg, color: catStyle.color,
                      }}>{policy.category}</span>
                      <span className="badge badge-success">{policy.status}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p style={{
                  fontSize: 13, color: 'var(--text-secondary)',
                  lineHeight: 1.6, marginBottom: 12,
                }}>{policy.description}</p>

                {/* Ministry */}
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                  📋 {policy.ministry}
                </p>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="animate-fadeIn" style={{ marginTop: 12, borderTop: '1px solid var(--border-light)', paddingTop: 14 }}>
                    {/* Eligibility */}
                    <div style={{ marginBottom: 14 }}>
                      <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>
                        👤 Eligibility
                      </h4>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {policy.eligibility}
                      </p>
                    </div>

                    {/* Benefits */}
                    <div style={{ marginBottom: 14 }}>
                      <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>
                        ✅ Key Benefits
                      </h4>
                      {policy.benefits?.map((b, i) => (
                        <div key={i} style={{
                          padding: '6px 10px', borderRadius: 8, marginBottom: 4,
                          background: '#f0fdf4', border: '1px solid #bbf7d0',
                          fontSize: 12, color: '#166534', lineHeight: 1.5,
                        }}>✓ {b}</div>
                      ))}
                    </div>

                    {/* How to Apply */}
                    <div style={{ marginBottom: 14 }}>
                      <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>
                        📝 How to Apply
                      </h4>
                      <p style={{
                        fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
                        padding: '8px 12px', background: '#fffde7', borderRadius: 8,
                        border: '1px solid #fff9c4',
                      }}>{policy.how_to_apply}</p>
                    </div>

                    {/* Website */}
                    {policy.website && (
                      <a
                        href={policy.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%', marginTop: 4 }}
                      >
                        🌐 Visit Official Website
                      </a>
                    )}
                  </div>
                )}

                {/* Expand indicator */}
                <div style={{
                  textAlign: 'center', marginTop: 8,
                  fontSize: 11, color: 'var(--text-muted)',
                }}>
                  {isExpanded ? '▲ Click to collapse' : '▼ Click for details'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Source */}
      <div style={{
        marginTop: 24, padding: '12px 16px', borderRadius: 10,
        background: 'var(--bg-input)', fontSize: 11, color: 'var(--text-muted)',
        textAlign: 'center',
      }}>
        📋 Source: Government of India — Ministry of Agriculture & Farmers Welfare | Data valid for 2025-26
      </div>
    </div>
  );
}
