import React, { useState, useEffect } from 'react';
import DashboardCard from '../components/DashboardCard/DashboardCard';
import { InlineLoader } from '../components/Loader/Loader';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';
import { Download, Printer, Users, CheckCircle, Pause, Building2, GraduationCap, Pin } from 'lucide-react';

// Color variants for progress bars
const BAR_COLORS = ['blue', 'green', 'teal', 'warning', 'red'];

const Reports = () => {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch aggregated report data on mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await studentApi.getReports();
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        toast.error('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [toast]);

  // Calculate percentage of a count relative to the total
  const percentOf = (count) => {
    if (!data?.totalStudents) return 0;
    return Math.round((count / data.totalStudents) * 100);
  };

  // Render a distribution list with progress bars
  const renderDistribution = (items, keyField, colorOffset = 0) => (
    <div className="report-list">
      {items.length > 0 ? (
        items.map((item, index) => {
          const pct = percentOf(item.count);
          return (
            <div className="report-item" key={item[keyField]}>
              <div className="report-item-header">
                <span className="report-item-label">{item[keyField]}</span>
                <span className="report-item-count">
                  {item.count}
                  <span className="report-item-percent"> ({pct}%)</span>
                </span>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${BAR_COLORS[(index + colorOffset) % BAR_COLORS.length]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })
      ) : (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
          No data available
        </p>
      )}
    </div>
  );

  // Export all report data to CSV
  const exportCSV = () => {
    if (!data || !data.totalStudents) {
      toast.warning('No report data to export');
      return;
    }

    const rows = [];
    rows.push(['Report: Student Management Summary']);
    rows.push(['Generated', new Date().toLocaleString()]);
    rows.push([]);
    rows.push(['Total Students', data.totalStudents]);
    rows.push(['Active Students', data.activeStudents]);
    rows.push(['Inactive Students', data.inactiveStudents]);
    rows.push(['Total Branches', data.totalBranches]);
    rows.push([]);
    rows.push(['--- By Branch ---']);
    rows.push(['Branch', 'Count', 'Percentage']);
    data.byBranch.forEach(item => rows.push([item.branch, item.count, `${percentOf(item.count)}%`]));
    rows.push([]);
    rows.push(['--- By Institute ---']);
    rows.push(['Institute', 'Count', 'Percentage']);
    data.byInstitute.forEach(item => rows.push([item.institute, item.count, `${percentOf(item.count)}%`]));
    rows.push([]);
    rows.push(['--- By Gender ---']);
    rows.push(['Gender', 'Count', 'Percentage']);
    data.byGender.forEach(item => rows.push([item.gender, item.count, `${percentOf(item.count)}%`]));
    rows.push([]);
    rows.push(['--- By Semester ---']);
    rows.push(['Semester', 'Count', 'Percentage']);
    data.bySemester.forEach(item => rows.push([item.semester, item.count, `${percentOf(item.count)}%`]));
    rows.push([]);
    rows.push(['--- By Status ---']);
    rows.push(['Status', 'Count', 'Percentage']);
    data.byStatus.forEach(item => rows.push([item.status, item.count, `${percentOf(item.count)}%`]));

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const printReport = () => {
    window.print();
  };

  if (loading) return <InlineLoader />;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Analytics and distribution of student records.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline btn-sm" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-outline btn-sm" onClick={printReport}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-stats">
        <DashboardCard icon={<Users size={24} />} iconColor="blue" title="Total Students" value={data?.totalStudents || 0} />
        <DashboardCard icon={<CheckCircle size={24} />} iconColor="green" title="Active Students" value={data?.activeStudents || 0} />
        <DashboardCard icon={<Pause size={24} />} iconColor="red" title="Inactive Students" value={data?.inactiveStudents || 0} />
        <DashboardCard icon={<Building2 size={24} />} iconColor="teal" title="Total Branches" value={data?.totalBranches || 0} />
      </div>

      {/* Distribution Sections */}
      <div className="reports-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2><Users size={18} /> Students by Branch</h2>
          </div>
          <div className="dashboard-section-body">
            {renderDistribution(data?.byBranch || [], 'branch')}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2><Building2 size={18} /> Students by Institute</h2>
          </div>
          <div className="dashboard-section-body">
            {renderDistribution(data?.byInstitute || [], 'institute', 1)}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2><GraduationCap size={18} /> Students by Semester</h2>
          </div>
          <div className="dashboard-section-body">
            {renderDistribution(data?.bySemester || [], 'semester', 2)}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2><Users size={18} /> Students by Gender</h2>
          </div>
          <div className="dashboard-section-body">
            {renderDistribution(data?.byGender || [], 'gender', 2)}
          </div>
        </div>

        <div className="dashboard-section reports-section-full">
          <div className="dashboard-section-header">
            <h2><Pin size={18} /> Status Breakdown</h2>
          </div>
          <div className="dashboard-section-body">
            {renderDistribution(data?.byStatus || [], 'status', 3)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
