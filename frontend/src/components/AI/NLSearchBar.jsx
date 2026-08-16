import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import aiApi from '../../services/aiApi';
import { useToast } from '../../context/ToastContext';
import { intentLabel } from '../../utils/ai';

// Natural-language search bar with inline results.
const NLSearchBar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = async (q) => {
    const text = (q !== undefined ? q : query).trim();
    if (!text) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await aiApi.search(text);
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Search failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') run();
  };

  return (
    <div style={{ flex: 1, minWidth: 260 }}>
      <div className="ai-search-bar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Try: computer science students above 8 cgpa, female electronics students, sem 3 students…"
        />
        <span className="ai-search-icon">✨</span>
      </div>

      <div className="ai-search-results">
        {loading && <p className="text-muted" style={{ fontSize: '13px' }}>Searching…</p>}
        {error && <p className="text-muted" style={{ fontSize: '13px', color: 'var(--danger)' }}>{error}</p>}

        {result && (
          <div>
            <div className="ai-search-meta">
              <span><span className="ai-chip">{intentLabel(result.intent)}</span> {result.message}</span>
              {result.total > 0 && <span className="ai-chip ai-chip-info">{result.total} result(s)</span>}
            </div>
            {result.results?.length > 0 && (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th><th>Name</th><th>Branch</th><th>Sem</th><th>CGPA</th><th>Status</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map(st => (
                      <tr key={st.id}>
                        <td>{st.studentId}</td>
                        <td>{st.name}</td>
                        <td>{st.branch}</td>
                        <td>{st.semester}</td>
                        <td>{st.cgpa}</td>
                        <td><span className={`badge badge-${String(st.status).toLowerCase()}`}>{st.status}</span></td>
                        <td>
                          <button className="action-btn view" title="View profile" onClick={() => navigate(`/students/profile/${st.id}`)}>👁</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NLSearchBar;
