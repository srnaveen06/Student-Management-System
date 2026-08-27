import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Shield, GraduationCap } from 'lucide-react';
import authApi from '../services/authApi';
import { useToast } from '../context/ToastContext';
import { useAI } from '../context/AIContext';
import '../styles/login.css';

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshFeatures } = useAI();

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('remember_me') === 'true');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const handleChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username.trim() && !formData.password) {
      setError('Please enter your username and password');
      return;
    }
    if (!formData.username.trim()) {
      setError('Please enter your username');
      return;
    }
    if (!formData.password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authApi.login(formData.username.trim(), formData.password);

      if (response.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('admin', JSON.stringify(response.data.admin));

        if (rememberMe) {
          localStorage.setItem('remember_me', 'true');
        } else {
          localStorage.removeItem('remember_me');
        }

        toast.success('Login successful! Welcome back.');
        refreshFeatures();
        navigate('/');
      }
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      if (status === 401) {
        setError('Incorrect username or password.');
      } else if (status === 403) {
        setError('Your account is currently inactive. Please contact an administrator.');
      } else if (status === 400) {
        setError('Please enter your username and password.');
      } else if (!err.response) {
        setError('Unable to connect to the server. Please try again.');
      } else {
        setError(message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">
            <GraduationCap size={28} strokeWidth={2} />
          </div>
          <h1>StudentOS</h1>
          <p>Intelligent College Management</p>
        </div>

        {/* Welcome */}
        <div className="login-welcome">
          <h2>Welcome back</h2>
          <p>Sign in to your account to continue</p>
        </div>

        {/* Error */}
        {error && (
          <div className="login-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Username */}
          <div className="login-form-group">
            <label htmlFor="login-username">Username</label>
            <div className="login-input-wrap">
              <User size={16} className="login-input-icon" />
              <input
                id="login-username"
                type="text"
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                autoComplete="username"
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-form-group">
            <label htmlFor="login-password">Password</label>
            <div className="login-input-wrap">
              <Lock size={16} className="login-input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(prev => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me + Forgot */}
          <div className="login-options-row">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              Remember me
            </label>
            <button
              type="button"
              className="login-forgot-link"
              onClick={() => setShowForgot(true)}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="login-spinner" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer tagline */}
        <div className="login-footer">
          <Shield size={12} />
          Secure
          <span className="login-footer-dot" />
          Smart
          <span className="login-footer-dot" />
          AI-powered
        </div>
      </div>

      {/* Forgot password modal */}
      {showForgot && (
        <div className="login-forgot-backdrop" onClick={() => setShowForgot(false)}>
          <div className="login-forgot-card" onClick={(e) => e.stopPropagation()}>
            <h3>Forgot password?</h3>
            <p>
              Contact your system administrator to reset your password.
              For security reasons, password resets must be handled by an authorized administrator.
            </p>
            <div className="login-forgot-actions">
              <button className="login-forgot-cancel" onClick={() => setShowForgot(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
