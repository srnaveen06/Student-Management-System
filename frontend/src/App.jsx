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
import './styles/responsive.css';

// Context
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

// Components
import Sidebar from './components/Sidebar/Sidebar';
import Navbar from './components/Navbar/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import AddStudent from './pages/AddStudent';
import EditStudent from './pages/EditStudent';
import NotFound from './pages/NotFound';

// Layout wrapper — includes sidebar, navbar, and page content
const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Check if current route is login or 404 (no layout needed)
  const noLayoutRoutes = ['/login'];
  const isNoLayout = noLayoutRoutes.includes(location.pathname);

  if (isNoLayout) return null;

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="main-content">
        {/* Top navbar */}
        <Navbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />

        {/* Page content */}
        <div className="page-content">
          <Routes>
            <Route path="/" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/students" element={
              <ProtectedRoute><Students /></ProtectedRoute>
            } />
            <Route path="/students/add" element={
              <ProtectedRoute><AddStudent /></ProtectedRoute>
            } />
            <Route path="/students/edit/:id" element={
              <ProtectedRoute><EditStudent /></ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <div className="page-header">
                  <div>
                    <h1>Reports</h1>
                    <p>Reports feature coming soon.</p>
                  </div>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <div className="page-header">
                  <div>
                    <h1>Settings</h1>
                    <p>Settings feature coming soon.</p>
                  </div>
                </div>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

// Main App component
function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Login route — no sidebar/navbar */}
            <Route path="/login" element={<Login />} />

            {/* All other routes — with layout */}
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
