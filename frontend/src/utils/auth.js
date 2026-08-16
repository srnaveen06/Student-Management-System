// Current logged-in user object (from localStorage)
export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('admin');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
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
