import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// Styles
import './styles/variables.css';
import './styles/App.css';
import './styles/navbar.css';
import './styles/sidebar.css';
import './styles/dashboard.css';
import './styles/table.css';
import './styles/form.css';
import './styles/layout.css';
import './styles/reports.css';
import './styles/settings.css';
import './styles/college.css';
import './styles/responsive.css';
import './styles/ai.css';
import './styles/erp.css';

// Context
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AIProvider } from './context/AIContext';
import { ProfileProvider } from './context/ProfileContext';

// Components
import Sidebar from './components/Sidebar/Sidebar';
import Navbar from './components/Navbar/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import FloatingChat from './components/CampusAI/FloatingChat';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import AddStudent from './pages/AddStudent';
import EditStudent from './pages/EditStudent';
import StudentProfile from './pages/StudentProfile';
import StudentImport from './pages/StudentImport';
import Attendance from './pages/Attendance';
import Fees from './pages/Fees';
import Courses from './pages/Courses';
import Examinations from './pages/Examinations';
import Marksheet from './pages/Marksheet';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import ActivityLogs from './pages/ActivityLogs';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// AI pages
import AIAssistant from './pages/AI/AIAssistant';
import AISearch from './pages/AI/AISearch';
import AIInsights from './pages/AI/AIInsights';
import AIReports from './pages/AI/AIReports';
import AIQuestions from './pages/AI/AIQuestions';
import TeacherAssistant from './pages/AI/TeacherAssistant';
import AIIntelligence from './pages/AI/AIIntelligence';
import AIDocuments from './pages/AI/AIDocuments';
import AISettings from './pages/AI/AISettings';

// ERP pages
import AcademicCalendar from './pages/AcademicCalendar';
import Announcements from './pages/Announcements';
import LeaveManagement from './pages/LeaveManagement';
import Documents from './pages/Documents';
import IdCards from './pages/IdCards';
import VerifyIdCard from './pages/VerifyIdCard';

// Layout wrapper — includes sidebar, navbar, and page content
const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const noLayoutRoutes = ['/login', '/signup'];
  const isNoLayout = noLayoutRoutes.includes(location.pathname);

  if (isNoLayout) return null;

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />

        <div className="page-content">
          <Routes>
            <Route path="/" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/students" element={
              <ProtectedRoute><Students /></ProtectedRoute>
            } />
            <Route path="/students/add" element={
              <ProtectedRoute roles={['super_admin', 'admin']}><AddStudent /></ProtectedRoute>
            } />
            <Route path="/students/edit/:id" element={
              <ProtectedRoute roles={['super_admin', 'admin']}><EditStudent /></ProtectedRoute>
            } />
            <Route path="/students/profile/:id" element={
              <ProtectedRoute><StudentProfile /></ProtectedRoute>
            } />
            <Route path="/students/import" element={
              <ProtectedRoute roles={['super_admin', 'admin']}><StudentImport /></ProtectedRoute>
            } />
            <Route path="/attendance" element={
              <ProtectedRoute><Attendance /></ProtectedRoute>
            } />
            <Route path="/fees" element={
              <ProtectedRoute><Fees /></ProtectedRoute>
            } />
            <Route path="/courses" element={
              <ProtectedRoute><Courses /></ProtectedRoute>
            } />
            <Route path="/examinations" element={
              <ProtectedRoute><Examinations /></ProtectedRoute>
            } />
            <Route path="/marksheet/:studentId" element={
              <ProtectedRoute><Marksheet /></ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute><Reports /></ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute><Notifications /></ProtectedRoute>
            } />
            <Route path="/activity-logs" element={
              <ProtectedRoute roles={['super_admin', 'admin']}><ActivityLogs /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><Settings /></ProtectedRoute>
            } />

            {/* ERP Features */}
            <Route path="/calendar" element={
              <ProtectedRoute><AcademicCalendar /></ProtectedRoute>
            } />
            <Route path="/announcements" element={
              <ProtectedRoute><Announcements /></ProtectedRoute>
            } />
            <Route path="/leaves" element={
              <ProtectedRoute><LeaveManagement /></ProtectedRoute>
            } />
            <Route path="/documents" element={
              <ProtectedRoute><Documents /></ProtectedRoute>
            } />
            <Route path="/id-cards" element={
              <ProtectedRoute><IdCards /></ProtectedRoute>
            } />

            {/* AI Platform */}
            <Route path="/ai/assistant" element={
              <ProtectedRoute><AIAssistant /></ProtectedRoute>
            } />
            <Route path="/ai/search" element={
              <ProtectedRoute><AISearch /></ProtectedRoute>
            } />
            <Route path="/ai/insights" element={
              <ProtectedRoute><AIInsights /></ProtectedRoute>
            } />
            <Route path="/ai/reports" element={
              <ProtectedRoute><AIReports /></ProtectedRoute>
            } />
            <Route path="/ai/questions" element={
              <ProtectedRoute><AIQuestions /></ProtectedRoute>
            } />
            <Route path="/ai/teacher" element={
              <ProtectedRoute><TeacherAssistant /></ProtectedRoute>
            } />
            <Route path="/ai/intelligence" element={
              <ProtectedRoute><AIIntelligence /></ProtectedRoute>
            } />
            <Route path="/ai/documents" element={
              <ProtectedRoute><AIDocuments /></ProtectedRoute>
            } />
            <Route path="/ai/settings" element={
              <ProtectedRoute roles={['super_admin', 'admin']}><AISettings /></ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>

        <FloatingChat />
      </div>
    </div>
  );
};

// Main App component
function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AIProvider>
          <ProfileProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/verify/:token" element={<VerifyIdCard />} />
                <Route path="/*" element={<AppLayout />} />
              </Routes>
            </Router>
          </ProfileProvider>
        </AIProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
