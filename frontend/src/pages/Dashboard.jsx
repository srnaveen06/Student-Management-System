import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardCard from '../components/DashboardCard/DashboardCard';
import { InlineLoader } from '../components/Loader/Loader';
import InsightsList from '../components/AI/InsightsList';
import dashboardApi from '../services/dashboardApi';
import aiApi from '../services/aiApi';
import { useToast } from '../context/ToastContext';
import { getInitials, formatCurrency, formatDate, timeAgo } from '../utils/format';
import {
  Users, UserCheck, BookOpen, Layers, IndianRupee, Clock,
  CalendarCheck, Bell, ClipboardList, TrendingUp,
  Plus, Download, CheckCircle, Sparkles, AlertTriangle,
  GraduationCap, CreditCard, FolderOpen, Megaphone, CalendarDays,
  Activity, BarChart3, ChevronRight, FileText
} from 'lucide-react';

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

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* Hero Banner */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <h1>{greeting}, Admin</h1>
          <p>Here's what's happening with your institution today. You have {counts.pendingLeaves || 0} pending leaves and {lists.unreadNotifications || 0} unread notifications.</p>
          <button className="btn" onClick={() => navigate('/students/add')}>
            <Plus size={16} />
            Add New Student
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="dashboard-stats">
        <DashboardCard
          icon={<Users size={22} />}
          iconColor="blue"
          title="Total Students"
          value={counts.totalStudents || 0}
        />
        <DashboardCard
          icon={<UserCheck size={22} />}
          iconColor="green"
          title="Active Students"
          value={counts.activeStudents || 0}
        />
        <DashboardCard
          icon={<BookOpen size={22} />}
          iconColor="teal"
          title="Courses"
          value={counts.totalCourses || 0}
        />
        <DashboardCard
          icon={<Layers size={22} />}
          iconColor="purple"
          title="Subjects"
          value={counts.totalSubjects || 0}
        />
        <DashboardCard
          icon={<IndianRupee size={22} />}
          iconColor="green"
          title="Fees Collected"
          value={formatCurrency(fees.collectedFees)}
        />
        <DashboardCard
          icon={<Clock size={22} />}
          iconColor="red"
          title="Pending Fees"
          value={formatCurrency(fees.pendingFees)}
        />
        <DashboardCard
          icon={<CalendarCheck size={22} />}
          iconColor="teal"
          title="Attendance Rate"
          value={`${attendance.rate || 0}%`}
        />
        <DashboardCard
          icon={<Bell size={22} />}
          iconColor="red"
          title="Unread Notifications"
          value={lists.unreadNotifications || 0}
        />
        <DashboardCard
          icon={<ClipboardList size={22} />}
          iconColor="orange"
          title="Pending Leaves"
          value={counts.pendingLeaves || 0}
        />
      </div>

      {/* AI Insights */}
      {aiInsights.length > 0 && (
        <div className="dashboard-section" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="dashboard-section-header">
            <h2><Sparkles size={18} /> AI Insights</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/ai/insights')}>
              View All <ChevronRight size={14} />
            </button>
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
            <h2><TrendingUp size={18} /> Student Registrations</h2>
          </div>
          <div className="dashboard-section-body">
            <BarChart data={charts.monthlyRegistrations || []} height={130} color="var(--primary)" />
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2><IndianRupee size={18} /> Fee Collection Trend</h2>
          </div>
          <div className="dashboard-section-body">
            <BarChart data={charts.feeTrend || []} height={130} color="var(--success)" valueKey="total" />
          </div>
        </div>
      </div>

      {/* Fee + Attendance + Status */}
      <div className="dashboard-grid dashboard-grid-3">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2><CreditCard size={18} /> Fee Summary</h2>
          </div>
          <div className="dashboard-section-body">
            <div className="progress-block">
              <div className="progress-label">
                <span>Collection Rate</span>
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
            <h2><Activity size={18} /> Attendance Overview</h2>
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
            <h2><BarChart3 size={18} /> Students by Branch</h2>
          </div>
          <div className="dashboard-section-body">
            <BarChart data={charts.branchDist || []} height={130} color="var(--warning)" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-quick-actions">
        <button className="btn btn-primary" onClick={() => navigate('/students/add')}>
          <Plus size={16} /> Add Student
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/students/import')}>
          <Download size={16} /> Import Students
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/attendance')}>
          <CalendarCheck size={16} /> Mark Attendance
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/fees')}>
          <IndianRupee size={16} /> Collect Fees
        </button>
      </div>

      {/* Lists Row */}
      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2><GraduationCap size={18} /> Recently Added Students</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/students')}>
              View All <ChevronRight size={14} />
            </button>
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
            <h2><AlertTriangle size={18} /> Low Attendance Warnings</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/attendance')}>
              Manage <ChevronRight size={14} />
            </button>
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
              <p className="muted-center">No low-attendance students</p>
            )}
          </div>
        </div>
      </div>

      {/* Exams + Payments */}
      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2><FileText size={18} /> Upcoming Examinations</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/examinations')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="dashboard-section-body">
            {lists.upcomingExams?.length > 0 ? (
              lists.upcomingExams.map(exam => (
                <div key={exam.id} className="recent-student">
                  <div className="recent-student-avatar" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
                    <FileText size={16} />
                  </div>
                  <div className="recent-student-info">
                    <h4>{exam.exam_name}</h4>
                    <p>{exam.subject_name} · Sem {exam.semester}</p>
                  </div>
                  <span className="badge badge-info">{formatDate(exam.exam_date)}</span>
                </div>
              ))
            ) : (
              <p className="muted-center">No upcoming exams</p>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2><IndianRupee size={18} /> Recent Payments</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/fees')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="dashboard-section-body">
            {lists.recentPayments?.length > 0 ? (
              lists.recentPayments.map(payment => (
                <div key={payment.id} className="recent-student">
                  <div className="recent-student-avatar" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                    <CheckCircle size={16} />
                  </div>
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

      {/* Activity + Status Dist */}
      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2><Activity size={18} /> Recent Activity</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/activity-logs')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="dashboard-section-body">
            {lists.recentActivities?.length > 0 ? (
              lists.recentActivities.map(log => (
                <div key={log.id} className="activity-row">
                  <span className="activity-dot" />
                  <div className="recent-student-info">
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>{log.description}</p>
                    <span className="text-muted">{log.username} · {timeAgo(log.created_at)}</span>
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
            <h2><Users size={18} /> Students by Status</h2>
          </div>
          <div className="dashboard-section-body">
            <BarChart data={charts.statusDist || []} height={110} color="var(--info)" />
            <h3 style={{ fontSize: 'var(--font-size-sm)', marginTop: '16px', marginBottom: '8px', color: 'var(--text-secondary)' }}>By Gender</h3>
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

      {/* ERP Widgets */}
      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2><CalendarDays size={18} /> Upcoming Events</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/calendar')}>
              View Calendar <ChevronRight size={14} />
            </button>
          </div>
          <div className="dashboard-section-body">
            {lists.upcomingEvents?.length > 0 ? (
              lists.upcomingEvents.map(event => (
                <div key={event.id} className="recent-student">
                  <div className="recent-student-avatar" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>
                    <CalendarDays size={16} />
                  </div>
                  <div className="recent-student-info">
                    <h4>{event.title}</h4>
                    <p>{event.event_type} · {event.location || 'Campus'}</p>
                  </div>
                  <span className="badge badge-info">{formatDate(event.start_date)}</span>
                </div>
              ))
            ) : (
              <p className="muted-center">No upcoming events</p>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2><Megaphone size={18} /> Latest Announcements</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/announcements')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="dashboard-section-body">
            {lists.latestAnnouncements?.length > 0 ? (
              lists.latestAnnouncements.map(ann => (
                <div key={ann.id} className="activity-row">
                  <span className="activity-dot" style={{ background: ann.is_pinned ? 'var(--warning)' : 'var(--primary)' }} />
                  <div className="recent-student-info">
                    <p style={{ fontSize: 'var(--font-size-sm)' }}><strong>{ann.title}</strong></p>
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
            <h2><ClipboardList size={18} /> Pending Leave Requests</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/leaves')}>
              Manage <ChevronRight size={14} />
            </button>
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
                  <span className="badge badge-warning">{leave.days}d</span>
                </div>
              ))
            ) : (
              <p className="muted-center">No pending leave requests</p>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2><FolderOpen size={18} /> Documents Overview</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/documents')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="dashboard-section-body">
            <div className="quick-stat-item">
              <span className="quick-stat-label">ID Cards Issued</span>
              <span className="quick-stat-value">—</span>
            </div>
            <p className="muted-center" style={{ marginTop: '8px' }}>
              Manage student documents and ID cards from the dedicated pages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
