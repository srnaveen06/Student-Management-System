import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, IndianRupee, Trash2, Edit } from 'lucide-react';
import { InlineLoader } from '../components/Loader/Loader';
import Pagination from '../components/Pagination/Pagination';
import Modal from '../components/Modal/Modal';
import feeApi from '../services/feeApi';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/format';
import { hasRole } from '../utils/auth';

const Fees = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const canEdit = hasRole('super_admin', 'admin', 'accountant');

  const [summary, setSummary] = useState(null);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  const [filters, setFilters] = useState({ search: '', status: '', branch: '', semester: '', page: 1, limit: 10 });
  const [branches, setBranches] = useState([]);

  // Modals
  const [assignModal, setAssignModal] = useState({ open: false, studentId: '', totalFees: '', dueDate: '' });
  const [payModal, setPayModal] = useState({ open: false, fee: null, amount: '', paymentDate: '', method: 'Cash', reference: '' });
  const [editModal, setEditModal] = useState({ open: false, payment: null, amount: '', paymentDate: '', method: '', reference: '' });
  const [viewModal, setViewModal] = useState({ open: false, fee: null, payments: [] });

  const today = new Date().toISOString().split('T')[0];

  const fetchSummary = useCallback(async () => {
    try {
      const res = await feeApi.getSummary();
      if (res.success) setSummary(res.data);
    } catch (error) {
      console.error('Failed to load fee summary');
    }
  }, []);

  const fetchFees = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.branch) params.branch = filters.branch;
      if (filters.semester) params.semester = filters.semester;
      params.page = filters.page;
      params.limit = filters.limit;
      const res = await feeApi.getFees(params);
      if (res.success) {
        setFees(res.fees || []);
        setPagination({ total: res.total || 0, page: res.page || 1, totalPages: res.totalPages || 1 });
      }
    } catch (error) {
      toast.error('Failed to load fees');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const fetchBranches = async () => {
    try {
      const res = await studentApi.getBranches();
      if (res.success) setBranches(res.data);
    } catch (error) {
      console.error('Failed to load branches');
    }
  };

  useEffect(() => { fetchSummary(); fetchBranches(); }, [fetchSummary]);
  useEffect(() => { fetchFees(); }, [fetchFees]);

  const handleAssign = async () => {
    if (!assignModal.studentId || !assignModal.totalFees || Number(assignModal.totalFees) <= 0) {
      toast.error('Select a student and enter a valid fee amount');
      return;
    }
    try {
      await feeApi.assignFee({ studentId: assignModal.studentId, totalFees: assignModal.totalFees, dueDate: assignModal.dueDate || null });
      toast.success('Fees assigned successfully');
      setAssignModal({ open: false, studentId: '', totalFees: '', dueDate: '' });
      fetchFees(); fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign fees');
    }
  };

  const openPayModal = (fee) => {
    setPayModal({ open: true, fee, amount: '', paymentDate: today, method: 'Cash', reference: '' });
  };

  const handlePay = async () => {
    if (!payModal.amount || !payModal.paymentDate) {
      toast.error('Amount and date are required');
      return;
    }
    try {
      await feeApi.recordPayment({
        feeId: payModal.fee.id,
        studentId: payModal.fee.student_id,
        amount: payModal.amount,
        paymentDate: payModal.paymentDate,
        method: payModal.method,
        reference: payModal.reference
      });
      toast.success('Payment recorded');
      setPayModal({ open: false, fee: null });
      fetchFees(); fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const openEditModal = (payment) => {
    setEditModal({
      open: true, payment,
      amount: payment.amount, paymentDate: payment.payment_date?.split('T')[0] || today,
      method: payment.method, reference: payment.reference || ''
    });
  };

  const handleEdit = async () => {
    if (!editModal.amount) { toast.error('Amount is required'); return; }
    try {
      await feeApi.editPayment(editModal.payment.id, {
        amount: editModal.amount,
        paymentDate: editModal.paymentDate,
        method: editModal.method,
        reference: editModal.reference
      });
      toast.success('Payment updated');
      setEditModal({ open: false, payment: null });
      fetchFees(); fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update payment');
    }
  };

  const handleDeletePayment = async (payment) => {
    if (!window.confirm(`Delete payment of ${formatCurrency(payment.amount)}?`)) return;
    try {
      await feeApi.deletePayment(payment.id);
      toast.success('Payment deleted');
      setEditModal({ open: false, payment: null });
      fetchFees(); fetchSummary();
    } catch (error) {
      toast.error('Failed to delete payment');
    }
  };

  const openView = async (fee) => {
    try {
      const res = await feeApi.getFee(fee.id);
      if (res.success) {
        setViewModal({ open: true, fee: res.data, payments: res.data.payments || [] });
      }
    } catch (error) {
      toast.error('Failed to load fee details');
    }
  };

  const feeBadge = (status) => (
    <span className={`badge ${status === 'Paid' ? 'badge-active' : status === 'Partially Paid' ? 'badge-warning' : 'badge-inactive'}`}>
      {status}
    </span>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Fees</h1>
          <p>Manage student fees and payments</p>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setAssignModal({ open: true, studentId: '', totalFees: '', dueDate: '' })}>
              <Plus size={16} /> Assign Fees
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="dashboard-stats">
        <div className="stat-inline-card"><span>Total Fees</span><strong>{formatCurrency(summary?.totalFees)}</strong></div>
        <div className="stat-inline-card"><span>Collected</span><strong style={{ color: 'var(--success)' }}>{formatCurrency(summary?.totalCollected)}</strong></div>
        <div className="stat-inline-card"><span>Pending</span><strong style={{ color: 'var(--danger)' }}>{formatCurrency(summary?.totalPending)}</strong></div>
        <div className="stat-inline-card"><span>Pending Fee Records</span><strong>{summary?.pendingFeeCount || 0}</strong></div>
        <div className="stat-inline-card"><span>Pending Students</span><strong>{summary?.pendingStudentCount || 0}</strong></div>
      </div>

      {/* Filters */}
      <div className="filter-bar filter-bar-wrap">
        <input
          className="form-input"
          placeholder="Search by name or student ID..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <select className="form-select" value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}>
          <option value="">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Pending">Pending</option>
        </select>
        <select className="form-select" value={filters.branch} onChange={(e) => setFilters(prev => ({ ...prev, branch: e.target.value, page: 1 }))}>
          <option value="">All Branches</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="form-select" value={filters.semester} onChange={(e) => setFilters(prev => ({ ...prev, semester: e.target.value, page: 1 }))}>
          <option value="">All Semesters</option>
          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
      </div>

      {/* Fees Table */}
      {loading ? (
        <InlineLoader />
      ) : (
        <>
          <div className="table-container">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Branch</th>
                    <th>Semester</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Remaining</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map(f => (
                    <tr key={f.id}>
                      <td>
                        <button className="student-name student-name-link" onClick={() => navigate(`/students/profile/${f.student_id}`)}>
                          {f.name}
                        </button>
                        <div className="text-muted" style={{ fontSize: '12px' }}>{f.student_id}</div>
                      </td>
                      <td>{f.branch}</td>
                      <td>Sem {f.semester}</td>
                      <td>{formatCurrency(f.total_fees)}</td>
                      <td style={{ color: 'var(--success)' }}>{formatCurrency(f.paid)}</td>
                      <td style={{ color: 'var(--danger)' }}>{formatCurrency(f.remaining)}</td>
                      <td>{feeBadge(f.status)}</td>
                      <td>{f.due_date ? formatDate(f.due_date) : '—'}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn view" title="View Payments" onClick={() => openView(f)}><Eye size={16} /></button>
                          {canEdit && Number(f.remaining) > 0 && (
                            <button className="action-btn edit" title="Record Payment" onClick={() => openPayModal(f)}><IndianRupee size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span className="table-info">Showing {fees.length} of {pagination.total} fee records</span>
            </div>
          </div>
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))} />
        </>
      )}

      {/* Assign Fee Modal */}
      <Modal
        isOpen={assignModal.open}
        onClose={() => setAssignModal({ open: false, studentId: '', totalFees: '', dueDate: '' })}
        title="Assign Fees"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setAssignModal({ open: false, studentId: '', totalFees: '', dueDate: '' })}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAssign}>Assign</button>
          </>
        }
      >
        <StudentPicker value={assignModal.studentId} onChange={(v) => setAssignModal(prev => ({ ...prev, studentId: v }))} />
        <div className="form-group">
          <label className="form-label">Total Fees (₹)</label>
          <input type="number" className="form-input" min="1" placeholder="e.g. 50000" value={assignModal.totalFees} onChange={(e) => setAssignModal(prev => ({ ...prev, totalFees: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Due Date (optional)</label>
          <input type="date" className="form-input" value={assignModal.dueDate} onChange={(e) => setAssignModal(prev => ({ ...prev, dueDate: e.target.value }))} />
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={payModal.open}
        onClose={() => setPayModal({ open: false, fee: null })}
        title="Record Payment"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setPayModal({ open: false, fee: null })}>Cancel</button>
            <button className="btn btn-success" onClick={handlePay}><IndianRupee size={16} /> Save Payment</button>
          </>
        }
      >
        {payModal.fee && (
          <>
            <p className="text-muted" style={{ marginBottom: '16px' }}>
              {payModal.fee.name} · Total: <strong>{formatCurrency(payModal.fee.total_fees)}</strong> · Remaining: <strong>{formatCurrency(payModal.fee.remaining)}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input type="number" className="form-input" min="1" value={payModal.amount} onChange={(e) => setPayModal(prev => ({ ...prev, amount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input type="date" className="form-input" value={payModal.paymentDate} onChange={(e) => setPayModal(prev => ({ ...prev, paymentDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Method</label>
              <select className="form-select" value={payModal.method} onChange={(e) => setPayModal(prev => ({ ...prev, method: e.target.value }))}>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reference (optional)</label>
              <input type="text" className="form-input" placeholder="Transaction/Cheque no." value={payModal.reference} onChange={(e) => setPayModal(prev => ({ ...prev, reference: e.target.value }))} />
            </div>
          </>
        )}
      </Modal>

      {/* Edit/Delete Payment Modal */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, payment: null })}
        title="Edit Payment"
        footer={
          <>
            {editModal.payment && (
              <button className="btn btn-danger" onClick={() => handleDeletePayment(editModal.payment)}><Trash2 size={16} /> Delete</button>
            )}
            <button className="btn btn-outline" onClick={() => setEditModal({ open: false, payment: null })}>Cancel</button>
            <button className="btn btn-primary" onClick={handleEdit}>Save</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Amount</label>
          <input type="number" className="form-input" min="1" value={editModal.amount} onChange={(e) => setEditModal(prev => ({ ...prev, amount: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Payment Date</label>
          <input type="date" className="form-input" value={editModal.paymentDate} onChange={(e) => setEditModal(prev => ({ ...prev, paymentDate: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Method</label>
          <select className="form-select" value={editModal.method} onChange={(e) => setEditModal(prev => ({ ...prev, method: e.target.value }))}>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Reference</label>
          <input type="text" className="form-input" value={editModal.reference} onChange={(e) => setEditModal(prev => ({ ...prev, reference: e.target.value }))} />
        </div>
      </Modal>

      {/* View Fee Payments Modal */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, fee: null, payments: [] })}
        title={viewModal.fee ? `Payments — ${viewModal.fee.name}` : 'Payments'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setViewModal({ open: false, fee: null, payments: [] })}>Close</button>
          </>
        }
      >
        {viewModal.fee && (
          <>
            <div className="view-details">
              <div className="view-detail-item">
                <span className="view-detail-label">Total</span>
                <span className="view-detail-value">{formatCurrency(viewModal.fee.total_fees)}</span>
              </div>
              <div className="view-detail-item">
                <span className="view-detail-label">Paid</span>
                <span className="view-detail-value" style={{ color: 'var(--success)' }}>{formatCurrency(viewModal.fee.paid)}</span>
              </div>
              <div className="view-detail-item">
                <span className="view-detail-label">Remaining</span>
                <span className="view-detail-value" style={{ color: 'var(--danger)' }}>{formatCurrency(viewModal.fee.remaining)}</span>
              </div>
            </div>
            {viewModal.payments.length > 0 ? (
              <div className="table-wrapper" style={{ marginTop: '16px' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Receipt</th><th>Date</th><th>Method</th><th>Amount</th>{canEdit && <th>Actions</th>}</tr>
                  </thead>
                  <tbody>
                    {viewModal.payments.map(p => (
                      <tr key={p.id}>
                        <td>{p.receipt_number || p.id}</td>
                        <td>{formatDate(p.payment_date)}</td>
                        <td>{p.method}</td>
                        <td>{formatCurrency(p.amount)}</td>
                        {canEdit && (
                          <td><button className="btn btn-sm btn-outline" onClick={() => { setViewModal(prev => ({ ...prev, open: false })); openEditModal(p); }}><Edit size={16} /> Edit</button></td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted-center">No payments recorded yet</p>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

// Debounced student picker for the assign-fee modal
const StudentPicker = ({ value, onChange }) => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query) { setOptions([]); return; }
      setLoading(true);
      try {
        const res = await studentApi.getAll({ search: query, limit: 20 });
        if (res.success) setOptions(res.data);
      } catch (error) {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="form-group">
      <label className="form-label">Student</label>
      <input
        className="form-input"
        placeholder="Type to search student by name or ID..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        list="student-options-list"
      />
      <datalist id="student-options-list">
        {options.map(s => <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>)}
      </datalist>
      {loading && <p className="form-hint">Searching...</p>}
      {value && <p className="form-hint">Selected student ID: {value}</p>}
      <select className="form-select" value={value} onChange={(e) => onChange(e.target.value)} style={{ marginTop: '8px' }}>
        <option value="">Select student</option>
        {options.map(s => <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>)}
      </select>
    </div>
  );
};

export default Fees;
