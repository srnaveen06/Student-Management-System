import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/PageHeader/PageHeader';
import { InlineLoader } from '../components/Loader/Loader';
import Modal from '../components/Modal/Modal';
import EmptyState from '../components/EmptyState/EmptyState';
import Pagination from '../components/Pagination/Pagination';
import calendarApi from '../services/calendarApi';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';
import { isAdmin } from '../utils/auth';

const TYPE_COLORS = {
  Exam: 'event-chip-exam',
  Holiday: 'event-chip-holiday',
  Cultural: 'event-chip-cultural',
  Seminar: 'event-chip-seminar',
  Workshop: 'event-chip-workshop',
  Sports: 'event-chip-sports',
  Other: 'event-chip-seminar'
};

const TYPE_ICONS = {
  Exam: '📝', Holiday: '🎉', Cultural: '🎭', Seminar: '💬', Workshop: '🛠', Sports: '🏆', Other: '📌'
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const toISODate = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const emptyForm = () => ({
  title: '', eventType: 'Other', startDate: '', endDate: '',
  branch: '', semester: '', location: '', description: '', status: 'Active'
});

const AcademicCalendar = () => {
  const { toast } = useToast();
  const canManage = isAdmin();

  // Calendar month navigation
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Data
  const [events, setEvents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // List filters
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  // Modals
  const [formModal, setFormModal] = useState({ open: false, editing: null, form: emptyForm() });
  const [detailEvent, setDetailEvent] = useState(null);

  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd = new Date(viewYear, viewMonth + 1, 0);

  // Events visible in the current month view
  const monthEvents = events.filter(e => {
    const start = new Date(e.start_date);
    const end = e.end_date ? new Date(e.end_date) : start;
    return start <= monthEnd && end >= monthStart;
  });

  const fetchMonthEvents = useCallback(async () => {
    setLoading(true);
    const start = new Date(viewYear, viewMonth, 1);
    const end = new Date(viewYear, viewMonth + 1, 0);
    try {
      const res = await calendarApi.getRange({ from: toISODate(start), to: toISODate(end) });
      if (res.success) setEvents(res.data);
    } catch (error) {
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [viewYear, viewMonth, toast]);

  useEffect(() => { fetchMonthEvents(); }, [fetchMonthEvents]);

  useEffect(() => {
    studentApi.getBranches().then(res => {
      if (res.success) setBranches(res.data);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build the 6x7 grid cells for the month view
  const buildCells = () => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const cells = [];
    const gridStart = new Date(viewYear, viewMonth, 1 - firstDay);
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      cells.push(d);
    }
    return cells;
  };

  const eventsForDate = (d) => {
    const key = toISODate(d);
    return monthEvents.filter(e => {
      const s = new Date(e.start_date);
      const end = e.end_date ? new Date(e.end_date) : s;
      const ek = toISODate(new Date(s.getFullYear(), s.getMonth(), s.getDate()));
      const ekEnd = toISODate(new Date(end.getFullYear(), end.getMonth(), end.getDate()));
      return key >= ek && key <= ekEnd;
    });
  };

  const changeMonth = (delta) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const goToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
  };

  const openCreate = () => setFormModal({ open: true, editing: null, form: emptyForm() });
  const openEdit = (ev) => setFormModal({
    open: true, editing: ev,
    form: {
      title: ev.title, eventType: ev.event_type, startDate: ev.start_date,
      endDate: ev.end_date || '', branch: ev.branch || '', semester: ev.semester || '',
      location: ev.location || '', description: ev.description || '', status: ev.status
    }
  });

  const handleSave = async () => {
    const f = formModal.form;
    if (!f.title || !f.startDate) {
      toast.error('Title and start date are required');
      return;
    }
    if (f.endDate && f.endDate < f.startDate) {
      toast.error('End date cannot be before start date');
      return;
    }
    const payload = {
      title: f.title, eventType: f.eventType, startDate: f.startDate,
      endDate: f.endDate, branch: f.branch, semester: f.semester,
      location: f.location, description: f.description, status: f.status
    };
    try {
      if (formModal.editing) {
        await calendarApi.updateEvent(formModal.editing.id, payload);
        toast.success('Event updated');
      } else {
        await calendarApi.createEvent(payload);
        toast.success('Event created');
      }
      setFormModal({ open: false, editing: null, form: emptyForm() });
      fetchMonthEvents();
      setPage(1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save event');
    }
  };

  const handleDelete = async (ev) => {
    if (!window.confirm(`Delete event "${ev.title}"?`)) return;
    try {
      await calendarApi.deleteEvent(ev.id);
      toast.success('Event deleted');
      setDetailEvent(null);
      fetchMonthEvents();
      setPage(1);
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  // Load the list when filters change
  useEffect(() => {
    const loadList = async () => {
      try {
        const res = await calendarApi.getEvents({
          search, eventType, branch, semester, month: (viewMonth + 1).toString(), status, page, limit: 8
        });
        if (res.success) setPagination({ total: res.total, page: res.page, totalPages: res.totalPages });
      } catch (error) {
        toast.error('Failed to load event list');
      }
    };
    loadList();
  }, [search, eventType, branch, semester, status, page, viewMonth, toast]);

  const cellDays = buildCells();
  const todayKey = toISODate(today);

  return (
    <div>
      <PageHeader
        title="📅 Academic Calendar"
        subtitle="Plan and track college events, exams and holidays"
        actions={canManage && (
          <button className="btn btn-primary" onClick={openCreate}>➕ Add Event</button>
        )}
      />

      {/* Month navigation */}
      <div className="calendar-toolbar">
        <div className="calendar-month-nav">
          <button className="btn btn-outline btn-sm" onClick={() => changeMonth(-1)}>←</button>
          <button className="btn btn-outline btn-sm" onClick={goToday}>Today</button>
          <button className="btn btn-outline btn-sm" onClick={() => changeMonth(1)}>→</button>
          <span className="calendar-month-title">{MONTHS[viewMonth]} {viewYear}</span>
        </div>
        <div className="calendar-legend">
          {Object.keys(TYPE_COLORS).map(t => (
            <span className="calendar-legend-item" key={t}>
              <span className={`event-type-dot ${TYPE_COLORS[t]}`} style={{ background: 'currentColor' }} />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Month grid */}
      <div className="calendar-grid">
        {WEEKDAYS.map(d => <div className="calendar-weekday" key={d}>{d}</div>)}
        {cellDays.map((d, i) => {
          const key = toISODate(d);
          const isOther = d.getMonth() !== viewMonth;
          const isToday = key === todayKey;
          const dayEvents = eventsForDate(d);
          return (
            <div className={`calendar-cell ${isOther ? 'other-month' : ''} ${isToday ? 'today' : ''}`} key={i}>
              <span className="calendar-cell-date">{d.getDate()}</span>
              {dayEvents.slice(0, 3).map(e => (
                <button
                  key={e.id}
                  className={`calendar-chip ${TYPE_COLORS[e.event_type] || 'event-chip-seminar'}`}
                  title={`${e.title} · ${formatDate(e.start_date)}`}
                  onClick={() => setDetailEvent(e)}
                >
                  {TYPE_ICONS[e.event_type] || '📌'} {e.title}
                </button>
              ))}
              {dayEvents.length > 3 && (
                <span className="calendar-cell-date" style={{ fontSize: '10px' }}>+{dayEvents.length - 3} more</span>
              )}
            </div>
          );
        })}
      </div>

      {loading && <InlineLoader />}

      {/* Events list for this month */}
      <div className="dashboard-section" style={{ marginTop: '24px' }}>
        <div className="dashboard-section-header">
          <h2>Events in {MONTHS[viewMonth]} {viewYear}</h2>
        </div>
        <div className="dashboard-section-body">
          <div className="filter-bar-wrap" style={{ marginBottom: '16px' }}>
            <div className="filter-bar">
              <input
                type="text"
                className="form-input"
                placeholder="Search events..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <select className="form-select" value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }}>
                <option value="">All Types</option>
                {Object.keys(TYPE_ICONS).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="form-select" value={branch} onChange={(e) => { setBranch(e.target.value); setPage(1); }}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select className="form-select" value={semester} onChange={(e) => { setSemester(e.target.value); setPage(1); }}>
                <option value="">All Semesters</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
              <select className="form-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {events.length === 0 ? (
            <EmptyState icon="🗓" title="No events this month" message="Create an event to get started" />
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Branch / Sem</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id}>
                      <td>
                        <button className="student-name-link" onClick={() => setDetailEvent(e)}>{e.title}</button>
                      </td>
                      <td><span className="badge badge-info">{TYPE_ICONS[e.event_type] || '📌'} {e.event_type}</span></td>
                      <td>{formatDate(e.start_date)}{e.end_date && e.end_date !== e.start_date ? ` → ${formatDate(e.end_date)}` : ''}</td>
                      <td>{e.branch || 'All'}{e.semester ? ` · Sem ${e.semester}` : ''}</td>
                      <td>{e.location || '—'}</td>
                      <td><span className={`badge ${e.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>{e.status}</span></td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn view" title="View" onClick={() => setDetailEvent(e)}>👁</button>
                          {canManage && (
                            <>
                              <button className="action-btn edit" title="Edit" onClick={() => openEdit(e)}>✏️</button>
                              <button className="action-btn delete" title="Delete" onClick={() => handleDelete(e)}>🗑</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, editing: null, form: emptyForm() })}
        title={formModal.editing ? 'Edit Event' : 'Add Event'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setFormModal({ open: false, editing: null, form: emptyForm() })}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{formModal.editing ? '💾 Save Changes' : '➕ Create Event'}</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Event Title *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Mid-Semester Exams"
            value={formModal.form.title}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, title: e.target.value } }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Event Type</label>
          <select
            className="form-select"
            value={formModal.form.eventType}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, eventType: e.target.value } }))}
          >
            {Object.keys(TYPE_ICONS).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Start Date *</label>
          <input
            type="date"
            className="form-input"
            value={formModal.form.startDate}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, startDate: e.target.value } }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">End Date (optional)</label>
          <input
            type="date"
            className="form-input"
            value={formModal.form.endDate}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, endDate: e.target.value } }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Branch (blank = all)</label>
          <select
            className="form-select"
            value={formModal.form.branch}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, branch: e.target.value } }))}
          >
            <option value="">All Branches</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Semester (blank = all)</label>
          <select
            className="form-select"
            value={formModal.form.semester}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, semester: e.target.value } }))}
          >
            <option value="">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Main Auditorium"
            value={formModal.form.location}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, location: e.target.value } }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-input"
            rows="3"
            placeholder="Event details..."
            value={formModal.form.description}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, description: e.target.value } }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select
            className="form-select"
            value={formModal.form.status}
            onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, status: e.target.value } }))}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailEvent}
        onClose={() => setDetailEvent(null)}
        title="Event Details"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDetailEvent(null)}>Close</button>
            {canManage && detailEvent && (
              <>
                <button className="btn btn-primary" onClick={() => { const e = detailEvent; setDetailEvent(null); openEdit(e); }}>✏️ Edit</button>
                <button className="btn btn-danger" onClick={() => handleDelete(detailEvent)}>🗑 Delete</button>
              </>
            )}
          </>
        }
      >
        {detailEvent && (
          <>
            <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: '8px' }}>
              {TYPE_ICONS[detailEvent.event_type] || '📌'} {detailEvent.title}
            </h3>
            <div className="quick-stat-item">
              <span className="quick-stat-label">Type</span>
              <span className="quick-stat-value"><span className={`badge ${TYPE_COLORS[detailEvent.event_type]}`}>{detailEvent.event_type}</span></span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label">Date</span>
              <span className="quick-stat-value">
                {formatDate(detailEvent.start_date)}
                {detailEvent.end_date && detailEvent.end_date !== detailEvent.start_date ? ` → ${formatDate(detailEvent.end_date)}` : ''}
              </span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label">Branch / Semester</span>
              <span className="quick-stat-value">{detailEvent.branch || 'All'}{detailEvent.semester ? ` · Sem ${detailEvent.semester}` : ''}</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label">Location</span>
              <span className="quick-stat-value">{detailEvent.location || '—'}</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label">Status</span>
              <span className="quick-stat-value"><span className={`badge ${detailEvent.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>{detailEvent.status}</span></span>
            </div>
            {detailEvent.description && (
              <div style={{ marginTop: '12px' }}>
                <div className="view-detail-label" style={{ marginBottom: '4px' }}>Description</div>
                <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'pre-wrap' }}>{detailEvent.description}</p>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default AcademicCalendar;
