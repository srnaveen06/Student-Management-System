import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({ icon, title = 'Nothing here yet', message, action }) => (
  <div className="empty-state">
    <div className="empty-state-icon">
      {icon || <Inbox size={28} />}
    </div>
    <h3>{title}</h3>
    {message && <p>{message}</p>}
    {action && <div className="empty-state-action">{action}</div>}
  </div>
);

export default EmptyState;
