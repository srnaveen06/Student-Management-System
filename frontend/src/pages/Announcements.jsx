import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/PageHeader/PageHeader';
import { InlineLoader } from '../components/Loader/Loader';
import Modal from '../components/Modal/Modal';
import EmptyState from '../components/EmptyState/EmptyState';
import Pagination from '../components/Pagination/Pagination';
import announcementApi from '../services/announcementApi';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../utils/format';
import { isAdmin } from '../utils/auth';
import { Megaphone, Plus, Edit, Trash2, Pin, Trophy, AlertTriangle, Inbox, FileText, Sparkles, CreditCard } from 'lucide-react';

const TYPE_META = {
  General: { icon: <Megaphone size={16} />, className: 'badge-info' },
  Exam: { icon: <FileText size={16} />, className: 'badge-warning' },
  Notice: { icon: <Pin size={16} />, className: 'badge-active' },
  Event: { icon: <Sparkles size={16} />, className: 'badge-info' },
  Fee: { icon: <CreditCard size={16} />, className: 'badge-inactive' },
  Result: { icon: <Trophy size={16} />, className: 'badge-active' },
  Urgent: { icon: <AlertTriangle size={16} />, className: 'badge-danger' }
};

const AUDIENCES = ['All', 'Students', 'Teachers', 'Staff'];

const emptyForm = () => ({
  title: '', content: '', announcementType: 'General', audience: 'All', isPinned: false
});

const Announcements = () => {
  const { toast } = useToast();
  const canManage = isAdmin();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [audience, setAudience] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  const [formModal, setFormModal] = useState({ open: false, editing: null, form: emptyForm() });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await announcementApi.getAnnouncements({ search, type, audience, page, limit: 8 });
      if (res.success) {
        setAnnouncements(res.announcements);
        setPagination({ total: res.total, page: res.page, totalPages: res.totalPages });
      }
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [search, type, audience, page, toast]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleSave = async () => {
    const f = formModal.form;
    if (!f.title || !f.content) {
      toast.error('Title and content are required');
      return;
    }
    try {
      if (formModal.editing) {
        await announcementApi.updateAnnouncement(formModal.editing.id, f);
        toast.success('Announcement updated');
      } else {
        await announcementApi.createAnnouncement(f);
        toast.success('Announcement published');
      }
      setFormModal({ open: false, editing: null, form: emptyForm() });
      setPage(1);
      fetchAnnouncements();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save announcement');
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete announcement "${a.title}"?`)) return;
    try {
      await announcementApi.deleteAnnouncement(a.id);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  const togglePin = async (a) => {
    try {
      await announcementApi.updateAnnouncement(a.id, {
        title: a.title, content: a.content, announcementType: a.announcement_type,
        audience: a.audience, isPinned: !a.is_pinned
      });
      toast.success(a.is_pinned ? 'Unpinned' : 'Pinned to top');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to update announcement');
    }
  };

  return (
    <div>
      <PageHeader
        title={<><Megaphone size={28} /> Announcements</>}
        subtitle="Broadcast notices, results, and urgent updates"
        actions={canManage && (
          <button className="btn btn-primary" onClick={() => setFormModal({ open: true, editing: null, form: emptyForm() })}>
            <Plus size={16} /> New Announcement
          </button>
        )}
      />

      <div className="filter-bar-wrap" style={{ marginBottom: '20px' }}>
        <div className="filter-bar">
          <input
            type="text"
            className="form-input"
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="form-select" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {Object.keys(TYPE_META).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="form-select" value={audience} onChange={(e) => { setAudience(e.target.value); setPage(1); }}>
            <option value="">All Audiences</option>
            {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <InlineLoader />
      ) : announcements.length === 0 ? (
        <EmptyState icon={<Inbox />} title="No announcements" message="Publish your first announcement" />
      ) : (
        <div className="announcements-list">
          {announcements.map(a => {
            const meta = TYPE_META[a.announcement_type] || TYPE_META.General;
            return (
              <div className={`announcement-card ${a.is_pinned ? 'pinned' : ''}`} key={a.id}>
                <div className="announcement-card-header">
                  <h3>
                    {meta.icon} {a.title}
                    {a.is_pinned && <span className="badge badge-warning" style={{ marginLeft: '8px' }}><Pin size={14} /> Pinned</span>}
                  </h3>
                  <div className="announcement-meta">
                    <span className={`badge ${meta.className}`}>{a.announcement_type}</span>
                    <span className="badge badge-info">{a.audience}</span>
                  </div>
                </div>
                <p className="announcement-content">{a.content}</p>
                <div className="announcement-footer">
                  <span>{a.published_by_name || 'Admin'} · {formatDateTime(a.created_at)}</span>
                  {canManage && (
                    <div className="action-buttons">
                      <button className="action-btn view" title={a.is_pinned ? 'Unpin' : 'Pin to top'} onClick={() => togglePin(a)}><Pin size={16} /></button>
                      <button
                        className="action-btn edit"
                        title="Edit"
                        onClick={() => setFormModal({
                          open: true, editing: a,
                          form: {
                            title: a.title, content: a.content,
                            announcementType: a.announcement_type, audience: a.audience, isPinned: !!a.is_pinned
                          }
                        })}
                      ><Edit size={16} /></button>
                      <button className="action-btn delete" title="Delete" onClick={() => handleDelete(a)}><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, editing: null, form: emptyForm() })}
        title={formModal.editing ? 'Edit Announcement' : 'New Announcement'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setFormModal({ open: false, editing: null, form: emptyForm() })}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {formModal.editing ? <><Edit size={16} /> Save Changes</> : <><Megaphone size={16} /> Publish</>}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Exam schedule released"
            value={formModal.form.title}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, title: e.target.value } }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Content *</label>
          <textarea
            className="form-input"
            rows="4"
            placeholder="Full announcement text..."
            value={formModal.form.content}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, content: e.target.value } }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select
            className="form-select"
            value={formModal.form.announcementType}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, announcementType: e.target.value } }))}
          >
            {Object.keys(TYPE_META).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Audience</label>
          <select
            className="form-select"
            value={formModal.form.audience}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, audience: e.target.value } }))}
          >
            {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={formModal.form.isPinned}
              onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, isPinned: e.target.checked } }))}
            />
            <span>Pin to top</span>
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default Announcements;
