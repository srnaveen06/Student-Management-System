import React, { useState, useEffect, useCallback } from 'react';
import Pagination from '../components/Pagination/Pagination';
import notificationApi from '../services/notificationApi';
import { useToast } from '../context/ToastContext';
import { timeAgo } from '../utils/format';

const NotificationIcon = ({ type }) => {
  switch (type) {
    case 'success': return '✅';
    case 'warning': return '⚠️';
    case 'danger': return '⛔';
    case 'info': return 'ℹ️';
    default: return '🔔';
  }
};

const Notifications = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.getNotifications({ page, limit: 20 });
      if (res.success) {
        setNotifications(res.notifications || []);
        setPagination({ total: res.total || 0, page: res.page || 1, totalPages: res.totalPages || 1 });
        setUnread(res.unread || 0);
      }
    } catch (error) {
      toast.error('Failed to load notifications');
    }
  }, [page, toast]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (n) => {
    if (n.is_read) return;
    try {
      await notificationApi.markRead(n.id);
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      toast.success('All notifications marked as read');
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const remove = async (n) => {
    try {
      await notificationApi.deleteNotification(n.id);
      toast.success('Notification deleted');
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>{unread > 0 ? `${unread} unread notification(s)` : 'All caught up!'}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={markAllRead} disabled={unread === 0}>
          ✅ Mark All Read
        </button>
      </div>

      <div className="notification-list">
        {notifications.length === 0 && <p className="muted-center">No notifications yet</p>}
        {notifications.map(n => (
          <div
            key={n.id}
            className={`notification-item ${n.is_read ? '' : 'unread'}`}
            onClick={() => markRead(n)}
          >
            <div className="notification-icon"><NotificationIcon type={n.type} /></div>
            <div className="notification-body">
              <h4>{n.title}</h4>
              <p>{n.message}</p>
              <span className="text-muted">{timeAgo(n.created_at)}</span>
            </div>
            {!n.is_read && <span className="notification-dot" />}
            <button
              className="btn btn-icon"
              title="Delete"
              onClick={(e) => { e.stopPropagation(); remove(n); }}
            >🗑</button>
          </div>
        ))}
      </div>

      <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
    </div>
  );
};

export default Notifications;
