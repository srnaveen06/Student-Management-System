import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Edit, File, Upload, Eye, Trash2, IndianRupee, Printer, RefreshCw, CreditCard, Building2 } from 'lucide-react';
import { InlineLoader } from '../components/Loader/Loader';
import Modal from '../components/Modal/Modal';
import studentApi from '../services/studentApi';
import examApi from '../services/examApi';
import feeApi from '../services/feeApi';
import aiApi from '../services/aiApi';
import leaveApi from '../services/leaveApi';
import idCardApi from '../services/idCardApi';
import { useToast } from '../context/ToastContext';
import { formatDate, formatCurrency, getInitials } from '../utils/format';
import { riskClass, riskColor } from '../utils/ai';
import { isAdmin } from '../utils/auth';

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canManage = isAdmin();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Upload modal state
  const [docModal, setDocModal] = useState({ open: false, docType: '', title: '', file: null });
  const [payModal, setPayModal] = useState({ open: false, fee: null, amount: '', paymentDate: '', method: 'Cash', reference: '' });
  const [marksheetSem, setMarksheetSem] = useState('');

  // Leave + ID Card tab state
  const [leaveTab, setLeaveTab] = useState({ loading: true, leaves: [], summary: null });
  const [idCard, setIdCard] = useState({ loading: true, card: null, exists: false });

  // AI analysis state
  const [aiRisk, setAiRisk] = useState(null);
  const [aiForecast, setAiForecast] = useState(null);
  const [aiRecs, setAiRecs] = useState(null);
  const [aiMarks, setAiMarks] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await studentApi.getProfile(id);
      if (response.success) setProfile(response.data);
      else toast.error('Student not found');
    } catch (error) {
      toast.error('Failed to load student profile');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const student = profile;

  const loadAiAnalysis = useCallback(async () => {
    setAiLoading(true);
    try {
      const [risk, forecast, recs, marks] = await Promise.allSettled([
        aiApi.studentRisk(id),
        aiApi.attendanceForecast(id),
        aiApi.recommendations(id),
        aiApi.marksAnalysis(id),
      ]);
      if (risk.status === 'fulfilled') setAiRisk(risk.value);
      if (forecast.status === 'fulfilled') setAiForecast(forecast.value);
      if (recs.status === 'fulfilled') setAiRecs(recs.value);
      if (marks.status === 'fulfilled') setAiMarks(marks.value);
    } catch (error) {
      // partial data is fine
    } finally {
      setAiLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (tab === 'ai') loadAiAnalysis();
  }, [tab, loadAiAnalysis]);

  // Load leave history when the Leave tab opens.
  useEffect(() => {
    if (tab === 'leave' && student) {
      setLeaveTab(prev => ({ ...prev, loading: true }));
      Promise.all([
        leaveApi.getStudentLeaves(student.id, { page: 1, limit: 20 }),
        leaveApi.getStudentSummary(student.id)
      ]).then(([list, summary]) => {
        setLeaveTab({
          loading: false,
          leaves: list.success ? list.leaves : [],
          summary: summary.success ? summary.data : null
        });
      }).catch(() => setLeaveTab(prev => ({ ...prev, loading: false })));
    }
  }, [tab, student]);

  // Load the student's ID card when the ID Card tab opens.
  useEffect(() => {
    if (tab === 'idcard' && student) {
      setIdCard(prev => ({ ...prev, loading: true }));
      idCardApi.getStudentCard(student.id)
        .then(res => {
          setIdCard({ loading: false, card: res.success ? res.data : null, exists: res.success });
        })
        .catch(() => setIdCard(prev => ({ ...prev, loading: false, exists: false })));
    }
  }, [tab, student]);

  const issueIdCard = async () => {
    try {
      const res = await idCardApi.createCard({ studentId: student.id });
      if (res.success) {
        toast.success('ID card issued');
        setIdCard({ loading: false, card: res.data, exists: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue ID card');
    }
  };

  if (loading) return <InlineLoader />;
  if (!profile) return <p className="muted-center">Student not found</p>;

  const handleDocUpload = async () => {
    if (!docModal.file || !docModal.docType) {
      toast.error('Please choose a file and document type');
      return;
    }
    const fd = new FormData();
    fd.append('file', docModal.file);
    fd.append('docType', docModal.docType);
    fd.append('title', docModal.title);
    try {
      await studentApi.addDocument(id, fd);
      toast.success('Document uploaded');
      setDocModal({ open: false, docType: '', title: '', file: null });
      fetchProfile();
    } catch (error) {
      toast.error('Failed to upload document');
    }
  };

  const handleDeleteDoc = async (doc) => {
    if (!window.confirm(`Delete document "${doc.title}"?`)) return;
    try {
      await studentApi.deleteDocument(doc.id);
      toast.success('Document deleted');
      fetchProfile();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const handleRecordPayment = async () => {
    if (!payModal.fee || !payModal.amount || !payModal.paymentDate) {
      toast.error('Amount and date are required');
      return;
    }
    try {
      await feeApi.recordPayment({
        feeId: payModal.fee.id,
        studentId: student.id,
        amount: payModal.amount,
        paymentDate: payModal.paymentDate,
        method: payModal.method,
        reference: payModal.reference
      });
      toast.success('Payment recorded');
      setPayModal({ open: false, fee: null, amount: '', paymentDate: '', method: 'Cash', reference: '' });
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'ai', label: 'AI Analysis' },
    { key: 'documents', label: `Documents (${student.documents?.length || 0})` },
    { key: 'attendance', label: 'Attendance' },
    { key: 'fees', label: 'Fees' },
    { key: 'marks', label: 'Marks & Marksheet' },
    { key: 'leave', label: 'Leave' },
    { key: 'idcard', label: 'ID Card' },
  ];

  const contactRows = [
    ['Email', student.email],
    ['Phone', student.phone],
    ['Date of Birth', student.dob ? formatDate(student.dob) : '—'],
    ['Blood Group', student.blood_group],
    ['City', student.city],
    ['State', student.state],
    ['Pincode', student.pincode],
    ['Address', student.address],
  ];

  const familyRows = [
    ['Father', student.father_name],
    ['Mother', student.mother_name],
    ['Guardian', student.guardian_name],
    ['Guardian Phone', student.guardian_phone],
    ['Emergency Contact', student.emergency_contact],
    ['Relationship', student.relationship],
  ];

  const academicRows = [
    ['Enrollment No', student.enrollment_number],
    ['Admission Year', student.admission_year],
    ['Enrollment Date', student.enrollment_date ? formatDate(student.enrollment_date) : '—'],
    ['Previous Qualification', student.previous_qualification],
    ['CGPA', student.cgpa],
    ['Institute', student.institute],
    ['Branch', student.branch],
    ['Semester', student.semester],
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/students')} style={{ marginBottom: '8px' }}>← Back to Students</button>
          <h1>Student Profile</h1>
          <p>{student.student_id} · {student.branch} · Sem {student.semester}</p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/students/edit/${student.id}`)}><Edit size={16} /> Edit Student</button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="profile-card">
        <div className="profile-avatar">
          {student.image ? (
            <img src={`${API_URL}/uploads/${student.image}`} alt={student.name} />
          ) : (
            <span>{getInitials(student.name)}</span>
          )}
        </div>
        <div className="profile-info">
          <h2>{student.name}</h2>
          <p className="profile-meta">{student.email || '—'} · {student.phone || '—'}</p>
          <p className="profile-meta">{student.institute || '—'}</p>
          <div className="profile-badges">
            <span className={`badge badge-${String(student.status).toLowerCase()}`}>{student.status}</span>
            <span className="badge badge-active">Sem {student.semester}</span>
            <span className={`badge ${student.fee_status === 'Paid' ? 'badge-active' : student.fee_status === 'Partially Paid' ? 'badge-warning' : 'badge-inactive'}`}>
              {student.fee_status || 'No Fee'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`profile-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="profile-tab-content">
        {tab === 'overview' && (
          <>
            <div className="dashboard-grid dashboard-grid-3">
              <div className="dashboard-section">
                <div className="dashboard-section-header"><h2>Academic Info</h2></div>
                <div className="dashboard-section-body">
                  {academicRows.map(([l, v]) => (
                    <div className="view-detail-item" key={l}>
                      <span className="view-detail-label">{l}</span>
                      <span className="view-detail-value">{v || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dashboard-section">
                <div className="dashboard-section-header"><h2>Contact Info</h2></div>
                <div className="dashboard-section-body">
                  {contactRows.map(([l, v]) => (
                    <div className="view-detail-item" key={l}>
                      <span className="view-detail-label">{l}</span>
                      <span className="view-detail-value">{v || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dashboard-section">
                <div className="dashboard-section-header"><h2>Family & Emergency</h2></div>
                <div className="dashboard-section-body">
                  {familyRows.map(([l, v]) => (
                    <div className="view-detail-item" key={l}>
                      <span className="view-detail-label">{l}</span>
                      <span className="view-detail-value">{v || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="dashboard-grid">
              <div className="dashboard-section">
                <div className="dashboard-section-header">
                  <h2>Quick Summary</h2>
                </div>
                <div className="dashboard-section-body">
                  <div className="quick-stat-item">
                    <span className="quick-stat-label">Attendance Rate</span>
                    <span className="quick-stat-value">{student.attendance?.overall?.percentage != null ? `${student.attendance.overall.percentage}%` : '—'}</span>
                  </div>
                  <div className="quick-stat-item">
                    <span className="quick-stat-label">Total Fees</span>
                    <span className="quick-stat-value">{formatCurrency(student.fees?.summary?.total)}</span>
                  </div>
                  <div className="quick-stat-item">
                    <span className="quick-stat-label">Fees Paid</span>
                    <span className="quick-stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(student.fees?.summary?.paid)}</span>
                  </div>
                  <div className="quick-stat-item">
                    <span className="quick-stat-label">Fees Pending</span>
                    <span className="quick-stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(student.fees?.summary?.remaining)}</span>
                  </div>
                  <div className="quick-stat-item">
                    <span className="quick-stat-label">Documents</span>
                    <span className="quick-stat-value">{student.documents?.length || 0}</span>
                  </div>
                  <div className="quick-stat-item">
                    <span className="quick-stat-label">Marks Records</span>
                    <span className="quick-stat-value">{student.marks?.length || 0}</span>
                  </div>
                </div>
              </div>
              <div className="dashboard-section">
                <div className="dashboard-section-header"><h2>Documents</h2></div>
                <div className="dashboard-section-body">
                  {student.documents?.length ? (
                    student.documents.slice(0, 5).map(doc => (
                      <div key={doc.id} className="recent-student">
                        <div className="recent-student-avatar"><File size={28} /></div>
                        <div className="recent-student-info">
                          <h4>{doc.title || doc.doc_type}</h4>
                          <p>{doc.doc_type} · {formatDate(doc.created_at)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="muted-center">No documents uploaded</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'ai' && (
          <>
            {aiLoading ? (
              <InlineLoader />
            ) : (
              <div className="dashboard-grid">
                {/* Risk */}
                <div className="dashboard-section">
                  <div className="dashboard-section-header"><h2>Risk Prediction</h2></div>
                  <div className="dashboard-section-body">
                    {aiRisk ? (
                      <>
                        <div className="ml-stat" style={{ marginBottom: '8px' }}>
                          <div className={`ml-stat-value ${riskClass(aiRisk.riskLevel)}`}>{aiRisk.riskLevel}</div>
                          <div className="ml-stat-label">Risk score {aiRisk.riskScore}/100</div>
                        </div>
                        <div className="risk-bar" style={{ marginBottom: '12px' }}>
                          <div className="risk-bar-fill" style={{ width: `${aiRisk.riskScore}%`, background: riskColor(aiRisk.riskLevel) }} />
                        </div>
                        <div className="quick-stat-item">
                          <span className="quick-stat-label">Academic</span>
                          <span className="quick-stat-value">{aiRisk.components?.academic}</span>
                        </div>
                        <div className="quick-stat-item">
                          <span className="quick-stat-label">Attendance</span>
                          <span className="quick-stat-value">{aiRisk.components?.attendance}</span>
                        </div>
                        <div className="quick-stat-item">
                          <span className="quick-stat-label">Fee</span>
                          <span className="quick-stat-value">{aiRisk.components?.fee}</span>
                        </div>
                        {aiRisk.factors?.length > 0 && (
                          <div style={{ marginTop: '12px' }}>
                            {aiRisk.factors.map((f, i) => (
                              <div key={i} className="ai-option" style={{ marginBottom: '6px' }}>
                                <span className={`ai-chip ${f.impact === 'critical' ? 'ai-chip-danger' : f.impact === 'high' ? 'ai-chip-warning' : 'ai-chip-info'}`}>{f.label}</span>
                                <div className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>{f.description}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : <p className="muted-center">No risk data.</p>}
                  </div>
                </div>

                {/* Attendance forecast */}
                <div className="dashboard-section">
                  <div className="dashboard-section-header"><h2>Attendance Forecast</h2></div>
                  <div className="dashboard-section-body">
                    {aiForecast ? (
                      <>
                        <div className="quick-stat-item">
                          <span className="quick-stat-label">Current attendance</span>
                          <span className="quick-stat-value">{aiForecast.currentAttendance}%</span>
                        </div>
                        <div className="quick-stat-item">
                          <span className="quick-stat-label">Projected final</span>
                          <span className={`quick-stat-value ${aiForecast.status === 'safe' ? '' : aiForecast.status === 'warning' ? 'risk-moderate' : 'risk-high'}`}>
                            {aiForecast.projectedFinal}%
                          </span>
                        </div>
                        {aiForecast.neededToReach != null && (
                          <div className="quick-stat-item">
                            <span className="quick-stat-label">Classes to reach 75%</span>
                            <span className="quick-stat-value">{aiForecast.neededToReach}</span>
                          </div>
                        )}
                        <div className="quick-stat-item">
                          <span className="quick-stat-label">Remaining (est.)</span>
                          <span className="quick-stat-value">{aiForecast.remainingClasses}</span>
                        </div>
                        <div style={{ marginTop: '12px' }}>
                          {aiForecast.scenarios?.map((s, i) => (
                            <div key={i} className="ai-option" style={{ marginBottom: '6px' }}>
                              <span className="ai-chip ai-chip-muted">{s.label}</span>
                              <strong style={{ marginLeft: '8px' }}>{s.projectedFinal}%</strong>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : <p className="muted-center">No attendance forecast.</p>}
                  </div>
                </div>

                {/* Study recommendations */}
                <div className="dashboard-section">
                  <div className="dashboard-section-header"><h2>Study Recommendations</h2></div>
                  <div className="dashboard-section-body">
                    {aiRecs ? (
                      aiRecs.recommendations?.length ? (
                        aiRecs.recommendations.map((r, i) => (
                          <div key={i} className="ai-msg-draft" style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span className={`ai-chip ${r.priority === 'high' ? 'ai-chip-danger' : r.priority === 'medium' ? 'ai-chip-warning' : 'ai-chip-info'}`}>
                                {r.priority} priority
                              </span>
                              {r.subject && <span className="ai-chip ai-chip-muted">{r.subject}</span>}
                            </div>
                            <div className="ai-msg-body" style={{ marginTop: '6px' }}>{r.advice}</div>
                          </div>
                        ))
                      ) : <p className="muted-center">{aiRecs.note || 'No recommendations.'}</p>
                    ) : <p className="muted-center">No recommendations.</p>}
                  </div>
                </div>

                {/* Marks analysis */}
                <div className="dashboard-section" style={{ gridColumn: '1 / -1' }}>
                  <div className="dashboard-section-header"><h2>Marks Analysis</h2></div>
                  <div className="dashboard-section-body">
                    {aiMarks ? (
                      <>
                        <div className="ml-stats">
                          <div className="ml-stat"><div className="ml-stat-value">{aiMarks.overallAverage}%</div><div className="ml-stat-label">Overall average</div></div>
                          <div className="ml-stat"><div className="ml-stat-value">{aiMarks.passRate}%</div><div className="ml-stat-label">Pass rate</div></div>
                          <div className="ml-stat"><div className="ml-stat-value">{aiMarks.gpaAverage ?? '—'}</div><div className="ml-stat-label">Avg GPA</div></div>
                          <div className="ml-stat"><div className="ml-stat-value">{aiMarks.improvingCount}</div><div className="ml-stat-label">Improving subjects</div></div>
                          <div className="ml-stat"><div className="ml-stat-value">{aiMarks.decliningCount}</div><div className="ml-stat-label">Declining subjects</div></div>
                        </div>
                        {aiMarks.weakest && (
                          <p className="text-muted" style={{ fontSize: '13px', marginBottom: '8px' }}>
                            Weakest: <strong>{aiMarks.weakest.subject}</strong> ({aiMarks.weakest.averagePercentage}%)
                            {aiMarks.strongest && <> · Strongest: <strong>{aiMarks.strongest.subject}</strong> ({aiMarks.strongest.averagePercentage}%)</>}
                          </p>
                        )}
                        {aiMarks.perSubject?.length ? (
                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr><th>Subject</th><th>Avg %</th><th>GPA</th><th>Trend</th></tr>
                              </thead>
                              <tbody>
                                {aiMarks.perSubject.map(s => (
                                  <tr key={s.subject}>
                                    <td>{s.subject}</td>
                                    <td>{s.averagePercentage}%</td>
                                    <td>{s.averageGpa}</td>
                                    <td className={s.trend >= 0 ? '' : 'risk-high'}>
                                      {s.trend > 0 ? `+${s.trend}` : s.trend} pts
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="muted-center">{aiMarks.note || 'No marks data.'}</p>
                        )}
                      </>
                    ) : <p className="muted-center">No marks analysis.</p>}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'documents' && (
          <div className="dashboard-section">
            <div className="dashboard-section-header">
              <h2>Student Documents</h2>
              {canManage && (
                <button className="btn btn-primary btn-sm" onClick={() => setDocModal(prev => ({ ...prev, open: true }))}>
                  <Upload size={16} /> Upload Document
                </button>
              )}
            </div>
            <div className="dashboard-section-body">
              {student.documents?.length ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Uploaded</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.documents.map(doc => (
                        <tr key={doc.id}>
                          <td>{doc.title || 'Untitled'}</td>
                          <td><span className="badge badge-active">{doc.doc_type}</span></td>
                          <td>{formatDate(doc.created_at)}</td>
                          <td>
                            <div className="action-buttons">
                              <a className="action-btn view" title="View Document" href={`${API_URL}/uploads/${doc.file_path}`} target="_blank" rel="noopener noreferrer"><Eye size={16} /></a>
                              {canManage && (
                                <button className="action-btn delete" title="Delete" onClick={() => handleDeleteDoc(doc)}><Trash2 size={16} /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted-center">No documents uploaded</p>
              )}
            </div>
          </div>
        )}

        {tab === 'attendance' && (
          <>
            <div className="dashboard-grid dashboard-grid-3">
              <div className="dashboard-section">
                <div className="dashboard-section-header"><h2>Overall Attendance</h2></div>
                <div className="dashboard-section-body">
                  <div className="attendance-donut">
                    <div className="attendance-donut-ring" style={{ '--rate': `${student.attendance?.overall?.percentage || 0}%` }}>
                      <span>{student.attendance?.overall?.percentage != null ? `${student.attendance.overall.percentage}%` : '—'}</span>
                    </div>
                  </div>
                  <div className="quick-stat-item">
                    <span className="quick-stat-label">Present</span>
                    <span className="quick-stat-value" style={{ color: 'var(--success)' }}>{student.attendance?.overall?.present || 0}</span>
                  </div>
                  <div className="quick-stat-item">
                    <span className="quick-stat-label">Absent</span>
                    <span className="quick-stat-value" style={{ color: 'var(--danger)' }}>{student.attendance?.overall?.absent || 0}</span>
                  </div>
                  <div className="quick-stat-item">
                    <span className="quick-stat-label">Total Classes</span>
                    <span className="quick-stat-value">{student.attendance?.overall?.total || 0}</span>
                  </div>
                </div>
              </div>
              <div className="dashboard-section" style={{ gridColumn: 'span 2' }}>
                <div className="dashboard-section-header"><h2>Subject-wise Attendance</h2></div>
                <div className="dashboard-section-body">
                  {student.attendance?.bySubject?.length ? (
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr><th>Subject</th><th>Present</th><th>Absent</th><th>Total</th></tr>
                        </thead>
                        <tbody>
                          {student.attendance.bySubject.map(s => (
                            <tr key={s.subject_id}>
                              <td>{s.subject_name}</td>
                              <td>{s.present}</td>
                              <td>{s.absent}</td>
                              <td>{s.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="muted-center">No attendance records yet</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'fees' && (
          <>
            <div className="dashboard-grid dashboard-grid-3">
              <div className="dashboard-section">
                <div className="dashboard-section-header"><h2>Fee Summary</h2></div>
                <div className="dashboard-section-body">
                  <div className="quick-stat-item">
                    <span className="quick-stat-label">Total Fees</span>
                    <span className="quick-stat-value">{formatCurrency(student.fees?.summary?.total)}</span>
                  </div>
                  <div className="quick-stat-item">
                    <span className="quick-stat-label">Paid</span>
                    <span className="quick-stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(student.fees?.summary?.paid)}</span>
                  </div>
                  <div className="quick-stat-item">
                    <span className="quick-stat-label">Pending</span>
                    <span className="quick-stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(student.fees?.summary?.remaining)}</span>
                  </div>
                </div>
              </div>
              <div className="dashboard-section" style={{ gridColumn: 'span 2' }}>
                <div className="dashboard-section-header">
                  <h2>Fee Records</h2>
                  {canManage && (
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/fees')}>Manage Fees →</button>
                  )}
                </div>
                <div className="dashboard-section-body">
                  {student.fees?.items?.length ? (
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Fee Type</th>
                            <th>Due Date</th>
                            <th>Total</th>
                            <th>Paid</th>
                            <th>Remaining</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {student.fees.items.map(f => (
                            <tr key={f.id}>
                              <td>{f.fee_type || 'Tuition'}</td>
                              <td>{f.due_date ? formatDate(f.due_date) : '—'}</td>
                              <td>{formatCurrency(f.total_fees)}</td>
                              <td>{formatCurrency(f.paid)}</td>
                              <td>{formatCurrency(f.remaining)}</td>
                              <td>
                                {canManage && Number(f.remaining) > 0 && (
                                  <button className="btn btn-sm btn-success" onClick={() => setPayModal({ open: true, fee: f, amount: '', paymentDate: new Date().toISOString().split('T')[0], method: 'Cash', reference: '' })}>
                                    <IndianRupee size={16} /> Record Payment
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="muted-center">No fees assigned yet</p>
                  )}

                  {student.fees?.payments?.length > 0 && (
                    <>
                      <h2 style={{ fontSize: 'var(--font-size-lg)', marginTop: '20px' }}>Payment History</h2>
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr><th>Receipt</th><th>Date</th><th>Method</th><th>Amount</th></tr>
                          </thead>
                          <tbody>
                            {student.fees.payments.map(p => (
                              <tr key={p.id}>
                                <td>{p.receipt_number || p.id}</td>
                                <td>{formatDate(p.payment_date)}</td>
                                <td>{p.method}</td>
                                <td>{formatCurrency(p.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'marks' && (
          <>
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <h2>Marksheet</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select className="form-select" value={marksheetSem} onChange={(e) => setMarksheetSem(e.target.value)}>
                    <option value="">All Semesters</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={async () => {
                      try {
                        const res = await examApi.getMarksheet(student.id, marksheetSem || undefined);
                        if (res.success) {
                          window.open(`/marksheet/${student.id}${marksheetSem ? `?semester=${marksheetSem}` : ''}`, '_blank');
                        }
                      } catch (error) {
                        toast.error('Failed to load marksheet');
                      }
                    }}
                  >
                    <Printer size={16} /> View Marksheet
                  </button>
                </div>
              </div>
              <div className="dashboard-section-body">
                {student.marks?.length ? (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Exam</th>
                          <th>Subject</th>
                          <th>Internal</th>
                          <th>External</th>
                          <th>Practical</th>
                          <th>Assignment</th>
                          <th>Total</th>
                          <th>%</th>
                          <th>Grade</th>
                          <th>GPA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {student.marks.map(m => (
                          <tr key={m.id}>
                            <td>{m.exam_name}</td>
                            <td>{m.subject_name}</td>
                            <td>{m.internal_marks}</td>
                            <td>{m.external_marks}</td>
                            <td>{m.practical_marks || 0}</td>
                            <td>{m.assignment_marks || 0}</td>
                            <td>{m.total_marks}</td>
                            <td>{m.percentage}</td>
                            <td><span className="badge badge-active">{m.grade}</span></td>
                            <td>{m.gpa}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted-center">No marks recorded yet</p>
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'leave' && (
          <>
            {leaveTab.summary && (
              <div className="leave-summary">
                <div className="leave-summary-card"><span>Pending</span><strong>{leaveTab.summary.pending}</strong></div>
                <div className="leave-summary-card"><span>Approved</span><strong>{leaveTab.summary.approved}</strong></div>
                <div className="leave-summary-card"><span>Rejected</span><strong>{leaveTab.summary.rejected}</strong></div>
                <div className="leave-summary-card"><span>Days Approved</span><strong>{leaveTab.summary.approvedDays}</strong></div>
              </div>
            )}
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <h2>Leave History</h2>
                <button className="btn btn-outline btn-sm" onClick={() => navigate('/leaves')}>Leave Management →</button>
              </div>
              <div className="dashboard-section-body">
                {leaveTab.loading ? (
                  <InlineLoader />
                ) : leaveTab.leaves.length ? (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr><th>Type</th><th>Duration</th><th>Days</th><th>Reason</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {leaveTab.leaves.map(l => (
                          <tr key={l.id}>
                            <td><span className="badge badge-info">{l.leave_type}</span></td>
                            <td>{formatDate(l.from_date)} → {formatDate(l.to_date)}</td>
                            <td>{l.days}</td>
                            <td title={l.reason}>{l.reason ? (l.reason.length > 40 ? `${l.reason.slice(0, 40)}…` : l.reason) : '—'}</td>
                            <td>
                              <span className={`leave-status ${l.status === 'Approved' ? 'leave-status-approved' : l.status === 'Rejected' ? 'leave-status-rejected' : l.status === 'Cancelled' ? 'leave-status-cancelled' : 'leave-status-pending'}`}>
                                {l.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted-center">No leave requests for this student</p>
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'idcard' && (
          <div className="dashboard-section">
            <div className="dashboard-section-header">
              <h2>Student ID Card</h2>
              {canManage && (
                <button className="btn btn-primary btn-sm" onClick={issueIdCard}>
                  {idCard.exists ? <><RefreshCw size={16} /> Regenerate Card</> : <><CreditCard size={16} /> Issue ID Card</>}
                </button>
              )}
            </div>
            <div className="dashboard-section-body">
              {idCard.loading ? (
                <InlineLoader />
              ) : idCard.card ? (
                <>
                  <div className="idcard-preview">
                    <div className="idcard-header">
                      <div>
                        <h2><Building2 size={18} /> Student ID</h2>
                        <p>Verified College Identity Card</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700 }}>{idCard.card.card_number}</div>
                        <div style={{ fontSize: '10px', opacity: 0.9 }}>
                          <span className={`leave-status ${idCard.card.status === 'Active' ? 'leave-status-approved' : 'leave-status-rejected'}`}>{idCard.card.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="idcard-body">
                      <div className="idcard-avatar">
                        {student.image
                          ? <img src={`${API_URL}/uploads/${student.image}`} alt={student.name} />
                          : getInitials(student.name)}
                      </div>
                      <div className="idcard-details">
                        <div><div className="idcard-field-label">Name</div><div className="idcard-field-value">{student.name}</div></div>
                        <div><div className="idcard-field-label">Roll Number</div><div className="idcard-field-value">{student.student_id}</div></div>
                        <div><div className="idcard-field-label">Branch</div><div className="idcard-field-value">{student.branch}</div></div>
                        <div><div className="idcard-field-label">Semester</div><div className="idcard-field-value">{student.semester}</div></div>
                        <div><div className="idcard-field-label">Issued On</div><div className="idcard-field-value">{formatDate(idCard.card.issued_on)}</div></div>
                        <div><div className="idcard-field-label">Valid Until</div><div className="idcard-field-value">{formatDate(idCard.card.valid_until)}</div></div>
                      </div>
                    </div>
                    <div className="idcard-footer">
                      <span>Scan to verify authenticity</span>
                      <span className="idcard-qr">
                        <QRCodeSVG value={`${window.location.origin}/verify/${idCard.card.verification_token}`} size={88} />
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="muted-center">
                  No ID card issued for this student yet.
                  {canManage && ' Use the button above to issue one.'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      <Modal
        isOpen={docModal.open}
        onClose={() => setDocModal({ open: false, docType: '', title: '', file: null })}
        title="Upload Document"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDocModal({ open: false, docType: '', title: '', file: null })}>Cancel</button>
            <button className="btn btn-primary" onClick={handleDocUpload}><Upload size={16} /> Upload</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Document Type</label>
          <select className="form-select" value={docModal.docType} onChange={(e) => setDocModal(prev => ({ ...prev, docType: e.target.value }))}>
            <option value="">Select type...</option>
            <option value="Aadhaar">Aadhaar</option>
            <option value="Marksheet">Marksheet</option>
            <option value="TC">Transfer Certificate</option>
            <option value="Fee Receipt">Fee Receipt</option>
            <option value="Certificate">Certificate</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Title (optional)</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. 10th Marksheet"
            value={docModal.title}
            onChange={(e) => setDocModal(prev => ({ ...prev, title: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">File</label>
          <input
            type="file"
            className="form-input"
            onChange={(e) => setDocModal(prev => ({ ...prev, file: e.target.files[0] }))}
          />
          <p className="form-hint">PDF, DOC, DOCX, images — max 10MB</p>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={payModal.open}
        onClose={() => setPayModal({ open: false, fee: null })}
        title="Record Payment"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setPayModal({ open: false, fee: null })}>Cancel</button>
            <button className="btn btn-success" onClick={handleRecordPayment}><IndianRupee size={16} /> Save Payment</button>
          </>
        }
      >
        {payModal.fee && (
          <>
            <p className="text-muted" style={{ marginBottom: '16px' }}>
              Fee total: <strong>{formatCurrency(payModal.fee.total_fees)}</strong> · Remaining: <strong>{formatCurrency(payModal.fee.remaining)}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input
                type="number"
                className="form-input"
                min="1"
                placeholder="Amount"
                value={payModal.amount}
                onChange={(e) => setPayModal(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input
                type="date"
                className="form-input"
                value={payModal.paymentDate}
                onChange={(e) => setPayModal(prev => ({ ...prev, paymentDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Method</label>
              <select className="form-select" value={payModal.method} onChange={(e) => setPayModal(prev => ({ ...prev, method: e.target.value }))}>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reference (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Transaction/Cheque no."
                value={payModal.reference}
                onChange={(e) => setPayModal(prev => ({ ...prev, reference: e.target.value }))}
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default StudentProfile;
