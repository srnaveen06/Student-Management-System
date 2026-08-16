import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import idCardApi from '../services/idCardApi';
import { formatDate, getInitials } from '../utils/format';
import { InlineLoader } from '../components/Loader/Loader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const VerifyIdCard = () => {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, card: null, error: '' });

  useEffect(() => {
    let mounted = true;
    idCardApi.verify(token)
      .then(res => {
        if (!mounted) return;
        if (res.success) setState({ loading: false, card: res.data, error: '' });
        else setState({ loading: false, card: null, error: res.message });
      })
      .catch(err => {
        if (!mounted) return;
        setState({ loading: false, card: null, error: err.response?.data?.message || 'Unable to verify this ID card' });
      });
    return () => { mounted = false; };
  }, [token]);

  const renderCard = (card) => (
    <div className="idcard-preview">
      <div className="idcard-header">
        <div>
          <h2>🏛️ Student ID</h2>
          <p>Verified College Identity Card</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700 }}>{card.card_number}</div>
        </div>
      </div>
      <div className="idcard-body">
        <div className="idcard-avatar">
          {card.image
            ? <img src={`${API_URL}/uploads/${card.image}`} alt={card.name} />
            : getInitials(card.name)}
        </div>
        <div className="idcard-details">
          <div><div className="idcard-field-label">Name</div><div className="idcard-field-value">{card.name}</div></div>
          <div><div className="idcard-field-label">Roll Number</div><div className="idcard-field-value">{card.roll_number}</div></div>
          <div><div className="idcard-field-label">Branch</div><div className="idcard-field-value">{card.branch}</div></div>
          <div><div className="idcard-field-label">Semester</div><div className="idcard-field-value">{card.semester}</div></div>
          <div><div className="idcard-field-label">Issued On</div><div className="idcard-field-value">{formatDate(card.issued_on)}</div></div>
          <div><div className="idcard-field-label">Valid Until</div><div className="idcard-field-value">{formatDate(card.valid_until)}</div></div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-primary)' }}>
      {state.loading ? (
        <div style={{ textAlign: 'center' }}>
          <InlineLoader />
          <p className="text-muted" style={{ marginTop: '12px' }}>Verifying ID card...</p>
        </div>
      ) : state.error ? (
        <>
          <div className="verification-banner error">✖ {state.error}</div>
          <Link to="/" style={{ marginTop: '16px' }}>← Back to portal</Link>
        </>
      ) : (
        <>
          <div className={`verification-banner ${state.card.status === 'Active' ? 'success' : 'error'}`}>
            {state.card.status === 'Active' ? '✔ This is a valid, active ID card' : `⚠ Card status: ${state.card.status}`}
          </div>
          {renderCard(state.card)}
        </>
      )}
    </div>
  );
};

export default VerifyIdCard;
