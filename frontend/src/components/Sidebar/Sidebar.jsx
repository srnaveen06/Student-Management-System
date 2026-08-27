import React from 'react';
import { NavLink } from 'react-router-dom';
import { hasRole, getCurrentUser } from '../../utils/auth';
import {
  LayoutDashboard, Users, UserPlus, Download, CalendarCheck,
  Coins, BookOpen, FileText, CalendarDays, Megaphone,
  ClipboardList, FolderOpen, CreditCard, BarChart3,
  Bell, ScrollText, Settings, Bot, Search, Lightbulb,
  FileBarChart, HelpCircle, GraduationCap, Brain,
<<<<<<< HEAD
  FileStack, FlaskConical, LogOut
=======
  FileStack, Scroll, FlaskConical
>>>>>>> b763a579713ceb90b318ad65686ff6a60989c494
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const admin = getCurrentUser();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Students', path: '/students', icon: Users, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Add Student', path: '/students/add', icon: UserPlus, roles: ['super_admin', 'admin'] },
    { label: 'Import Students', path: '/students/import', icon: Download, roles: ['super_admin', 'admin'] },
    { label: 'Attendance', path: '/attendance', icon: CalendarCheck, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Fees', path: '/fees', icon: Coins, roles: ['super_admin', 'admin', 'accountant', 'teacher'] },
    { label: 'Courses & Subjects', path: '/courses', icon: BookOpen, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Examinations', path: '/examinations', icon: FileText, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Academic Calendar', path: '/calendar', icon: CalendarDays, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Announcements', path: '/announcements', icon: Megaphone, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Leave Management', path: '/leaves', icon: ClipboardList, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Student Documents', path: '/documents', icon: FolderOpen, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'ID Cards', path: '/id-cards', icon: CreditCard, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
  ];

  const bottomItems = [
    { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Notifications', path: '/notifications', icon: Bell, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'Activity Logs', path: '/activity-logs', icon: ScrollText, roles: ['super_admin', 'admin'] },
    { label: 'Settings', path: '/settings', icon: Settings, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
  ];

  const aiItems = [
    { label: 'AI Assistant', path: '/ai/assistant', icon: Bot, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'AI Search', path: '/ai/search', icon: Search, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'AI Insights', path: '/ai/insights', icon: Lightbulb, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'AI Reports', path: '/ai/reports', icon: FileBarChart, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'AI Questions', path: '/ai/questions', icon: HelpCircle, roles: ['super_admin', 'admin', 'teacher'] },
    { label: 'TeacherAI', path: '/ai/teacher', icon: GraduationCap, roles: ['super_admin', 'admin', 'teacher'] },
    { label: 'AI Intelligence', path: '/ai/intelligence', icon: Brain, roles: ['super_admin', 'admin', 'teacher', 'accountant'] },
    { label: 'AI Documents', path: '/ai/documents', icon: FileStack, roles: ['super_admin', 'admin'] },
    { label: 'AI Settings', path: '/ai/settings', icon: FlaskConical, roles: ['super_admin', 'admin'] },
  ];

  const filterByRole = (items) => items.filter(item => item.roles.some(r => hasRole(r)));
  const main = filterByRole(navItems);
  const other = filterByRole(bottomItems);
  const ai = filterByRole(aiItems);

  const userInitials = admin?.name
    ? admin.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (admin?.username || 'A').slice(0, 2).toUpperCase();

  const userRole = admin?.role ? admin.role.replace('_', ' ') : 'Administrator';

  const renderNavSection = (items) =>
    items.map(item => {
      const Icon = item.icon;
      return (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <Icon size={18} strokeWidth={1.8} />
          </span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      );
    });

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
          <div className="sidebar-brand">
            <div className="sidebar-title">SMS</div>
            <div className="sidebar-subtitle">College Management</div>
          </div>
        </div>

        <div className="sidebar-nav">
          <div className="sidebar-nav-label">Main</div>
          {renderNavSection(main)}

          {other.length > 0 && (
            <>
              <div className="sidebar-nav-label">Administration</div>
              {renderNavSection(other)}
            </>
          )}

          {ai.length > 0 && (
            <>
              <div className="sidebar-nav-label">AI Platform</div>
              {renderNavSection(ai)}
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{userInitials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{admin?.name || admin?.username || 'Admin'}</div>
              <div className="sidebar-user-role">{userRole}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
