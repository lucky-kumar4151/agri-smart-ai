import { useState, useRef } from 'react';
import { predictAPI } from '../services/api';
import { useToast } from '../components/Toast';

/* ─── Confidence ring ─────────────────────────────────────────────────────── */
function ConfidenceRing({ value, isHealthy }) {
  const size = 80, stroke = 7;
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const color = isHealthy ? '#16a34a' : value >= 70 ? '#dc2626' : value >= 50 ? '#d97706' : '#6b7280';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(.2,1.4,.5,1)' }} />
        <text x={size/2} y={size/2 - 4} textAnchor="middle" dominantBaseline="middle"
          fontSize={16} fontWeight="800" fill={color}>{value}</text>
        <text x={size/2} y={size/2 + 12} textAnchor="middle" dominantBaseline="middle"
          fontSize={9} fill="#9ca3af">%</text>
      </svg>
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color }}>
        {isHealthy ? 'Healthy' : value >= 70 ? 'High' : value >= 50 ? 'Medium' : 'Low'} conf.
      </span>
    </div>
  );
}

/* ─── Section card ─────────────────────────────────────────────────────────── */
function ResultSection({ icon, title, accentColor, accentBg, children }) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <h3 style={{
        fontSize: 13, fontWeight: 800, marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 8,
        color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function DiseaseDetectionPage() {
  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [dragActive,  setDragActive]  = useState(false);
  const inputRef = useRef(null);
  const toast    = useToast();

  const handleFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Please upload an image file — JPEG, PNG, or WEBP.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File size must be under 10 MB.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) { setError('Please select an image first.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await predictAPI.diseaseDetection(file);
      setResult(res.data);
      toast.success('Disease analysis complete!');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg    = detail || `Analysis failed (${err.response?.status || 'network error'}). Please try a different image.`;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(''); };
  const isHealthy = result?.disease_name?.toLowerCase().includes('healthy');

  return (
    <div className="animate-fadeIn">
      {/* Page header */}
      <div className="page-header">
        <h1>🔬 Plant Disease Detection</h1>
        <p>
          Upload a plant leaf photo — our <strong>AI Vision API (Groq AI · Llama 4 Scout)</strong> analyses your
          actual image to identify disease symptoms, lesion patterns, and severity with clinical precision.
        </p>
      </div>



      <div style={{
        display: 'grid',
        gridTemplateColumns: result ? 'repeat(auto-fit, minmax(340px, 1fr))' : '1fr',
        gap: 24,
      }}>
        {/* ── Upload Panel ── */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#111827' }}>
              📤 Upload Plant Image
            </h3>
            <span className="badge badge-info" style={{ fontSize: 10 }}>AI Vision Analysis</span>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--primary)' : preview ? 'var(--primary-200)' : 'var(--border)'}`,
              borderRadius: 14, padding: preview ? 0 : 52, textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              background: dragActive ? 'rgba(22,163,74,0.04)' : 'var(--bg-input)',
              overflow: 'hidden', position: 'relative', minHeight: 220,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Uploaded plant leaf for disease analysis"
                style={{ width: '100%', maxHeight: 400, objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <div>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🌿</div>
                <p style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)', fontSize: 14 }}>
                  Drop image here or click to browse
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  JPEG · PNG · WEBP — max 10 MB
                </p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>

          {/* File info */}
          {file && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginTop: 10,
              padding: '8px 12px', borderRadius: 10,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
            }}>
              <span style={{ fontSize: 16 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 11, color: '#4b5563' }}>
                  {(file.size / 1024).toFixed(0)} KB · {file.type}
                </div>
              </div>
              <span className="badge badge-success" style={{ fontSize: 10 }}>Ready</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="alert alert-error" style={{ marginTop: 14, fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={handleSubmit}
              className="btn btn-primary btn-lg"
              disabled={!file || loading}
              style={{ flex: 1 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 6, height: 6, borderRadius: '50%', background: 'white',
                        animation: `bounce 1.4s infinite ${i * 0.16}s`, display: 'inline-block',
                      }} />
                    ))}
                  </span>
                  Analysing Image via AI…
                </span>
              ) : '🔍 Detect Disease'}
            </button>
            {file && (
              <button onClick={reset} className="btn btn-secondary btn-lg">Reset</button>
            )}
          </div>

          {/* Tips */}
          <div style={{
            marginTop: 18, padding: 16, borderRadius: 12,
            background: 'rgba(22,163,74,0.04)', border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
              💡 Tips for best diagnosis results:
            </p>
            {[
              'Take a clear, close-up photo of the affected leaf — fill the frame',
              'Use natural daylight — avoid harsh shadows or flash glare',
              'Include both symptomatic and healthy areas of the same leaf',
              'Use a plain, light-coloured background for maximum contrast',
              'Photograph multiple affected leaves for more comprehensive analysis',
            ].map((tip, i) => (
              <p key={i} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: i < 4 ? 4 : 0 }}>
                • {tip}
              </p>
            ))}
          </div>
        </div>

        {/* ── Results Panel ── */}
        {result && result.disease_name && (
          <div className="animate-slideIn">
            {/* Main diagnosis card */}
            <div className="card" style={{
              marginBottom: 14,
              borderColor: isHealthy ? 'rgba(67,160,71,0.4)' : 'rgba(229,57,53,0.35)',
              background: isHealthy
                ? 'linear-gradient(135deg, #e8f5e9, #f1f8e9)'
                : 'linear-gradient(135deg, #fff5f5, #fff3e0)',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 22 }}>{isHealthy ? '✅' : '⚠️'}</span>
                    <h3 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: '#111827', letterSpacing: '-0.02em' }}>
                      {result.disease_name}
                    </h3>
                  </div>
                  {result.crop_type && result.crop_type !== 'Unknown' && (
                    <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 8px' }}>
                      🌱 <strong>Crop identified:</strong> {result.crop_type}
                    </p>
                  )}
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0 }}>
                    {result.description}
                  </p>
                </div>
                <ConfidenceRing value={result.confidence || 0} isHealthy={isHealthy} />
              </div>

              {/* Method badge */}
              {result.analysis_method && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span className="badge badge-info" style={{ fontSize: 10 }}>
                    🤖 {result.analysis_method}
                  </span>
                  <span className="badge badge-success" style={{ fontSize: 10 }}>
                    📷 Photo Analysis
                  </span>
                </div>
              )}
            </div>

            {/* Alternative diagnoses */}
            {Array.isArray(result.alternatives) && result.alternatives.length > 0 && (
              <ResultSection icon="🔄" title="Alternative Diagnoses" accentColor="#3b82f6" accentBg="#eff6ff">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {result.alternatives.map((alt, i) => alt && (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', borderRadius: 10, background: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: 13, color: '#374151' }}>{alt.name || 'Unknown'}</span>
                      <span className="badge badge-warning" style={{ fontSize: 10 }}>{alt.confidence || 0}%</span>
                    </div>
                  ))}
                </div>
              </ResultSection>
            )}

            {/* Treatment plan — uses AI/API recommendations based on detected disease */}
            {Array.isArray(result.treatment) && result.treatment.length > 0 && (
              <ResultSection icon="💊" title="Treatment Plan" accentColor="#16a34a" accentBg="#f0fdf4">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.treatment.map((t, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                      padding: '10px 14px', borderRadius: 10,
                      background: '#fafafa', border: '1px solid #f0f0f0',
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#16a34a', color: 'white',
                        fontSize: 10, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>{i + 1}</div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.65 }}>{t}</p>
                    </div>
                  ))}
                </div>
              </ResultSection>
            )}

            {/* Recommended pesticides */}
            {Array.isArray(result.pesticide) && result.pesticide.length > 0 && (
              <ResultSection icon="🧪" title="Recommended Pesticides / Fungicides" accentColor="#d97706" accentBg="#fffbeb">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.pesticide.map((p, i) => (
                    <span key={i} style={{
                      padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                      background: '#fffbeb', border: '1.5px solid #fde68a', color: '#92400e',
                    }}>
                      🧫 {p}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10 }}>
                  ⚠️ Always follow the manufacturer's label dosage. Use proper PPE during application. Observe the pre-harvest interval (PHI).
                </p>
              </ResultSection>
            )}

            {/* Prevention */}
            {Array.isArray(result.prevention) && result.prevention.length > 0 && (
              <ResultSection icon="🛡️" title="Prevention & Cultural Practices" accentColor="#7c3aed" accentBg="#f5f3ff">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {result.prevention.map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      fontSize: 13, color: '#374151',
                    }}>
                      <span style={{ color: '#7c3aed', flexShrink: 0, fontWeight: 700 }}>✓</span>
                      <span style={{ lineHeight: 1.65 }}>{p}</span>
                    </div>
                  ))}
                </div>
              </ResultSection>
            )}

            {/* Expert Guidelines CTA */}
            <div style={{
              padding: '18px 20px', borderRadius: 16,
              background: 'linear-gradient(135deg, #052e16, #14532d)',
              border: '1.5px solid rgba(134,239,172,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 32 }}>📚</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 4 }}>
                    Want comprehensive disease management protocols?
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                    Visit the Expert Guidelines module for ICAR-approved treatment protocols, IPM strategies, and organic alternatives.
                  </div>
                </div>
                <a
                  href="/expert-guidelines"
                  style={{
                    flexShrink: 0, padding: '8px 16px', borderRadius: 10,
                    background: '#16a34a', color: 'white', fontWeight: 700,
                    fontSize: 12, textDecoration: 'none', border: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}
                >
                  📖 Expert Guidelines →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
