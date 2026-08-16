// Rule-based student risk analysis. Scores are computed deterministically from
// attendance, marks and fee data. If the ML pipeline is active, mlService can
// produce the same shape with a model.

const pool = require('../../config/db');
const studentTools = require('../tools/studentTools');

const ATTENDANCE_THRESHOLD = 75;

function computeRisk({ attendance, marks, fees, student }) {
  const attPct = Number(attendance.overallPercentage) || 0;
  const avgPct = Number(marks.overallAverage) || 0;
  const failedSubjects = marks.subjects.reduce(
    (acc, s) => acc + s.exams.filter(e => Number(e.percentage) < 40).length, 0
  );
  const totalExams = marks.subjects.reduce((acc, s) => acc + s.exams.length, 0);
  const paid = Number(fees.paid) || 0;
  const totalFees = fees.fee ? Number(fees.fee.total_fees) || 0 : 0;
  const outstanding = Number(fees.outstanding) || 0;
  const feeRatio = totalFees ? outstanding / totalFees : 0;

  // Component scores 0..100 (higher = more risk).
  const academicRisk = Math.min(100, (100 - avgPct) * (100 / 100) * 1.1);
  const attendanceRisk = Math.max(0, Math.min(100, ((ATTENDANCE_THRESHOLD - attPct) / ATTENDANCE_THRESHOLD) * 140));
  const feeRisk = Math.max(0, Math.min(100, feeRatio * 100));

  const riskScore = Math.round(
    academicRisk * 0.4 + attendanceRisk * 0.4 + feeRisk * 0.2
  );

  let riskLevel = 'LOW';
  if (riskScore >= 70) riskLevel = 'HIGH';
  else if (riskScore >= 40) riskLevel = 'MODERATE';

  const factors = [];
  if (avgPct < 40 && avgPct > 0) factors.push({ key: 'academic_failing', label: 'Failing average', impact: 'critical', description: `Average marks of ${avgPct}% is below the pass mark (40%).` });
  else if (avgPct < 60 && avgPct > 0) factors.push({ key: 'academic_weak', label: 'Weak academic average', impact: 'high', description: `Average marks of ${avgPct}% indicates a weak academic profile.` });
  if (failedSubjects > 0) factors.push({ key: 'failed_subjects', label: `${failedSubjects} failed subject${failedSubjects > 1 ? 's' : ''}`, impact: 'critical', description: `${failedSubjects} of ${totalExams} exam attempts scored below 40%.` });
  if (attPct < ATTENDANCE_THRESHOLD) factors.push({ key: 'low_attendance', label: `Attendance below ${ATTENDANCE_THRESHOLD}%`, impact: attPct < 65 ? 'critical' : 'high', description: `Attendance is ${attPct}%.` });
  else if (attPct < 85) factors.push({ key: 'moderate_attendance', label: 'Moderate attendance', impact: 'moderate', description: `Attendance of ${attPct}% — keep monitoring.` });
  if (feeRatio > 0.6) factors.push({ key: 'high_fee_arrears', label: 'High fee arrears', impact: 'high', description: `${(feeRatio * 100).toFixed(0)}% of fees still outstanding.` });
  else if (feeRatio > 0) factors.push({ key: 'partial_fee_arrears', label: 'Partial fee arrears', impact: 'moderate', description: `${(feeRatio * 100).toFixed(0)}% of fees still outstanding.` });

  if (student && student.status === 'Inactive') {
    factors.push({ key: 'inactive', label: 'Student inactive', impact: 'high', description: 'Student record is marked Inactive.' });
  }

  const recommendations = [];
  if (failedSubjects > 0) recommendations.push('Schedule remedial classes and a personal academic review.');
  if (avgPct < 60 && avgPct > 0) recommendations.push('Assign a faculty mentor and weekly progress check-ins.');
  if (attPct < ATTENDANCE_THRESHOLD) recommendations.push('Notify the guardian and set an attendance improvement target (75%).');
  if (feeRatio > 0) recommendations.push(`Follow up on the outstanding fee of ${currency(outstanding)} before the due date.`);
  if (!recommendations.length) recommendations.push('Student is in good standing — continue routine monitoring.');

  return {
    riskScore,
    riskLevel,
    components: {
      academic: Math.round(academicRisk * 100) / 100,
      attendance: Math.round(attendanceRisk * 100) / 100,
      fee: Math.round(feeRisk * 100) / 100,
    },
    factors,
    recommendations,
    data: { attendancePct: attPct, averagePct: avgPct, failedSubjects, outstanding, totalFees },
  };
}

function currency(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

async function getStudentRisk(studentId) {
  const base = await studentTools.getStudentById(null, { id: studentId });
  if (base.error) return base;
  const [att, marks, fees] = await Promise.all([
    studentTools.getStudentAttendance(null, { studentId }),
    studentTools.getStudentMarks(null, { studentId }),
    studentTools.getStudentFees(null, { studentId }),
  ]);
  const risk = computeRisk({ attendance: att, marks, fees, student: base.student });
  return { student: base.student, ...risk };
}

// Batch risk for many students (used by fee-risk + anomaly + insights).
async function batchRisk() {
  const [students] = await pool.query('SELECT id, name, branch, semester, cgpa, status FROM students ORDER BY id');
  const results = [];
  for (const s of students) {
    const r = await getStudentRisk(s.id);
    results.push({ ...r, student: { ...s, ...r.student } });
  }
  return results;
}

async function savePrediction(studentId, prediction, modelType = 'rule_based', modelVersion = 'rule-v1', confidence = null) {
  const { riskScore, riskLevel, components, factors, recommendations } = prediction;
  await pool.query(
    `INSERT INTO ai_risk_predictions
      (student_id, model_type, risk_score, risk_level, academic_risk, attendance_risk, factors, recommendations, confidence, model_version)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [studentId, modelType, riskScore, riskLevel, components.academic, components.attendance,
     JSON.stringify(factors), JSON.stringify(recommendations), confidence, modelVersion]
  );
}

module.exports = { computeRisk, getStudentRisk, batchRisk, savePrediction, ATTENDANCE_THRESHOLD };
