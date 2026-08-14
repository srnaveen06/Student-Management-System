import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentTable from '../components/StudentTable/StudentTable';
import SearchBar from '../components/SearchBar/SearchBar';
import Pagination from '../components/Pagination/Pagination';
import Modal from '../components/Modal/Modal';
import { InlineLoader } from '../components/Loader/Loader';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';

const Students = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  // Filter and search state
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [gender, setGender] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('');
  const [page, setPage] = useState(1);

  // Branch options for filter dropdown
  const [branches, setBranches] = useState([]);

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState({ open: false, student: null });

  // View student modal
  const [viewModal, setViewModal] = useState({ open: false, student: null });

  // Fetch students with current filters
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (branch) params.branch = branch;
      if (semester) params.semester = semester;
      if (gender) params.gender = gender;
      if (status) params.status = status;
      if (sort) params.sort = sort;
      params.page = page;
      params.limit = 10;

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
  }, [search, branch, semester, gender, status, sort, page, toast]);

  // Fetch branch list for filter
  const fetchBranches = async () => {
    try {
      const response = await studentApi.getBranches();
      if (response.success) {
        setBranches(response.data);
      }
    } catch (error) {
      console.error('Failed to load branches');
    }
  };

  // Load students and branches on mount and when filters change
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetchBranches();
  }, []);

  // Reset page to 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [search, branch, semester, gender, status, sort]);

  // Handle search input with debounce
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Handle student deletion
  const handleDelete = async () => {
    if (!deleteModal.student) return;
    try {
      await studentApi.delete(deleteModal.student.id);
      toast.success('Student deleted successfully');
      setDeleteModal({ open: false, student: null });
      fetchStudents();
    } catch (error) {
      toast.error('Failed to delete student');
    }
  };

  // Export students to CSV
  const exportCSV = () => {
    if (students.length === 0) {
      toast.warning('No students to export');
      return;
    }

    const headers = ['Student ID', 'Name', 'Email', 'Phone', 'Gender', 'Branch', 'Semester', 'DOB', 'Address', 'Status'];
    const csvContent = [
      headers.join(','),
      ...students.map(s => [
        s.student_id, `"${s.name}"`, s.email, s.phone, s.gender,
        s.branch, s.semester, s.dob?.split('T')[0], `"${s.address}"`, s.status
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

  // Print student list
  const printList = () => {
    window.print();
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Students</h1>
          <p>Manage all student records</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline btn-sm" onClick={exportCSV}>
            📥 Export CSV
          </button>
          <button className="btn btn-outline btn-sm" onClick={printList}>
            🖨 Print
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/students/add')}>
            ➕ Add Student
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by name, ID, email, or phone..."
        />
        <select className="form-select" value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select className="form-select" value={semester} onChange={(e) => setSemester(e.target.value)}>
          <option value="">All Semesters</option>
          {[1,2,3,4,5,6,7,8].map(s => (
            <option key={s} value={s}>Semester {s}</option>
          ))}
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
        <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="">Newest First</option>
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* Student Table */}
      {loading ? (
        <InlineLoader />
      ) : (
        <>
          <div className="table-container">
            <StudentTable
              students={students}
              onDelete={(student) => setDeleteModal({ open: true, student })}
              onView={(student) => setViewModal({ open: true, student })}
            />
            <div className="table-footer">
              <span className="table-info">
                Showing {students.length} of {pagination.total} students
              </span>
            </div>
          </div>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, student: null })}
        title="Confirm Delete"
        footer={
          <>
            <button
              className="btn btn-outline"
              onClick={() => setDeleteModal({ open: false, student: null })}
            >
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              🗑 Delete
            </button>
          </>
        }
      >
        <p>
          Are you sure you want to delete{' '}
          <strong>{deleteModal.student?.name}</strong>?
          This action cannot be undone.
        </p>
      </Modal>

      {/* View Student Details Modal */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, student: null })}
        title="Student Details"
      >
        {viewModal.student && (
          <div className="view-details">
            <div className="view-student-avatar">
              {viewModal.student.image ? (
                <img
                  src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/uploads/${viewModal.student.image}`}
                  alt={viewModal.student.name}
                />
              ) : (
                <div className="avatar-placeholder">
                  {viewModal.student.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              )}
            </div>
            <div className="view-detail-item">
              <span className="view-detail-label">Student ID</span>
              <span className="view-detail-value">{viewModal.student.student_id}</span>
            </div>
            <div className="view-detail-item">
              <span className="view-detail-label">Name</span>
              <span className="view-detail-value">{viewModal.student.name}</span>
            </div>
            <div className="view-detail-item">
              <span className="view-detail-label">Email</span>
              <span className="view-detail-value">{viewModal.student.email}</span>
            </div>
            <div className="view-detail-item">
              <span className="view-detail-label">Phone</span>
              <span className="view-detail-value">{viewModal.student.phone}</span>
            </div>
            <div className="view-detail-item">
              <span className="view-detail-label">Gender</span>
              <span className="view-detail-value">{viewModal.student.gender}</span>
            </div>
            <div className="view-detail-item">
              <span className="view-detail-label">Branch</span>
              <span className="view-detail-value">{viewModal.student.branch}</span>
            </div>
            <div className="view-detail-item">
              <span className="view-detail-label">Semester</span>
              <span className="view-detail-value">{viewModal.student.semester}</span>
            </div>
            <div className="view-detail-item">
              <span className="view-detail-label">Date of Birth</span>
              <span className="view-detail-value">
                {viewModal.student.dob?.split('T')[0]}
              </span>
            </div>
            <div className="view-detail-item">
              <span className="view-detail-label">Status</span>
              <span className={`badge badge-${viewModal.student.status.toLowerCase()}`}>
                {viewModal.student.status}
              </span>
            </div>
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
