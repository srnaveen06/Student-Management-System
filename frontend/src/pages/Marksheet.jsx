import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { InlineLoader } from '../components/Loader/Loader';
import examApi from '../services/examApi';
import { formatCurrency, getInitials } from '../utils/format';

const Marksheet = () => {
  const { studentId } = useParams();
  const [searchParams] = useSearchParams();
  const semester = searchParams.get('semester') || '';
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSheet = async () => {
      try {
        const res = await examApi.getMarksheet(studentId, semester || undefined);
        if (res.success) setSheet(res.data);
      } catch (error) {
        console.error('Failed to load marksheet');
      } finally {
        setLoading(false);
      }
    };
    fetchSheet();
  }, [studentId, semester]);

  if (loading) return <InlineLoader />;
  if (!sheet) return <p className="muted-center">Marksheet not found</p>;

  const s = sheet.student;

  return (
    <div className="marksheet-page">
      <div className="marksheet-actions">
        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/students/profile/${studentId}`)}>← Back to Profile</button>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨 Print</button>
      </div>

      <div className="marksheet">
        <div className="marksheet-header">
          <div>
            <h2>{(s.institute || 'College').toUpperCase()}</h2>
            <p>Academic Marksheet · {sheet.semester}</p>
          </div>
          <div className="profile-avatar marksheet-avatar">
            {s.image ? (
              <img src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/uploads/${s.image}`} alt={s.name} />
            ) : (
              <span>{getInitials(s.name)}</span>
            )}
          </div>
        </div>

        <div className="marksheet-info">
          {[
            ['Student ID', s.student_id],
            ['Enrollment No', s.enrollment_number],
            ['Name', s.name],
            ['Branch', s.branch],
            ['Semester', sheet.semester],
            ['CGPA', sheet.cgpa || '—'],
            ['Result', sheet.result],
          ].map(([l, v]) => (
            <div key={l}>
              <span className="marksheet-label">{l}</span>
              <span className="marksheet-value">{v || '—'}</span>
            </div>
          ))}
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Code</th>
                <th>Internal</th>
                <th>External</th>
                <th>Practical</th>
                <th>Assignment</th>
                <th>Total</th>
                <th>Max</th>
                <th>%</th>
                <th>Grade</th>
                <th>GPA</th>
              </tr>
            </thead>
            <tbody>
              {sheet.marks.map(m => (
                <tr key={m.id}>
                  <td>{m.subject_name}</td>
                  <td>{m.subject_code}</td>
                  <td>{m.internal_marks}</td>
                  <td>{m.external_marks}</td>
                  <td>{m.practical_marks || 0}</td>
                  <td>{m.assignment_marks || 0}</td>
                  <td><strong>{m.total_marks}</strong></td>
                  <td>{m.max_marks}</td>
                  <td>{m.percentage}</td>
                  <td><span className="badge badge-active">{m.grade}</span></td>
                  <td>{m.gpa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="marksheet-footer">
          <span>GPA: <strong>{sheet.cgpa || '—'}</strong></span>
          <span>Result: <strong className={sheet.result === 'PASS' ? 'text-success' : 'text-danger'}>{sheet.result}</strong></span>
          <span>Fees Paid: <strong>{formatCurrency(s.paid_fees)} / {formatCurrency(s.total_fees)}</strong></span>
        </div>
      </div>
    </div>
  );
};

export default Marksheet;
