// Attendance forecasting and fee-risk analysis. All arithmetic is deterministic
// and computed from real attendance/fee records — no LLM involvement.

const pool = require('../../config/db');
const studentTools = require('../tools/studentTools');
const riskService = require('./riskService');

const ATTENDANCE_THRESHOLD = 75;

function computeProjection(attPct, totalClasses, absentCount, remainingClasses) {
  // Scenario analysis for the rest of the semester.
  const currentPresent = Math.round((attPct / 100) * totalClasses);
  const scenarios = [];
  const makeScenario = (label, futurePct) => {
    const extra = Math.round((futurePct / 100) * remainingClasses);
    const final = ((currentPresent + extra) / (totalClasses + remainingClasses)) * 100;
    return { label, scenarioPercentage: futurePct, projectedFinal: Math.round(final * 10) / 10 };
  };
  scenarios.push(makeScenario('If attendance continues as-is', Math.max(0, Math.min(100, attPct))));
  scenarios.push(makeScenario('If attendance improves to 90%', 90));
  scenarios.push(makeScenario('If attendance drops to 50%', 50));

  // How many consecutive classes must be attended to reach the threshold.
  let neededToReach = null;
  if (attPct < ATTENDANCE_THRESHOLD) {
    // solve: (currentPresent + x) / (totalClasses + x) >= threshold
    const x = Math.ceil(((ATTENDANCE_THRESHOLD / 100) * totalClasses - currentPresent) / (1 - ATTENDANCE_THRESHOLD / 100));
    neededToReach = Math.max(0, x);
  }
  const projectedFinal = scenarios[0].projectedFinal;
  const status = projectedFinal >= ATTENDANCE_THRESHOLD ? 'safe' : (projectedFinal >= 65 ? 'warning' : 'critical');
  return { currentAttendance: attPct, currentPresent, absentCount, remainingClasses, scenarios, neededToReach, projectedFinal, status };
}

async function getAttendanceForecast(studentId) {
  const att = await studentTools.getStudentAttendance(null, { studentId });
  if (att.error) return att;
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(status IN ('Present', 'Approved Leave')) AS present,
            MIN(attendance_date) AS first_date, MAX(attendance_date) AS last_date,
            COUNT(DISTINCT attendance_date) AS classDays
     FROM attendance WHERE student_id = ?`, [studentId]);
  const r = rows[0];
  if (!r.total) return { studentId, error: 'No attendance records for this student.' };
  const absent = r.total - r.present;
  // Estimate remaining classes: semester runs ~100 class days.
  const estSemesterDays = 100;
  const remaining = Math.max(0, estSemesterDays - r.classDays);
  const projection = computeProjection(att.overallPercentage, r.classDays, absent, remaining);
  return { studentId, range: { firstDate: r.first_date, lastDate: r.last_date }, classDays: r.classDays, ...projection };
}

// Fee-risk: deterministic per-student + roll-up.
async function getFeeRisk() {
  const risks = await riskService.batchRisk();
  const [feeRows] = await pool.query(
    `SELECT s.id, s.name, s.branch, s.semester, f.status, f.total_fees,
            ROUND(f.total_fees - COALESCE((SELECT SUM(p.amount) FROM fee_payments p WHERE p.fee_id = f.id), 0), 2) AS outstanding,
            f.due_date,
            DATEDIFF(CURDATE(), f.due_date) AS daysOverdue
     FROM fees f JOIN students s ON s.id = f.student_id`
  );
  const list = feeRows.map(f => {
    const ratio = Number(f.total_fees) ? Number(f.outstanding) / Number(f.total_fees) : 0;
    let score = Math.round(ratio * 60 + (f.daysOverdue > 0 ? Math.min(40, f.daysOverdue) : 0));
    if (f.status === 'Paid') score = 0;
    let level = 'LOW';
    if (score >= 70) level = 'HIGH';
    else if (score >= 35) level = 'MODERATE';
    return {
      student: { id: f.id, name: f.name, branch: f.branch, semester: f.semester },
      status: f.status, totalFees: Number(f.total_fees), outstanding: Number(f.outstanding),
      dueDate: f.due_date, daysOverdue: f.daysOverdue, score, level,
      riskFactor: ratio > 0.6 || f.daysOverdue > 30 ? 'high' : (ratio > 0 ? 'moderate' : 'none'),
    };
  });
  const byRisk = list.reduce((acc, f) => { acc[f.level] = (acc[f.level] || 0) + 1; return acc; }, {});
  return {
    summary: {
      totalStudents: list.length,
      withArrears: list.filter(f => f.outstanding > 0).length,
      high: byRisk.HIGH || 0, moderate: byRisk.MODERATE || 0, low: byRisk.LOW || 0,
      totalOutstanding: list.reduce((a, f) => a + f.outstanding, 0),
    },
    list: list.sort((a, b) => b.score - a.score),
  };
}

module.exports = { getAttendanceForecast, getFeeRisk, ATTENDANCE_THRESHOLD };
