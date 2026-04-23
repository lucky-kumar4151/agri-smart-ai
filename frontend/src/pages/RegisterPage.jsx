import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import AuthLayout from '../components/AuthLayout';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', role: 'farmer', language: 'en',
    state: '', city: '', soil_type: '',
  });

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const goToStep2 = () => {
    setError('');
    if (!form.name.trim()) { setError('Please enter your name'); return; }
    if (!form.email.trim()) { setError('Please enter your email'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role: form.role,
        language: form.language,
        location: { state: form.state, district: '', city: form.city },
        farm_details: { farm_size: '', farm_size_unit: 'acres', crops: [], soil_type: form.soil_type, irrigation_type: '' },
      });
      toast.success('Account created successfully! Welcome aboard.');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed. Try again.';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #d0e4d0',
    borderRadius: 10, fontSize: 14, background: '#f7fbf7',
    outline: 'none', fontFamily: 'Inter', boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle = {
    fontSize: 13, fontWeight: 600, color: '#2d5a2d',
    marginBottom: 5, display: 'block',
  };

  const focusHandlers = {
    onFocus: (e) => { e.target.style.borderColor = '#2d7a3a'; e.target.style.boxShadow = '0 0 0 3px rgba(45,122,58,0.1)'; },
    onBlur: (e) => { e.target.style.borderColor = '#d0e4d0'; e.target.style.boxShadow = 'none'; },
  };

  return (
    <AuthLayout
      title={step === 1 ? 'Create Account' : 'Complete Your Profile'}
      subtitle={step === 1 ? 'Join Kisan — AI-powered farming assistance' : 'Tell us about yourself for a personalized experience'}
      mode="register"
    >
      <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); goToStep2(); }}>
        {error && (
          <div style={{
            padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#dc2626',
          }}>
            {error}
          </div>
        )}

        {/* ─── STEP 1: Basic Details ─── */}
        {step === 1 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input required style={inputStyle} placeholder="Enter your full name"
                  value={form.name} onChange={set('name')} {...focusHandlers} />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input required type="email" style={inputStyle} placeholder="you@example.com"
                  value={form.email} onChange={set('email')} {...focusHandlers} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}>Password</label>
                <input required type="password" style={inputStyle} placeholder="Min 6 chars"
                  value={form.password} onChange={set('password')} {...focusHandlers} />
              </div>
              <div>
                <label style={labelStyle}>Confirm</label>
                <input required type="password" style={inputStyle} placeholder="Re-enter password"
                  value={form.confirmPassword} onChange={set('confirmPassword')} {...focusHandlers} />
              </div>
            </div>

            <button type="submit" style={{
              width: '100%', padding: 13, border: 'none', borderRadius: 12,
              background: 'linear-gradient(135deg, #2d7a3a, #1b5a28)',
              color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Inter', boxShadow: '0 4px 12px rgba(45,122,58,0.3)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8
            }}>
              Next
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* ─── STEP 2: Additional Details ─── */}
        {step === 2 && (
          <>
            {/* Step indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: '#2d7a3a',
                color: 'white', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>✓</div>
              <div style={{ flex: 1, height: 2, background: '#2d7a3a', borderRadius: 2 }} />
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: '#2d7a3a',
                color: 'white', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>2</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Phone</label>
                <div style={{ display: 'flex', gap: 0 }}>
                  <span style={{
                    padding: '11px 10px', background: '#e8f0e8', border: '1.5px solid #d0e4d0',
                    borderRight: 'none', borderRadius: '10px 0 0 10px', fontSize: 13,
                    color: '#4a7a4a', fontWeight: 600
                  }}>+91</span>
                  <input style={{ ...inputStyle, borderRadius: '0 10px 10px 0' }}
                    placeholder="9876543210" value={form.phone} onChange={set('phone')} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.role} onChange={set('role')}>
                  <option value="farmer">Farmer</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>State</label>
                <input style={inputStyle} placeholder="e.g. Punjab" value={form.state} onChange={set('state')} />
              </div>
              <div>
                <label style={labelStyle}>City / Village</label>
                <input style={inputStyle} placeholder="e.g. Amritsar" value={form.city} onChange={set('city')} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Soil Type</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.soil_type} onChange={set('soil_type')}>
                  <option value="">Select</option>
                  <option value="Alluvial">Alluvial</option>
                  <option value="Black">Black</option>
                  <option value="Red">Red</option>
                  <option value="Laterite">Laterite</option>
                  <option value="Sandy">Sandy</option>
                  <option value="Loamy">Loamy</option>
                  <option value="Clay">Clay</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Language</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.language} onChange={set('language')}>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="pa">Punjabi</option>
                  <option value="mr">Marathi</option>
                  <option value="ta">Tamil</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => { setStep(1); setError(''); }}
                style={{
                  flex: 1, padding: 13, border: '1.5px solid #d0e4d0', borderRadius: 12,
                  background: 'white', color: '#2d5a2d', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d5a2d" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button type="submit" disabled={loading}
                style={{
                  flex: 2, padding: 13, border: 'none', borderRadius: 12,
                  background: loading ? '#7aaa7a' : 'linear-gradient(135deg, #2d7a3a, #1b5a28)',
                  color: 'white', fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter', boxShadow: '0 4px 12px rgba(45,122,58,0.3)',
                  transition: 'all 0.2s', touchAction: 'manipulation',
                }}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
