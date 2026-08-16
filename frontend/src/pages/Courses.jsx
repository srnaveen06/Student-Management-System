import React, { useState, useEffect, useCallback } from 'react';
import { InlineLoader } from '../components/Loader/Loader';
import Modal from '../components/Modal/Modal';
import courseApi from '../services/courseApi';
import { useToast } from '../context/ToastContext';
import { isAdmin } from '../utils/auth';

const emptyCourse = { course_name: '', course_code: '', branch: '', semester: '', credits: '', description: '', status: 'Active' };
const emptySubject = { subject_name: '', subject_code: '', branch: '', semester: '', credits: '', teacher: '', course_id: '', status: 'Active' };

const Courses = () => {
  const { toast } = useToast();
  const canEdit = isAdmin();

  const [tab, setTab] = useState('courses');

  // Courses
  const [courses, setCourses] = useState([]);
  const [courseFilters, setCourseFilters] = useState({ search: '', branch: '', semester: '', status: '' });
  const [courseModal, setCourseModal] = useState({ open: false, editing: null, form: emptyCourse });

  // Subjects
  const [subjects, setSubjects] = useState([]);
  const [subjectFilters, setSubjectFilters] = useState({ search: '', branch: '', semester: '', status: '' });
  const [subjectModal, setSubjectModal] = useState({ open: false, editing: null, form: emptySubject });

  const [loading, setLoading] = useState(true);
  const branches = ['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT'];

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (courseFilters.search) params.search = courseFilters.search;
      if (courseFilters.branch) params.branch = courseFilters.branch;
      if (courseFilters.semester) params.semester = courseFilters.semester;
      if (courseFilters.status) params.status = courseFilters.status;
      const res = await courseApi.getCourses(params);
      if (res.success) setCourses(res.courses || []);
    } catch (error) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [courseFilters, toast]);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (subjectFilters.search) params.search = subjectFilters.search;
      if (subjectFilters.branch) params.branch = subjectFilters.branch;
      if (subjectFilters.semester) params.semester = subjectFilters.semester;
      if (subjectFilters.status) params.status = subjectFilters.status;
      const res = await courseApi.getSubjects(params);
      if (res.success) setSubjects(res.subjects || []);
    } catch (error) {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, [subjectFilters, toast]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);
  useEffect(() => { if (tab === 'subjects') fetchSubjects(); }, [tab, fetchSubjects]);

  const saveCourse = async () => {
    const f = courseModal.form;
    if (!f.course_name || !f.course_code) { toast.error('Course name and code are required'); return; }
    try {
      if (courseModal.editing) {
        await courseApi.updateCourse(courseModal.editing.id, f);
        toast.success('Course updated');
      } else {
        await courseApi.createCourse(f);
        toast.success('Course created');
      }
      setCourseModal({ open: false, editing: null, form: emptyCourse });
      fetchCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save course');
    }
  };

  const deleteCourse = async (course) => {
    if (!window.confirm(`Delete course "${course.course_name}"?`)) return;
    try {
      await courseApi.deleteCourse(course.id);
      toast.success('Course deleted');
      fetchCourses();
    } catch (error) {
      toast.error('Failed to delete course');
    }
  };

  const saveSubject = async () => {
    const f = subjectModal.form;
    if (!f.subject_name || !f.subject_code) { toast.error('Subject name and code are required'); return; }
    try {
      if (subjectModal.editing) {
        await courseApi.updateSubject(subjectModal.editing.id, f);
        toast.success('Subject updated');
      } else {
        await courseApi.createSubject(f);
        toast.success('Subject created');
      }
      setSubjectModal({ open: false, editing: null, form: emptySubject });
      fetchSubjects();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save subject');
    }
  };

  const deleteSubject = async (subject) => {
    if (!window.confirm(`Delete subject "${subject.subject_name}"?`)) return;
    try {
      await courseApi.deleteSubject(subject.id);
      toast.success('Subject deleted');
      fetchSubjects();
    } catch (error) {
      toast.error('Failed to delete subject');
    }
  };

  const renderCourseForm = () => (
    <>
      <div className="form-group">
        <label className="form-label">Course Name *</label>
        <input className="form-input" placeholder="e.g. B.Tech Computer Science" value={courseModal.form.course_name} onChange={(e) => setCourseModal(prev => ({ ...prev, form: { ...prev.form, course_name: e.target.value } }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Course Code *</label>
        <input className="form-input" placeholder="e.g. BCS" value={courseModal.form.course_code} onChange={(e) => setCourseModal(prev => ({ ...prev, form: { ...prev.form, course_code: e.target.value } }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Branch</label>
        <select className="form-select" value={courseModal.form.branch} onChange={(e) => setCourseModal(prev => ({ ...prev, form: { ...prev.form, branch: e.target.value } }))}>
          <option value="">Select Branch</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Semester</label>
        <select className="form-select" value={courseModal.form.semester} onChange={(e) => setCourseModal(prev => ({ ...prev, form: { ...prev.form, semester: e.target.value } }))}>
          <option value="">All Semesters</option>
          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Credits</label>
        <input type="number" className="form-input" value={courseModal.form.credits} onChange={(e) => setCourseModal(prev => ({ ...prev, form: { ...prev.form, credits: e.target.value } }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-input" rows="3" value={courseModal.form.description} onChange={(e) => setCourseModal(prev => ({ ...prev, form: { ...prev.form, description: e.target.value } }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-select" value={courseModal.form.status} onChange={(e) => setCourseModal(prev => ({ ...prev, form: { ...prev.form, status: e.target.value } }))}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
    </>
  );

  const renderSubjectForm = () => (
    <>
      <div className="form-group">
        <label className="form-label">Subject Name *</label>
        <input className="form-input" placeholder="e.g. Data Structures" value={subjectModal.form.subject_name} onChange={(e) => setSubjectModal(prev => ({ ...prev, form: { ...prev.form, subject_name: e.target.value } }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Subject Code *</label>
        <input className="form-input" placeholder="e.g. CS301" value={subjectModal.form.subject_code} onChange={(e) => setSubjectModal(prev => ({ ...prev, form: { ...prev.form, subject_code: e.target.value } }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Branch</label>
        <select className="form-select" value={subjectModal.form.branch} onChange={(e) => setSubjectModal(prev => ({ ...prev, form: { ...prev.form, branch: e.target.value } }))}>
          <option value="">Select Branch</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Semester</label>
        <select className="form-select" value={subjectModal.form.semester} onChange={(e) => setSubjectModal(prev => ({ ...prev, form: { ...prev.form, semester: e.target.value } }))}>
          <option value="">Select Semester</option>
          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Credits</label>
        <input type="number" className="form-input" value={subjectModal.form.credits} onChange={(e) => setSubjectModal(prev => ({ ...prev, form: { ...prev.form, credits: e.target.value } }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Teacher</label>
        <input className="form-input" placeholder="Teacher name" value={subjectModal.form.teacher} onChange={(e) => setSubjectModal(prev => ({ ...prev, form: { ...prev.form, teacher: e.target.value } }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Linked Course (optional)</label>
        <select className="form-select" value={subjectModal.form.course_id} onChange={(e) => setSubjectModal(prev => ({ ...prev, form: { ...prev.form, course_id: e.target.value } }))}>
          <option value="">No Course</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-select" value={subjectModal.form.status} onChange={(e) => setSubjectModal(prev => ({ ...prev, form: { ...prev.form, status: e.target.value } }))}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
    </>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Courses & Subjects</h1>
          <p>Manage academic courses and subjects</p>
        </div>
        {canEdit && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => tab === 'courses'
              ? setCourseModal({ open: true, editing: null, form: emptyCourse })
              : setSubjectModal({ open: true, editing: null, form: emptySubject })}
          >
            ➕ Add {tab === 'courses' ? 'Course' : 'Subject'}
          </button>
        )}
      </div>

      <div className="profile-tabs">
        <button className={`profile-tab ${tab === 'courses' ? 'active' : ''}`} onClick={() => setTab('courses')}>Courses ({courses.length})</button>
        <button className={`profile-tab ${tab === 'subjects' ? 'active' : ''}`} onClick={() => setTab('subjects')}>Subjects ({subjects.length})</button>
      </div>

      {loading ? (
        <InlineLoader />
      ) : tab === 'courses' ? (
        <>
          <div className="filter-bar filter-bar-wrap">
            <input className="form-input" placeholder="Search courses..." value={courseFilters.search} onChange={(e) => setCourseFilters(prev => ({ ...prev, search: e.target.value }))} style={{ flex: 1, minWidth: '180px' }} />
            <select className="form-select" value={courseFilters.branch} onChange={(e) => setCourseFilters(prev => ({ ...prev, branch: e.target.value }))}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="form-select" value={courseFilters.semester} onChange={(e) => setCourseFilters(prev => ({ ...prev, semester: e.target.value }))}>
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <select className="form-select" value={courseFilters.status} onChange={(e) => setCourseFilters(prev => ({ ...prev, status: e.target.value }))}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="cards-grid">
            {courses.map(course => (
              <div className="card course-card" key={course.id}>
                <div className="course-card-header">
                  <div>
                    <h3>{course.course_name}</h3>
                    <span className="text-muted">{course.course_code}</span>
                  </div>
                  <span className={`badge ${course.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>{course.status}</span>
                </div>
                <div className="course-card-meta">
                  {course.branch && <span>🏫 {course.branch}</span>}
                  {course.semester && <span>📚 Sem {course.semester}</span>}
                  {course.credits ? <span>⭐ {course.credits} credits</span> : null}
                </div>
                {course.description && <p className="text-muted">{course.description}</p>}
                {canEdit && (
                  <div className="course-card-actions">
                    <button className="btn btn-sm btn-outline" onClick={() => setCourseModal({ open: true, editing: course, form: { ...emptyCourse, ...course } })}>✏ Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteCourse(course)}>🗑 Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {courses.length === 0 && !loading && <p className="muted-center">No courses found. Add your first course.</p>}
        </>
      ) : (
        <>
          <div className="filter-bar filter-bar-wrap">
            <input className="form-input" placeholder="Search subjects..." value={subjectFilters.search} onChange={(e) => setSubjectFilters(prev => ({ ...prev, search: e.target.value }))} style={{ flex: 1, minWidth: '180px' }} />
            <select className="form-select" value={subjectFilters.branch} onChange={(e) => setSubjectFilters(prev => ({ ...prev, branch: e.target.value }))}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="form-select" value={subjectFilters.semester} onChange={(e) => setSubjectFilters(prev => ({ ...prev, semester: e.target.value }))}>
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <select className="form-select" value={subjectFilters.status} onChange={(e) => setSubjectFilters(prev => ({ ...prev, status: e.target.value }))}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="table-container">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Code</th>
                    <th>Branch</th>
                    <th>Semester</th>
                    <th>Credits</th>
                    <th>Teacher</th>
                    <th>Status</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(subject => (
                    <tr key={subject.id}>
                      <td>{subject.subject_name}</td>
                      <td><span className="student-id">{subject.subject_code}</span></td>
                      <td>{subject.branch}</td>
                      <td>Sem {subject.semester}</td>
                      <td>{subject.credits || 0}</td>
                      <td>{subject.teacher || '—'}</td>
                      <td><span className={`badge ${subject.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>{subject.status}</span></td>
                      {canEdit && (
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn edit" title="Edit" onClick={() => setSubjectModal({ open: true, editing: subject, form: { ...emptySubject, ...subject } })}>✏</button>
                            <button className="action-btn delete" title="Delete" onClick={() => deleteSubject(subject)}>🗑</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {subjects.length === 0 && !loading && <p className="muted-center">No subjects found. Add your first subject.</p>}
        </>
      )}

      {/* Course Modal */}
      <Modal
        isOpen={courseModal.open}
        onClose={() => setCourseModal({ open: false, editing: null, form: emptyCourse })}
        title={courseModal.editing ? 'Edit Course' : 'Add Course'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setCourseModal({ open: false, editing: null, form: emptyCourse })}>Cancel</button>
            <button className="btn btn-primary" onClick={saveCourse}>{courseModal.editing ? 'Save Changes' : 'Add Course'}</button>
          </>
        }
      >
        {renderCourseForm()}
      </Modal>

      {/* Subject Modal */}
      <Modal
        isOpen={subjectModal.open}
        onClose={() => setSubjectModal({ open: false, editing: null, form: emptySubject })}
        title={subjectModal.editing ? 'Edit Subject' : 'Add Subject'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setSubjectModal({ open: false, editing: null, form: emptySubject })}>Cancel</button>
            <button className="btn btn-primary" onClick={saveSubject}>{subjectModal.editing ? 'Save Changes' : 'Add Subject'}</button>
          </>
        }
      >
        {renderSubjectForm()}
      </Modal>
    </div>
  );
};

export default Courses;
