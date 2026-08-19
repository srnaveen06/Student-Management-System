import React, { useState, useEffect } from 'react';
import { FileText, Plus, AlertTriangle, X } from 'lucide-react';
import examApi from '../../services/examApi';
import courseApi from '../../services/courseApi';
import { formatDate } from '../../utils/format';

// Enroll the student in existing exams and/or create a new exam with marks.
const ExamsTab = ({ value = [], onChange, branch, semester }) => {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(value.filter(e => e.exam_id).map(e => e.exam_id));
  const [extra, setExtra] = useState(value.filter(e => e.is_new));
  // Existing marks per enrolled exam (kept when editing so resaving doesn't wipe them)
  const [marksByExam, setMarksByExam] = useState(() => {
    const map = {};
    value.filter(e => e.exam_id).forEach(e => {
      map[e.exam_id] = {
        internal_marks: e.internal_marks || 0,
        external_marks: e.external_marks || 0,
        practical_marks: e.practical_marks || 0,
        assignment_marks: e.assignment_marks || 0
      };
    });
    return map;
  });
  const [newExam, setNewExam] = useState({
    exam_name: '',
    subject_id: '',
    semester: semester || '',
    exam_date: '',
    max_marks: '',
    internal_marks: '',
    external_marks: '',
    practical_marks: '',
    assignment_marks: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      examApi.getExams({ limit: 100 }).then(r => r.exams || []).catch(() => []),
      courseApi.getSubjectOptions({ branch, semester }).then(r => r.data || []).catch(() => [])
    ]).then(([ex, sub]) => {
      if (!active) return;
      setExams(ex);
      setSubjects(sub);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [branch, semester]);

  const emit = (en, ex) => {
    onChange([
      ...exams.filter(e => en.includes(e.id)).map(e => ({
        exam_id: e.id,
        ...(marksByExam[e.id] || {})
      })),
      ...ex
    ]);
  };

  const toggleExam = (id) => {
    const next = enrolled.includes(id)
      ? enrolled.filter(x => x !== id)
      : [...enrolled, id];
    setEnrolled(next);
    emit(next, extra);
  };

  const addNewExam = () => {
    if (!newExam.exam_name.trim() || !newExam.subject_id) {
      setError('New exam needs an exam name and a subject');
      return;
    }
    const item = {
      is_new: true,
      exam_name: newExam.exam_name.trim(),
      subject_id: Number(newExam.subject_id),
      semester: newExam.semester ? Number(newExam.semester) : semester ? Number(semester) : 1,
      exam_date: newExam.exam_date || null,
      max_marks: Number(newExam.max_marks) || 100,
      internal_marks: Number(newExam.internal_marks) || 0,
      external_marks: Number(newExam.external_marks) || 0,
      practical_marks: Number(newExam.practical_marks) || 0,
      assignment_marks: Number(newExam.assignment_marks) || 0
    };
    const next = [...extra, item];
    setExtra(next);
    emit(enrolled, next);
    setNewExam({
      exam_name: '', subject_id: '', semester: semester || '', exam_date: '',
      max_marks: '', internal_marks: '', external_marks: '', practical_marks: '', assignment_marks: ''
    });
    setError('');
  };

  const removeExtra = (index) => {
    const next = extra.filter((_, i) => i !== index);
    setExtra(next);
    emit(enrolled, next);
  };

  const marksTotal = ['internal_marks', 'external_marks', 'practical_marks', 'assignment_marks']
    .reduce((sum, k) => sum + (Number(newExam[k]) || 0), 0);
  const maxMarks = Number(newExam.max_marks) || 100;

  return (
    <div className="form-container">
      <h2 className="form-title"><FileText size={20} /> Examinations</h2>
      <p className="tab-hint">
        Enroll this student in existing exams, or create a new exam with this student's marks.
      </p>

      {error && <div className="form-error" style={{ marginBottom: 8 }}>{error}</div>}

      {/* Enroll in existing exams */}
      <h3 className="tab-subtitle">Enroll in Existing Exams</h3>
      <div className="tab-check-list">
        {loading && <div className="tab-hint">Loading exams…</div>}
        {!loading && exams.length === 0 && (
          <div className="tab-hint">No existing exams found. You can create a new one below.</div>
        )}
        {exams.map(e => (
          <label className="tab-check-item" key={e.id}>
            <input
              type="checkbox"
              checked={enrolled.includes(e.id)}
              onChange={() => toggleExam(e.id)}
            />
            <span>
              <strong>{e.exam_name}</strong>
              {' '}<span className="tab-muted">{e.subject_name ? `(${e.subject_name})` : ''}</span>
              {e.exam_date ? ` — ${formatDate(e.exam_date)}` : ''}
            </span>
          </label>
        ))}
      </div>

      {/* Create new exam */}
      <h3 className="tab-subtitle"><Plus size={16} /> Create New Exam with Marks</h3>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Exam Name <span className="required">*</span></label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Mid Term 1"
            value={newExam.exam_name}
            onChange={(e) => setNewExam({ ...newExam, exam_name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Subject <span className="required">*</span></label>
          <select
            className="form-select"
            value={newExam.subject_id}
            onChange={(e) => setNewExam({ ...newExam, subject_id: e.target.value })}
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
          <label className="form-label">Semester</label>
          <select
            className="form-select"
            value={newExam.semester}
            onChange={(e) => setNewExam({ ...newExam, semester: e.target.value })}
          >
            <option value="">Select Semester</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <option key={n} value={n}>Semester {n}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Exam Date</label>
          <input
            type="date"
            className="form-input"
            value={newExam.exam_date}
            onChange={(e) => setNewExam({ ...newExam, exam_date: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Max Marks</label>
          <input
            type="number"
            min="1"
            className="form-input"
            placeholder="100"
            value={newExam.max_marks}
            onChange={(e) => setNewExam({ ...newExam, max_marks: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Internal Marks</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="form-input"
            value={newExam.internal_marks}
            onChange={(e) => setNewExam({ ...newExam, internal_marks: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">External Marks</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="form-input"
            value={newExam.external_marks}
            onChange={(e) => setNewExam({ ...newExam, external_marks: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Practical Marks</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="form-input"
            value={newExam.practical_marks}
            onChange={(e) => setNewExam({ ...newExam, practical_marks: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Assignment Marks</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="form-input"
            value={newExam.assignment_marks}
            onChange={(e) => setNewExam({ ...newExam, assignment_marks: e.target.value })}
          />
        </div>

        <div className="form-group tab-inline-actions">
          <button type="button" className="btn btn-outline" onClick={addNewExam}>Add Exam</button>
        </div>
      </div>

      {newExam.exam_name && (
        <div className="tab-hint" style={{ marginTop: 8 }}>
          Marks total: <strong>{marksTotal}</strong> / {maxMarks}
          {maxMarks > 0 && marksTotal > maxMarks ? <><AlertTriangle size={14} /> exceeds max marks</> : ''}
        </div>
      )}

      {extra.length > 0 && (
        <div className="tab-added-list">
          <h3 className="tab-subtitle">Exams to be created ({extra.length})</h3>
          {extra.map((ex, i) => {
            const subject = subjects.find(s => s.id === ex.subject_id);
            return (
              <div className="tab-row" key={i}>
                <span>
                  <strong>{ex.exam_name}</strong>
                  {' — '}{subject ? subject.subject_name : `Subject #${ex.subject_id}`}
                  {' · Marks: '}{ex.internal_marks}/{ex.external_marks}/{ex.practical_marks}/{ex.assignment_marks}
                </span>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeExtra(i)}><X size={14} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExamsTab;
