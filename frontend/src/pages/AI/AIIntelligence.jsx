import React, { useState, useEffect } from 'react';
import { InlineLoader } from '../../components/Loader/Loader';
import aiApi from '../../services/aiApi';
import studentApi from '../../services/studentApi';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatCurrency } from '../../utils/format';
import { riskClass, riskColor, severityClass, intentLabel, formatNumber } from '../../utils/ai';
import { isAdmin } from '../../utils/auth';
import { IndianRupee, AlertTriangle, Bot, Search, Brain, Sparkles, PartyPopper, RefreshCw } from 'lucide-react';

const AIIntelligence = () => {
  const { toast } = useToast();
  const admin = isAdmin();
  const [tab, setTab] = useState('fee-risk');

  // Fee risk
  const [feeRisk, setFeeRisk] = useState(null);
  const [feeLoading, setFeeLoading] = useState(true);

  // Anomalies
  const [anomalies, setAnomalies] = useState(null);
  const [anomLoading, setAnomLoading] = useState(false);

  // ML pipeline
  const [model, setModel] = useState(null);
  const [training, setTraining] = useState(false);
  const [students, setStudents] = useState([]);
  const [predictStudent, setPredictStudent] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [predictLoading, setPredictLoading] = useState(false);

  const loadFeeRisk = async () => {
    setFeeLoading(true);
    try {
      const data = await aiApi.feeRisk();
      setFeeRisk(data);
    } catch (error) {
      toast.error('Failed to load fee risk');
    } finally {
      setFeeLoading(false);
    }
  };

  const loadAnomalies = async () => {
    setAnomLoading(true);
    try {
      const data = await aiApi.anomalies();
      setAnomalies(data);
    } catch (error) {
      toast.error('Failed to run anomaly detection');
    } finally {
      setAnomLoading(false);
    }
  };

  const loadModel = async () => {
    try {
      const data = await aiApi.getModel();
      setModel(data.model);
    } catch (error) { /* optional */ }
  };

  const loadStudents = async () => {
    try {
      const res = await studentApi.getAll({ limit: 200 });
      setStudents(res.data || []);
    } catch (error) { /* optional */ }
  };

  useEffect(() => {
    loadFeeRisk();
    if (admin) { loadModel(); loadStudents(); }
  }, [admin]);

  const train = async () => {
    setTraining(true);
    setPrediction(null);
    try {
      const result = await aiApi.trainModel();
      if (result.error) {
        toast.error(result.error);
      } else {
        setModel({ id: result.id, name: result.name, version: result.version, algorithm: result.algorithm, status: result.status, metrics: result.metrics });
        toast.success(`Model v${result.version} trained`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Training failed');
    } finally {
      setTraining(false);
    }
  };

  const predict = async () => {
    if (!predictStudent) return;
    setPredictLoading(true);
    setPrediction(null);
    try {
      const result = await aiApi.predictWithModel(Number(predictStudent));
      setPrediction(result);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Prediction failed');
    } finally {
      setPredictLoading(false);
    }
  };

  const metrics = model?.metrics && typeof model.metrics === 'string' ? JSON.parse(model.metrics) : model?.metrics;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Intelligence</h1>
          <p>Fee-risk analytics, anomaly detection and the ML pipeline.</p>
        </div>
      </div>

      <div className="profile-tabs" style={{ marginBottom: '16px' }}>
        <button className={`profile-tab ${tab === 'fee-risk' ? 'active' : ''}`} onClick={() => setTab('fee-risk')}><IndianRupee size={16} /> Fee Risk</button>
        <button className={`profile-tab ${tab === 'anomalies' ? 'active' : ''}`} onClick={() => setTab('anomalies')}><AlertTriangle size={16} /> Anomalies</button>
        {admin && <button className={`profile-tab ${tab === 'ml' ? 'active' : ''}`} onClick={() => setTab('ml')}><Bot size={16} /> ML Pipeline</button>}
      </div>

      {tab === 'fee-risk' && (
        <>
          <div className="ml-stats">
            <div className="ml-stat"><div className="ml-stat-value">{feeRisk?.summary?.totalStudents || 0}</div><div className="ml-stat-label">Students</div></div>
            <div className="ml-stat"><div className="ml-stat-value">{feeRisk?.summary?.withArrears || 0}</div><div className="ml-stat-label">With arrears</div></div>
            <div className="ml-stat"><div className="ml-stat-value" style={{ color: 'var(--danger)' }}>{feeRisk?.summary?.high || 0}</div><div className="ml-stat-label">High risk</div></div>
            <div className="ml-stat"><div className="ml-stat-value" style={{ color: 'var(--warning)' }}>{feeRisk?.summary?.moderate || 0}</div><div className="ml-stat-label">Moderate</div></div>
            <div className="ml-stat"><div className="ml-stat-value" style={{ color: 'var(--success)' }}>{feeRisk?.summary?.low || 0}</div><div className="ml-stat-label">Low</div></div>
            <div className="ml-stat"><div className="ml-stat-value">{formatCurrency(feeRisk?.summary?.totalOutstanding)}</div><div className="ml-stat-label">Outstanding</div></div>
          </div>

          <div className="dashboard-section">
            <div className="dashboard-section-header">
              <h2>Fee Risk Ranking</h2>
              <button className="btn btn-outline btn-sm" onClick={loadFeeRisk} disabled={feeLoading}><RefreshCw size={14} /> Refresh</button>
            </div>
            <div className="dashboard-section-body">
              {feeLoading ? <InlineLoader /> : feeRisk?.list?.length ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr><th>Student</th><th>Branch</th><th>Status</th><th>Outstanding</th><th>Due date</th><th>Overdue</th><th>Risk</th><th>Score</th></tr>
                    </thead>
                    <tbody>
                      {feeRisk.list.map((f, i) => (
                        <tr key={i}>
                          <td>{f.student.name}</td>
                          <td>{f.student.branch} · Sem {f.student.semester}</td>
                          <td><span className={`ai-chip ${f.status === 'Paid' ? 'ai-chip-success' : f.status === 'Pending' ? 'ai-chip-danger' : 'ai-chip-warning'}`}>{f.status}</span></td>
                          <td>{formatCurrency(f.outstanding)}</td>
                          <td>{formatDate(f.dueDate)}</td>
                          <td>{f.daysOverdue > 0 ? `${f.daysOverdue} day(s)` : '—'}</td>
                          <td className={riskClass(f.level)}>{f.level}</td>
                          <td>{f.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted-center">No fee data.</p>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'anomalies' && (
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Detected Anomalies{anomalies ? ` (${anomalies.count})` : ''}</h2>
            <button className="btn btn-outline btn-sm" onClick={loadAnomalies} disabled={anomLoading}>
              {anomLoading ? 'Scanning…' : <><Search size={16} /> Run Detection</>}
            </button>
          </div>
          <div className="dashboard-section-body">
            {anomLoading ? <InlineLoader /> : anomalies?.anomalies?.length ? (
              <div className="insight-list">
                {anomalies.anomalies.map(a => (
                  <div key={a.id} className={`insight-item warning anomaly-item ${severityClass(a.severity)}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div className="insight-title"><AlertTriangle size={14} /> {intentLabel(a.type)}</div>
                      <span className={`ai-chip ${a.severity >= 3 ? 'ai-chip-danger' : 'ai-chip-warning'}`}>severity {a.severity}</span>
                    </div>
                    <div className="insight-desc">{a.description}</div>
                    {a.studentName && <div className="insight-metrics"><span className="insight-metric">Student: <strong>{a.studentName}</strong></span></div>}
                  </div>
                ))}
              </div>
            ) : anomalies ? (
              <p className="muted-center">No anomalies detected. <PartyPopper size={14} /></p>
            ) : (
              <p className="muted-center">Click "Run Detection" to scan student records.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'ml' && admin && (
        <div className="dashboard-grid">
          <div className="dashboard-section">
            <div className="dashboard-section-header"><h2>ML Pipeline</h2></div>
            <div className="dashboard-section-body">
              {model ? (
                <>
                  <div className="ml-stats">
                    <div className="ml-stat"><div className="ml-stat-value">{model.version}</div><div className="ml-stat-label">Version</div></div>
                    <div className="ml-stat"><div className="ml-stat-value">{metrics?.trainAccuracy != null ? `${formatNumber(metrics.trainAccuracy, 1)}%` : '—'}</div><div className="ml-stat-label">Train accuracy</div></div>
                    <div className="ml-stat"><div className="ml-stat-value">{metrics?.validationAccuracy != null ? `${formatNumber(metrics.validationAccuracy, 1)}%` : '—'}</div><div className="ml-stat-label">Validation</div></div>
                    <div className="ml-stat"><div className="ml-stat-value">{metrics?.sampleCount ?? '—'}</div><div className="ml-stat-label">Samples</div></div>
                  </div>
                  <p className="text-muted" style={{ fontSize: '13px', marginBottom: '8px' }}>{metrics?.note}</p>
                  <p className="text-muted" style={{ fontSize: '12px' }}>
                    Algorithm: {model.algorithm} · Status: <span className="ai-chip ai-chip-success">{model.status}</span>
                  </p>
                </>
              ) : (
                <p className="muted-center">No active model yet. Train one from the existing student risk data.</p>
              )}
              <button className="btn btn-primary" onClick={train} disabled={training} style={{ marginTop: '8px' }}>
                {training ? 'Training…' : <><Brain size={16} /> Train Baseline Model</>}
              </button>
              <p className="form-hint">Baseline logistic regression trained on rule-derived risk labels. Versions auto-increment.</p>
            </div>
          </div>

          <div className="dashboard-section" style={{ gridColumn: 'span 2' }}>
            <div className="dashboard-section-header"><h2>Model Prediction</h2></div>
            <div className="dashboard-section-body">
              <div className="ai-form-row" style={{ marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Student</label>
                  <select className="form-select" value={predictStudent} onChange={(e) => setPredictStudent(e.target.value)}>
                    <option value="">Select a student…</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>)}
                  </select>
                </div>
                <div style={{ alignSelf: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={predict} disabled={predictLoading || !predictStudent}>
                    {predictLoading ? 'Predicting…' : <><Sparkles size={16} /> Predict Risk</>}
                  </button>
                </div>
              </div>

              {prediction && (
                <div className="ai-grid">
                  <div className="ai-card">
                    <div className="ai-card-header">
                      <h3>Prediction</h3>
                      <span className={`ai-chip ${prediction.source === 'ml' ? 'ai-chip-info' : 'ai-chip-muted'}`}>
                        source: {prediction.source}
                      </span>
                    </div>
                    {prediction.modelUsed && (
                      <p className="text-muted" style={{ fontSize: '12px', marginBottom: '8px' }}>
                        Model: {prediction.modelUsed.name} {prediction.modelUsed.version}
                      </p>
                    )}
                    <div className="ml-stat" style={{ marginBottom: '8px' }}>
                      <div className={`ml-stat-value ${riskClass(prediction.prediction.riskLevel)}`}>{prediction.prediction.riskLevel}</div>
                      <div className="ml-stat-label">Risk level · score {prediction.prediction.riskScore}</div>
                    </div>
                    {prediction.probability != null && (
                      <p className="text-muted" style={{ fontSize: '13px' }}>High-risk probability: {prediction.probability}%</p>
                    )}
                    <div className="risk-bar">
                      <div className="risk-bar-fill" style={{ width: `${prediction.prediction.riskScore}%`, background: riskColor(prediction.prediction.riskLevel) }} />
                    </div>
                  </div>

                  <div className="ai-card">
                    <div className="ai-card-header"><h3>Factors</h3></div>
                    {prediction.prediction.factors?.length ? (
                      prediction.prediction.factors.map((f, i) => (
                        <div key={i} className="ai-option" style={{ marginBottom: '6px' }}>
                          <span className={`ai-chip ${f.impact === 'critical' ? 'ai-chip-danger' : f.impact === 'high' ? 'ai-chip-warning' : 'ai-chip-info'}`}>{f.label}</span>
                          <div className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>{f.description}</div>
                        </div>
                      ))
                    ) : <p className="muted-center">No factors.</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIIntelligence;
