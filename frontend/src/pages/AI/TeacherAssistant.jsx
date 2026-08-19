import React, { useState, useEffect } from 'react';
import { InlineLoader } from '../../components/Loader/Loader';
import aiApi from '../../services/aiApi';
import { useToast } from '../../context/ToastContext';
import { riskClass } from '../../utils/ai';
import { BarChart3, Mail, Sparkles, PartyPopper } from 'lucide-react';

const MESSAGE_TYPES = [
  { value: 'attendance_warning', label: 'Attendance Warning' },
  { value: 'fee_reminder', label: 'Fee Reminder' },
  { value: 'low_marks', label: 'Low Marks Notice' },
  { value: 'congratulation', label: 'Congratulation' },
];

const TeacherAssistant = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState('analysis');
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');

  // Message generator
  const [msgType, setMsgType] = useState('attendance_warning');
  const [msgBranch, setMsgBranch] = useState('');
  const [msgSemester, setMsgSemester] = useState('');
  const [msgLimit, setMsgLimit] = useState(10);
  const [messages, setMessages] = useState(null);
  const [msgLoading, setMsgLoading] = useState(false);

  const loadAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const params = {};
      if (branch) params.branch = branch;
      if (semester) params.semester = Number(semester);
      const data = await aiApi.classAnalysis(params);
      setAnalysis(data);
    } catch (error) {
      toast.error('Failed to load class analysis');
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => { loadAnalysis(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateMessages = async () => {
    setMsgLoading(true);
    setMessages(null);
    try {
      const data = await aiApi.generateMessages({
        type: msgType,
        branch: msgBranch || null,
        semester: msgSemester ? Number(msgSemester) : null,
        limit: Number(msgLimit),
      });
      setMessages(data);
      toast.success(`${data.count} message draft(s) generated`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate messages');
    } finally {
      setMsgLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>TeacherAI</h1>
          <p>Class analytics and automated message drafting for staff.</p>
        </div>
      </div>

      <div className="profile-tabs" style={{ marginBottom: '16px' }}>
        <button className={`profile-tab ${tab === 'analysis' ? 'active' : ''}`} onClick={() => setTab('analysis')}><BarChart3 size={16} /> Class Analysis</button>
        <button className={`profile-tab ${tab === 'messages' ? 'active' : ''}`} onClick={() => setTab('messages')}><Mail size={16} /> Message Generator</button>
      </div>

      {tab === 'analysis' && (
        <>
          <div className="filter-bar" style={{ marginBottom: '16px' }}>
            <input
              type="text"
              className="form-select"
              placeholder="Branch (e.g. Computer Science)"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
            <select className="form-select" value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={loadAnalysis}>Apply</button>
          </div>

          {analysisLoading ? <InlineLoader /> : analysis ? (
            <>
              <div className="ml-stats">
                <div className="ml-stat">
                  <div className="ml-stat-value">{analysis.summary.studentsCount}</div>
                  <div className="ml-stat-label">Students</div>
                </div>
                <div className="ml-stat">
                  <div className="ml-stat-value">{analysis.summary.classAverage}%</div>
                  <div className="ml-stat-label">Class average</div>
                </div>
                <div className="ml-stat">
                  <div className="ml-stat-value">{analysis.summary.passRate}%</div>
                  <div className="ml-stat-label">Pass rate</div>
                </div>
                <div className="ml-stat">
                  <div className="ml-stat-value">{analysis.summary.subjectsCount}</div>
                  <div className="ml-stat-label">Subjects</div>
                </div>
                <div className="ml-stat">
                  <div className="ml-stat-value">{analysis.summary.highRisk}</div>
                  <div className="ml-stat-label">High risk</div>
                </div>
                <div className="ml-stat">
                  <div className="ml-stat-value">{analysis.summary.attendanceBelowThreshold}</div>
                  <div className="ml-stat-label">Below 75% attendance</div>
                </div>
              </div>

              <div className="dashboard-grid">
                <div className="dashboard-section">
                  <div className="dashboard-section-header"><h2>Top Students</h2></div>
                  <div className="dashboard-section-body">
                    {analysis.topStudents.length === 0 ? (
                      <p className="muted-center">No data</p>
                    ) : (
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead><tr><th>Student</th><th>Avg %</th><th>Risk</th></tr></thead>
                          <tbody>
                            {analysis.topStudents.map(s => (
                              <tr key={s.studentId}>
                                <td>{s.name}</td>
                                <td>{s.averagePercentage}%</td>
                                <td className={riskClass(s.riskLevel)}>{s.riskLevel || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <div className="dashboard-section">
                  <div className="dashboard-section-header"><h2>At-Risk Students</h2></div>
                  <div className="dashboard-section-body">
                    {analysis.atRiskStudents.length === 0 ? (
                      <p className="muted-center">No at-risk students <PartyPopper size={14} /></p>
                    ) : (
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead><tr><th>Student</th><th>Avg %</th><th>Risk</th></tr></thead>
                          <tbody>
                            {analysis.atRiskStudents.map(s => (
                              <tr key={s.studentId}>
                                <td>{s.name}</td>
                                <td>{s.averagePercentage}%</td>
                                <td className={riskClass(s.riskLevel)}>{s.riskLevel || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="dashboard-section" style={{ marginTop: '16px' }}>
                <div className="dashboard-section-header"><h2>Subject-wise Performance</h2></div>
                <div className="dashboard-section-body">
                  {analysis.subjects.length === 0 ? (
                    <p className="muted-center">No subject data</p>
                  ) : (
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead><tr><th>Subject</th><th>Exam</th><th>Avg %</th><th>Pass rate</th></tr></thead>
                        <tbody>
                          {analysis.subjects.map((s, i) => (
                            <tr key={i}>
                              <td>{s.subjectName}</td>
                              <td>{s.examName}</td>
                              <td>{s.averagePercentage}%</td>
                              <td>
                                <span className={`ai-chip ${Number(s.passRate) < 80 ? 'ai-chip-danger' : 'ai-chip-success'}`}>
                                  {s.passRate}%
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
            </>
          ) : (
            <p className="muted-center">Unable to load class analysis.</p>
          )}
        </>
      )}

      {tab === 'messages' && (
        <div className="dashboard-grid">
          <div className="dashboard-section">
            <div className="dashboard-section-header"><h2>Generate Messages</h2></div>
            <div className="dashboard-section-body">
              <div className="form-group">
                <label className="form-label">Message Type</label>
                <select className="form-select" value={msgType} onChange={(e) => setMsgType(e.target.value)}>
                  {MESSAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="ai-form-row">
                <div className="form-group">
                  <label className="form-label">Branch (optional)</label>
                  <input type="text" className="form-input" placeholder="e.g. Mechanical" value={msgBranch} onChange={(e) => setMsgBranch(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Semester (optional)</label>
                  <select className="form-select" value={msgSemester} onChange={(e) => setMsgSemester(e.target.value)}>
                    <option value="">All</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Limit</label>
                  <input type="number" className="form-input" min="1" max="50" value={msgLimit} onChange={(e) => setMsgLimit(Number(e.target.value))} />
                </div>
              </div>
              <button className="btn btn-primary" onClick={generateMessages} disabled={msgLoading}>
                {msgLoading ? 'Generating…' : <><Sparkles size={16} /> Generate Drafts</>}
              </button>
              <p className="form-hint">Drafts are for review before sending — no messages are sent automatically.</p>
            </div>
          </div>

          <div className="dashboard-section" style={{ gridColumn: 'span 2' }}>
            <div className="dashboard-section-header"><h2>Generated Drafts</h2></div>
            <div className="dashboard-section-body">
              {messages ? (
                messages.messages.length === 0 ? (
                  <p className="muted-center">No recipients matched the filter.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {messages.messages.map((m, i) => (
                      <div key={i} className="ai-msg-draft">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="ai-chip ai-chip-muted">Student #{m.studentId}</span>
                          <span className="ai-chip ai-chip-warning">draft</span>
                        </div>
                        <div className="ai-msg-subject" style={{ marginTop: '8px' }}>{m.subject}</div>
                        <div className="ai-msg-body">{m.message}</div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="muted-center">Generate drafts to see them here.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAssistant;
