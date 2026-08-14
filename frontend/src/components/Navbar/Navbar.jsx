import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const Navbar = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Get admin info from localStorage
  const admin = JSON.parse(localStorage.getItem('admin'));

  // Handle logout — clear storage and redirect to login
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {/* Hamburger menu button — visible on tablet/mobile */}
        <button className="menu-toggle" onClick={onMenuToggle}>
          ☰
        </button>
      </div>

      <div className="navbar-right">
        {/* Dark/Light mode toggle */}
        <button className="navbar-theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* Admin user info */}
        <div className="navbar-user">
          <span>👤</span>
          <span>{admin?.username || 'Admin'}</span>
        </div>

        {/* Logout button */}
        <button className="navbar-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
