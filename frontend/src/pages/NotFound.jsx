import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '40px'
    }}>
      <div style={{ animation: 'cardAnimate 0.5s ease forwards' }}>
        <div style={{ fontSize: '80px', marginBottom: '16px' }}>🔍</div>
        <h1 style={{
          fontSize: '64px',
          fontWeight: '800',
          color: 'var(--primary)',
          marginBottom: '8px'
        }}>
          404
        </h1>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          Page Not Found
        </h2>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '15px',
          marginBottom: '24px'
        }}>
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/')}
        >
          ← Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;
