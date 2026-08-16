import React from 'react';
import { NavLink } from 'react-router-dom';
import { hasRole } from '../../utils/auth';

const Sidebar = ({ isOpen, onClose }) => {
  // Role-aware navigation items
  const navItems = [
    { label: 'Dashboard', path: '/', icon: '📊', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Students', path: '/students', icon: '👥', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Add Student', path: '/students/add', icon: '➕', roles: ['super_admin', 'admin'] },
    { label: 'Import Students', path: '/students/import', icon: '📥', roles: ['super_admin', 'admin'] },
    { label: 'Attendance', path: '/attendance', icon: '📅', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Fees', path: '/fees', icon: '💰', roles: ['super_admin', 'admin', 'accountant', 'teacher'] },
    { label: 'Courses & Subjects', path: '/courses', icon: '📚', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Examinations', path: '/examinations', icon: '📝', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Academic Calendar', path: '/calendar', icon: '🗓️', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Announcements', path: '/announcements', icon: '📢', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Leave Management', path: '/leaves', icon: '📝', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Student Documents', path: '/documents', icon: '📂', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'ID Cards', path: '/id-cards', icon: '🎫', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
  ];

  const bottomItems = [
    { label: 'Reports', path: '/reports', icon: '📈', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Notifications', path: '/notifications', icon: '🔔', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Activity Logs', path: '/activity-logs', icon: '🕓', roles: ['super_admin', 'admin'] },
    { label: 'Settings', path: '/settings', icon: '⚙️', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
  ];

  const aiItems = [
    { label: 'AI Assistant', path: '/ai/assistant', icon: '🤖', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'AI Search', path: '/ai/search', icon: '🔎', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'AI Insights', path: '/ai/insights', icon: '💡', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'AI Reports', path: '/ai/reports', icon: '📄', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'AI Questions', path: '/ai/questions', icon: '❓', roles: ['super_admin', 'admin', 'teacher'] },
    { label: 'TeacherAI', path: '/ai/teacher', icon: '🧑‍🏫', roles: ['super_admin', 'admin', 'teacher'] },
    { label: 'AI Intelligence', path: '/ai/intelligence', icon: '🧠', roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'AI Documents', path: '/ai/documents', icon: '📑', roles: ['super_admin', 'admin'] },
    { label: 'AI Activity', path: '/ai/activity', icon: '📜', roles: ['super_admin', 'admin'] },
    { label: 'AI Settings', path: '/ai/settings', icon: '🧪', roles: ['super_admin', 'admin'] },
  ];

  const filterByRole = (items) => items.filter(item => item.roles.some(r => hasRole(r)));
  const main = filterByRole(navItems);
  const other = filterByRole(bottomItems);
  const ai = filterByRole(aiItems);

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <button className="sidebar-close" onClick={onClose}>×</button>

        <div className="sidebar-header">
          <div className="sidebar-logo">S</div>
          <div>
            <div className="sidebar-title">SMS</div>
            <div className="sidebar-subtitle">College Management</div>
          </div>
        </div>

        <div className="sidebar-nav">
          <div className="sidebar-nav-label">Main Menu</div>
          {main.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}

          {other.length > 0 && (
            <>
              <div className="sidebar-nav-label" style={{ marginTop: '24px' }}>
                Other
              </div>
              {other.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              ))}
            </>
          )}

          {ai.length > 0 && (
            <>
              <div className="sidebar-nav-label" style={{ marginTop: '24px' }}>
                AI Platform
              </div>
              {ai.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
