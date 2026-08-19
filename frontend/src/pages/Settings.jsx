import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Palette, Sun, Moon, Lock, Clock, LogOut, Building2, Save, Users, Plus, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal/Modal';
import authApi from '../services/authApi';
import settingsApi from '../services/settingsApi';
import { getCurrentUser } from '../utils/auth';
import { formatDateTime } from '../utils/format';

const ROLE_LABELS = { super_admin: 'Super Admin', admin: 'Admin', teacher: 'Teacher', accountant: 'Accountant' };

const Settings = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const admin = getCurrentUser();
  const isSuperAdmin = (admin?.role || admin?.adminRole || 'admin') === 'super_admin';
  const canEditSettings = isSuperAdmin || (admin?.role || 'admin') === 'admin';

  // Change password form
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // College settings
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // User management
  const [users, setUsers] = useState([]);
  const [userModal, setUserModal] = useState({ open: false, form: { username: '', password: '', role: 'teacher', name: '', email: '' } });

  useEffect(() => {
    settingsApi.getSettings().then(res => {
      if (res.success) setSettings(res.data || {});
    }).catch(() => {});
    if (isSuperAdmin) {
      authApi.getUsers().then(res => {
        if (res.success) setUsers(res.data || []);
      }).catch(() => {});
    }
  }, [isSuperAdmin]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.currentPassword) newErrors.currentPassword = 'Current password is required';
    if (!form.newPassword) newErrors.newPassword = 'New password is required';
    else if (form.newPassword.length < 6) newErrors.newPassword = 'New password must be at least 6 characters';
    if (!form.confirmPassword) newErrors.confirmPassword = 'Please confirm your new password';
    else if (form.confirmPassword !== form.newPassword) newErrors.confirmPassword = 'Passwords do not match';

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const response = await authApi.changePassword(form.currentPassword, form.newPassword);
      if (response.success) {
        toast.success(response.message || 'Password changed successfully');
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await settingsApi.updateSettings(settings);
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const setSetting = (key, value) => setSettings(prev => ({ ...(prev || {}), [key]: value }));

  const createUser = async () => {
    const f = userModal.form;
    if (!f.username || !f.password || !f.role) {
      toast.error('Username, password and role are required');
      return;
    }
    try {
      await authApi.createUser(f);
      toast.success('User created');
      setUserModal({ open: false, form: { username: '', password: '', role: 'teacher', name: '', email: '' } });
      const res = await authApi.getUsers();
      if (res.success) setUsers(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const changeRole = async (user, role) => {
    if (!window.confirm(`Change ${user.username}'s role to ${ROLE_LABELS[role]}?`)) return;
    try {
      await authApi.changeRole(user.id, role);
      toast.success('Role updated');
      const res = await authApi.getUsers();
      if (res.success) setUsers(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update role');
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete user "${user.username}"?`)) return;
    try {
      await authApi.deleteUser(user.id);
      toast.success('User deleted');
      const res = await authApi.getUsers();
      if (res.success) setUsers(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    toast.info('Logged out');
    navigate('/login');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your account, application preferences and users.</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Profile */}
        <div className="dashboard-section">
          <div className="dashboard-section-header"><h2><User size={18} /> Profile</h2></div>
          <div className="dashboard-section-body">
            <div className="profile-card">
              <div className="profile-avatar">
                {(admin?.name || admin?.username || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="profile-info">
                <h3>{admin?.name || admin?.username || 'Admin'}</h3>
                <p>{ROLE_LABELS[admin?.role] || 'Administrator'}</p>
              </div>
            </div>
            <div className="view-detail-item" style={{ marginTop: 'var(--space-lg)' }}>
              <span className="view-detail-label">Username</span>
              <span className="view-detail-value">{admin?.username || 'admin'}</span>
            </div>
            <div className="view-detail-item">
              <span className="view-detail-label">Email</span>
              <span className="view-detail-value">{admin?.email || '—'}</span>
            </div>
            <div className="view-detail-item">
              <span className="view-detail-label">Role</span>
              <span className="view-detail-value">{ROLE_LABELS[admin?.role] || 'Administrator'}</span>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="dashboard-section">
          <div className="dashboard-section-header"><h2><Palette size={18} /> Appearance</h2></div>
          <div className="dashboard-section-body">
            <p className="settings-desc">Choose how the application looks for you.</p>
            <div className="theme-options">
              <button className={`theme-option ${theme === 'light' ? 'active' : ''}`} onClick={() => theme !== 'light' && toggleTheme()}>
                <span className="theme-option-icon"><Sun size={18} /></span>
                <span className="theme-option-label">Light Mode</span>
              </button>
              <button className={`theme-option ${theme === 'dark' ? 'active' : ''}`} onClick={() => theme !== 'dark' && toggleTheme()}>
                <span className="theme-option-icon"><Moon size={18} /></span>
                <span className="theme-option-label">Dark Mode</span>
              </button>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="dashboard-section">
          <div className="dashboard-section-header"><h2><Lock size={18} /> Change Password</h2></div>
          <div className="dashboard-section-body">
            <form onSubmit={handleChangePassword} className="settings-form">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" name="currentPassword" className={`form-input ${errors.currentPassword ? 'error' : ''}`} placeholder="Enter current password" value={form.currentPassword} onChange={handleChange} autoComplete="current-password" />
                {errors.currentPassword && <span className="form-error">{errors.currentPassword}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" name="newPassword" className={`form-input ${errors.newPassword ? 'error' : ''}`} placeholder="Enter new password" value={form.newPassword} onChange={handleChange} autoComplete="new-password" />
                {errors.newPassword && <span className="form-error">{errors.newPassword}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" name="confirmPassword" className={`form-input ${errors.confirmPassword ? 'error' : ''}`} placeholder="Confirm new password" value={form.confirmPassword} onChange={handleChange} autoComplete="new-password" />
                {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
              </div>
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 'var(--space-md)' }} disabled={loading}>
                {loading ? <><Clock size={16} /> Updating...</> : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Account */}
        <div className="dashboard-section">
          <div className="dashboard-section-header"><h2><LogOut size={18} /> Account</h2></div>
          <div className="dashboard-section-body">
            <p className="settings-desc">Sign out of your account. You will need to log in again.</p>
            <button className="btn btn-danger" onClick={handleLogout} style={{ justifyContent: 'center' }}>Logout</button>
          </div>
        </div>
      </div>

      {/* College Settings */}
      {canEditSettings && (
        <div className="dashboard-section" style={{ marginTop: 'var(--space-lg)' }}>
          <div className="dashboard-section-header">
            <h2><Building2 size={18} /> College Settings</h2>
            <button className="btn btn-primary btn-sm" onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? <><Clock size={16} /> Saving...</> : <><Save size={16} /> Save Settings</>}
            </button>
          </div>
          <div className="dashboard-section-body">
            {!settings ? (
              <p className="muted-center">Loading...</p>
            ) : (
              <div className="settings-form-grid">
                <div className="form-group">
                  <label className="form-label">College Name</label>
                  <input className="form-input" value={settings.college_name || ''} onChange={(e) => setSetting('college_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">College Address</label>
                  <input className="form-input" value={settings.college_address || ''} onChange={(e) => setSetting('college_address', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">College Phone</label>
                  <input className="form-input" value={settings.college_phone || ''} onChange={(e) => setSetting('college_phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">College Email</label>
                  <input className="form-input" value={settings.college_email || ''} onChange={(e) => setSetting('college_email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">College Website</label>
                  <input className="form-input" value={settings.college_website || ''} onChange={(e) => setSetting('college_website', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Academic Year</label>
                  <input className="form-input" placeholder="e.g. 2025-2026" value={settings.academic_year || ''} onChange={(e) => setSetting('academic_year', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Principal Name</label>
                  <input className="form-input" value={settings.principal_name || ''} onChange={(e) => setSetting('principal_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Affiliation Number</label>
                  <input className="form-input" value={settings.affiliation_no || ''} onChange={(e) => setSetting('affiliation_no', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Attendance Threshold (%)</label>
                  <input type="number" className="form-input" value={settings.attendance_threshold || 75} onChange={(e) => setSetting('attendance_threshold', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fee Due Reminder (days)</label>
                  <input type="number" className="form-input" value={settings.fee_due_reminder_days || 7} onChange={(e) => setSetting('fee_due_reminder_days', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Management */}
      {isSuperAdmin && (
        <div className="dashboard-section" style={{ marginTop: 'var(--space-lg)' }}>
          <div className="dashboard-section-header">
            <h2><Users size={18} /> User Management</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setUserModal({ open: true, form: { username: '', password: '', role: 'teacher', name: '', email: '' } })}>
              <Plus size={16} /> Add User
            </button>
          </div>
          <div className="dashboard-section-body">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td><strong>{user.username}</strong>{user.username === admin?.username && ' (you)'}</td>
                      <td>{user.name || '—'}</td>
                      <td>{user.email || '—'}</td>
                      <td>
                        <select
                          className="form-select"
                          value={user.role}
                          disabled={user.username === admin?.username}
                          onChange={(e) => changeRole(user, e.target.value)}
                        >
                          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                      <td>{user.last_login ? formatDateTime(user.last_login) : 'Never'}</td>
                      <td>
                        {user.username !== admin?.username && (
                          <button className="btn btn-sm btn-danger" onClick={() => deleteUser(user)}><Trash2 size={16} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={userModal.open}
        onClose={() => setUserModal({ open: false, form: { username: '', password: '', role: 'teacher', name: '', email: '' } })}
        title="Add User"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setUserModal({ open: false, form: { username: '', password: '', role: 'teacher', name: '', email: '' } })}>Cancel</button>
            <button className="btn btn-primary" onClick={createUser}>Create User</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Username *</label>
          <input className="form-input" value={userModal.form.username} onChange={(e) => setUserModal(prev => ({ ...prev, form: { ...prev.form, username: e.target.value } }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Password *</label>
          <input type="password" className="form-input" value={userModal.form.password} onChange={(e) => setUserModal(prev => ({ ...prev, form: { ...prev.form, password: e.target.value } }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Role *</label>
          <select className="form-select" value={userModal.form.role} onChange={(e) => setUserModal(prev => ({ ...prev, form: { ...prev.form, role: e.target.value } }))}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" value={userModal.form.name} onChange={(e) => setUserModal(prev => ({ ...prev, form: { ...prev.form, name: e.target.value } }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" value={userModal.form.email} onChange={(e) => setUserModal(prev => ({ ...prev, form: { ...prev.form, email: e.target.value } }))} />
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
