import React, { useState, useEffect } from 'react';
import { InlineLoader } from '../../components/Loader/Loader';
import aiApi from '../../services/aiApi';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/format';
import { Sparkles, Printer } from 'lucide-react';

const REPORT_TYPES = [
  { value: 'academic', label: 'Academic Performance' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'fee', label: 'Fee Status' },
  { value: 'risk', label: 'Student Risk' },
];

const AIReports = () => {
  const { toast } = useToast();
  const [type, setType] = useState('academic');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    try {
      const data = await aiApi.listReports(20);
      setHistory(data.reports || []);
    } catch (error) {
      // non-fatal
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const generate = async () => {
    setGenerating(true);
    setReport(null);
    try {
      const filters = {};
      if (branch) filters.branch = branch;
      if (semester) filters.semester = Number(semester);
      const data = await aiApi.generateReport({ type, filters });
      if (data.report) {
        setReport(data.report);
        toast.success('Report generated');
        loadHistory();
      } else {
        toast.error(data.error || 'Failed to generate report');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const printReport = () => window.print();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Reports</h1>
          <p>Generate structured reports from real data — export via browser print.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header"><h2>Generate Report</h2></div>
          <div className="dashboard-section-body">
            <div className="form-group">
              <label className="form-label">Report Type</label>
              <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="ai-form-row">
              <div className="form-group">
                <label className="form-label">Branch (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Computer Science"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Semester (optional)</label>
                <select className="form-select" value={semester} onChange={(e) => setSemester(e.target.value)}>
                  <option value="">All</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary" onClick={generate} disabled={generating}>
              {generating ? 'Generating…' : <><Sparkles size={16} /> Generate Report</>}
            </button>
          </div>
        </div>

        <div className="dashboard-section" style={{ gridColumn: 'span 2' }}>
          <div className="dashboard-section-header"><h2>Generated Report</h2></div>
          <div className="dashboard-section-body">
            {report ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: 'var(--font-size-lg)' }}>{report.title}</h2>
                  <button className="btn btn-outline btn-sm" onClick={printReport}><Printer size={16} /> Print / Export PDF</button>
                </div>
                {report.sections.map((section, i) => (
                  <div key={i} style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: '6px', color: 'var(--text-primary)' }}>{section.heading}</h3>
                    {section.body && <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>{section.body}</p>}
                    {section.table && (
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>{section.table.columns.map(c => <th key={c}>{c}</th>)}</tr>
                          </thead>
                          <tbody>
                            {section.table.rows.length === 0 ? (
                              <tr><td colSpan={section.table.columns.length} className="muted-center">No data</td></tr>
                            ) : section.table.rows.map((row, ri) => (
                              <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
                <p className="text-muted" style={{ fontSize: '12px' }}>Generated {formatDateTime(report.generatedAt)}</p>
              </div>
            ) : (
              <p className="muted-center">Choose a report type and click Generate.</p>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-section" style={{ marginTop: '16px' }}>
        <div className="dashboard-section-header"><h2>Report History</h2></div>
        <div className="dashboard-section-body">
          {loadingHistory ? <InlineLoader /> : history.length === 0 ? (
            <p className="muted-center">No reports generated yet</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Title</th><th>Type</th><th>Generated</th></tr>
                </thead>
                <tbody>
                  {history.map(r => (
                    <tr key={r.id}>
                      <td>{r.title}</td>
                      <td><span className="ai-chip">{r.report_type}</span></td>
                      <td>{formatDateTime(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIReports;
