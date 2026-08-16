// Safe read-only analytics tools. All input is pre-validated; LIMIT/OFFSET
// values are integer literals (mysql2 cannot bind LIMIT placeholders).

const pool = require('../../config/db');

function int(n, fallback) {
  const v = Number(n);
  return Number.isInteger(v) && v > 0 ? v : fallback;
}

const byBranch = (extra = '') => `
  SELECT s.branch, COUNT(*) AS total,
         ROUND(AVG(s.cgpa), 2) AS avgCgpa,
         SUM(CASE WHEN s.status = 'Active' THEN 1 ELSE 0 END) AS active,
         AVG(s.status = 'Inactive') * 100 AS inactivePct
  FROM students s ${extra ? `WHERE ${extra}` : ''} GROUP BY s.branch ORDER BY s.branch`;

async function getDashboardStatistics() {
  const [studentCount] = await pool.query('SELECT COUNT(*) AS total FROM students');
  const [branchRows] = await pool.query(byBranch());
  const [activeCount] = await pool.query("SELECT COUNT(*) AS total FROM students WHERE status = 'Active'");
  const [attendance] = await pool.query(
    `SELECT ROUND(AVG(pct), 1) AS avgPct FROM (SELECT student_id, AVG(status IN ('Present', 'Approved Leave')) * 100 AS pct FROM attendance GROUP BY student_id) t`
  );
  const [fees] = await pool.query(
    `SELECT COALESCE(SUM(f.total_fees - COALESCE((SELECT SUM(p.amount) FROM fee_payments p WHERE p.fee_id = f.id), 0)), 0) AS outstanding
     FROM fees f`
  );
  const [feeStatus] = await pool.query('SELECT status, COUNT(*) AS total FROM fees GROUP BY status');
  const [semesters] = await pool.query(
    'SELECT semester, COUNT(*) AS total FROM students GROUP BY semester ORDER BY semester'
  );
  const [recent] = await pool.query(
    'SELECT id, name, branch, semester, status, admission_year FROM students ORDER BY created_at DESC LIMIT 6'
  );
  return {
    totalStudents: studentCount[0].total,
    activeStudents: activeCount[0].total,
    branchDistribution: branchRows,
    averageAttendance: attendance[0].avgPct || 0,
    outstandingFees: Math.round(Number(fees[0].outstanding)),
    feeStatusDistribution: feeStatus,
    semesterDistribution: semesters,
    recentStudents: recent,
  };
}

async function getBranchStatistics(ctx, { minSemester } = {}) {
  const where = [];
  const params = [];
  if (minSemester) { where.push('s.semester >= ?'); params.push(int(minSemester, 1)); }
  const rows = where.length ? await pool.query(byBranch(where.join(' AND ')), params).then(r => r[0]) : await pool.query(byBranch()).then(r => r[0]);
  const detailed = await Promise.all(rows.map(async b => {
    const [att] = await pool.query(
      `SELECT ROUND(AVG(pct), 1) AS avgPct FROM (
         SELECT a.student_id, AVG(a.status IN ('Present', 'Approved Leave')) * 100 AS pct
         FROM attendance a JOIN students s ON s.id = a.student_id
         WHERE s.branch = ? GROUP BY a.student_id
       ) t`, [b.branch]);
    const [fees] = await pool.query(
      `SELECT COALESCE(SUM(f.total_fees - COALESCE((SELECT SUM(p.amount) FROM fee_payments p WHERE p.fee_id = f.id), 0)), 0) AS outstanding
       FROM fees f JOIN students s ON s.id = f.student_id WHERE s.branch = ?`, [b.branch]);
    return {
      branch: b.branch, total: b.total, avgCgpa: b.avgCgpa, active: b.active,
      averageAttendance: att[0].avgPct || 0,
      outstandingFees: Math.round(Number(fees[0].outstanding)),
    };
  }));
  return { branches: detailed };
}

async function getSemesterStatistics(ctx, { semester } = {}) {
  const where = [];
  const params = [];
  if (semester) { where.push('s.semester = ?'); params.push(int(semester, 1)); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [sem] = await pool.query(
    `SELECT s.semester, COUNT(*) AS total, ROUND(AVG(s.cgpa), 2) AS avgCgpa
     FROM students s ${w} GROUP BY s.semester ORDER BY s.semester`, params);
  return { semesters: sem };
}

async function getAttendanceAlerts(ctx, { threshold, branch, semester } = {}) {
  const thr = Number(threshold) >= 0 && Number(threshold) <= 100 ? Number(threshold) : 75;
  const where = [];
  const params = [thr];
  if (branch) { where.push('s.branch = ?'); params.push(branch); }
  if (semester) { where.push('s.semester = ?'); params.push(int(semester, 1)); }
  const cond = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.branch, s.semester, ROUND(att.pct, 1) AS attendance
     FROM (
       SELECT a.student_id, AVG(a.status IN ('Present', 'Approved Leave')) * 100 AS pct
       FROM attendance a GROUP BY a.student_id
     ) att
     JOIN students s ON s.id = att.student_id
     ${cond} AND att.pct < ?
     ORDER BY att.pct ASC`, [...params, thr]);
  return { threshold: thr, students: rows };
}

async function getFeeAlerts(ctx, { branch, semester } = {}) {
  const where = [];
  const params = [];
  if (branch) { where.push('s.branch = ?'); params.push(branch); }
  if (semester) { where.push('s.semester = ?'); params.push(int(semester, 1)); }
  const cond = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.branch, s.semester, f.status,
            f.total_fees,
            ROUND(f.total_fees - COALESCE((SELECT SUM(p.amount) FROM fee_payments p WHERE p.fee_id = f.id), 0), 2) AS outstanding,
            f.due_date
     FROM fees f JOIN students s ON s.id = f.student_id
     ${cond}
       AND f.status IN ('Pending', 'Partially Paid')
     ORDER BY outstanding DESC`, params);
  return { students: rows };
}

async function getClassPerformance(ctx, { branch, semester, subjectId, examName } = {}) {
  const where = [];
  const params = [];
  if (branch) { where.push('s.branch = ?'); params.push(branch); }
  if (semester) { where.push('s.semester = ?'); params.push(int(semester, 1)); }
  if (subjectId) { where.push('m.subject_id = ?'); params.push(int(subjectId, 0)); }
  if (examName) { where.push('e.exam_name LIKE ?'); params.push(`%${examName}%`); }
  const cond = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT su.id AS subject_id, su.subject_name, e.id AS examination_id, e.exam_name,
            COUNT(m.id) AS attempts,
            ROUND(AVG(m.percentage), 1) AS avgPct,
            ROUND(AVG(m.gpa), 2) AS avgGpa,
            SUM(m.percentage >= 40) AS passed,
            SUM(m.percentage < 40) AS failed
     FROM marks m
     JOIN students s ON s.id = m.student_id
     JOIN subjects su ON su.id = m.subject_id
     JOIN examinations e ON e.id = m.examination_id
     ${cond}
     GROUP BY su.id, e.id
     ORDER BY su.subject_name, e.exam_name`, params);
  const subjects = rows.map(r => ({
    subjectId: r.subject_id, subjectName: r.subject_name, examinationId: r.examination_id,
    examName: r.exam_name, attempts: r.attempts,
    averagePercentage: r.avgPct, averageGpa: r.avgGpa,
    passRate: r.attempts ? Math.round((r.passed / r.attempts) * 1000) / 10 : 0,
    failedCount: r.failed,
  }));
  const avg = rows.length ? Math.round((rows.reduce((a, r) => a + Number(r.avgPct), 0) / rows.length) * 10) / 10 : null;
  return { classAverage: avg, subjects };
}

async function getExaminationResults(ctx, { examinationId, branch, semester } = {}) {
  const where = [];
  const params = [];
  if (examinationId) { where.push('m.examination_id = ?'); params.push(int(examinationId, 0)); }
  if (branch) { where.push('s.branch = ?'); params.push(branch); }
  if (semester) { where.push('s.semester = ?'); params.push(int(semester, 1)); }
  const cond = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT m.student_id, s.name, s.branch, s.semester, e.exam_name, e.id AS examination_id,
            ROUND(AVG(m.percentage), 1) AS avgPct, ROUND(AVG(m.gpa), 2) AS avgGpa,
            SUM(m.percentage >= 40) AS passed, SUM(m.percentage < 40) AS failed,
            COUNT(m.id) AS subjectsCount
     FROM marks m
     JOIN students s ON s.id = m.student_id
     JOIN examinations e ON e.id = m.examination_id
     ${cond}
     GROUP BY m.student_id, e.id
     ORDER BY avgPct DESC`, params);
  const total = rows.length;
  const passers = rows.filter(r => Number(r.failed) === 0).length;
  return {
    results: rows,
    totalCandidates: total,
    passRate: total ? Math.round((passers / total) * 1000) / 10 : 0,
  };
}

async function getSubjectList(ctx, { branch, semester } = {}) {
  const where = [];
  const params = [];
  if (branch) { where.push('branch = ?'); params.push(branch); }
  if (semester) { where.push('semester = ?'); params.push(int(semester, 1)); }
  const cond = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT id, subject_name, subject_code, branch, semester, credits, teacher
     FROM subjects ${cond} ORDER BY branch, semester, subject_name`, params);
  return { subjects: rows };
}

async function getExaminationList(ctx, { branch, semester } = {}) {
  const where = [];
  const params = [];
  if (branch) { where.push('su.branch = ?'); params.push(branch); }
  if (semester) { where.push('e.semester = ?'); params.push(int(semester, 1)); }
  const cond = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT e.id, e.exam_name, e.academic_year, e.semester, e.exam_date, e.max_marks,
            e.status, su.subject_name, su.branch
     FROM examinations e JOIN subjects su ON su.id = e.subject_id
     ${cond} ORDER BY e.exam_date DESC, su.branch`, params);
  return { examinations: rows };
}

module.exports = {
  getDashboardStatistics,
  getBranchStatistics,
  getSemesterStatistics,
  getAttendanceAlerts,
  getFeeAlerts,
  getClassPerformance,
  getExaminationResults,
  getSubjectList,
  getExaminationList,
};
