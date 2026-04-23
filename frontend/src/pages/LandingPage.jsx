import { Link } from 'react-router-dom';

const features = [
  { title: 'AI Chatbot', desc: 'Ask anything in Hindi, Punjabi, Tamil & more. Voice & text support.', icon: '💬', color: '#1a7a3a', bg: '#f0fdf4' },
  { title: 'Crop Recommendation', desc: 'ML-powered crop suggestions based on your soil, climate & region.', icon: '🌾', color: '#d97706', bg: '#fffbeb' },
  { title: 'Disease Detection', desc: 'Upload a leaf photo for instant AI disease diagnosis & treatment.', icon: '🔬', color: '#dc2626', bg: '#fef2f2' },
  { title: 'Weather Advisory', desc: 'Real-time forecasts with daily farming safety recommendations.', icon: '🌤️', color: '#1e88e5', bg: '#eff6ff' },
  { title: 'Market Prices', desc: 'Live mandi prices and MSP data for 23+ crops across India.', icon: '📈', color: '#7c3aed', bg: '#faf5ff' },
  { title: 'Govt Policies', desc: 'PM-KISAN, PMFBY and all farming schemes simplified for you.', icon: '🏛️', color: '#0891b2', bg: '#f0fdfe' },
  { title: 'Farmer Community', desc: 'Connect with thousands of other farmers, share tips, and learn together.', icon: '🤝', color: '#db2777', bg: '#fdf2f8' },
  { title: 'Action History', desc: 'Review your past disease scans, weather checks, and AI advice anytime.', icon: '⏳', color: '#4f46e5', bg: '#eef2ff' },
];

export default function LandingPage() {
  return (
    <div className="landing-page" style={{ paddingTop: 60, minHeight: '100vh', background: '#f8faf8', fontFamily: 'Inter, sans-serif' }}>

      {/* ══════════════════════ NAV ══════════════════════ */}
      <nav style={{
        padding: '0 clamp(16px, 4vw, 40px)', height: 60, width: '100%',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(16px)', position: 'fixed', top: 0, left: 0, zIndex: 100,
        boxShadow: '0 1px 12px rgba(0,0,0,0.05)',
      }}>
        <Link to="/" style={{
          fontSize: 'clamp(20px, 4vw, 22px)', fontWeight: 900, fontFamily: 'Manrope, Outfit, sans-serif',
          letterSpacing: '-0.03em', textDecoration: 'none',
          background: 'linear-gradient(135deg, #006028, #2d9e50)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>AgriSmart</Link>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/login" className="landing-nav-btn-ghost" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 99, fontWeight: 600, lineHeight: 1,
            border: '1.5px solid #d1d5db', background: 'white', color: '#374151',
            textDecoration: 'none', transition: 'all 0.15s',
          }}>Login</Link>
          <Link to="/register" className="landing-nav-btn-primary" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 99, fontWeight: 700, lineHeight: 1,
            background: 'linear-gradient(135deg, #006028, #1a7a3a)', color: 'white',
            textDecoration: 'none', boxShadow: '0 4px 14px rgba(0,96,40,0.30)',
          }}>Sign Up</Link>
        </div>
      </nav>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="landing-hero" style={{
        minHeight: 'calc(100vh - 60px)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(32px, 6vh, 80px) clamp(16px, 5vw, 40px)',
        background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 60%, #e8f5e9 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: '10%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(26,122,58,0.06)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '5%', right: '-8%', width: 350, height: 350, borderRadius: '50%', background: 'rgba(76,175,80,0.07)', filter: 'blur(50px)', pointerEvents: 'none' }} />

        <div className="landing-hero-inner" style={{ 
          position: 'relative', zIndex: 1, 
          maxWidth: 1200, width: '100%', 
          display: 'flex', alignItems: 'center', gap: 'clamp(32px, 5vw, 64px)',
          flexWrap: 'wrap'
        }}>
          {/* Left Text */}
          <div className="landing-hero-text" style={{ flex: '1 1 400px', textAlign: 'left' }}>
            <h1 style={{
              fontSize: 'clamp(40px, 6vw, 68px)', fontWeight: 900, lineHeight: 1.08,
              letterSpacing: '-0.03em', marginBottom: 20,
              fontFamily: 'Manrope, Outfit, sans-serif', color: '#0f1f0f',
            }}>
              Grow Smarter with{' '}
              <span style={{
                background: 'linear-gradient(135deg, #006028, #1a7a3a, #2d9e50)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>AI Farming</span>
            </h1>

            <p style={{
              fontSize: 'clamp(16px, 2vw, 18px)', color: '#3d6b3d', maxWidth: 520,
              marginBottom: 32, lineHeight: 1.65,
            }}>
              Crop recommendations, disease detection, market prices & weather — all in <strong>your language</strong>, powered by AI.
            </p>

            {/* CTA buttons */}
            <div className="landing-cta-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/register" className="landing-btn-primary" style={{
                padding: '13px 32px',
                borderRadius: 99, fontSize: 15, fontWeight: 800,
                background: 'linear-gradient(135deg, #006028, #1a7a3a)',
                color: 'white', textDecoration: 'none',
                boxShadow: '0 8px 28px rgba(0,96,40,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                display: 'inline-block',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,96,40,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,96,40,0.35)'; }}
              >
                Start for Free
              </Link>
              <Link to="/login" className="landing-btn-secondary" style={{
                padding: '13px 32px',
                borderRadius: 99, fontSize: 15, fontWeight: 700,
                background: 'white', color: '#1a7a3a', textDecoration: 'none',
                border: '2px solid #86efac',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                display: 'inline-block',
              }}>
                Sign In
              </Link>
            </div>
          </div>

          {/* Right Image */}
          <div className="landing-hero-image" style={{ flex: '1 1 400px', display: 'flex', justifyContent: 'center' }}>
            <img 
              src="/hero-farmer.png" 
              alt="Indian farmer using smart agriculture AI app" 
              style={{
                width: '100%', maxWidth: 540,
                borderRadius: 24,
                boxShadow: '0 24px 48px rgba(0,96,40,0.15)',
                objectFit: 'cover',
                border: '4px solid white'
              }}
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════ FEATURES ══════════════════════ */}
      <section id="features" style={{
        padding: 'clamp(48px, 8vh, 80px) clamp(24px, 5vw, 64px)',
        background: '#ffffff',
      }}>
        <div style={{ width: '100%', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(28px, 5vh, 48px)' }}>
            <div style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 99, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700, marginBottom: 14, letterSpacing: '0.04em' }}>FEATURES</div>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, color: '#0f1f0f', letterSpacing: '-0.02em', marginBottom: 10, fontFamily: 'Manrope, sans-serif' }}>
              Everything a farmer needs
            </h2>
            <p style={{ fontSize: 15, color: '#4d7a4d', maxWidth: 460, margin: '0 auto' }}>
              Powered by Groq AI and real Indian farming data
            </p>
          </div>

          <div className="landing-features-grid">
            {features.map((f, i) => (
              <div key={i} style={{
                padding: '22px 20px', borderRadius: 20,
                background: f.bg, border: `1.5px solid ${f.color}18`,
                transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = `0 16px 36px ${f.color}20`; e.currentTarget.style.borderColor = `${f.color}44`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = `${f.color}18`; }}
              >
                <div style={{
                  width: 50, height: 50, borderRadius: 14, marginBottom: 16,
                  background: `${f.color}15`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 24, border: `1px solid ${f.color}20`,
                }}>{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8, color: '#0f1f0f', letterSpacing: '-0.01em' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#4d7a4d', lineHeight: 1.6 }}>{f.desc}</p>
                <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: f.color }}>Learn more →</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ CTA SECTION ══════════════════════ */}
      <section style={{
        padding: 'clamp(48px, 8vh, 80px) clamp(16px, 5vw, 40px)',
        background: 'linear-gradient(180deg, #f8faf8 0%, #e8f5e9 100%)',
        position: 'relative', overflow: 'hidden', textAlign: 'center',
        borderTop: '1px solid #e8f5e9',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle, #1a7a3a 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 900, color: '#0f1f0f', letterSpacing: '-0.02em', marginBottom: 12, fontFamily: 'Manrope, sans-serif' }}>
            Ready to grow smarter?
          </h2>
          <p style={{ fontSize: 'clamp(14px, 2vw, 16px)', color: '#4d7a4d', marginBottom: 32, lineHeight: 1.6 }}>
            Join thousands of Indian farmers using AgriSmart to make better decisions every day
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              padding: 'clamp(12px,2vw,16px) clamp(28px,5vw,44px)',
              borderRadius: 99, fontSize: 'clamp(14px,2.5vw,16px)', fontWeight: 800,
              background: 'linear-gradient(135deg, #006028, #1a7a3a)', color: 'white', textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(0,96,40,0.25)', display: 'inline-block',
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}
             onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,96,40,0.35)'; }}
             onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,96,40,0.25)'; }}
            >Create Free Account</Link>
            <Link to="/login" style={{
              padding: 'clamp(12px,2vw,16px) clamp(28px,5vw,44px)',
              borderRadius: 99, fontSize: 'clamp(14px,2.5vw,16px)', fontWeight: 700,
              background: 'white', color: '#1a7a3a', textDecoration: 'none',
              border: '2px solid #a5d6a7', display: 'inline-block',
            }}>Sign In</Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer style={{ padding: '60px clamp(24px, 5vw, 64px) 24px', background: '#f8faf8', borderTop: '1px solid #e8f5e9' }}>
        <div style={{ width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
            <div style={{ flex: '1 1 240px' }}>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'Manrope, sans-serif', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #006028, #2d9e50)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 12 }}>AgriSmart</div>
              <p style={{ color: '#4d7a4d', fontSize: 13, maxWidth: 300, lineHeight: 1.6 }}>Empowering Indian farmers with AI-driven intelligence for better yield and market success.</p>
            </div>
            
            <div style={{ display: 'flex', gap: 'clamp(32px, 6vw, 64px)', flexWrap: 'wrap' }}>
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 800, color: '#0f1f0f', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Platform</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: '#4d7a4d', fontWeight: 500 }}>
                  <span style={{ cursor: 'pointer' }}>Crop AI</span>
                  <span style={{ cursor: 'pointer' }}>Disease Check</span>
                  <span style={{ cursor: 'pointer' }}>Market Prices</span>
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 800, color: '#0f1f0f', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Company</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: '#4d7a4d', fontWeight: 500 }}>
                  <span style={{ cursor: 'pointer' }}>About Us</span>
                  <span style={{ cursor: 'pointer' }}>Contact Form</span>
                  <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ color: '#7a9a7a', fontSize: 12, fontWeight: 500 }}>© 2026 AgriSmart AI. Designed for Indian Farmers.</p>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#7a9a7a', fontWeight: 600 }}>
              <span style={{ cursor: 'pointer' }}>Twitter 𝕏</span>
              <span style={{ cursor: 'pointer' }}>YouTube</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
