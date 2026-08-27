import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/PageHeader/PageHeader';
import { InlineLoader } from '../components/Loader/Loader';
import Modal from '../components/Modal/Modal';
import EmptyState from '../components/EmptyState/EmptyState';
import Pagination from '../components/Pagination/Pagination';
import documentApi from '../services/documentApi';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';
import { isAdmin } from '../utils/auth';
import { FolderOpen, Upload, Eye, Trash2, FileText, CreditCard, Award } from 'lucide-react';

const DOC_TYPES = ['Aadhaar', 'Marksheet', 'TC', 'Fee Receipt', 'Certificate', 'Other'];

const TYPE_ICON = {
  Aadhaar: <CreditCard size={16} />,
  Marksheet: <FileText size={16} />,
  TC: <FileText size={16} />,
  'Fee Receipt': <FileText size={16} />,
  Certificate: <Award size={16} />,
  Other: <FolderOpen size={16} />
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const emptyForm = () => ({ studentId: '', docType: '', title: '', file: null });

const Documents = () => {
  const { toast } = useToast();
  const canManage = isAdmin();

  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState({ total: 0, students: 0, byType: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  const [uploadModal, setUploadModal] = useState({ open: false, form: emptyForm() });
  const [students, setStudents] = useState([]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await documentApi.getSummary();
      if (res.success) setSummary(res.data);
    } catch (error) {
      toast.error('Failed to load document summary');
    }
  }, [toast]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentApi.getDocuments({ search, docType, page, limit: 8 });
      if (res.success) {
        setDocuments(res.documents);
        setPagination({ total: res.total, page: res.page, totalPages: res.totalPages });
      }
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [search, docType, page, toast]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  useEffect(() => {
    if (uploadModal.open && students.length === 0) {
      studentApi.getAll({ page: 1, limit: 100 })
        .then(res => { if (res.success) setStudents(res.students || []); })
        .catch(() => toast.error('Failed to load students'));
    }
  }, [uploadModal.open, students.length, toast]);

  const handleUpload = async () => {
    const f = uploadModal.form;
    if (!f.studentId) { toast.error('Select a student'); return; }
    if (!f.docType) { toast.error('Select a document type'); return; }
    if (!f.file) { toast.error('Choose a file to upload'); return; }
    const fd = new FormData();
    fd.append('docType', f.docType);
    fd.append('title', f.title);
    fd.append('file', f.file);
    try {
      await studentApi.addDocument(f.studentId, fd);
      toast.success('Document uploaded');
      setUploadModal({ open: false, form: emptyForm() });
      setPage(1);
      fetchDocuments();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload document');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete document "${doc.title || doc.doc_type}" for ${doc.name}?`)) return;
    try {
      await studentApi.deleteDocument(doc.id);
      toast.success('Document deleted');
      fetchDocuments();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div>
      <PageHeader
        title={<><FolderOpen size={28} /> Student Documents</>}
        subtitle="Central store for student records and certificates"
        actions={canManage && (
          <button className="btn btn-primary" onClick={() => setUploadModal({ open: true, form: emptyForm() })}>
            <Upload size={16} /> Upload Document
          </button>
        )}
      />

      <div className="document-type-grid" style={{ marginBottom: '20px' }}>
        {DOC_TYPES.map(t => {
          const item = summary.byType.find(b => b.doc_type === t);
          return (
            <div className="document-card" key={t} onClick={() => setDocType(t)} style={{ cursor: 'pointer', borderColor: docType === t ? 'var(--primary)' : undefined }}>
              <div className="document-icon">{TYPE_ICON[t] || <FolderOpen size={16} />}</div>
              <div className="document-info">
                <h4>{t}</h4>
                <p>{item ? item.count : 0} document(s)</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: '-12px', marginBottom: '20px' }}>
        {summary.total} total documents across {summary.students} student(s)
      </p>

      <div className="filter-bar-wrap" style={{ marginBottom: '20px' }}>
        <div className="filter-bar">
          <input
            type="text"
            className="form-input"
            placeholder="Search student, title or type..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="form-select" value={docType} onChange={(e) => { setDocType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <InlineLoader />
      ) : documents.length === 0 ? (
        <EmptyState icon={<FolderOpen />} title="No documents found" message="Upload documents to keep student records organized" />
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Document</th>
                <th>Type</th>
                <th>Uploaded</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <strong>{doc.name}</strong>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{doc.roll_number} · {doc.branch} · Sem {doc.semester}</div>
                  </td>
                  <td>
                    <strong>{doc.title || doc.doc_type}</strong>
                  </td>
                  <td>
                    <span className="badge badge-active">{TYPE_ICON[doc.doc_type] || <FolderOpen size={16} />} {doc.doc_type}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: 'var(--font-size-xs)' }}>{formatDate(doc.created_at)}</div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>by {doc.uploaded_by_name || 'Admin'}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="action-buttons">
                      <a
                        className="action-btn view"
                        title="View Document"
                        href={`${API_URL}/uploads/${doc.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      ><Eye size={16} /></a>
                      {canManage && (
                        <button className="action-btn delete" title="Delete" onClick={() => handleDelete(doc)}><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModal.open}
        onClose={() => setUploadModal({ open: false, form: emptyForm() })}
        title="Upload Document"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setUploadModal({ open: false, form: emptyForm() })}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpload}><Upload size={16} /> Upload</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Student *</label>
          <select
            className="form-select"
            value={uploadModal.form.studentId}
            onChange={(e) => setUploadModal(prev => ({ ...prev, form: { ...prev.form, studentId: e.target.value } }))}
          >
            <option value="">Select student...</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.student_id} — {s.name} ({s.branch}, Sem {s.semester})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Document Type *</label>
          <select
            className="form-select"
            value={uploadModal.form.docType}
            onChange={(e) => setUploadModal(prev => ({ ...prev, form: { ...prev.form, docType: e.target.value } }))}
          >
            <option value="">Select type...</option>
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Title (optional)</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. 10th Marksheet"
            value={uploadModal.form.title}
            onChange={(e) => setUploadModal(prev => ({ ...prev, form: { ...prev.form, title: e.target.value } }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">File *</label>
          <input
            type="file"
            className="form-input"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
            onChange={(e) => setUploadModal(prev => ({ ...prev, form: { ...prev.form, file: e.target.files[0] } }))}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Documents;
