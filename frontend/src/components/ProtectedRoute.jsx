import React from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';

// ProtectedRoute — redirects to login if user is not authenticated.
// If `roles` is provided, only those roles can access the page.
const ProtectedRoute = ({ children, roles }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0) {
    const user = getCurrentUser();
    const role = (user?.role || user?.adminRole || 'admin').toLowerCase();
    if (!roles.map(r => r.toLowerCase()).includes(role)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
