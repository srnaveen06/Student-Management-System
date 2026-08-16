import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardCard from '../components/DashboardCard/DashboardCard';
import { InlineLoader } from '../components/Loader/Loader';
import InsightsList from '../components/AI/InsightsList';
import dashboardApi from '../services/dashboardApi';
import aiApi from '../services/aiApi';
import { useToast } from '../context/ToastContext';
import { getInitials, formatCurrency, formatDate, timeAgo } from '../utils/format';

// Simple CSS bar chart used across the dashboard
const BarChart = ({ data, height = 120, color = 'var(--primary)', labelKey = 'label', valueKey = 'count' }) => {
  const max = Math.max(1, ...data.map(d => Number(d[valueKey]) || 0));
  return (
    <div className="chart-bar">
      {data.length === 0 && <div className="chart-empty">No data yet</div>}
      {data.map((d, i) => (
        <div key={i} className="chart-bar-col" title={`${d[labelKey]}: ${d[valueKey]}`}>
          <div className="chart-bar-track" style={{ height }}>
            <div
              className="chart-bar-fill"
              style={{ height: `${(Number(d[valueKey]) / max) * 100}%`, background: color }}
            />
          </div>
          <span className="chart-bar-label">{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState([]);
  const [aiLoading, setAiLoading] = useState(true);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await dashboardApi.getDashboardData();
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [toast]);

  // AI insights — non-blocking; failures just hide the section.
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await aiApi.dashboardInsights();
        setAiInsights(res.insights || []);
      } catch (error) {
        // keep section empty
      } finally {
        setAiLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (loading) return <InlineLoader />;

  const counts = data?.counts || {};
  const fees = data?.fees || {};
  const attendance = data?.attendance || {};
  const charts = data?.charts || {};
  const lists = data?.lists || {};

  const collectionRate = fees.totalFees > 0
    ? Math.round((fees.collectedFees / fees.totalFees) * 100)
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here's what's happening with your students.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-stats">
        <DashboardCard icon="👥" iconColor="blue" title="Total Students" value={counts.totalStudents || 0} />
        <DashboardCard icon="✅" iconColor="green" title="Active Students" value={counts.activeStudents || 0} />
        <DashboardCard icon="📚" iconColor="teal" title="Courses" value={counts.totalCourses || 0} />
        <DashboardCard icon="🗂" iconColor="purple" title="Subjects" value={counts.totalSubjects || 0} />
        <DashboardCard icon="💰" iconColor="orange" title="Fees Collected" value={formatCurrency(fees.collectedFees)} />
        <DashboardCard icon="⏳" iconColor="red" title="Pending Fees" value={formatCurrency(fees.pendingFees)} />
        <DashboardCard icon="📅" iconColor="green" title="Attendance Rate" value={`${attendance.rate || 0}%`} />
        <DashboardCard icon="🔔" iconColor="red" title="Unread Notifications" value={lists.unreadNotifications || 0} />
        <DashboardCard icon="📝" iconColor="orange" title="Pending Leaves" value={counts.pendingLeaves || 0} />
      </div>

      {/* AI Insights */}
      {aiInsights.length > 0 && (
        <div className="dashboard-section" style={{ marginBottom: '24px' }}>
          <div className="dashboard-section-header">
            <h2>✨ AI Insights</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/ai/insights')}>View All →</button>
          </div>
          <div className="dashboard-section-body">
            {aiLoading ? <InlineLoader /> : <InsightsList insights={aiInsights.slice(0, 3)} />}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Student Registrations (12 months)</h2>
          </div>
          <div className="dashboard-section-body">
            <BarChart data={charts.monthlyRegistrations || []} height={130} color="var(--primary)" />
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Fee Collection Trend (12 months)</h2>
          </div>
          <div className="dashboard-section-body">
            <BarChart data={charts.feeTrend || []} height={130} color="var(--success)" valueKey="total" />
          </div>
        </div>
      </div>

      {/* Fee + Attendance Summary */}
      <div className="dashboard-grid dashboard-grid-3">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Fee Summary</h2>
          </div>
          <div className="dashboard-section-body">
            <div className="progress-block">
              <div className="progress-label">
                <span>Collected</span>
                <span>{collectionRate}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${collectionRate}%`, background: 'var(--success)' }} />
              </div>
            </div>
            {(charts.feeStatusDist || []).map(item => (
              <div className="quick-stat-item" key={item.status}>
                <span className="quick-stat-label">{item.status}</span>
                <span className="quick-stat-value">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Attendance Overview</h2>
          </div>
          <div className="dashboard-section-body">
            <div className="attendance-donut">
              <div className="attendance-donut-ring" style={{ '--rate': `${attendance.rate}%` }}>
                <span>{attendance.rate}%</span>
              </div>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label">Present</span>
              <span className="quick-stat-value" style={{ color: 'var(--success)' }}>{attendance.present || 0}</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label">Absent</span>
              <span className="quick-stat-value" style={{ color: 'var(--danger)' }}>{attendance.absent || 0}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Students by Status</h2>
          </div>
          <div className="dashboard-section-body">
            <BarChart data={charts.statusDist || []} height={110} color="var(--info)" />
            <h2 style={{ fontSize: 'var(--font-size-lg)', marginTop: '16px' }}>By Gender</h2>
            <div className="inline-bars">
              {(charts.genderDist || []).map(item => (
                <div key={item.gender} className="inline-bar-item">
                  <span className="quick-stat-label">{item.gender || 'Other'}</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${counts.totalStudents ? (item.count / counts.totalStudents) * 100 : 0}%`, background: 'var(--primary-light)' }}
                    />
                  </div>
                  <span className="quick-stat-value">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lists Row */}
      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Recently Added Students</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/students')}>View All →</button>
          </div>
          <div className="dashboard-section-body">
            {lists.recentStudents?.length > 0 ? (
              lists.recentStudents.map(student => (
                <div key={student.id} className="recent-student">
                  <div className="recent-student-avatar">
                    {student.image ? (
                      <img src={`${API_URL}/uploads/${student.image}`} alt={student.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    ) : null}
                    <span style={{ display: student.image ? 'none' : 'flex' }}>{getInitials(student.name)}</span>
                  </div>
                  <div className="recent-student-info">
                    <h4>{student.name}</h4>
                    <p>{student.branch} · Sem {student.semester}</p>
                  </div>
                  <span className="badge badge-active">{student.status}</span>
                </div>
              ))
            ) : (
              <p className="muted-center">No students yet</p>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Low Attendance Warnings</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/attendance')}>Manage →</button>
          </div>
          <div className="dashboard-section-body">
            {lists.lowAttendance?.length > 0 ? (
              lists.lowAttendance.map(student => (
                <div key={student.id} className="recent-student">
                  <div className="recent-student-avatar">{getInitials(student.name)}</div>
                  <div className="recent-student-info">
                    <h4>{student.name}</h4>
                    <p>{student.branch} · Sem {student.semester}</p>
                  </div>
                  <span className="badge badge-inactive">{student.percentage}%</span>
                </div>
              ))
            ) : (
              <p className="muted-center">No low-attendance students 🎉</p>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Upcoming Examinations</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/examinations')}>View All →</button>
          </div>
          <div className="dashboard-section-body">
            {lists.upcomingExams?.length > 0 ? (
              lists.upcomingExams.map(exam => (
                <div key={exam.id} className="recent-student">
                  <div className="recent-student-avatar">{exam.subject_name?.charAt(0) || 'E'}</div>
                  <div className="recent-student-info">
                    <h4>{exam.exam_name}</h4>
                    <p>{exam.subject_name} · Sem {exam.semester}</p>
                  </div>
                  <span className="badge badge-active">{formatDate(exam.exam_date)}</span>
                </div>
              ))
            ) : (
              <p className="muted-center">No upcoming exams</p>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Recent Payments</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/fees')}>View All →</button>
          </div>
          <div className="dashboard-section-body">
            {lists.recentPayments?.length > 0 ? (
              lists.recentPayments.map(payment => (
                <div key={payment.id} className="recent-student">
                  <div className="recent-student-avatar" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>₹</div>
                  <div className="recent-student-info">
                    <h4>{payment.student_name}</h4>
                    <p>{payment.receipt_number} · {payment.method}</p>
                  </div>
                  <span className="badge badge-active">{formatCurrency(payment.amount)}</span>
                </div>
              ))
            ) : (
              <p className="muted-center">No payments yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Recent Activity</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/activity-logs')}>View All →</button>
          </div>
          <div className="dashboard-section-body">
            {lists.recentActivities?.length > 0 ? (
              lists.recentActivities.map(log => (
                <div key={log.id} className="activity-row">
                  <span className="activity-dot" />
                  <div className="recent-student-info">
                    <p>{log.description}</p>
                    <span className="text-muted">{log.username} · {formatDate(log.created_at)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted-center">No recent activity</p>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Students by Branch</h2>
          </div>
          <div className="dashboard-section-body">
            <BarChart data={charts.branchDist || []} height={130} color="var(--warning)" />
          </div>
        </div>
      </div>

      {/* ERP Widgets */}
      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>🗓️ Upcoming Events</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/calendar')}>View Calendar →</button>
          </div>
          <div className="dashboard-section-body">
            {lists.upcomingEvents?.length > 0 ? (
              lists.upcomingEvents.map(event => (
                <div key={event.id} className="recent-student">
                  <div className="recent-student-avatar">🎉</div>
                  <div className="recent-student-info">
                    <h4>{event.title}</h4>
                    <p>{event.event_type} · {event.location || 'Campus'}</p>
                  </div>
                  <span className="badge badge-active">{formatDate(event.start_date)}</span>
                </div>
              ))
            ) : (
              <p className="muted-center">No upcoming events</p>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>📢 Latest Announcements</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/announcements')}>View All →</button>
          </div>
          <div className="dashboard-section-body">
            {lists.latestAnnouncements?.length > 0 ? (
              lists.latestAnnouncements.map(ann => (
                <div key={ann.id} className="activity-row">
                  <span className="activity-dot" style={{ background: ann.is_pinned ? 'var(--warning)' : 'var(--primary)' }} />
                  <div className="recent-student-info">
                    <p><strong>{ann.title}</strong></p>
                    <span className="text-muted">{ann.published_by_name || 'Admin'} · {timeAgo(ann.created_at)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted-center">No announcements yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>📝 Pending Leave Requests</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/leaves')}>Manage →</button>
          </div>
          <div className="dashboard-section-body">
            {lists.pendingLeaves?.length > 0 ? (
              lists.pendingLeaves.map(leave => (
                <div key={leave.id} className="recent-student">
                  <div className="recent-student-avatar">{getInitials(leave.student_name)}</div>
                  <div className="recent-student-info">
                    <h4>{leave.student_name}</h4>
                    <p>{leave.leave_type} · {formatDate(leave.from_date)} → {formatDate(leave.to_date)}</p>
                  </div>
                  <span className="badge badge-inactive">{leave.days} day(s)</span>
                </div>
              ))
            ) : (
              <p className="muted-center">No pending leave requests 🎉</p>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>📂 Documents Overview</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/documents')}>View All →</button>
          </div>
          <div className="dashboard-section-body">
            <div className="quick-stat-item">
              <span className="quick-stat-label">🎫 ID Cards Issued</span>
              <span className="quick-stat-value">—</span>
            </div>
            <p className="muted-center" style={{ marginTop: '8px' }}>
              Manage student documents and ID cards from the dedicated pages.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-quick-actions">
        <button className="btn btn-primary" onClick={() => navigate('/students/add')}>➕ Add Student</button>
        <button className="btn btn-outline" onClick={() => navigate('/students/import')}>📥 Import Students</button>
        <button className="btn btn-outline" onClick={() => navigate('/attendance')}>📅 Mark Attendance</button>
        <button className="btn btn-outline" onClick={() => navigate('/fees')}>💰 Collect Fees</button>
      </div>
    </div>
  );
};

export default Dashboard;
