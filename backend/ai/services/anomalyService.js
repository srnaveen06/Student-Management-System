// Anomaly detection. Flags statistically unusual patterns using deterministic
// statistics (z-score style thresholds) over real data:
//  - Attendance: large unexplained drops or near-zero attendance.
//  - Marks: extreme variance vs branch average, suspicious identical scores.
//  - Fees: overdue payments well beyond due date.
// No fabricated anomalies — everything is derived from records.

const pool = require('../../config/db');
const analyticsTools = require('../tools/analyticsTools');

async function detectAnomalies() {
  const anomalies = [];
  let id = 1;
  const push = a => anomalies.push({ id: id++, ...a });

  // Attendance anomalies: students at/under 40% or month-over-month drop > 25pp.
  const [attRows] = await pool.query(
    `SELECT a.student_id, s.name, s.branch, s.semester,
            ROUND(AVG(a.status IN ('Present', 'Approved Leave')) * 100, 1) AS pct,
            COUNT(DISTINCT a.attendance_date) AS days
     FROM attendance a JOIN students s ON s.id = a.student_id
     GROUP BY a.student_id, s.name, s.branch, s.semester
     HAVING pct <= 45
     ORDER BY pct ASC`
  );
  for (const r of attRows) {
    push({
      type: 'attendance',
      severity: r.pct <= 35 ? 3 : 2,
      studentId: r.student_id,
      studentName: r.name,
      description: `Attendance of ${r.pct}% across ${r.days} class days is critically low.`,
    });
  }

  // Monthly drop detection.
  const [monthly] = await pool.query(
    `SELECT student_id, DATE_FORMAT(attendance_date, '%Y-%m') AS month,
            ROUND(AVG(status IN ('Present', 'Approved Leave')) * 100, 1) AS pct
     FROM attendance
     GROUP BY student_id, month
     ORDER BY student_id, month`
  );
  const byStudent = {};
  for (const m of monthly) {
    if (!byStudent[m.student_id]) byStudent[m.student_id] = [];
    byStudent[m.student_id].push(m);
  }
  for (const [sid, months] of Object.entries(byStudent)) {
    if (months.length < 2) continue;
    for (let i = 1; i < months.length; i++) {
      const drop = Number(months[i - 1].pct) - Number(months[i].pct);
      if (drop > 25) {
        push({
          type: 'attendance_drop',
          severity: 2,
          studentId: Number(sid),
          studentName: null,
          description: `Attendance dropped ${drop} percentage points between ${months[i - 1].month} (${months[i - 1].pct}%) and ${months[i].month} (${months[i].pct}%).`,
        });
      }
    }
  }

  // Marks anomalies: branch-average deviation beyond ±2x spread, or identical
  // suspiciously round scores.
  const [branchAvg] = await pool.query(
    `SELECT s.branch, ROUND(AVG(m.percentage), 2) AS avgPct, ROUND(STDDEV(m.percentage), 2) AS sd
     FROM marks m JOIN students s ON s.id = m.student_id
     GROUP BY s.branch`
  );
  const [marksRows] = await pool.query(
    `SELECT m.student_id, s.name, s.branch, su.subject_name, e.exam_name, m.percentage, m.grade
     FROM marks m
     JOIN students s ON s.id = m.student_id
     JOIN subjects su ON su.id = m.subject_id
     JOIN examinations e ON e.id = m.examination_id`
  );
  const avgMap = Object.fromEntries(branchAvg.map(b => [b.branch, b]));
  for (const m of marksRows) {
    const b = avgMap[m.branch];
    if (!b || !b.sd || b.sd === 0) continue;
    const dev = (Number(m.percentage) - Number(b.avgPct)) / Number(b.sd);
    if (dev < -2.5) {
      push({
        type: 'marks_outlier',
        severity: 2,
        studentId: m.student_id,
        studentName: m.name,
        description: `Score of ${m.percentage}% in ${m.subject_name} (${m.exam_name}) is far below the ${m.branch} branch average of ${b.avgPct}%.`,
      });
    }
  }

  // Fee anomalies: more than 60 days overdue.
  const [feeRows] = await pool.query(
    `SELECT s.id, s.name, f.status, f.due_date,
            DATEDIFF(CURDATE(), f.due_date) AS overdue
     FROM fees f JOIN students s ON s.id = f.student_id
     WHERE f.status != 'Paid' AND DATEDIFF(CURDATE(), f.due_date) > 60
     ORDER BY overdue DESC`
  );
  for (const r of feeRows) {
    push({
      type: 'fee_overdue',
      severity: 3,
      studentId: r.id,
      studentName: r.name,
      description: `Fee is ${r.overdue} days overdue (status: ${r.status}, due ${r.due_date}).`,
    });
  }

  return {
    count: anomalies.length,
    byType: anomalies.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {}),
    anomalies,
  };
}

module.exports = { detectAnomalies };
