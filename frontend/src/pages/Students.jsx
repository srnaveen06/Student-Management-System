import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentTable from '../components/StudentTable/StudentTable';
import SearchBar from '../components/SearchBar/SearchBar';
import Pagination from '../components/Pagination/Pagination';
import Modal from '../components/Modal/Modal';
import { InlineLoader } from '../components/Loader/Loader';
import NLSearchBar from '../components/AI/NLSearchBar';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';
import { formatDate, getInitials } from '../utils/format';
import { isAdmin } from '../utils/auth';

const Students = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const canManage = isAdmin();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  // Filter and search state
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [gender, setGender] = useState('');
  const [status, setStatus] = useState('');
  const [institute, setInstitute] = useState('');
  const [admissionYear, setAdmissionYear] = useState('');
  const [feeStatus, setFeeStatus] = useState('');
  const [attendanceMin, setAttendanceMin] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dropdown options
  const [branches, setBranches] = useState([]);
  const [institutes, setInstitutes] = useState([]);

  // Bulk selection
  const [selected, setSelected] = useState([]);
  const [bulkModal, setBulkModal] = useState({ open: false, type: null });

  // Modals
  const [deleteModal, setDeleteModal] = useState({ open: false, student: null });
  const [viewModal, setViewModal] = useState({ open: false, student: null });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (branch) params.branch = branch;
      if (semester) params.semester = semester;
      if (gender) params.gender = gender;
      if (status) params.status = status;
      if (institute) params.institute = institute;
      if (admissionYear) params.admissionYear = admissionYear;
      if (feeStatus) params.feeStatus = feeStatus;
      if (attendanceMin) params.attendanceMin = attendanceMin;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (sort) params.sort = sort;
      params.page = page;
      params.limit = pageSize;

      const response = await studentApi.getAll(params);
      if (response.success) {
        setStudents(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [search, branch, semester, gender, status, institute, admissionYear, feeStatus, attendanceMin, dateFrom, dateTo, sort, page, pageSize, toast]);

  const fetchOptions = async () => {
    try {
      const [bRes, iRes] = await Promise.all([studentApi.getBranches(), studentApi.getInstitutes()]);
      if (bRes.success) setBranches(bRes.data);
      if (iRes.success) setInstitutes(iRes.data);
    } catch (error) {
      console.error('Failed to load filter options');
    }
  };

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => { fetchOptions(); }, []);
  useEffect(() => { setPage(1); }, [search, branch, semester, gender, status, institute, admissionYear, feeStatus, attendanceMin, dateFrom, dateTo, sort, pageSize]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = async () => {
    if (!deleteModal.student) return;
    try {
      await studentApi.delete(deleteModal.student.id);
      toast.success('Student deleted successfully');
      setDeleteModal({ open: false, student: null });
      setSelected([]);
      fetchStudents();
    } catch (error) {
      toast.error('Failed to delete student');
    }
  };

  const clearFilters = () => {
    setSearchInput(''); setSearch(''); setBranch(''); setSemester('');
    setGender(''); setStatus(''); setInstitute(''); setAdmissionYear('');
    setFeeStatus(''); setAttendanceMin(''); setDateFrom(''); setDateTo(''); setSort('');
    setPage(1);
  };

  const hasFilters = search || branch || semester || gender || status || institute || admissionYear || feeStatus || attendanceMin || dateFrom || dateTo || sort;

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (students.every(s => selected.includes(s.id))) {
      setSelected(prev => prev.filter(x => !students.some(s => s.id === x)));
    } else {
      setSelected([...new Set([...selected, ...students.map(s => s.id)])]);
    }
  };

  const handleBulk = async () => {
    const { type } = bulkModal;
    if (selected.length === 0) return;
    try {
      if (type === 'activate') {
        await studentApi.bulkStatus(selected, 'Active');
        toast.success(`${selected.length} student(s) activated`);
      } else if (type === 'deactivate') {
        await studentApi.bulkStatus(selected, 'Inactive');
        toast.success(`${selected.length} student(s) deactivated`);
      } else if (type === 'delete') {
        await studentApi.bulkDelete(selected);
        toast.success(`${selected.length} student(s) deleted`);
      }
      setBulkModal({ open: false, type: null });
      setSelected([]);
      fetchStudents();
    } catch (error) {
      toast.error('Bulk operation failed');
    }
  };

  // Export current page to CSV
  const exportCSV = () => {
    if (students.length === 0) {
      toast.warning('No students to export');
      return;
    }
    const headers = ['Student ID', 'Name', 'Enrollment No', 'Email', 'Phone', 'Gender', 'Branch', 'Institute', 'Semester', 'DOB', 'CGPA', 'Address', 'Status'];
    const csvContent = [
      headers.join(','),
      ...students.map(s => [
        s.student_id, `"${s.name}"`, `"${s.enrollment_number || ''}"`, s.email, s.phone, s.gender,
        s.branch, `"${s.institute || ''}"`, s.semester, s.dob?.split('T')[0], s.cgpa || '', `"${s.address}"`, s.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const printList = () => window.print();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Students</h1>
          <p>Manage all student records</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {canManage && (
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/students/import')}>
              📥 Import CSV
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={exportCSV}>📤 Export CSV</button>
          <button className="btn btn-outline btn-sm" onClick={printList}>🖨 Print</button>
          {canManage && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/students/add')}>➕ Add Student</button>
          )}
        </div>
      </div>

      {/* AI Natural-Language Search */}
      <div className="dashboard-section" style={{ marginBottom: '16px' }}>
        <div className="dashboard-section-body">
          <NLSearchBar />
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="filter-bar filter-bar-wrap">
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by name, ID, email, phone, enrollment..."
        />
        <select className="form-select" value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="form-select" value={semester} onChange={(e) => setSemester(e.target.value)}>
          <option value="">All Semesters</option>
          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
        <select className="form-select" value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select className="form-select" value={institute} onChange={(e) => setInstitute(e.target.value)}>
          <option value="">All Institutes</option>
          {institutes.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select className="form-select" value={admissionYear} onChange={(e) => setAdmissionYear(e.target.value)}>
          <option value="">All Admission Years</option>
          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select className="form-select" value={feeStatus} onChange={(e) => setFeeStatus(e.target.value)}>
          <option value="">All Fee Status</option>
          <option value="Paid">Paid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Pending">Pending</option>
        </select>
        <select className="form-select" value={attendanceMin} onChange={(e) => setAttendanceMin(e.target.value)}>
          <option value="">Any Attendance</option>
          <option value="75">≥ 75%</option>
          <option value="50">≥ 50%</option>
          <option value="25">≥ 25%</option>
        </select>
        <input type="date" className="form-select" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Joined from" />
        <input type="date" className="form-select" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Joined to" />
        <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="">Newest First</option>
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
          <option value="oldest">Oldest First</option>
        </select>
        {hasFilters && (
          <button className="btn btn-sm btn-outline" onClick={clearFilters}>✕ Clear</button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {canManage && selected.length > 0 && (
        <div className="bulk-bar">
          <span><strong>{selected.length}</strong> selected</span>
          <button className="btn btn-sm btn-success" onClick={() => setBulkModal({ open: true, type: 'activate' })}>✅ Activate</button>
          <button className="btn btn-sm btn-outline" onClick={() => setBulkModal({ open: true, type: 'deactivate' })}>⏸ Deactivate</button>
          <button className="btn btn-sm btn-danger" onClick={() => setBulkModal({ open: true, type: 'delete' })}>🗑 Delete</button>
          <button className="btn btn-sm btn-icon" onClick={() => setSelected([])}>✕ Clear</button>
        </div>
      )}

      {loading ? (
        <InlineLoader />
      ) : (
        <>
          <div className="table-container">
            <StudentTable
              students={students}
              onDelete={(student) => setDeleteModal({ open: true, student })}
              onView={(student) => setViewModal({ open: true, student })}
              onProfile={(student) => navigate(`/students/profile/${student.id}`)}
              selected={selected}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleAll}
              canManage={canManage}
            />
            <div className="table-footer">
              <span className="table-info">
                Showing {students.length} of {pagination.total} students
              </span>
              <div className="table-page-size">
                <span>Rows per page:</span>
                <select
                  className="form-select"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Bulk Confirm Modal */}
      <Modal
        isOpen={bulkModal.open}
        onClose={() => setBulkModal({ open: false, type: null })}
        title={`Bulk ${bulkModal.type === 'delete' ? 'Delete' : bulkModal.type}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setBulkModal({ open: false, type: null })}>Cancel</button>
            <button className={`btn ${bulkModal.type === 'delete' ? 'btn-danger' : 'btn-primary'}`} onClick={handleBulk}>
              Confirm
            </button>
          </>
        }
      >
        <p>Are you sure you want to {bulkModal.type === 'delete' ? 'delete' : bulkModal.type} <strong>{selected.length}</strong> student(s)?</p>
        {bulkModal.type === 'delete' && <p className="text-muted">This action cannot be undone.</p>}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, student: null })}
        title="Confirm Delete"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDeleteModal({ open: false, student: null })}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>🗑 Delete</button>
          </>
        }
      >
        <p>Are you sure you want to delete <strong>{deleteModal.student?.name}</strong>? This action cannot be undone.</p>
      </Modal>

      {/* View Student Details Modal */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, student: null })}
        title="Student Details"
        footer={
          viewModal.student ? (
            <>
              <button className="btn btn-outline" onClick={() => navigate(`/students/profile/${viewModal.student.id}`)}>
                👤 Full Profile
              </button>
              {canManage && (
                <button className="btn btn-primary" onClick={() => navigate(`/students/edit/${viewModal.student.id}`)}>
                  ✏ Edit
                </button>
              )}
            </>
          ) : null
        }
      >
        {viewModal.student && (
          <div className="view-details">
            <div className="view-student-avatar">
              {viewModal.student.image ? (
                <img src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/uploads/${viewModal.student.image}`} alt={viewModal.student.name} />
              ) : (
                <div className="avatar-placeholder">{getInitials(viewModal.student.name)}</div>
              )}
            </div>
            {[
              ['Student ID', viewModal.student.student_id],
              ['Enrollment No', viewModal.student.enrollment_number],
              ['Name', viewModal.student.name],
              ['Email', viewModal.student.email],
              ['Phone', viewModal.student.phone],
              ['Gender', viewModal.student.gender],
              ['Branch', viewModal.student.branch],
              ['Institute', viewModal.student.institute],
              ['Semester', viewModal.student.semester],
              ['Admission Year', viewModal.student.admission_year],
              ['Date of Birth', viewModal.student.dob ? formatDate(viewModal.student.dob) : '—'],
              ['CGPA', viewModal.student.cgpa],
              ['Fee Status', viewModal.student.fee_status],
              ['Attendance', viewModal.student.attendance_percentage ? `${viewModal.student.attendance_percentage}%` : '—'],
              ['Status', viewModal.student.status],
            ].map(([label, value]) => (
              <div className="view-detail-item" key={label}>
                <span className="view-detail-label">{label}</span>
                <span className="view-detail-value">{value || '—'}</span>
              </div>
            ))}
            <div className="view-detail-item full-width">
              <span className="view-detail-label">Address</span>
              <span className="view-detail-value">{viewModal.student.address}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Students;
