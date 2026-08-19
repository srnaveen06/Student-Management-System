import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, X } from 'lucide-react';
import courseApi from '../../services/courseApi';

// Assign existing courses/subjects to the student and/or create new ones inline.
// `value` = { courses: [{ course_id } | { is_new, ... }], subjects: [...] } — prefilled
// from the student's existing enrollments when editing.
const CoursesSubjectsTab = ({ value = { courses: [], subjects: [] }, onChange, branch, semester }) => {
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selCourses, setSelCourses] = useState(
    () => (value.courses || []).filter(c => c.course_id).map(c => c.course_id)
  );
  const [selSubjects, setSelSubjects] = useState(
    () => (value.subjects || []).filter(s => s.subject_id).map(s => s.subject_id)
  );
  const [extraCourses, setExtraCourses] = useState(() => (value.courses || []).filter(c => c.is_new));
  const [extraSubjects, setExtraSubjects] = useState(() => (value.subjects || []).filter(s => s.is_new));

  const [newCourse, setNewCourse] = useState({ course_name: '', course_code: '', credits: '' });
  const [newSubject, setNewSubject] = useState({ subject_name: '', subject_code: '', credits: '', teacher: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      courseApi.getCourses({ branch, semester, limit: 100 }).then(r => r.courses || []).catch(() => []),
      courseApi.getSubjects({ branch, semester, limit: 100 }).then(r => r.subjects || []).catch(() => [])
    ]).then(([c, s]) => {
      if (!active) return;
      setCourses(c);
      setSubjects(s);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [branch, semester]);

  const emit = (sc, ss, ec, es) => {
    onChange({
      courses: [
        ...courses.filter(c => sc.includes(c.id)).map(c => ({ course_id: c.id })),
        ...ec
      ],
      subjects: [
        ...subjects.filter(s => ss.includes(s.id)).map(s => ({ subject_id: s.id })),
        ...es
      ]
    });
  };

  const toggleCourse = (id) => {
    const next = selCourses.includes(id)
      ? selCourses.filter(x => x !== id)
      : [...selCourses, id];
    setSelCourses(next);
    emit(next, selSubjects, extraCourses, extraSubjects);
  };

  const toggleSubject = (id) => {
    const next = selSubjects.includes(id)
      ? selSubjects.filter(x => x !== id)
      : [...selSubjects, id];
    setSelSubjects(next);
    emit(selCourses, next, extraCourses, extraSubjects);
  };

  const addNewCourse = () => {
    if (!newCourse.course_name.trim() || !newCourse.course_code.trim()) {
      setError('New course needs a name and course code');
      return;
    }
    const item = {
      is_new: true,
      course_name: newCourse.course_name.trim(),
      course_code: newCourse.course_code.trim().toUpperCase(),
      branch: branch || null,
      semester: semester ? Number(semester) : null,
      credits: Number(newCourse.credits) || 0
    };
    const next = [...extraCourses, item];
    setExtraCourses(next);
    emit(selCourses, selSubjects, next, extraSubjects);
    setNewCourse({ course_name: '', course_code: '', credits: '' });
    setError('');
  };

  const removeNewCourse = (index) => {
    const next = extraCourses.filter((_, i) => i !== index);
    setExtraCourses(next);
    emit(selCourses, selSubjects, next, extraSubjects);
  };

  const addNewSubject = () => {
    if (!newSubject.subject_name.trim() || !newSubject.subject_code.trim()) {
      setError('New subject needs a name and subject code');
      return;
    }
    const item = {
      is_new: true,
      subject_name: newSubject.subject_name.trim(),
      subject_code: newSubject.subject_code.trim().toUpperCase(),
      branch: branch || '',
      semester: semester ? Number(semester) : 1,
      credits: Number(newSubject.credits) || 0,
      teacher: newSubject.teacher.trim() || null
    };
    const next = [...extraSubjects, item];
    setExtraSubjects(next);
    emit(selCourses, selSubjects, extraCourses, next);
    setNewSubject({ subject_name: '', subject_code: '', credits: '', teacher: '' });
    setError('');
  };

  const removeNewSubject = (index) => {
    const next = extraSubjects.filter((_, i) => i !== index);
    setExtraSubjects(next);
    emit(selCourses, selSubjects, extraCourses, next);
  };

  return (
    <div className="form-container">
      <h2 className="form-title"><BookOpen size={20} /> Courses & Subjects</h2>
      <p className="tab-hint">
        Assign existing courses/subjects to this student, or create new ones inline.
        New ones will be created when you save the student.
      </p>

      {error && <div className="form-error" style={{ marginBottom: 8 }}>{error}</div>}

      <div className="tab-columns">
        {/* Courses */}
        <div className="tab-column">
          <h3 className="tab-subtitle">Courses</h3>

          <div className="tab-check-list">
            {loading && <div className="tab-hint">Loading courses…</div>}
            {!loading && courses.length === 0 && (
              <div className="tab-hint">No existing courses found{branch ? ` for ${branch}` : ''}. You can add one below.</div>
            )}
            {courses.map(c => (
              <label className="tab-check-item" key={c.id}>
                <input
                  type="checkbox"
                  checked={selCourses.includes(c.id)}
                  onChange={() => toggleCourse(c.id)}
                />
                <span>
                  <strong>{c.course_name}</strong>
                  {' '}<span className="tab-muted">({c.course_code})</span>
                  {c.semester ? ` — Sem ${c.semester}` : ''}
                </span>
              </label>
            ))}
          </div>

          <div className="tab-inline-form">
            <h4 className="tab-inline-title"><Plus size={16} /> Add New Course</h4>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Course Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Data Structures"
                  value={newCourse.course_name}
                  onChange={(e) => setNewCourse({ ...newCourse, course_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Course Code <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CS201"
                  value={newCourse.course_code}
                  onChange={(e) => setNewCourse({ ...newCourse, course_code: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Credits</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={newCourse.credits}
                  onChange={(e) => setNewCourse({ ...newCourse, credits: e.target.value })}
                />
              </div>
              <div className="form-group tab-inline-actions">
                <button type="button" className="btn btn-outline" onClick={addNewCourse}>Add</button>
              </div>
            </div>
          </div>

          {extraCourses.length > 0 && (
            <div className="tab-added-list">
              {extraCourses.map((c, i) => (
                <div className="tab-row" key={i}>
                  <span><strong>{c.course_name}</strong> ({c.course_code}) — new</span>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeNewCourse(i)}><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subjects */}
        <div className="tab-column">
          <h3 className="tab-subtitle">Subjects</h3>

          <div className="tab-check-list">
            {loading && <div className="tab-hint">Loading subjects…</div>}
            {!loading && subjects.length === 0 && (
              <div className="tab-hint">No existing subjects found{branch ? ` for ${branch}` : ''}. You can add one below.</div>
            )}
            {subjects.map(s => (
              <label className="tab-check-item" key={s.id}>
                <input
                  type="checkbox"
                  checked={selSubjects.includes(s.id)}
                  onChange={() => toggleSubject(s.id)}
                />
                <span>
                  <strong>{s.subject_name}</strong>
                  {' '}<span className="tab-muted">({s.subject_code})</span>
                  {s.semester ? ` — Sem ${s.semester}` : ''}
                </span>
              </label>
            ))}
          </div>

          <div className="tab-inline-form">
            <h4 className="tab-inline-title"><Plus size={16} /> Add New Subject</h4>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Subject Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Operating Systems"
                  value={newSubject.subject_name}
                  onChange={(e) => setNewSubject({ ...newSubject, subject_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Subject Code <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CS303"
                  value={newSubject.subject_code}
                  onChange={(e) => setNewSubject({ ...newSubject, subject_code: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Credits</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={newSubject.credits}
                  onChange={(e) => setNewSubject({ ...newSubject, credits: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Teacher</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Teacher name (optional)"
                  value={newSubject.teacher}
                  onChange={(e) => setNewSubject({ ...newSubject, teacher: e.target.value })}
                />
              </div>
              <div className="form-group tab-inline-actions">
                <button type="button" className="btn btn-outline" onClick={addNewSubject}>Add</button>
              </div>
            </div>
          </div>

          {extraSubjects.length > 0 && (
            <div className="tab-added-list">
              {extraSubjects.map((s, i) => (
                <div className="tab-row" key={i}>
                  <span><strong>{s.subject_name}</strong> ({s.subject_code}) — new</span>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeNewSubject(i)}><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursesSubjectsTab;
