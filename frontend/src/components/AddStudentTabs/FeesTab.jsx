import React, { useState } from 'react';
import { IndianRupee } from 'lucide-react';

// Optional fee assignment + initial payment for the student.
const FeesTab = ({ value = null, onChange, editMode = false }) => {
  const [form, setForm] = useState({
    total_fees: value?.total_fees || '',
    due_date: value?.due_date || '',
    initial_payment: value?.initial_payment || '',
    payment_method: 'Cash',
    payment_date: new Date().toISOString().slice(0, 10),
    reference: value?.reference || ''
  });
  const [error, setError] = useState('');

  const notify = (next) => {
    const totalFees = Number(next.total_fees);
    if (!next.total_fees || !(totalFees > 0)) {
      onChange(null);
      return;
    }
    const initialPayment = Math.max(Number(next.initial_payment) || 0, 0);
    if (initialPayment > totalFees) {
      setError('Payment cannot exceed total fees');
    } else {
      setError('');
    }
    onChange({
      total_fees: totalFees,
      due_date: next.due_date || null,
      initial_payment: initialPayment,
      payment_method: next.payment_method,
      payment_date: next.payment_date || null,
      reference: next.reference || null
    });
  };

  const handleChange = (e) => {
    const next = { ...form, [e.target.name]: e.target.value };
    setForm(next);
    notify(next);
  };

  return (
    <div className="form-container">
      <h2 className="form-title"><IndianRupee size={20} /> Fees</h2>
      <p className="tab-hint">
        {editMode
          ? 'Update the fee assignment for this student or record a new payment. Payment history is never deleted.'
          : 'Optionally assign tuition fees to this student and record an initial payment. Leave "Total Fees" blank to skip this section.'}
      </p>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Total Fees</label>
          <input
            type="number"
            name="total_fees"
            min="0"
            step="0.01"
            className={`form-input ${error ? 'error' : ''}`}
            placeholder="e.g. 45000"
            value={form.total_fees}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Due Date</label>
          <input
            type="date"
            name="due_date"
            className="form-input"
            value={form.due_date}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{editMode ? 'New Payment' : 'Initial Payment'}</label>
          <input
            type="number"
            name="initial_payment"
            min="0"
            step="0.01"
            className="form-input"
            placeholder={editMode ? 'e.g. 5000 (optional)' : 'e.g. 10000 (optional)'}
            value={form.initial_payment}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <select
            name="payment_method"
            className="form-select"
            value={form.payment_method}
            onChange={handleChange}
          >
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="UPI">UPI</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Payment Date</label>
          <input
            type="date"
            name="payment_date"
            className="form-input"
            value={form.payment_date}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Reference No.</label>
          <input
            type="text"
            name="reference"
            className="form-input"
            placeholder="Transaction reference (optional)"
            value={form.reference}
            onChange={handleChange}
          />
        </div>
      </div>

      {error && <div className="form-error" style={{ marginTop: 8 }}>{error}</div>}

      {Number(form.total_fees) > 0 && (
        <div className="tab-added-list">
          <div className="tab-row">
            <span>
              <strong>Total: ₹{Number(form.total_fees).toLocaleString()}</strong>
              {' · Initial payment: ₹'}{Number(form.initial_payment) || 0}
              {' · Status: '}
              <strong>
                {Number(form.initial_payment) >= Number(form.total_fees)
                  ? 'Paid'
                  : Number(form.initial_payment) > 0 ? 'Partially Paid' : 'Pending'}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesTab;
