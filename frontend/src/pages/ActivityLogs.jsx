import React, { useState, useEffect, useCallback } from 'react';
import { InlineLoader } from '../components/Loader/Loader';
import Pagination from '../components/Pagination/Pagination';
import activityApi from '../services/activityApi';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../utils/format';

const ActionBadge = ({ action }) => {
  let cls = 'badge-active';
  if (action.includes('delete')) cls = 'badge-inactive';
  else if (action.includes('create') || action.includes('add') || action.includes('assigned') || action.includes('received') || action.includes('import')) cls = 'badge-active';
  else if (action.includes('update') || action.includes('change') || action.includes('settings')) cls = 'badge-warning';
  return <span className={`badge ${cls}`}>{action.replace(/_/g, ' ')}</span>;
};

const ActivityLogs = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', action: '', username: '', dateFrom: '', dateTo: '', page: 1, limit: 20 });
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.action) params.action = filters.action;
      if (filters.username) params.username = filters.username;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      params.page = filters.page;
      params.limit = filters.limit;
      const res = await activityApi.getLogs(params);
      if (res.success) {
        setLogs(res.logs || []);
        setSummary(res.summary || null);
        setPagination({ total: res.total || 0, page: res.page || 1, totalPages: res.totalPages || 1 });
      }
    } catch (error) {
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const fetchActions = async () => {
    try {
      const res = await activityApi.getActions();
      if (res.success) setActions(res.data || []);
    } catch (error) {
      console.error('Failed to load actions');
    }
  };

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchActions(); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Activity Logs</h1>
          <p>Audit trail of all system actions</p>
        </div>
      </div>

      {summary && (
        <div className="dashboard-stats">
          <div className="stat-inline-card"><span>Total Actions</span><strong>{summary.total}</strong></div>
          <div className="stat-inline-card"><span>Additions</span><strong style={{ color: 'var(--success)' }}>{summary.additions}</strong></div>
          <div className="stat-inline-card"><span>Updates</span><strong style={{ color: 'var(--warning)' }}>{summary.updates}</strong></div>
          <div className="stat-inline-card"><span>Deletions</span><strong style={{ color: 'var(--danger)' }}>{summary.deletions}</strong></div>
        </div>
      )}

      <div className="filter-bar filter-bar-wrap">
        <input className="form-input" placeholder="Search user or description..." value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))} style={{ flex: 1, minWidth: '180px' }} />
        <select className="form-select" value={filters.action} onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value, page: 1 }))}>
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <input className="form-select" placeholder="Username" value={filters.username} onChange={(e) => setFilters(prev => ({ ...prev, username: e.target.value, page: 1 }))} />
        <input type="date" className="form-select" value={filters.dateFrom} onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value, page: 1 }))} />
        <input type="date" className="form-select" value={filters.dateTo} onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value, page: 1 }))} />
      </div>

      {loading ? (
        <InlineLoader />
      ) : (
        <>
          <div className="table-container">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Action</th>
                    <th>Description</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td><strong>{log.username}</strong></td>
                      <td><ActionBadge action={log.action} /></td>
                      <td>{log.description}</td>
                      <td>{formatDateTime(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span className="table-info">Showing {logs.length} of {pagination.total} logs</span>
            </div>
          </div>
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))} />
        </>
      )}
    </div>
  );
};

export default ActivityLogs;
