// AI report generation. Builds a structured report (academic, attendance, fee
// or risk) entirely from real data and stores it in ai_reports. The frontend
// renders it and can export to PDF via the browser print flow.

const pool = require('../../config/db');
const analyticsTools = require('../tools/analyticsTools');
const riskService = require('./riskService');
const { getFeeRisk } = require('./forecastService');
const { getClassAnalysis } = require('./classAnalysisService');

const currency = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const TYPES = ['academic', 'attendance', 'fee', 'risk'];

async function buildReportData(type, filters) {
  const f = filters || {};
  switch (type) {
    case 'academic': {
      const classAnalysis = await getClassAnalysis({ branch: f.branch, semester: f.semester });
      return {
        title: `Academic Performance Report — ${f.branch || 'All branches'}${f.semester ? ` Sem ${f.semester}` : ''}`,
        type: 'academic',
        sections: [
          { heading: 'Overview', body: `${classAnalysis.studentsCount} students analysed. Class average ${classAnalysis.summary.classAverage}%, pass rate ${classAnalysis.summary.passRate}%.` },
          { heading: 'Subject-wise averages', table: { columns: ['Subject', 'Exam', 'Avg %', 'Pass rate'], rows: classAnalysis.subjects.map(s => [s.subjectName, s.examName, `${s.averagePercentage}%`, `${s.passRate}%`]) } },
          { heading: 'Top students', table: { columns: ['Name', 'Avg %', 'GPA'], rows: classAnalysis.topStudents.map(s => [s.name, `${s.averagePercentage}%`, s.averageGpa]) } },
          { heading: 'At-risk students', body: classAnalysis.atRiskStudents.length ? classAnalysis.atRiskStudents.map(s => `${s.name} — ${s.averagePercentage}% (${s.riskLevel})`).join(', ') : 'None flagged.' },
        ],
      };
    }
    case 'attendance': {
      const alerts = await analyticsTools.getAttendanceAlerts(null, { threshold: 75, branch: f.branch, semester: f.semester });
      const stats = await analyticsTools.getDashboardStatistics();
      return {
        title: `Attendance Report — ${f.branch || 'All branches'}${f.semester ? ` Sem ${f.semester}` : ''}`,
        type: 'attendance',
        sections: [
          { heading: 'Overview', body: `College average attendance is ${stats.averageAttendance}%.` },
          { heading: 'Below threshold (75%)', table: { columns: ['Name', 'Branch', 'Semester', 'Attendance'], rows: alerts.students.map(s => [s.name, s.branch, s.semester, `${s.attendance}%`]) } },
          { heading: 'Count', body: `${alerts.students.length} student(s) below the threshold.` },
        ],
      };
    }
    case 'fee': {
      const feeRisk = await getFeeRisk();
      return {
        title: `Fee Status Report — ${f.branch || 'All branches'}`,
        type: 'fee',
        sections: [
          { heading: 'Summary', body: `${feeRisk.summary.totalStudents} students on record. ${feeRisk.summary.withArrears} with arrears. Total outstanding ${currency(feeRisk.summary.totalOutstanding)}.` },
          { heading: 'Arrears detail', table: { columns: ['Name', 'Branch', 'Status', 'Outstanding', 'Due date'], rows: feeRisk.list.filter(x => x.outstanding > 0).map(x => [x.student.name, x.student.branch, x.status, currency(x.outstanding), x.dueDate]) } },
        ],
      };
    }
    case 'risk': {
      const risks = await riskService.batchRisk();
      const sorted = risks.filter(r => !r.error).sort((a, b) => b.riskScore - a.riskScore);
      return {
        title: `Student Risk Report — ${f.branch || 'All branches'}`,
        type: 'risk',
        sections: [
          { heading: 'Summary', body: `${sorted.length} students assessed. ${sorted.filter(r => r.riskLevel === 'HIGH').length} high risk, ${sorted.filter(r => r.riskLevel === 'MODERATE').length} moderate, ${sorted.filter(r => r.riskLevel === 'LOW').length} low.` },
          { heading: 'Risk table', table: { columns: ['Name', 'Branch', 'Risk', 'Score', 'Top factor'], rows: sorted.slice(0, 30).map(r => [r.student.name, r.student.branch, r.riskLevel, r.riskScore, r.factors[0] ? r.factors[0].label : '—']) } },
        ],
      };
    }
    default:
      return null;
  }
}

async function generateReport({ type, filters, userId }) {
  if (!TYPES.includes(type)) return { error: `Unknown report type. Choose one of: ${TYPES.join(', ')}.` };
  const data = await buildReportData(type, filters);
  const [r] = await pool.query(
    'INSERT INTO ai_reports (user_id, title, report_type, filters, content) VALUES (?,?,?,?,?)',
    [userId, data.title, type, JSON.stringify(filters || {}), JSON.stringify(data)]
  );
  return { id: r.insertId, ...data, generatedAt: new Date().toISOString() };
}

async function listReports(userId, { limit = 20 } = {}) {
  const n = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const [rows] = await pool.query(
    'SELECT id, title, report_type, filters, created_at FROM ai_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, n]
  );
  return { reports: rows };
}

module.exports = { generateReport, listReports, TYPES };
