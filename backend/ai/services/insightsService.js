// Dashboard insight generation. Insights are rule-based and computed entirely
// from real statistics, so they are never fabricated. Each insight carries a
// type, severity, metric chips and a link to the relevant page.

const analyticsTools = require('../tools/analyticsTools');
const riskService = require('./riskService');
const { ATTENDANCE_THRESHOLD } = require('./forecastService');

const currency = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

async function generateInsights() {
  const stats = await analyticsTools.getDashboardStatistics();
  const alerts = await analyticsTools.getAttendanceAlerts(null, { threshold: ATTENDANCE_THRESHOLD });
  const feeAlerts = await analyticsTools.getFeeAlerts();
  const branches = await analyticsTools.getBranchStatistics();
  const insights = [];
  let id = 1;
  const push = (ins) => insights.push({ id: id++, ...ins });

  // Attendance
  if (alerts.students.length) {
    const critical = alerts.students.filter(s => s.attendance < 65).length;
    push({
      type: critical ? 'critical' : 'warning',
      severity: critical ? 3 : 2,
      title: `${alerts.students.length} students below ${ATTENDANCE_THRESHOLD}% attendance`,
      description: `${alerts.students.length} students are under the attendance threshold, ${critical} critically below 65%. Early intervention improves outcomes.`,
      metrics: { 'Below 75%': alerts.students.length, 'Below 65%': critical, 'Average': `${stats.averageAttendance}%` },
      action: { label: 'View attendance', to: '/attendance' },
      students: alerts.students.slice(0, 5).map(s => s.name),
    });
  } else {
    push({
      type: 'success',
      severity: 1,
      title: 'Attendance is healthy',
      description: `All students are above the ${ATTENDANCE_THRESHOLD}% threshold.`,
      metrics: { 'College average': `${stats.averageAttendance}%` },
      action: { label: 'View attendance', to: '/attendance' },
    });
  }

  // Fees
  if (feeAlerts.students.length) {
    const overdue = feeAlerts.students.filter(s => s.status === 'Pending').length;
    push({
      type: overdue ? 'critical' : 'warning',
      severity: overdue ? 3 : 2,
      title: `${feeAlerts.students.length} students have fee arrears`,
      description: `${overdue} students have fully pending fees. ${currency(stats.outstandingFees)} is outstanding in total.`,
      metrics: { 'With arrears': feeAlerts.students.length, 'Fully pending': overdue, 'Outstanding': currency(stats.outstandingFees) },
      action: { label: 'View fees', to: '/fees' },
    });
  } else {
    push({
      type: 'success',
      severity: 1,
      title: 'No fee arrears',
      description: 'All fee records are settled.',
      metrics: { 'Outstanding': currency(stats.outstandingFees) },
      action: { label: 'View fees', to: '/fees' },
    });
  }

  // Academic performance
  const classPerf = await analyticsTools.getClassPerformance(null, {});
  if (classPerf.subjects.length) {
    const weak = classPerf.subjects.filter(s => s.passRate < 80);
    if (weak.length) {
      push({
        type: 'warning',
        severity: 2,
        title: `${weak.length} subject/exam combinations below 80% pass rate`,
        description: `Class average is ${classPerf.classAverage}%. Consider revision or remedial support for the flagged subjects.`,
        metrics: { 'Class average': `${classPerf.classAverage}%`, 'Flagged': weak.length, 'Weakest': `${weak[0].subjectName} (${weak[0].passRate}%)` },
        action: { label: 'View results', to: '/examinations' },
        subjects: weak.slice(0, 5).map(s => s.subjectName),
      });
    } else {
      push({
        type: 'success',
        severity: 1,
        title: 'Strong academic performance',
        description: 'All subject/exam combinations have at least 80% pass rate.',
        metrics: { 'Class average': `${classPerf.classAverage}%` },
        action: { label: 'View results', to: '/examinations' },
      });
    }
  }

  // Risk overview
  const riskList = await riskService.batchRisk();
  const high = riskList.filter(r => r.riskLevel === 'HIGH');
  const moderate = riskList.filter(r => r.riskLevel === 'MODERATE');
  if (high.length) {
    push({
      type: 'critical',
      severity: 3,
      title: `${high.length} students at high risk`,
      description: 'These students combine weak attendance, academics or fee arrears. Open the risk panel to review factors and recommendations.',
      metrics: { 'High risk': high.length, 'Moderate': moderate.length, 'Low': riskList.length - high.length - moderate.length },
      action: { label: 'Review risks', to: '/students' },
      students: high.slice(0, 5).map(r => r.student.name),
    });
  }

  // Branch highlight
  if (branches.branches.length) {
    const best = [...branches.branches].sort((a, b) => (b.avgCgpa || 0) - (a.avgCgpa || 0))[0];
    push({
      type: 'info',
      severity: 1,
      title: `${best.branch} leads by CGPA`,
      description: `${best.branch} has the highest average CGPA (${best.avgCgpa}) with ${best.total} students and ${best.averageAttendance}% attendance.`,
      metrics: { 'Students': best.total, 'Avg CGPA': best.avgCgpa, 'Attendance': `${best.averageAttendance}%` },
      action: { label: 'View students', to: '/students' },
      branch: best.branch,
    });
  }

  // Enrollment overview
  const inactive = stats.totalStudents - stats.activeStudents;
  push({
    type: 'info',
    severity: 1,
    title: 'Enrollment overview',
    description: `${stats.totalStudents} students enrolled across ${stats.branchDistribution.length} branches; ${stats.activeStudents} active, ${inactive} inactive.`,
    metrics: { 'Total': stats.totalStudents, 'Active': stats.activeStudents, 'Inactive': inactive },
    action: { label: 'View students', to: '/students' },
  });

  return insights;
}

module.exports = { generateInsights };
