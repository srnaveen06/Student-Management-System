import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, Inbox } from 'lucide-react';

const StudentTable = ({
  students,
  onDelete,
  onView,
  onProfile,
  selected = [],
  onToggleSelect,
  onToggleAll,
  canManage = true
}) => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!students || students.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Inbox size={28} />
        </div>
        <h3>No Students Found</h3>
        <p>Try adjusting your search or filter criteria</p>
      </div>
    );
  }

  const allSelected = students.length > 0 && students.every(s => selected.includes(s.id));
  const feeBadge = (s) => {
    const status = s.fee_status;
    if (!status) return <span className="badge badge-inactive">No Fee</span>;
    if (status === 'Paid') return <span className="badge badge-active">{status}</span>;
    if (status === 'Partially Paid') return <span className="badge badge-warning">{status}</span>;
    return <span className="badge badge-inactive">{status}</span>;
  };

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {canManage && (
              <th className="col-check">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  aria-label="Select all"
                />
              </th>
            )}
            <th>Student</th>
            <th>ID</th>
            <th>Branch</th>
            <th>Institute</th>
            <th>Sem</th>
            <th>Fee</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} className={selected.includes(student.id) ? 'row-selected' : ''}>
              {canManage && (
                <td className="col-check">
                  <input
                    type="checkbox"
                    checked={selected.includes(student.id)}
                    onChange={() => onToggleSelect(student.id)}
                    aria-label={`Select ${student.name}`}
                  />
                </td>
              )}

              <td>
                <div className="student-cell">
                  <div className="student-avatar">
                    {student.image ? (
                      <img
                        src={`${API_URL}/uploads/${student.image}`}
                        alt={student.name}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span style={{ display: student.image ? 'none' : 'flex' }}>
                      {getInitials(student.name)}
                    </span>
                  </div>
                  <div>
                    <button
                      className="student-name student-name-link"
                      onClick={() => (onProfile ? onProfile(student) : onView(student))}
                    >
                      {student.name}
                    </button>
                    <div className="student-id">{student.email || student.student_id}</div>
                  </div>
                </div>
              </td>

              <td>
                <span className="student-id">{student.student_id}</span>
              </td>

              <td>{student.branch}</td>
              <td>{student.institute || '—'}</td>
              <td>Sem {student.semester}</td>

              <td>{feeBadge(student)}</td>

              <td>
                <span className={`badge badge-${String(student.status).toLowerCase()}`}>
                  {student.status}
                </span>
              </td>

              <td>
                <div className="action-buttons">
                  <button
                    className="action-btn view"
                    title="View Details"
                    onClick={() => onView(student)}
                  >
                    <Eye size={16} />
                  </button>
                  {canManage && (
                    <>
                      <button
                        className="action-btn edit"
                        title="Edit Student"
                        onClick={() => navigate(`/students/edit/${student.id}`)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="action-btn delete"
                        title="Delete Student"
                        onClick={() => onDelete(student)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;
