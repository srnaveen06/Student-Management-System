import { useState, useEffect } from 'react';

// Current logged-in user object (from localStorage)
export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('admin');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

// Persist the updated logged-in user object to localStorage
// and notify subscribers so the UI updates immediately.
export const setCurrentUser = (user) => {
  localStorage.setItem('admin', JSON.stringify(user));
  window.dispatchEvent(new Event('current-user-changed'));
};

// Reactive hook — re-renders when the current user changes in localStorage
export const useCurrentUser = () => {
  const [user, setUser] = useState(getCurrentUser);

  useEffect(() => {
    const handleChange = () => setUser(getCurrentUser());
    window.addEventListener('current-user-changed', handleChange);
    return () => window.removeEventListener('current-user-changed', handleChange);
  }, []);

  return user;
};

export const getAssetUrl = (fileName) => {
  const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  return fileName ? `${base}/uploads/${fileName}` : null;
};

export const hasRole = (...allowedRoles) => {
  const user = getCurrentUser();
  if (!user) return false;
  const role = (user.role || user.adminRole || 'admin').toLowerCase();
  return allowedRoles.map(r => r.toLowerCase()).includes(role);
};

export const isSuperAdmin = () => hasRole('super_admin');
export const isAdmin = () => hasRole('super_admin', 'admin');
export const isTeacher = () => hasRole('teacher');
export const isAccountant = () => hasRole('accountant');