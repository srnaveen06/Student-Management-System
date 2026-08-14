import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../services/authApi';
import { useToast } from '../context/ToastContext';

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  // Handle login form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login(formData.username, formData.password);

      if (response.success) {
        // Save token and admin info to localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('admin', JSON.stringify(response.data.admin));

        toast.success('Login successful! Welcome back.');
        navigate('/');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)',
        padding: '40px',
        animation: 'cardAnimate 0.5s ease forwards'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'var(--primary)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: '700',
            color: 'white',
            margin: '0 auto 16px'
          }}>
            S
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '4px'
          }}>
            Student Management
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '14px'
          }}>
            Sign in to your admin account
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              padding: '12px',
              borderRadius: 'var(--radius)',
              background: 'var(--danger-light)',
              color: 'var(--danger)',
              fontSize: '13px',
              fontWeight: '500',
              marginBottom: '16px'
            }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '6px'
            }}>
              Username
            </label>
            <input
              type="text"
              name="username"
              className="form-input"
              style={{ width: '100%' }}
              placeholder="Enter username"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '6px'
            }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              className="form-input"
              style={{ width: '100%' }}
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            disabled={loading}
          >
            {loading ? '⏳ Signing in...' : '🚀 Sign In'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '12px',
          color: 'var(--text-muted)'
        }}>
          Default credentials: admin / admin123
        </p>
      </div>
    </div>
  );
};

export default Login;
