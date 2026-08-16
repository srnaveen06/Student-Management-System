import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { InlineLoader } from '../components/Loader/Loader';
import Pagination from '../components/Pagination/Pagination';
import attendanceApi from '../services/attendanceApi';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';
import { formatDate, getInitials } from '../utils/format';
import { hasRole } from '../utils/auth';

const Attendance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const canEdit = hasRole('super_admin', 'admin', 'teacher');

  const today = new Date().toISOString().split('T')[0];

  // Marking tab
  const [marking, setMarking] = useState({
    date: today, branch: '', semester: '', subjectId: '',
    students: [], records: {}, loaded: false
  });
  const [subjects, setSubjects] = useState([]);
  const [branches, setBranches] = useState([]);

  // Overview tab
  const [tab, setTab] = useState('marking');
  const [overview, setOverview] = useState({ records: [], total: 0, page: 1, totalPages: 1 });
  const [ovFilters, setOvFilters] = useState({ date: '', branch: '', semester: '', subjectId: '', page: 1, limit: 15 });
  const [low, setLow] = useState([]);

  const fetchMarkingStudents = useCallback(async () => {
    if (!marking.branch || !marking.semester || !marking.subjectId) {
      setMarking(prev => ({ ...prev, students: [], loaded: false }));
      return;
    }
    try {
      const res = await attendanceApi.getStudentsForMarking({
        branch: marking.branch, semester: marking.semester, subjectId: marking.subjectId, date: marking.date
      });
      if (res.success) {
        const records = {};
        res.data.forEach(s => { records[s.id] = s.current_status || 'Present'; });
        setMarking(prev => ({ ...prev, students: res.data, records, loaded: true }));
      }
    } catch (error) {
      toast.error('Failed to load students');
    }
  }, [marking.branch, marking.semester, marking.subjectId, marking.date, toast]);

  const fetchOptions = async () => {
    try {
      const [bRes, subRes] = await Promise.all([
        studentApi.getBranches(),
        studentApi.getSubjectOptions().catch(() => ({ data: [] }))
      ]);
      if (bRes.success) setBranches(bRes.data);
      if (subRes.data) setSubjects(subRes.data);
    } catch (error) {
      console.error('Failed to load options');
    }
  };

  const fetchOverview = useCallback(async () => {
    try {
      const params = {};
      if (ovFilters.date) { params.dateFrom = ovFilters.date; params.dateTo = ovFilters.date; }
      if (ovFilters.branch) params.branch = ovFilters.branch;
      if (ovFilters.semester) params.semester = ovFilters.semester;
      if (ovFilters.subjectId) params.subjectId = ovFilters.subjectId;
      params.page = ovFilters.page;
      params.limit = ovFilters.limit;
      const res = await attendanceApi.getOverview(params);
      if (res.success) {
        setOverview({ records: res.records || [], total: res.total || 0, page: res.page || 1, totalPages: res.totalPages || 1 });
      }
    } catch (error) {
      toast.error('Failed to load attendance overview');
    }
  }, [ovFilters, toast]);

  const fetchLow = async () => {
    try {
      const res = await attendanceApi.getLowAttendance();
      if (res.success) setLow(res.data);
    } catch (error) {
      console.error('Failed to load low attendance');
    }
  };

  useEffect(() => { fetchOptions(); }, []);
  useEffect(() => { fetchMarkingStudents(); }, [fetchMarkingStudents]);
  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { if (tab === 'low') fetchLow(); }, [tab]);

  const setStatus = (id, value) => {
    setMarking(prev => ({ ...prev, records: { ...prev.records, [id]: value } }));
  };

  const setAll = (value) => {
    const records = {};
    marking.students.forEach(s => { records[s.id] = value; });
    setMarking(prev => ({ ...prev, records }));
  };

  const saveAttendance = async () => {
    const rows = marking.students.map(s => ({ studentId: s.id, status: marking.records[s.id] || 'Present' }));
    if (rows.length === 0) {
      toast.warning('No students loaded');
      return;
    }
    try {
      await attendanceApi.saveAttendance({ date: marking.date, subjectId: marking.subjectId, rows });
      toast.success(`Attendance saved for ${rows.length} students`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save attendance');
    }
  };

  const markingReady = marking.branch && marking.semester && marking.subjectId && marking.date;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Attendance</h1>
          <p>Mark and track student attendance</p>
        </div>
      </div>

      <div className="profile-tabs">
        <button className={`profile-tab ${tab === 'marking' ? 'active' : ''}`} onClick={() => setTab('marking')}>Mark Attendance</button>
        <button className={`profile-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`profile-tab ${tab === 'low' ? 'active' : ''}`} onClick={() => setTab('low')}>Low Attendance</button>
      </div>

      {tab === 'marking' && (
        <>
          <div className="filter-bar filter-bar-wrap">
            <input type="date" className="form-select" value={marking.date} onChange={(e) => setMarking(prev => ({ ...prev, date: e.target.value }))} />
            <select className="form-select" value={marking.branch} onChange={(e) => setMarking(prev => ({ ...prev, branch: e.target.value }))}>
              <option value="">Select Branch</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="form-select" value={marking.semester} onChange={(e) => setMarking(prev => ({ ...prev, semester: e.target.value }))}>
              <option value="">Select Semester</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <select className="form-select" value={marking.subjectId} onChange={(e) => setMarking(prev => ({ ...prev, subjectId: e.target.value }))}>
              <option value="">Select Subject</option>
              {subjects
                .filter(s => (!marking.branch || s.branch === marking.branch) && (!marking.semester || String(s.semester) === String(marking.semester)))
                .map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>)}
            </select>
            <button className="btn btn-outline btn-sm" onClick={() => { setMarking(prev => ({ ...prev, students: [], loaded: false })); fetchMarkingStudents(); }}>
              🔄 Load Students
            </button>
          </div>

          {canEdit && markingReady && marking.loaded && marking.students.length > 0 && (
            <div className="bulk-bar">
              <span>Set all:</span>
              <button className="btn btn-sm btn-success" onClick={() => setAll('Present')}>✅ All Present</button>
              <button className="btn btn-sm btn-danger" onClick={() => setAll('Absent')}>❌ All Absent</button>
              <button className="btn btn-sm btn-primary" onClick={saveAttendance}>💾 Save Attendance</button>
            </div>
          )}

          {!markingReady && <p className="muted-center" style={{ marginTop: '24px' }}>Select date, branch, semester and subject to load students.</p>}
          {markingReady && !marking.loaded && <InlineLoader />}
          {marking.loaded && marking.students.length === 0 && (
            <p className="muted-center" style={{ marginTop: '24px' }}>No students found for the selected criteria.</p>
          )}

          {marking.loaded && marking.students.length > 0 && (
            <div className="table-container" style={{ marginTop: '16px' }}>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Student ID</th>
                      <th>Branch</th>
                      <th>Semester</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marking.students.map(s => (
                      <tr key={s.id}>
                        <td>
                          <div className="student-avatar">
                            <span>{getInitials(s.name)}</span>
                          </div>
                          <span className="student-name">{s.name}</span>
                        </td>
                        <td>{s.student_id}</td>
                        <td>{s.branch}</td>
                        <td>Sem {s.semester}</td>
                        <td>
                          {canEdit ? (
                            <div className="attendance-toggle">
                              <button
                                className={`toggle-btn ${marking.records[s.id] === 'Present' ? 'present' : ''}`}
                                onClick={() => setStatus(s.id, 'Present')}
                              >✅ Present</button>
                              <button
                                className={`toggle-btn ${marking.records[s.id] === 'Absent' ? 'absent' : ''}`}
                                onClick={() => setStatus(s.id, 'Absent')}
                              >❌ Absent</button>
                            </div>
                          ) : (
                            <span className={`badge ${s.current_status === 'Present' ? 'badge-active' : 'badge-inactive'}`}>
                              {s.current_status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'overview' && (
        <>
          <div className="filter-bar filter-bar-wrap">
            <input type="date" className="form-select" value={ovFilters.date} onChange={(e) => setOvFilters(prev => ({ ...prev, date: e.target.value, page: 1 }))} />
            <select className="form-select" value={ovFilters.branch} onChange={(e) => setOvFilters(prev => ({ ...prev, branch: e.target.value, page: 1 }))}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="form-select" value={ovFilters.semester} onChange={(e) => setOvFilters(prev => ({ ...prev, semester: e.target.value, page: 1 }))}>
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <select className="form-select" value={ovFilters.subjectId} onChange={(e) => setOvFilters(prev => ({ ...prev, subjectId: e.target.value, page: 1 }))}>
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
          </div>

          <div className="table-container">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Student ID</th>
                    <th>Subject</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.records.map(row => (
                    <tr key={row.id}>
                      <td>
                        <button className="student-name student-name-link" onClick={() => navigate(`/students/profile/${row.student_id}`)}>{row.name}</button>
                      </td>
                      <td>{row.student_id}</td>
                      <td>{row.subject_name}</td>
                      <td>{formatDate(row.date)}</td>
                      <td>
                        <span className={`badge ${row.status === 'Present' ? 'badge-active' : row.status === 'Absent' ? 'badge-inactive' : row.status === 'Late' ? 'badge-warning' : 'badge-info'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span className="table-info">Showing {overview.records.length} of {overview.total} records</span>
            </div>
          </div>
          <Pagination currentPage={overview.page} totalPages={overview.totalPages} onPageChange={(p) => setOvFilters(prev => ({ ...prev, page: p }))} />
        </>
      )}

      {tab === 'low' && (
        <div className="table-container">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student ID</th>
                  <th>Branch</th>
                  <th>Semester</th>
                  <th>Attendance %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {low.map(s => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.student_id}</td>
                    <td>{s.branch}</td>
                    <td>Sem {s.semester}</td>
                    <td>
                      <span className={`badge ${Number(s.percentage) < 60 ? 'badge-inactive' : 'badge-warning'}`}>{s.percentage}%</span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => navigate(`/students/profile/${s.id}`)}>👤 Profile</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {low.length === 0 && <p className="muted-center">No students below the threshold 🎉</p>}
        </div>
      )}
    </div>
  );
};

export default Attendance;
