import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { authAPI } from '../services/api';

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [step, setStep] = useState(1); // 1=email, 2=reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      toast.success('Reset code sent to your email!');
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to send reset code. Check your email.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, otp, new_password: newPassword });
      toast.success('Password reset successful! You can now login.');
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid or expired reset code.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', border: '1px solid #c8dcc8',
    borderRadius: 10, fontSize: 14, background: '#f5f9f5',
    outline: 'none', fontFamily: 'Inter', boxSizing: 'border-box'
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#2d5a2d', marginBottom: 6, display: 'block' };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f9f0 0%, #e8f5e9 50%, #f5f9f5 100%)',
      padding: 20
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: 'white',
        borderRadius: 20, padding: '36px 28px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        border: '1px solid #d4e8d4'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Outfit', color: '#1a2e1a', margin: '0 0 6px' }}>
            {step === 1 ? 'Forgot Password' : step === 2 ? 'Reset Password' : 'All Done!'}
          </h1>
          <p style={{ fontSize: 13, color: '#6a8a6a', margin: 0 }}>
            {step === 1 && 'Enter your email and we\'ll send a reset code'}
            {step === 2 && `Enter the code sent to ${email}`}
            {step === 3 && 'Your password has been reset successfully'}
          </p>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Step 1: Enter email */}
        {step === 1 && (
          <form onSubmit={handleSendOTP}>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle} placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: 13, border: 'none', borderRadius: 10,
              background: '#2d7a3a', color: 'white', fontSize: 15,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, fontFamily: 'Inter'
            }}>
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {/* Step 2: Enter OTP + new password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Reset Code</label>
              <input type="text" required value={otp} onChange={e => setOtp(e.target.value)}
                style={{ ...inputStyle, textAlign: 'center', fontSize: 20, letterSpacing: 8, fontWeight: 700 }}
                placeholder="000000" maxLength={6} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>New Password</label>
              <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                style={inputStyle} placeholder="At least 6 characters" />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Confirm Password</label>
              <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                style={inputStyle} placeholder="Confirm your password" />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: 13, border: 'none', borderRadius: 10,
              background: '#2d7a3a', color: 'white', fontSize: 15,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, fontFamily: 'Inter'
            }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button type="button" onClick={() => { setStep(1); setError(''); }}
              style={{
                width: '100%', marginTop: 10, padding: 10, border: '1px solid #e0e4e0',
                borderRadius: 10, background: '#f8f8f8', fontSize: 13,
                cursor: 'pointer', color: '#666', fontFamily: 'Inter'
              }}>
              ← Back to Email
            </button>
          </form>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <Link to="/login" style={{
              display: 'inline-block', padding: '12px 32px', border: 'none', borderRadius: 10,
              background: '#2d7a3a', color: 'white', fontSize: 15,
              fontWeight: 700, textDecoration: 'none', fontFamily: 'Inter'
            }}>
              Go to Login
            </Link>
          </div>
        )}

        {/* Back to login */}
        {step !== 3 && (
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6a8a6a' }}>
            Remember your password?{' '}
            <Link to="/login" style={{ color: '#2d7a3a', fontWeight: 700, textDecoration: 'none' }}>Login</Link>
          </p>
        )}
      </div>
    </div>
  );
}
