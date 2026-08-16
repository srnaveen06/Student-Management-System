import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentUser } from '../../utils/auth';
import notificationApi from '../../services/notificationApi';

const Navbar = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const admin = getCurrentUser();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await notificationApi.getUnreadCount();
        if (res.success) setUnread(res.data || 0);
      } catch (error) {
        // Ignore — server may not be ready during development
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          ☰
        </button>
      </div>

      <div className="navbar-right">
        <button className="navbar-theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* Notifications */}
        <Link to="/notifications" className="navbar-notification" title="Notifications">
          🔔
          {unread > 0 && <span className="navbar-notification-badge">{unread > 9 ? '9+' : unread}</span>}
        </Link>

        {/* User info */}
        <div className="navbar-user">
          <span>👤</span>
          <span>{admin?.name || admin?.username || 'Admin'}</span>
        </div>

        <button className="navbar-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
