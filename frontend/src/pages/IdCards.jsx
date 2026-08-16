import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import PageHeader from '../components/PageHeader/PageHeader';
import { InlineLoader } from '../components/Loader/Loader';
import Modal from '../components/Modal/Modal';
import EmptyState from '../components/EmptyState/EmptyState';
import Pagination from '../components/Pagination/Pagination';
import idCardApi from '../services/idCardApi';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';
import { formatDate, getInitials } from '../utils/format';
import { isAdmin } from '../utils/auth';

const STATUS_CLASS = {
  Active: 'leave-status-approved',
  Inactive: 'leave-status-cancelled',
  Revoked: 'leave-status-rejected'
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const IdCards = () => {
  const { toast } = useToast();
  const canManage = isAdmin();

  const [cards, setCards] = useState([]);
  const [summary, setSummary] = useState({ active: 0, inactive: 0, revoked: 0, total: 0, studentsWithoutCard: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  const [issueModal, setIssueModal] = useState({ open: false, studentId: '', issuedOn: '', validUntil: '' });
  const [viewCard, setViewCard] = useState(null);
  const [students, setStudents] = useState([]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await idCardApi.getSummary();
      if (res.success) setSummary(res.data);
    } catch (error) {
      toast.error('Failed to load ID card summary');
    }
  }, [toast]);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await idCardApi.getCards({ search, status, page, limit: 8 });
      if (res.success) {
        setCards(res.cards);
        setPagination({ total: res.total, page: res.page, totalPages: res.totalPages });
      }
    } catch (error) {
      toast.error('Failed to load ID cards');
    } finally {
      setLoading(false);
    }
  }, [search, status, page, toast]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchCards(); }, [fetchCards]);

  useEffect(() => {
    if (issueModal.open && students.length === 0) {
      studentApi.getAll({ page: 1, limit: 100 })
        .then(res => { if (res.success) setStudents(res.students || []); })
        .catch(() => toast.error('Failed to load students'));
    }
  }, [issueModal.open, students.length, toast]);

  const handleIssue = async () => {
    const f = issueModal;
    if (!f.studentId) { toast.error('Select a student'); return; }
    try {
      const payload = { studentId: f.studentId };
      if (f.issuedOn) payload.issuedOn = f.issuedOn;
      if (f.validUntil) payload.validUntil = f.validUntil;
      await idCardApi.createCard(payload);
      toast.success('ID card issued');
      setIssueModal({ open: false, studentId: '', issuedOn: '', validUntil: '' });
      setPage(1);
      fetchCards();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue ID card');
    }
  };

  const toggleStatus = async (card) => {
    const next = card.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await idCardApi.updateCard(card.id, { status: next });
      toast.success(`Card ${next.toLowerCase()}`);
      fetchCards();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to update card');
    }
  };

  const handleRevoke = async (card) => {
    if (!window.confirm(`Revoke ID card ${card.card_number} for ${card.name}?`)) return;
    try {
      await idCardApi.updateCard(card.id, { status: 'Revoked' });
      toast.success('Card revoked');
      fetchCards();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to revoke card');
    }
  };

  const handleDelete = async (card) => {
    if (!window.confirm(`Delete ID card ${card.card_number}?`)) return;
    try {
      await idCardApi.deleteCard(card.id);
      toast.success('ID card deleted');
      fetchCards();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to delete card');
    }
  };

  const renderCardPreview = (card) => (
    <div className="idcard-preview">
      <div className="idcard-header">
        <div>
          <h2>🏛️ Student ID</h2>
          <p>Verified College Identity Card</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700 }}>{card.card_number}</div>
          <div style={{ fontSize: '10px', opacity: 0.9 }}>
            <span className={`leave-status ${STATUS_CLASS[card.status]}`}>{card.status}</span>
          </div>
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
      <div className="idcard-footer">
        <span>Scan to verify authenticity</span>
        <span className="idcard-qr">
          <QRCodeSVG value={`${window.location.origin}/verify/${card.verification_token}`} size={88} />
        </span>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="🎫 Student ID Cards"
        subtitle="Issue, manage and verify student identity cards"
        actions={canManage && (
          <button className="btn btn-primary" onClick={() => setIssueModal({ open: true, studentId: '', issuedOn: '', validUntil: '' })}>
            🆔 Issue ID Card
          </button>
        )}
      />

      <div className="leave-summary">
        <div className="leave-summary-card">
          <span>Active</span>
          <strong>{summary.active}</strong>
        </div>
        <div className="leave-summary-card">
          <span>Inactive</span>
          <strong>{summary.inactive}</strong>
        </div>
        <div className="leave-summary-card">
          <span>Revoked</span>
          <strong>{summary.revoked}</strong>
        </div>
        <div className="leave-summary-card">
          <span>Students w/o Card</span>
          <strong>{summary.studentsWithoutCard}</strong>
        </div>
      </div>

      <div className="filter-bar-wrap" style={{ marginBottom: '20px' }}>
        <div className="filter-bar">
          <input
            type="text"
            className="form-input"
            placeholder="Search student, roll or card number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="form-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {['Active', 'Inactive', 'Revoked'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <InlineLoader />
      ) : cards.length === 0 ? (
        <EmptyState icon="🎫" title="No ID cards found" message="Issue an ID card to get started" />
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Card Number</th>
                <th>Student</th>
                <th>Status</th>
                <th>Valid Until</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.map(card => (
                <tr key={card.id}>
                  <td><strong>{card.card_number}</strong></td>
                  <td>
                    <strong>{card.name}</strong>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{card.roll_number} · {card.branch} · Sem {card.semester}</div>
                  </td>
                  <td>
                    <span className={`leave-status ${STATUS_CLASS[card.status]}`}>{card.status}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: 'var(--font-size-xs)' }}>{formatDate(card.valid_until)}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="action-buttons">
                      <button className="action-btn view" title="View Card" onClick={() => setViewCard(card)}>🪪</button>
                      {canManage && (
                        <>
                          <button className="action-btn edit" title={card.status === 'Active' ? 'Deactivate' : 'Activate'} onClick={() => toggleStatus(card)}>
                            {card.status === 'Active' ? '⏸️' : '▶️'}
                          </button>
                          {card.status !== 'Revoked' && (
                            <button className="action-btn delete" title="Revoke" onClick={() => handleRevoke(card)}>🚫</button>
                          )}
                          <button className="action-btn delete" title="Delete" onClick={() => handleDelete(card)}>🗑</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
      </div>

      {/* Issue Modal */}
      <Modal
        isOpen={issueModal.open}
        onClose={() => setIssueModal({ open: false, studentId: '', issuedOn: '', validUntil: '' })}
        title="Issue ID Card"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIssueModal({ open: false, studentId: '', issuedOn: '', validUntil: '' })}>Cancel</button>
            <button className="btn btn-primary" onClick={handleIssue}>🆔 Issue Card</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Student *</label>
          <select
            className="form-select"
            value={issueModal.studentId}
            onChange={(e) => setIssueModal(prev => ({ ...prev, studentId: e.target.value }))}
          >
            <option value="">Select student...</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.student_id} — {s.name} ({s.branch}, Sem {s.semester})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Issued On</label>
          <input
            type="date"
            className="form-input"
            value={issueModal.issuedOn}
            onChange={(e) => setIssueModal(prev => ({ ...prev, issuedOn: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Valid Until</label>
          <input
            type="date"
            className="form-input"
            value={issueModal.validUntil}
            onChange={(e) => setIssueModal(prev => ({ ...prev, validUntil: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Card preview Modal */}
      <Modal
        isOpen={!!viewCard}
        onClose={() => setViewCard(null)}
        title="ID Card Preview"
        footer={
          <>
            {viewCard && canManage && viewCard.status !== 'Revoked' && (
              <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => { handleRevoke(viewCard); setViewCard(null); }}>
                🚫 Revoke Card
              </button>
            )}
            <button className="btn btn-outline" onClick={() => setViewCard(null)}>Close</button>
          </>
        }
      >
        {viewCard && renderCardPreview(viewCard)}
      </Modal>
    </div>
  );
};

export default IdCards;
