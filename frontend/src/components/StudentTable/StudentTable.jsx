import React from 'react';
import { useNavigate } from 'react-router-dom';

// Student data table with photo, info, status, and action buttons
const StudentTable = ({ students, onDelete, onView }) => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Get initials from name for avatar placeholder
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // If no students, show empty state
  if (!students || students.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📭</div>
        <h3>No Students Found</h3>
        <p>Try adjusting your search or filter criteria</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Photo</th>
            <th>Student ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Branch</th>
            <th>Semester</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              {/* Profile Photo */}
              <td>
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
              </td>

              {/* Student ID */}
              <td>
                <span className="student-id">{student.student_id}</span>
              </td>

              {/* Name */}
              <td>
                <span className="student-name">{student.name}</span>
              </td>

              {/* Email */}
              <td>{student.email}</td>

              {/* Phone */}
              <td>{student.phone}</td>

              {/* Branch */}
              <td>{student.branch}</td>

              {/* Semester */}
              <td>Sem {student.semester}</td>

              {/* Status Badge */}
              <td>
                <span className={`badge badge-${student.status.toLowerCase()}`}>
                  {student.status}
                </span>
              </td>

              {/* Action Buttons */}
              <td>
                <div className="action-buttons">
                  <button
                    className="action-btn view"
                    title="View Details"
                    onClick={() => onView(student)}
                  >
                    👁
                  </button>
                  <button
                    className="action-btn edit"
                    title="Edit Student"
                    onClick={() => navigate(`/students/edit/${student.id}`)}
                  >
                    ✏
                  </button>
                  <button
                    className="action-btn delete"
                    title="Delete Student"
                    onClick={() => onDelete(student)}
                  >
                    🗑
                  </button>
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
