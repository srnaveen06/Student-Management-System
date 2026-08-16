import React from 'react';
import { useNavigate } from 'react-router-dom';

// Renders a list of AI insights (type, metrics, students, action link).
const InsightsList = ({ insights = [] }) => {
  const navigate = useNavigate();

  if (insights.length === 0) {
    return <p className="muted-center">No insights available.</p>;
  }

  return (
    <div className="insight-list">
      {insights.map(ins => (
        <div key={ins.id} className={`insight-item ${ins.type || 'info'}`}>
          <div className="insight-title">{ins.title}</div>
          <div className="insight-desc">{ins.description}</div>

          {ins.metrics && (
            <div className="insight-metrics">
              {Object.entries(ins.metrics).map(([label, value]) => (
                <span key={label} className="insight-metric">
                  {label}: <strong>{value}</strong>
                </span>
              ))}
            </div>
          )}

          {ins.students?.length > 0 && (
            <div className="insight-students">
              {ins.students.map(name => (
                <span key={name} className="ai-chip ai-chip-muted">{name}</span>
              ))}
            </div>
          )}

          {ins.action && (
            <div style={{ marginTop: '10px' }}>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => navigate(ins.action.to)}
              >
                {ins.action.label} →
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default InsightsList;
