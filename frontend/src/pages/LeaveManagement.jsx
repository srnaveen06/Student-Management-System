import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/PageHeader/PageHeader';
import { InlineLoader } from '../components/Loader/Loader';
import Modal from '../components/Modal/Modal';
import EmptyState from '../components/EmptyState/EmptyState';
import Pagination from '../components/Pagination/Pagination';
import leaveApi from '../services/leaveApi';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';
import { formatDate, formatDateTime } from '../utils/format';
import { isAdmin, isTeacher } from '../utils/auth';
import { CalendarDays, Plus, CheckCircle, X, Trash2, Ban, Clock, AlertTriangle, FileText, Send, Save } from 'lucide-react';

const LEAVE_TYPE_META = {
  Sick: { icon: <AlertTriangle size={16} />, className: 'badge-danger' },
  Casual: { icon: <Clock size={16} />, className: 'badge-warning' },
  Emergency: { icon: <AlertTriangle size={16} />, className: 'badge-danger' },
  Study: { icon: <FileText size={16} />, className: 'badge-info' },
  Other: { icon: <FileText size={16} />, className: 'badge-inactive' }
};

const STATUS_CLASS = {
  Pending: 'leave-status-pending',
  Approved: 'leave-status-approved',
  Rejected: 'leave-status-rejected',
  Cancelled: 'leave-status-cancelled'
};

const emptyForm = () => ({
  studentId: '', leaveType: 'Casual', fromDate: '', toDate: '', reason: '', file: null
});

const LeaveManagement = () => {
  const { toast } = useToast();
  const canManage = isAdmin() || isTeacher();
  const canApprove = isAdmin();

  const [leaves, setLeaves] = useState([]);
  const [summary, setSummary] = useState({ pending: 0, approved: 0, rejected: 0, cancelled: 0, total: 0, approvedDaysThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  const [formModal, setFormModal] = useState({ open: false, editing: null, form: emptyForm() });
  const [statusModal, setStatusModal] = useState({ leave: null, action: '', remarks: '' });
  const [students, setStudents] = useState([]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await leaveApi.getSummary();
      if (res.success) setSummary(res.data);
    } catch (error) {
      toast.error('Failed to load leave summary');
    }
  }, [toast]);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leaveApi.getLeaves({ search, status, leaveType, page, limit: 8 });
      if (res.success) {
        setLeaves(res.leaves);
        setPagination({ total: res.total, page: res.page, totalPages: res.totalPages });
      }
    } catch (error) {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [search, status, leaveType, page, toast]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  // Load students for the picker when the form modal opens.
  useEffect(() => {
    if (formModal.open && students.length === 0) {
      studentApi.getAll({ page: 1, limit: 100 })
        .then(res => { if (res.success) setStudents(res.students || []); })
        .catch(() => toast.error('Failed to load students'));
    }
  }, [formModal.open, students.length, toast]);

  const submitLeave = async (payload) => {
    if (formModal.editing) {
      await leaveApi.updateLeave(formModal.editing.id, payload);
    } else {
      await leaveApi.createLeave(payload);
    }
  };

  const handleSave = async () => {
    const f = formModal.form;
    if (!f.studentId) { toast.error('Select a student'); return; }
    if (!f.fromDate || !f.toDate) { toast.error('From and to dates are required'); return; }
    if (f.toDate < f.fromDate) { toast.error('To date cannot be before from date'); return; }

    const base = {
      studentId: f.studentId, leaveType: f.leaveType, fromDate: f.fromDate,
      toDate: f.toDate, reason: f.reason
    };
    try {
      if (f.file) {
        const fd = new FormData();
        Object.entries(base).forEach(([k, v]) => fd.append(k, v));
        fd.append('attachment', f.file);
        await submitLeave(fd);
      } else {
        await submitLeave(base);
      }
      toast.success(formModal.editing ? 'Leave request updated' : 'Leave request submitted');
      setFormModal({ open: false, editing: null, form: emptyForm() });
      setPage(1);
      fetchLeaves();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save leave request');
    }
  };

  const handleStatusChange = async () => {
    const { leave, action, remarks } = statusModal;
    try {
      await leaveApi.setStatus(leave.id, { status: action, remarks });
      toast.success(action === 'Approved' ? 'Leave approved and attendance marked' : `Leave ${action.toLowerCase()}`);
      setStatusModal({ leave: null, action: '', remarks: '' });
      fetchLeaves();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update leave status');
    }
  };

  const handleDelete = async (l) => {
    if (!window.confirm(`Delete leave request #${l.id} for ${l.name}?`)) return;
    try {
      await leaveApi.deleteLeave(l.id);
      toast.success('Leave request deleted');
      fetchLeaves();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to delete leave request');
    }
  };

  const openStatus = (leave, action) => {
    const msg = action === 'Approved'
      ? 'Approving will mark these dates as "Approved Leave" in attendance.'
      : action === 'Cancelled'
        ? 'Cancelling will remove any "Approved Leave" attendance entries for these dates.'
        : 'Rejected leaves are not marked in attendance.';
    if (action === 'Approved' && !window.confirm(`Approve leave for ${leave.name}? ${msg}`)) return;
    if (action === 'Cancelled' && !window.confirm(`Cancel approved leave for ${leave.name}? ${msg}`)) return;
    setStatusModal({ leave, action, remarks: '' });
  };

  const renderActions = (l) => {
    if (!canApprove) return null;
    return (
      <div className="action-buttons">
        {l.status === 'Pending' && (
          <>
            <button className="action-btn view" title="Approve" onClick={() => openStatus(l, 'Approved')}><CheckCircle size={16} /></button>
            <button className="action-btn delete" title="Reject" onClick={() => openStatus(l, 'Rejected')}><X size={16} /></button>
          </>
        )}
        {l.status === 'Approved' && (
          <button className="action-btn view" title="Cancel leave" onClick={() => openStatus(l, 'Cancelled')}><Ban size={16} /></button>
        )}
        <button className="action-btn delete" title="Delete" onClick={() => handleDelete(l)}><Trash2 size={16} /></button>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title={<><CalendarDays size={28} /> Leave Management</>}
        subtitle="Track and manage student leave requests"
        actions={canManage && (
          <button className="btn btn-primary" onClick={() => setFormModal({ open: true, editing: null, form: emptyForm() })}>
            <Plus size={16} /> New Leave Request
          </button>
        )}
      />

      <div className="leave-summary">
        <div className="leave-summary-card">
          <span>Pending</span>
          <strong>{summary.pending}</strong>
        </div>
        <div className="leave-summary-card">
          <span>Approved</span>
          <strong>{summary.approved}</strong>
        </div>
        <div className="leave-summary-card">
          <span>Rejected</span>
          <strong>{summary.rejected}</strong>
        </div>
        <div className="leave-summary-card">
          <span>Cancelled</span>
          <strong>{summary.cancelled}</strong>
        </div>
      </div>
      <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: '-12px', marginBottom: '20px' }}>
        {summary.approvedDaysThisMonth} approved leave days this month · {summary.pending} waiting for approval
      </p>

      <div className="filter-bar-wrap" style={{ marginBottom: '20px' }}>
        <div className="filter-bar">
          <input
            type="text"
            className="form-input"
            placeholder="Search by student name or roll number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="form-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {['Pending', 'Approved', 'Rejected', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-select" value={leaveType} onChange={(e) => { setLeaveType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {Object.keys(LEAVE_TYPE_META).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <InlineLoader />
      ) : leaves.length === 0 ? (
        <EmptyState icon={<CalendarDays />} title="No leave requests" message="Submit a new leave request to get started" />
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Requested</th>
                {canApprove && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {leaves.map(l => {
                const typeMeta = LEAVE_TYPE_META[l.leave_type] || LEAVE_TYPE_META.Other;
                return (
                  <tr key={l.id}>
                    <td>
                      <strong>{l.name}</strong>
                      <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{l.roll_number} · {l.branch} · Sem {l.semester}</div>
                    </td>
                    <td>
                      <span className={`badge ${typeMeta.className}`}>{typeMeta.icon} {l.leave_type}</span>
                    </td>
                    <td>
                      <div>{formatDate(l.from_date)} → {formatDate(l.to_date)}</div>
                      <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{l.days} day(s)</div>
                    </td>
                    <td>
                      <span title={l.reason}>{l.reason ? (l.reason.length > 40 ? `${l.reason.slice(0, 40)}…` : l.reason) : '—'}</span>
                      {l.attachment && <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{l.attachment}</div>}
                    </td>
                    <td>
                      <span className={`leave-status ${STATUS_CLASS[l.status]}`}>{l.status}</span>
                      {l.remarks && <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>"{l.remarks}"</div>}
                    </td>
                    <td>
                      <div style={{ fontSize: 'var(--font-size-xs)' }}>{formatDateTime(l.created_at)}</div>
                      <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>by {l.requested_by_name || 'Admin'}</div>
                    </td>
                    {canApprove && <td style={{ textAlign: 'right' }}>{renderActions(l)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, editing: null, form: emptyForm() })}
        title={formModal.editing ? `Edit Leave #${formModal.editing.id}` : 'New Leave Request'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setFormModal({ open: false, editing: null, form: emptyForm() })}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {formModal.editing ? <><Save size={16} /> Save Changes</> : <><Send size={16} /> Submit Request</>}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Student *</label>
          <select
            className="form-select"
            value={formModal.form.studentId}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, studentId: e.target.value } }))}
          >
            <option value="">Select student...</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.student_id} — {s.name} ({s.branch}, Sem {s.semester})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Leave Type</label>
          <select
            className="form-select"
            value={formModal.form.leaveType}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, leaveType: e.target.value } }))}
          >
            {Object.keys(LEAVE_TYPE_META).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">From Date *</label>
          <input
            type="date"
            className="form-input"
            value={formModal.form.fromDate}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, fromDate: e.target.value } }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">To Date *</label>
          <input
            type="date"
            className="form-input"
            value={formModal.form.toDate}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, toDate: e.target.value } }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Reason</label>
          <textarea
            className="form-input"
            rows="3"
            placeholder="Reason for leave..."
            value={formModal.form.reason}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, reason: e.target.value } }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Attachment (optional)</label>
          <input
            type="file"
            className="form-input"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, file: e.target.files[0] || null } }))}
          />
        </div>
      </Modal>

      {/* Status change Modal (reject/cancel; approve uses confirm) */}
      <Modal
        isOpen={!!statusModal.leave}
        onClose={() => setStatusModal({ leave: null, action: '', remarks: '' })}
        title={statusModal.action === 'Rejected' ? 'Reject Leave' : 'Cancel Leave'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setStatusModal({ leave: null, action: '', remarks: '' })}>Close</button>
            <button className="btn btn-primary" onClick={handleStatusChange}>
              {statusModal.action === 'Rejected' ? <><X size={16} /> Reject</> : <><Ban size={16} /> Cancel Leave</>}
            </button>
          </>
        }
      >
        {statusModal.leave && (
          <>
            <p>
              <strong>{statusModal.leave.name}</strong> ({statusModal.leave.leave_type},{' '}
              {formatDate(statusModal.leave.from_date)} → {formatDate(statusModal.leave.to_date)})
            </p>
            <div className="form-group">
              <label className="form-label">Remarks</label>
              <textarea
                className="form-input"
                rows="3"
                placeholder="Reason for this decision..."
                value={statusModal.remarks}
                onChange={(e) => setStatusModal(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default LeaveManagement;
