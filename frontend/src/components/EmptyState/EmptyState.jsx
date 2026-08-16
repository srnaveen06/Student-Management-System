import React from 'react';

const EmptyState = ({ icon = '📭', title = 'Nothing here yet', message, action }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon}</div>
    <h3>{title}</h3>
    {message && <p>{message}</p>}
    {action && <div className="empty-state-action">{action}</div>}
  </div>
);

export default EmptyState;
