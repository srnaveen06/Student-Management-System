import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import authApi from '../services/authApi';
import { useToast } from '../context/ToastContext';
import '../styles/login.css';
import '../styles/signup.css';

const PASSWORD_MIN = 6;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,50}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setServerError('');
  }, []);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) {
      next.name = 'Full name is required';
    } else if (form.name.trim().length < 2) {
      next.name = 'Please enter your full name';
    }

    if (!form.username.trim()) {
      next.username = 'Username is required';
    } else if (!USERNAME_RE.test(form.username.trim())) {
      next.username = 'Username must be 3-50 characters using letters, numbers, "_", "." or "-"';
    }

    if (!form.email.trim()) {
      next.email = 'Email is required';
    } else if (!EMAIL_RE.test(form.email.trim())) {
      next.email = 'Please enter a valid email address';
    }

    if (!form.password) {
      next.password = 'Password is required';
    } else if (form.password.length < PASSWORD_MIN) {
      next.password = `Password must be at least ${PASSWORD_MIN} characters`;
    }

    if (!form.confirmPassword) {
      next.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }

    return next;
  };

  const checkDuplicate = async (field) => {
    const params = {};
    if (field === 'username' && form.username.trim()) params.username = form.username.trim();
    if (field === 'email' && form.email.trim()) params.email = form.email.trim();
    if (Object.keys(params).length === 0) return;

    try {
      const res = await authApi.checkAvailability(params);
      if (res.success) {
        setErrors(prev => {
          const next = { ...prev };
          if (params.username && !res.data.usernameAvailable && !next.username) {
            next.username = 'Username is already taken';
          }
          if (params.email && !res.data.emailAvailable && !next.email) {
            next.email = 'Email is already registered';
          }
          return next;
        });
      }
    } catch (err) {
      // Ignore availability-check failures — the server re-validates on submit
    }
  };

  const handleBlur = (e) => {
    if (e.target.name === 'username' || e.target.name === 'email') {
      checkDuplicate(e.target.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const next = validate();
    setErrors(next);
    setServerError('');

    if (Object.keys(next).length > 0) return;

    // Confirm uniqueness before submitting
    let availability = { usernameAvailable: true, emailAvailable: true };
    try {
      const res = await authApi.checkAvailability({
        username: form.username.trim(),
        email: form.email.trim()
      });
      availability = res.data || availability;
    } catch (err) {
      // Server validates anyway
    }

    const dupErrors = {};
    if (!availability.usernameAvailable) dupErrors.username = 'Username is already taken';
    if (!availability.emailAvailable) dupErrors.email = 'Email is already registered';
    if (Object.keys(dupErrors).length > 0) {
      setErrors(dupErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register({
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password
      });

      if (response.success) {
        toast.success('Account created successfully! Please sign in.');
        navigate('/login', {
          state: { registered: true, username: form.username.trim() }
        });
      }
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page signup-page">
      <div className="login-card signup-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">
            <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="StudentOS logo" />
          </div>
          <h1>StudentOS</h1>
          <p>Intelligent College Management</p>
        </div>

        {/* Welcome */}
        <div className="login-welcome">
          <h2>Create your account</h2>
          <p>Join StudentOS to manage your college experience</p>
        </div>

        {/* Server error */}
        {serverError && (
          <div className="login-error" role="alert">
            <AlertCircle size={16} />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="login-form-group">
            <label htmlFor="signup-name">Full Name</label>
            <div className="login-input-wrap">
              <User size={16} className="login-input-icon" />
              <input
                id="signup-name"
                type="text"
                name="name"
                className={errors.name ? 'error' : ''}
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                autoFocus
                disabled={loading}
              />
            </div>
            {errors.name && (
              <span className="login-field-error"><AlertCircle size={12} /> {errors.name}</span>
            )}
          </div>

          <div className="login-form-group">
            <label htmlFor="signup-username">Username</label>
            <div className="login-input-wrap">
              <User size={16} className="login-input-icon" />
              <input
                id="signup-username"
                type="text"
                name="username"
                className={errors.username ? 'error' : ''}
                placeholder="Choose a username"
                value={form.username}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="username"
                disabled={loading}
              />
            </div>
            {errors.username && (
              <span className="login-field-error"><AlertCircle size={12} /> {errors.username}</span>
            )}
          </div>

          <div className="login-form-group">
            <label htmlFor="signup-email">Email</label>
            <div className="login-input-wrap">
              <Mail size={16} className="login-input-icon" />
              <input
                id="signup-email"
                type="email"
                name="email"
                className={errors.email ? 'error' : ''}
                placeholder="Enter your email address"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="email"
                disabled={loading}
              />
            </div>
            {errors.email && (
              <span className="login-field-error"><AlertCircle size={12} /> {errors.email}</span>
            )}
          </div>

          <div className="login-form-group">
            <label htmlFor="signup-password">Password</label>
            <div className="login-input-wrap">
              <Lock size={16} className="login-input-icon" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                className={errors.password ? 'error' : ''}
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
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
            {errors.password && (
              <span className="login-field-error"><AlertCircle size={12} /> {errors.password}</span>
            )}
          </div>

          <div className="login-form-group">
            <label htmlFor="signup-confirm">Confirm Password</label>
            <div className="login-input-wrap">
              <Lock size={16} className="login-input-icon" />
              <input
                id="signup-confirm"
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowConfirm(prev => !prev)}
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="login-field-error"><AlertCircle size={12} /> {errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="login-spinner" />
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Link to login */}
        <div className="login-create-row">
          <span>Already have an account?</span>
          <Link to="/login" className="login-create-link">Sign in</Link>
        </div>

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
    </div>
  );
};

export default Signup;