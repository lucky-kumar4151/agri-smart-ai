import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

export default function AuthLayout({ children, title, subtitle, mode = 'login' }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const userData = await loginWithGoogle();
      toast.success(`Welcome, ${userData.name}!`);
      if (userData.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err) {
      // Don't show error if user just closed the popup
      if (err?.code !== 'auth/popup-closed-by-user') {
        setGoogleError(err?.response?.data?.detail || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{
      width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(16px, 4vw, 40px)', background: '#f0fdf4', overflow: 'hidden', boxSizing: 'border-box'
    }}>
      <div style={{
        display: 'flex', alignItems: 'stretch', width: '100%', maxWidth: 1100, height: '100%', maxHeight: 720,
        background: '#ffffff', borderRadius: 28, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,96,40,0.12), 0 8px 16px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,96,40,0.1)',
      }}>
        {/* Left panel — image (hidden on mobile) */}
        <div className="auth-visual-panel" style={{
          width: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden'
        }}>
          <img src="/images/auth_farm_scene.png" alt="Farm Scene"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>

        {/* Right panel — form */}
        <div className="auth-form-panel" style={{
          width: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(32px, 5vw, 64px)', background: '#ffffff', overflowY: 'auto'
        }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Header */}
          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <h1 style={{
              fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em',
              color: '#1a2e1a', fontFamily: 'Outfit', lineHeight: 1.2
            }}>{title}</h1>
            {subtitle && (
              <p style={{ marginTop: 4, fontSize: 13, color: '#6a8a6a' }}>{subtitle}</p>
            )}
          </div>

          {/* Form Content */}
          <div>
            {children}
          </div>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, margin: '16px 0'
          }}>
            <div style={{ flex: 1, height: 1, background: '#e0e8e0' }} />
            <span style={{ fontSize: 12, color: '#999', fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#e0e8e0' }} />
          </div>

          {/* Google Button */}
          {googleError && (
            <div style={{
              padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, marginBottom: 10, fontSize: 12, color: '#dc2626'
            }}>
              {googleError}
            </div>
          )}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: '12px 20px', border: '1.5px solid #e0e4e0', borderRadius: 12,
              background: 'white', cursor: googleLoading ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 500, color: '#333', transition: 'all 0.2s',
              fontFamily: 'Inter', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              opacity: googleLoading ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!googleLoading) { e.currentTarget.style.borderColor = '#2d7a3a'; e.currentTarget.style.background = '#f8faf8'; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e4e0'; e.currentTarget.style.background = 'white'; }}>
            {googleLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Signing in...
              </span>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Switch */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6a8a6a' }}>
            {mode === 'login' ? (
              <>Don't have an account? <Link to="/register" style={{ color: '#2d7a3a', fontWeight: 700, textDecoration: 'none' }}>Sign Up</Link></>
            ) : (
              <>Already have an account? <Link to="/login" style={{ color: '#2d7a3a', fontWeight: 700, textDecoration: 'none' }}>Login</Link></>
            )}
          </p>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .auth-visual-panel { display: none !important; }
          .auth-form-panel {
            width: 100% !important;
            padding: 40px 24px !important;
          }
        }
      `}</style>
    </div>
  </div>
  );
}
