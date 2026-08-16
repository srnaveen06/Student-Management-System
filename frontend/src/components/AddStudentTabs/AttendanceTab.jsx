import React, { useState, useEffect } from 'react';
import courseApi from '../../services/courseApi';

// Optional attendance records to create together with the student.
const AttendanceTab = ({ value = [], onChange, branch, semester, editMode = false }) => {
  const [rows, setRows] = useState(value);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ subject_id: '', attendance_date: '', status: 'Present' });
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    courseApi.getSubjectOptions({ branch, semester })
      .then(res => { if (active) setSubjects(res.data || []); })
      .catch(() => { if (active) setSubjects([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [branch, semester]);

  const addRow = () => {
    if (!form.subject_id || !form.attendance_date) {
      setError('Select a subject and date for the attendance record');
      return;
    }
    const next = [
      ...rows,
      { subject_id: Number(form.subject_id), attendance_date: form.attendance_date, status: form.status }
    ];
    setRows(next);
    onChange(next);
    setForm(f => ({ ...f, subject_id: '', attendance_date: '' }));
    setError('');
  };

  const removeRow = (index) => {
    const next = rows.filter((_, i) => i !== index);
    setRows(next);
    onChange(next);
  };

  return (
    <div className="form-container">
      <h2 className="form-title">📅 Attendance</h2>
      <p className="tab-hint">
        Optionally record attendance for this student. Each record is saved against a subject on a specific date.
      </p>

      {subjects.length === 0 && !loading && (
        <div className="tab-alert">
          No subjects found for the selected branch/semester. You can add subjects in the
          "Courses & Subjects" tab, or leave this section empty.
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Subject <span className="required">*</span></label>
          <select
            name="subject_id"
            className="form-select"
            value={form.subject_id}
            onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
          >
            <option value="">Select Subject</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.subject_name} ({s.subject_code}){s.branch ? ` — ${s.branch}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Date <span className="required">*</span></label>
          <input
            type="date"
            name="attendance_date"
            className="form-input"
            value={form.attendance_date}
            onChange={(e) => setForm({ ...form, attendance_date: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <select
            name="status"
            className="form-select"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">&nbsp;</label>
          <button type="button" className="btn btn-outline" onClick={addRow}>
            ➕ Add Record
          </button>
        </div>
      </div>

      {error && <div className="form-error" style={{ marginTop: 8 }}>{error}</div>}

      {rows.length > 0 && (
        <div className="tab-added-list">
          <h3 className="tab-subtitle">
            {editMode ? `Attendance records (${rows.length})` : `Records to be added (${rows.length})`}
          </h3>
          {rows.map((r, i) => {
            const subject = subjects.find(s => s.id === r.subject_id);
            return (
              <div className="tab-row" key={i}>
                <span>
                  <strong>{subject ? subject.subject_name : `Subject #${r.subject_id}`}</strong>
                  {' — '}{r.attendance_date} · {r.status}
                </span>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeRow(i)}>✕ Remove</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttendanceTab;
