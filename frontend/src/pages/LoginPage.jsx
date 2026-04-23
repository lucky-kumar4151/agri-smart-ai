import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import AuthLayout from '../components/AuthLayout';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(email, password);
      toast.success(`Welcome back, ${userData.name}!`);
      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid email or password. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1px solid #c8dcc8',
    borderRadius: 8, fontSize: 14, background: '#f5f9f5',
    outline: 'none', fontFamily: 'Inter', boxSizing: 'border-box'
  };

  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#2d5a2d', marginBottom: 4, display: 'block' };

  return (
    <AuthLayout
      title={isAdmin ? 'Admin Login' : 'Welcome Back'}
      subtitle={isAdmin ? 'Sign in as administrator' : 'Sign in to your AgriSmart account'}
      mode="login"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 14, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Email Address</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            style={inputStyle} placeholder="you@example.com" />
        </div>

        <div style={{ marginBottom: 6 }}>
          <label style={labelStyle}>Password</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            style={inputStyle} placeholder="Enter your password" />
        </div>

        <div style={{ textAlign: 'right', marginBottom: 18 }}>
          <button type="button" onClick={() => navigate('/forgot-password')}
            style={{ fontSize: 12, color: '#2d7a3a', fontWeight: 500, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Forgot Password?
          </button>
        </div>

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: 12, border: 'none', borderRadius: 10,
          background: isAdmin ? '#1a2e1a' : '#2d7a3a', color: 'white', fontSize: 15,
          fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1, fontFamily: 'Inter',
          touchAction: 'manipulation',  /* no 300ms ghost-click delay on mobile */
        }}>
          {loading ? 'Signing In...' : isAdmin ? 'Sign In as Admin' : 'Sign In'}
        </button>

        {/* Toggle admin/user mode */}
        <button
          type="button"
          onClick={() => { setIsAdmin(!isAdmin); setEmail(''); setPassword(''); setError(''); }}
          style={{
            width: '100%', marginTop: 10, padding: 10, border: 'none',
            borderRadius: 10, fontSize: 13, fontFamily: 'Inter', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: isAdmin
              ? 'linear-gradient(135deg, #e8f5e9, #c8e6c9)'
              : 'linear-gradient(135deg, #1a2e1a, #2d5a2d)',
            color: isAdmin ? '#2d7a3a' : 'white',
          }}>
          {isAdmin ? 'Switch to Farmer Login' : 'Admin Login'}
        </button>
      </form>
    </AuthLayout>
  );
}
