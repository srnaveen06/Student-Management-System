import React, { useState, useEffect } from 'react';
import { InlineLoader } from '../../components/Loader/Loader';
import aiApi from '../../services/aiApi';
import { formatDateTime } from '../../utils/format';
import { intentLabel } from '../../utils/ai';

const AIActivity = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);

  const load = async (n = limit) => {
    setLoading(true);
    try {
      const data = await aiApi.activity(n);
      setLogs(data.logs || []);
    } catch (error) {
      // handled by caller
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(limit); }, [limit]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Activity Log</h1>
          <p>Audit trail for every AI request. Prompts are truncated; secrets are never stored.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select className="form-select" value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={{ width: '120px' }}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <button className="btn btn-outline btn-sm" onClick={() => load()}>↺ Refresh</button>
        </div>
      </div>

      {loading ? <InlineLoader /> : logs.length === 0 ? (
        <p className="muted-center">No AI activity recorded.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th><th>User</th><th>Feature</th><th>Prompt</th><th>Status</th><th>Model</th><th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td>{log.username} <span className="text-muted">({log.role})</span></td>
                  <td><span className="ai-chip">{intentLabel(log.feature)}</span></td>
                  <td title={log.error || ''}>
                    {log.prompt ? (log.prompt.length > 60 ? `${log.prompt.slice(0, 60)}…` : log.prompt) : '—'}
                    {log.error && <div className="text-muted" style={{ fontSize: '11px', color: 'var(--danger)' }}>{String(log.error).slice(0, 80)}</div>}
                  </td>
                  <td><span className={`ai-chip ${log.status === 'error' ? 'ai-chip-danger' : 'ai-chip-success'}`}>{log.status}</span></td>
                  <td>{log.model || '—'}</td>
                  <td>{log.latency_ms != null ? `${log.latency_ms}ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AIActivity;
