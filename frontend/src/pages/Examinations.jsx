import React, { useState, useEffect, useCallback } from 'react';
import { Plus, School, BookOpen, CalendarDays, Target, PenLine, Edit, Trash2, Save } from 'lucide-react';
import { InlineLoader } from '../components/Loader/Loader';
import Modal from '../components/Modal/Modal';
import examApi from '../services/examApi';
import courseApi from '../services/courseApi';
import { useToast } from '../context/ToastContext';
import { formatDate, getInitials } from '../utils/format';
import { hasRole } from '../utils/auth';

const emptyExam = { exam_name: '', academic_year: '', semester: '', exam_date: '', subject_id: '', max_marks: 100, status: 'Scheduled' };

const Examinations = () => {
  const { toast } = useToast();
  const canEdit = hasRole('super_admin', 'admin', 'teacher');

  const [tab, setTab] = useState('exams');
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', semester: '', status: '' });
  const [subjects, setSubjects] = useState([]);

  const [examModal, setExamModal] = useState({ open: false, editing: null, form: emptyExam });

  // Marks entry
  const [entry, setEntry] = useState(null);
  const [marksForm, setMarksForm] = useState({});

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.semester) params.semester = filters.semester;
      if (filters.status) params.status = filters.status;
      const res = await examApi.getExams(params);
      if (res.success) setExams(res.exams || []);
    } catch (error) {
      toast.error('Failed to load examinations');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const fetchOptions = async () => {
    try {
      const subRes = await courseApi.getSubjectOptions().catch(() => ({ data: [] }));
      if (subRes.data) setSubjects(subRes.data);
    } catch (error) {
      console.error('Failed to load options');
    }
  };

  useEffect(() => { fetchExams(); }, [fetchExams]);
  useEffect(() => { fetchOptions(); }, []);

  const saveExam = async () => {
    const f = examModal.form;
    if (!f.exam_name || !f.subject_id || !f.semester || !f.max_marks) {
      toast.error('Exam name, subject, semester and max marks are required');
      return;
    }
    try {
      if (examModal.editing) {
        await examApi.updateExam(examModal.editing.id, f);
        toast.success('Examination updated');
      } else {
        await examApi.createExam(f);
        toast.success('Examination created');
      }
      setExamModal({ open: false, editing: null, form: emptyExam });
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save examination');
    }
  };

  const deleteExam = async (exam) => {
    if (!window.confirm(`Delete examination "${exam.exam_name}"?`)) return;
    try {
      await examApi.deleteExam(exam.id);
      toast.success('Examination deleted');
      fetchExams();
    } catch (error) {
      toast.error('Failed to delete examination');
    }
  };

  const openEntry = async (exam) => {
    try {
      const res = await examApi.getExamEntry(exam.id);
      if (res.success) {
        const form = {};
        res.data.rows.forEach(r => {
          if (r.mark) {
            form[r.id] = {
              internal: r.mark.internal_marks, external: r.mark.external_marks,
              practical: r.mark.practical_marks, assignment: r.mark.assignment_marks
            };
          } else {
            form[r.id] = { internal: '', external: '', practical: '', assignment: '' };
          }
        });
        setMarksForm(form);
        setEntry(res.data);
        setTab('marks');
      }
    } catch (error) {
      toast.error('Failed to load marks entry');
    }
  };

  const setMarkField = (studentId, field, value) => {
    setMarksForm(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [field]: value }
    }));
  };

  const totalFor = (studentId) => {
    const m = marksForm[studentId] || {};
    return (Number(m.internal) || 0) + (Number(m.external) || 0) + (Number(m.practical) || 0) + (Number(m.assignment) || 0);
  };

  const saveMarks = async () => {
    if (!entry) return;
    const rows = entry.rows
      .filter(r => marksForm[r.id] && (marksForm[r.id].internal !== '' || marksForm[r.id].external !== '' || marksForm[r.id].practical !== '' || marksForm[r.id].assignment !== ''))
      .map(r => ({
        studentId: r.id,
        internal_marks: marksForm[r.id].internal || 0,
        external_marks: marksForm[r.id].external || 0,
        practical_marks: marksForm[r.id].practical || 0,
        assignment_marks: marksForm[r.id].assignment || 0
      }));
    if (rows.length === 0) { toast.warning('No marks entered'); return; }
    try {
      await examApi.saveMarks(entry.exam.id, rows);
      toast.success(`Marks saved for ${rows.length} students`);
      setTab('exams');
      setEntry(null);
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save marks');
    }
  };

  const renderExamForm = () => {
    const f = examModal.form;
    const filteredSubjects = subjects.filter(s => (!f.branch || s.branch === f.branch) && (!f.semester || String(s.semester) === String(f.semester)));
    return (
      <>
        <div className="form-group">
          <label className="form-label">Exam Name *</label>
          <input className="form-input" placeholder="e.g. Mid-Term 1" value={f.exam_name} onChange={(e) => setExamModal(prev => ({ ...prev, form: { ...prev.form, exam_name: e.target.value } }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Academic Year</label>
          <input className="form-input" placeholder="e.g. 2025-2026" value={f.academic_year} onChange={(e) => setExamModal(prev => ({ ...prev, form: { ...prev.form, academic_year: e.target.value } }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Semester *</label>
          <select className="form-select" value={f.semester} onChange={(e) => setExamModal(prev => ({ ...prev, form: { ...prev.form, semester: e.target.value } }))}>
            <option value="">Select Semester</option>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Subject *</label>
          <select className="form-select" value={f.subject_id} onChange={(e) => setExamModal(prev => ({ ...prev, form: { ...prev.form, subject_id: e.target.value } }))}>
            <option value="">Select Subject</option>
            {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Exam Date</label>
          <input type="date" className="form-input" value={f.exam_date} onChange={(e) => setExamModal(prev => ({ ...prev, form: { ...prev.form, exam_date: e.target.value } }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Max Marks *</label>
          <input type="number" className="form-input" min="1" value={f.max_marks} onChange={(e) => setExamModal(prev => ({ ...prev, form: { ...prev.form, max_marks: e.target.value } }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={f.status} onChange={(e) => setExamModal(prev => ({ ...prev, form: { ...prev.form, status: e.target.value } }))}>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Examinations</h1>
          <p>Create examinations and enter marks</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary btn-sm" onClick={() => setExamModal({ open: true, editing: null, form: emptyExam })}>
            <Plus size={16} /> Create Exam
          </button>
        )}
      </div>

      <div className="profile-tabs">
        <button className={`profile-tab ${tab === 'exams' ? 'active' : ''}`} onClick={() => setTab('exams')}>Examinations</button>
        {entry && <button className={`profile-tab ${tab === 'marks' ? 'active' : ''}`} onClick={() => setTab('marks')}>Enter Marks — {entry.exam.exam_name}</button>}
      </div>

      {tab === 'exams' && (
        <>
          <div className="filter-bar filter-bar-wrap">
            <input className="form-input" placeholder="Search exams..." value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} style={{ flex: 1, minWidth: '180px' }} />
            <select className="form-select" value={filters.semester} onChange={(e) => setFilters(prev => ({ ...prev, semester: e.target.value }))}>
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <select className="form-select" value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
              <option value="">All Status</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {loading ? (
            <InlineLoader />
          ) : (
            <div className="cards-grid">
              {exams.map(exam => (
                <div className="card course-card" key={exam.id}>
                  <div className="course-card-header">
                    <div>
                      <h3>{exam.exam_name}</h3>
                      <span className="text-muted">{exam.subject_name} ({exam.subject_code})</span>
                    </div>
                    <span className={`badge ${exam.status === 'Completed' ? 'badge-active' : exam.status === 'Cancelled' ? 'badge-inactive' : 'badge-warning'}`}>
                      {exam.status}
                    </span>
                  </div>
                  <div className="course-card-meta">
                    <span><School size={14} /> {exam.branch || '—'}</span>
                    <span><BookOpen size={14} /> Sem {exam.semester}</span>
                    <span><CalendarDays size={14} /> {formatDate(exam.exam_date)}</span>
                    <span><Target size={14} /> Max {exam.max_marks}</span>
                  </div>
                  <div className="course-card-actions">
                    {canEdit && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => openEntry(exam)}><PenLine size={16} /> Enter Marks</button>
                        <button className="btn btn-sm btn-outline" onClick={() => setExamModal({ open: true, editing: exam, form: { ...emptyExam, ...exam } })}><Edit size={16} /> Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteExam(exam)}><Trash2 size={16} /> Delete</button>
                      </>
                    )}
                    {!canEdit && <span className="text-muted">Read only</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && exams.length === 0 && <p className="muted-center">No examinations found.</p>}
        </>
      )}

      {tab === 'marks' && entry && (
        <>
          <div className="bulk-bar">
            <span>
              {entry.exam.exam_name} · {entry.exam.subject_name} · Sem {entry.exam.semester} · Max {entry.exam.max_marks} marks · {entry.rows.length} students
            </span>
            <button className="btn btn-sm btn-success" onClick={saveMarks}><Save size={16} /> Save All Marks</button>
            <button className="btn btn-sm btn-outline" onClick={() => setTab('exams')}>← Back</button>
          </div>

          <div className="table-container">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Student ID</th>
                    <th>Internal</th>
                    <th>External</th>
                    <th>Practical</th>
                    <th>Assignment</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.rows.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="student-avatar"><span>{getInitials(s.name)}</span></div>
                        <span className="student-name">{s.name}</span>
                      </td>
                      <td>{s.student_id}</td>
                      <td>
                        <input type="number" className="marks-input" min="0" max={entry.exam.max_marks} value={marksForm[s.id]?.internal ?? ''} onChange={(e) => setMarkField(s.id, 'internal', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" className="marks-input" min="0" max={entry.exam.max_marks} value={marksForm[s.id]?.external ?? ''} onChange={(e) => setMarkField(s.id, 'external', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" className="marks-input" min="0" max={entry.exam.max_marks} value={marksForm[s.id]?.practical ?? ''} onChange={(e) => setMarkField(s.id, 'practical', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" className="marks-input" min="0" max={entry.exam.max_marks} value={marksForm[s.id]?.assignment ?? ''} onChange={(e) => setMarkField(s.id, 'assignment', e.target.value)} />
                      </td>
                      <td>
                        <strong>{totalFor(s.id)}</strong>
                        <div className="text-muted" style={{ fontSize: '11px' }}>{Number(entry.exam.max_marks) > 0 ? `${((totalFor(s.id) / Number(entry.exam.max_marks)) * 100).toFixed(1)}%` : ''}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Exam Modal */}
      <Modal
        isOpen={examModal.open}
        onClose={() => setExamModal({ open: false, editing: null, form: emptyExam })}
        title={examModal.editing ? 'Edit Examination' : 'Create Examination'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setExamModal({ open: false, editing: null, form: emptyExam })}>Cancel</button>
            <button className="btn btn-primary" onClick={saveExam}>{examModal.editing ? 'Save Changes' : 'Create Exam'}</button>
          </>
        }
      >
        {renderExamForm()}
      </Modal>
    </div>
  );
};

export default Examinations;
