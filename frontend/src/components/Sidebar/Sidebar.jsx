import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ isOpen, onClose }) => {
  // Navigation items with icons (using Unicode symbols as simple icons)
  const navItems = [
    { label: 'Dashboard', path: '/', icon: '📊' },
    { label: 'Students', path: '/students', icon: '👥' },
    { label: 'Add Student', path: '/students/add', icon: '➕' },
  ];

  const bottomItems = [
    { label: 'Reports', path: '/reports', icon: '📈' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  return (
    <>
      {/* Overlay — visible on tablet/mobile when sidebar is open */}
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Close button for mobile */}
        <button className="sidebar-close" onClick={onClose}>×</button>

        {/* Logo section */}
        <div className="sidebar-header">
          <div className="sidebar-logo">S</div>
          <div>
            <div className="sidebar-title">SMS</div>
            <div className="sidebar-subtitle">Student Management</div>
          </div>
        </div>

        {/* Main navigation */}
        <div className="sidebar-nav">
          <div className="sidebar-nav-label">Main Menu</div>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}

          {/* Bottom navigation */}
          <div className="sidebar-nav-label" style={{ marginTop: '24px' }}>
            Other
          </div>
          {bottomItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
