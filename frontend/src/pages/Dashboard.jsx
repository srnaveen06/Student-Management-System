import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardCard from '../components/DashboardCard/DashboardCard';
import { InlineLoader } from '../components/Loader/Loader';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch dashboard statistics on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await studentApi.getStats();
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [toast]);

  // Get initials from name for avatar
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) return <InlineLoader />;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here's what's happening with your students.</p>
        </div>
      </div>

      {/* Stats Cards — animate in sequence */}
      <div className="dashboard-stats">
        <DashboardCard
          icon="👥"
          iconColor="blue"
          title="Total Students"
          value={stats?.totalStudents || 0}
        />
        <DashboardCard
          icon="✅"
          iconColor="green"
          title="Active Students"
          value={stats?.activeStudents || 0}
        />
        <DashboardCard
          icon="⏸"
          iconColor="red"
          title="Inactive Students"
          value={stats?.inactiveStudents || 0}
        />
        <DashboardCard
          icon="🏛"
          iconColor="teal"
          title="Total Branches"
          value={stats?.totalBranches || 0}
        />
      </div>

      {/* Dashboard Grid — Recent Students + Quick Stats */}
      <div className="dashboard-grid">
        {/* Recently Added Students */}
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Recently Added Students</h2>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => navigate('/students')}
            >
              View All →
            </button>
          </div>
          <div className="dashboard-section-body">
            {stats?.recentStudents?.length > 0 ? (
              stats.recentStudents.map(student => (
                <div key={student.id} className="recent-student">
                  <div className="recent-student-avatar">
                    {student.image ? (
                      <img
                        src={`${API_URL}/uploads/${student.image}`}
                        alt={student.name}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span style={{ display: student.image ? 'none' : 'flex' }}>
                      {getInitials(student.name)}
                    </span>
                  </div>
                  <div className="recent-student-info">
                    <h4>{student.name}</h4>
                    <p>{student.branch} · Sem {student.semester}</p>
                  </div>
                  <span className={`badge badge-${student.status.toLowerCase()}`}>
                    {student.status}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                No students yet
              </p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Quick Statistics</h2>
          </div>
          <div className="dashboard-section-body">
            <div className="quick-stat-item">
              <span className="quick-stat-label">Active Rate</span>
              <span className="quick-stat-value" style={{ color: 'var(--success)' }}>
                {stats?.totalStudents > 0
                  ? Math.round((stats.activeStudents / stats.totalStudents) * 100)
                  : 0}%
              </span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label">Inactive Rate</span>
              <span className="quick-stat-value" style={{ color: 'var(--danger)' }}>
                {stats?.totalStudents > 0
                  ? Math.round((stats.inactiveStudents / stats.totalStudents) * 100)
                  : 0}%
              </span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label">Total Branches</span>
              <span className="quick-stat-value">{stats?.totalBranches || 0}</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label">Avg Students/Branch</span>
              <span className="quick-stat-value">
                {stats?.totalBranches > 0
                  ? Math.round(stats.totalStudents / stats.totalBranches)
                  : 0}
              </span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label">Total Records</span>
              <span className="quick-stat-value">{stats?.totalStudents || 0}</span>
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/students/add')}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                ➕ Add Student
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/students')}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                📋 View All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
