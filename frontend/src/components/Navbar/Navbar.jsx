import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useProfile } from '../../context/ProfileContext';
import { useCurrentUser, getAssetUrl } from '../../utils/auth';
import notificationApi from '../../services/notificationApi';
import { Search, Bell, Sun, Moon, Menu, LogOut } from 'lucide-react';

const Navbar = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { openProfile } = useProfile();
  const admin = useCurrentUser();
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

  const userInitials = admin?.name
    ? admin.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (admin?.username || 'A').slice(0, 2).toUpperCase();

  const userRole = admin?.role ? admin.role.replace('_', ' ') : 'Administrator';

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="menu-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
          <Menu size={20} />
        </button>

        <div className="navbar-search">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search students, staff, reports..."
          />
        </div>
      </div>

      <div className="navbar-right">
        <button className="navbar-theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <Link to="/notifications" className="navbar-notification" title="Notifications">
          <Bell size={20} />
          {unread > 0 && (
            <span className="navbar-notification-badge">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        <button type="button" className="navbar-user-section" onClick={openProfile} title="Edit profile">
          <div className="navbar-user-avatar">
            {admin?.image ? (
              <img src={getAssetUrl(admin.image)} alt={admin?.name || 'Profile'} />
            ) : null}
            <span style={{ display: admin?.image ? 'none' : 'flex' }}>{userInitials}</span>
          </div>
          <div className="navbar-user-info">
            <span className="navbar-user-name">{admin?.name || admin?.username || 'Admin'}</span>
            <span className="navbar-user-role">{userRole}</span>
          </div>
        </button>

        <button className="navbar-logout" onClick={handleLogout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
