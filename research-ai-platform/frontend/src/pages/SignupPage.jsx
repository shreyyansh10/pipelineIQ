import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API_BASE_URL from '../config/api';
import axios from 'axios';

const SignupPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const btnRef = useRef(null);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('Error state changed:', error)
  }, [error])

  /* ── Google Sign-Up ─────────────────────────────── */
  const handleGoogleResponse = useCallback(async (response) => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.post(`${API_BASE_URL}/auth/google`, {
        idToken: response.credential,
      });
      if (res.data.success) {
        login(res.data.user, res.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [login, navigate]);

  useEffect(() => {
    const initGoogle = () => {
      if (window.google && btnRef.current) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 300,
          text: 'signup_with',
          shape: 'rectangular',
        });
      }
    };

    if (window.google) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          initGoogle();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [handleGoogleResponse]);

  /* ── Step 1: Send OTP ───────────────────────────── */
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await axios.post(
        `${API_BASE_URL}/auth/send-otp`,
        { name, email }
      );

      if (response.data.success) {
        setOtp('');
        setError('');
        setStep(2);
      }
    } catch (err) {
      console.error('Send OTP error:', err)
      const errorMsg = err.response?.data?.error 
        || err.message 
        || 'Failed to send code. Please try again.'
      console.log('Setting error:', errorMsg)
      setError(errorMsg)
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Verify OTP ─────────────────────────── */
  const handleVerifyOTP = async () => {
    console.log('Verifying OTP:', otp);

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await axios.post(
        `${API_BASE_URL}/auth/verify-otp-only`,
        { email, otp: otp.toString() }
      );

      console.log('OTP verify response:', response.data);

      if (response.data.success) {
        setPassword('');
        setConfirmPassword('');
        setError('');
        setStep(3);
      }
    } catch (err) {
      console.error('OTP Error:', err.response?.data);
      setError(
        err.response?.data?.error ||
        'Invalid code. Please check and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await axios.post(`${API_BASE_URL}/auth/send-otp`, { name, email });
      setSuccess('Code resent!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 3: Create Account ─────────────────────── */
  const handleCreateAccount = async () => {
    console.log('=== CREATE ACCOUNT CLICKED ===');
    console.log('name:', name);
    console.log('email:', email);
    console.log('otp:', otp);
    console.log('password length:', password?.length);

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('Calling API...');

      const response = await axios.post(
        `${API_BASE_URL}/auth/verify-otp`,
        {
          name: name,
          email: email,
          otp: otp.toString(),
          password: password
        }
      );

      console.log('API response:', response.data);

      if (response.data.success) {
        login(response.data.user, response.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error:', err.response?.data || err.message);
      setError(
        err.response?.data?.error ||
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Shared Styles ──────────────────────────────── */
  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    textAlign: 'left',
  };

  const primaryBtnStyle = {
    width: '100%',
    padding: '12px',
    background: loading ? 'var(--border-color)' : 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '15px',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    opacity: loading ? 0.7 : 1,
  };

  /* ── Step Indicator ─────────────────────────────── */
  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginRight: '4px' }}>
        Step {step} of 3
      </span>
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: s <= step ? 'var(--accent)' : 'var(--border-color)',
            transition: 'background 0.3s',
          }}
        />
      ))}
    </div>
  );

  /* ── Render Step Content ────────────────────────── */
  const renderStep = () => {
    if (step === 1) {
      return (
        <>
          <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: '24px' }}>
            Create your account
          </p>

          <form onSubmit={handleSendOTP} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Full Name</label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Email Address</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#ef4444',
                fontSize: '14px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            <button id="signup-send-otp" type="submit" disabled={loading} style={primaryBtnStyle}>
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '24px 0',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>

          {/* Google Button */}
          <div
            ref={btnRef}
            id="google-signup-btn"
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '20px',
              minHeight: '44px',
            }}
          />
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: '8px' }}>
            Verify your email
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: 0, marginBottom: '24px' }}>
            We sent a 6-digit code to<br />
            <strong style={{ color: 'var(--accent)' }}>{email}</strong>
          </p>

          <div style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Verification Code</label>
              <input
                id="signup-otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                maxLength={6}
                style={{ ...inputStyle, textAlign: 'center', fontSize: '20px', letterSpacing: '8px', fontWeight: 700 }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#ef4444',
                fontSize: '13px',
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            <button id="signup-verify-otp" onClick={handleVerifyOTP} disabled={loading} style={primaryBtnStyle}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '16px', marginBottom: '8px' }}>
            Didn&apos;t receive the code?{' '}
            <button
              onClick={handleResendOTP}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Resend code
            </button>
          </p>

          {success && (
            <p style={{ color: 'var(--accent)', fontSize: '13px', margin: '8px 0 0' }}>{success}</p>
          )}

          <button
            onClick={() => {
              setStep(1);
              setName('');
              setEmail('');
              setOtp('');
              setPassword('');
              setConfirmPassword('');
              setSuccess('');
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '14px',
              marginTop: '12px',
              padding: 0,
              fontWeight: 500,
            }}
          >
            ← Back
          </button>
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: '24px' }}>
            Create your password
          </p>

          <div style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  style={{ ...inputStyle, paddingRight: '60px' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: 0,
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  style={{ ...inputStyle, paddingRight: '60px' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: 0,
                  }}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '0 0 20px', textAlign: 'left' }}>
              Password must be 6+ characters
            </p>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#ef4444',
                fontSize: '13px',
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            <button id="signup-create-account" onClick={handleCreateAccount} disabled={loading} style={primaryBtnStyle}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>

          <button
            onClick={() => {
              setStep(2);
              setPassword('');
              setConfirmPassword('');
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '14px',
              marginTop: '16px',
              padding: 0,
              fontWeight: 500,
            }}
          >
            ← Back
          </button>
        </>
      );
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute',
        width: '460px',
        height: '460px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--accent-bg) 0%, transparent 70%)',
        filter: 'blur(40px)',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '40px',
        position: 'relative',
        zIndex: 2,
        boxSizing: 'border-box',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '22px',
          fontWeight: 800,
          marginBottom: '8px',
          color: 'var(--accent)',
        }}>PipelineIQ</div>

        <StepIndicator />

        {renderStep()}

        {step === 1 && (
          <>
            <div style={{
              margin: '20px 0 14px',
              height: '1px',
              background: 'linear-gradient(to right, transparent, var(--border-color), transparent)',
            }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', margin: 0 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                Login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default SignupPage;