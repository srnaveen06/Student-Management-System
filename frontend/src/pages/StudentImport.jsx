import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { InlineLoader } from '../components/Loader/Loader';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';

const REQUIRED_HEADERS = ['Student ID', 'Name', 'Email', 'Phone', 'Gender', 'Branch', 'Institute', 'Semester', 'Admission Year', 'Date of Birth'];

const StudentImport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f || null);
    setResult(null);
    setShowPreview(false);
  };

  const runImport = async (dryRun) => {
    if (!file) {
      toast.warning('Please choose a CSV file');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await studentApi.importStudents(fd, dryRun);
      if (res.success) {
        setResult(res.data);
        if (!dryRun) {
          toast.success(`Imported ${res.data.imported} students successfully`);
          setFile(null);
          if (fileRef.current) fileRef.current.value = '';
          setShowPreview(false);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process CSV file');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const sampleRow = 'S001,John Doe,john@example.com,9876543210,Male,CSE,ABC College,1,2024,2005-01-15';
    const csv = `${REQUIRED_HEADERS.join(',')}\n${sampleRow}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/students')} style={{ marginBottom: '8px' }}>← Back to Students</button>
          <h1>Import Students</h1>
          <p>Bulk import students from a CSV file</p>
        </div>
      </div>

      <div className="import-card card">
        <div className="dashboard-section-header">
          <h2>Step 1 — Download Template</h2>
        </div>
        <div className="dashboard-section-body">
          <p className="text-muted">
            Required columns: <strong>Student ID, Name, Email, Phone, Gender, Branch, Institute, Semester, Admission Year, Date of Birth</strong>
          </p>
          <button className="btn btn-outline" onClick={downloadTemplate} style={{ marginTop: '12px' }}>📄 Download Template</button>
        </div>
      </div>

      <div className="import-card card">
        <div className="dashboard-section-header">
          <h2>Step 2 — Upload CSV</h2>
        </div>
        <div className="dashboard-section-body">
          <input type="file" ref={fileRef} accept=".csv,text/csv" onChange={handleFileChange} />
          <p className="form-hint">Only CSV files. The first row must be the header row.</p>
          {loading && <InlineLoader />}
          {!loading && file && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button className="btn btn-primary" onClick={() => runImport(true)}>🔍 Preview & Validate</button>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="import-card card">
          <div className="dashboard-section-header">
            <h2>Import Result {result.dryRun ? '(Preview)' : '(Completed)'}</h2>
          </div>
          <div className="dashboard-section-body">
            <div className="dashboard-stats">
              <div className="stat-inline-card"><span>Total Rows</span><strong>{result.totalRows}</strong></div>
              <div className="stat-inline-card"><span>Valid</span><strong style={{ color: 'var(--success)' }}>{result.valid}</strong></div>
              <div className="stat-inline-card"><span>Invalid</span><strong style={{ color: 'var(--danger)' }}>{result.invalid}</strong></div>
              <div className="stat-inline-card"><span>Duplicates</span><strong style={{ color: 'var(--warning)' }}>{result.duplicate}</strong></div>
              {result.imported > 0 && <div className="stat-inline-card"><span>Imported</span><strong style={{ color: 'var(--info)' }}>{result.imported}</strong></div>}
            </div>

            {result.dryRun && result.valid > 0 && (
              <button className="btn btn-success" onClick={() => runImport(false)} style={{ margin: '16px 0' }}>
                ✅ Confirm Import ({result.valid} students)
              </button>
            )}

            <button className="btn btn-sm btn-outline" onClick={() => setShowPreview(prev => !prev)} style={{ marginLeft: '10px' }}>
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>

            {showPreview && (
              <div className="table-wrapper" style={{ marginTop: '16px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Branch</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.slice(0, 50).map((row, i) => (
                      <tr key={i}>
                        <td>{row.rowNo}</td>
                        <td>{row.data.student_id}</td>
                        <td>{row.data.name}</td>
                        <td>{row.data.email}</td>
                        <td>{row.data.branch}</td>
                        <td>
                          <span className={`badge ${row.valid ? 'badge-active' : 'badge-inactive'}`}>
                            {row.valid ? 'Valid' : row.problems.join(', ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentImport;
