import React, { useState, useEffect } from 'react';
import { InlineLoader } from '../../components/Loader/Loader';
import aiApi from '../../services/aiApi';
import studentApi from '../../services/studentApi';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/format';

const DOC_TYPES = [
  { value: 'marksheet', label: 'Marksheet' },
  { value: 'aadhaar', label: 'Aadhaar' },
  { value: 'address_proof', label: 'Address Proof' },
  { value: 'transfer_certificate', label: 'Transfer Certificate' },
  { value: 'other', label: 'Other' },
];

const AIDocuments = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [docType, setDocType] = useState('marksheet');
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState(null);

  const [extractions, setExtractions] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadStudents = async () => {
    try {
      const res = await studentApi.getAll({ limit: 200 });
      setStudents(res.data || []);
    } catch (error) { /* optional */ }
  };

  const loadExtractions = async () => {
    setLoadingList(true);
    try {
      const data = await aiApi.listExtractions(30);
      setExtractions(data.extractions || []);
    } catch (error) {
      // non-fatal
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { loadStudents(); loadExtractions(); }, []);

  const handleExtract = async () => {
    if (!studentId || !file) {
      toast.error('Select a student and a file');
      return;
    }
    setExtracting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('studentId', studentId);
      fd.append('docType', docType);
      const data = await aiApi.extractDocument(fd);
      setResult(data);
      toast.success(data.status === 'pending' ? 'Document queued for review' : 'Document parsed');
      loadExtractions();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleApply = async (id) => {
    try {
      await aiApi.applyExtraction(id);
      toast.success('Extraction applied');
      loadExtractions();
    } catch (error) {
      toast.error('Failed to apply extraction');
    }
  };

  const parseExtracted = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch (e) { return null; }
    }
    return raw;
  };

  const renderFields = (extracted) => {
    if (!extracted) return <p className="text-muted">No extracted data.</p>;
    const fields = extracted.recognizedFields;
    if (!fields) return <p className="ai-extract-note">{extracted.note}</p>;
    if (fields.preview) {
      return (
        <>
          <p className="ai-extract-note">{extracted.note}</p>
          <p className="text-muted" style={{ fontSize: '12px', marginTop: '6px' }}>
            {fields.rowCount} row(s) parsed · header: {(fields.header || []).join(', ')}
          </p>
          <div className="table-wrapper">
            <table className="data-table ai-extract-table">
              <thead>
                <tr>{(fields.header || []).map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {fields.preview.map((row, i) => (
                  <tr key={i}>{(fields.header || []).map(h => <td key={h}>{row[h] || ''}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }
    if (fields.format === 'tabular') {
      return (
        <>
          <p className="ai-extract-note">{extracted.note}</p>
          <p className="text-muted" style={{ fontSize: '12px' }}>{fields.rowCount} row(s) parsed</p>
        </>
      );
    }
    return (
      <>
        <p className="ai-extract-note">{extracted.note}</p>
        <div className="insight-metrics">
          {Object.entries(fields).slice(0, 12).map(([k, v]) => (
            <span key={k} className="insight-metric">{k}: <strong>{typeof v === 'object' ? JSON.stringify(v) : v}</strong></span>
          ))}
        </div>
      </>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Document Intelligence</h1>
          <p>Extract structured fields from uploaded student documents.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header"><h2>Extract Document</h2></div>
          <div className="dashboard-section-body">
            <div className="form-group">
              <label className="form-label">Student</label>
              <select className="form-select" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">Select a student…</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Document Type</label>
              <select className="form-select" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">File</label>
              <input
                type="file"
                className="form-input"
                accept=".csv,.txt,.json,.pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <p className="form-hint">CSV / text / JSON are parsed automatically. Images & PDFs are queued for manual review.</p>
            </div>
            <button className="btn btn-primary" onClick={handleExtract} disabled={extracting}>
              {extracting ? 'Extracting…' : '📄 Extract Document'}
            </button>
          </div>

          {result && (
            <div className="ai-card" style={{ marginTop: '16px' }}>
              <div className="ai-card-header">
                <h3>Extraction Result</h3>
                <span className={`ai-chip ${result.status === 'reviewed' ? 'ai-chip-success' : 'ai-chip-warning'}`}>{result.status}</span>
              </div>
              <p className="text-muted" style={{ fontSize: '13px', marginBottom: '8px' }}>
                {result.extracted?.fileName} · {result.docType}
              </p>
              {renderFields(result.extracted)}
            </div>
          )}
        </div>

        <div className="dashboard-section" style={{ gridColumn: 'span 2' }}>
          <div className="dashboard-section-header">
            <h2>Recent Extractions</h2>
            <button className="btn btn-outline btn-sm" onClick={loadExtractions}>↺ Refresh</button>
          </div>
          <div className="dashboard-section-body">
            {loadingList ? <InlineLoader /> : extractions.length === 0 ? (
              <p className="muted-center">No extractions yet</p>
            ) : (
              <div className="insight-list">
                {extractions.map(x => {
                  const extracted = parseExtracted(x.extracted);
                  return (
                    <div key={x.id} className="insight-item info">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div>
                          <div className="insight-title">{x.student_name} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>· {x.doc_type}</span></div>
                          <div className="text-muted" style={{ fontSize: '12px' }}>{formatDateTime(x.created_at)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className={`ai-chip ${x.status === 'applied' ? 'ai-chip-success' : x.status === 'reviewed' ? 'ai-chip-info' : 'ai-chip-warning'}`}>{x.status}</span>
                          {x.status !== 'applied' && (
                            <button className="btn btn-sm btn-primary" onClick={() => handleApply(x.id)}>Apply</button>
                          )}
                        </div>
                      </div>
                      {renderFields(extracted)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIDocuments;
