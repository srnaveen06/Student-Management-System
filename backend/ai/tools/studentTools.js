// Safe read-only tools for student data. These functions are the ONLY way the
// AI layer reads student records. All params are already validated/whitelisted
// by ai/validators before reaching here. Numbers used in LIMIT/OFFSET are
// pre-validated integers (mysql2 cannot bind LIMIT placeholders).

const pool = require('../../config/db');

const ADMITTED = ['super_admin', 'admin'];
const ADMITTED_OR_TEACHER = ['super_admin', 'admin', 'teacher'];
const ADMITTED_OR_ACCOUNTANT = ['super_admin', 'admin', 'accountant'];

function hasRole(user, roles) {
  return user && user.role && roles.includes(user.role);
}

function int(n, fallback) {
  const v = Number(n);
  return Number.isInteger(v) && v > 0 ? v : fallback;
}

// Build the SELECT column list + base join for student summaries.
const BASE_SQL = `
  SELECT s.id, s.student_id, s.enrollment_number, s.name, s.email, s.phone,
         s.gender, s.branch, s.semester, s.admission_year, s.cgpa, s.status,
         s.institute, s.city, s.state
  FROM students s
`;

async function getStudentById(ctx, { id }) {
  const sid = int(id, 0);
  if (!sid) return { error: 'A valid student id is required.' };
  const [rows] = await pool.query(`${BASE_SQL} WHERE s.id = ?`, [sid]);
  if (!rows.length) return { error: `No student found with id ${sid}.` };
  return { student: rows[0] };
}

async function getStudentAttendance(ctx, { studentId, subjectId }) {
  const sid = int(studentId, 0);
  if (!sid) return { error: 'A valid student id is required.' };
  let query = `SELECT a.subject_id, su.subject_name, a.attendance_date, a.status
               FROM attendance a
               JOIN subjects su ON su.id = a.subject_id
               WHERE a.student_id = ?`;
  const params = [sid];
  if (subjectId) { query += ' AND a.subject_id = ?'; params.push(int(subjectId)); }
  query += ' ORDER BY su.subject_name, a.attendance_date';
  const [rows] = await pool.query(query, params);

  const bySubject = {};
  for (const r of rows) {
    if (!bySubject[r.subject_id]) {
      bySubject[r.subject_id] = { subjectId: r.subject_id, subjectName: r.subject_name, present: 0, total: 0, records: [] };
    }
    const s = bySubject[r.subject_id];
    s.total += 1;
    if (r.status === 'Present' || r.status === 'Approved Leave') s.present += 1;
    s.records.push({ date: r.attendance_date, status: r.status });
  }
  const subjects = Object.values(bySubject).map(s => ({
    ...s,
    percentage: s.total ? Math.round((s.present / s.total) * 1000) / 10 : 0,
  }));
  const overallPresent = subjects.reduce((a, s) => a + s.present, 0);
  const overallTotal = subjects.reduce((a, s) => a + s.total, 0);
  return {
    studentId: sid,
    overallPercentage: overallTotal ? Math.round((overallPresent / overallTotal) * 1000) / 10 : 0,
    subjects,
  };
}

async function getStudentMarks(ctx, { studentId }) {
  const sid = int(studentId, 0);
  if (!sid) return { error: 'A valid student id is required.' };
  const [rows] = await pool.query(
    `SELECT m.id, m.examination_id, e.exam_name, e.max_marks, su.id AS subject_id,
            su.subject_name, su.subject_code, m.internal_marks, m.external_marks,
            m.practical_marks, m.assignment_marks, m.total_marks, m.percentage,
            m.grade, m.gpa
     FROM marks m
     JOIN examinations e ON e.id = m.examination_id
     JOIN subjects su ON su.id = m.subject_id
     WHERE m.student_id = ?
     ORDER BY su.subject_name, e.exam_date`,
    [sid]
  );
  const bySubject = {};
  for (const r of rows) {
    if (!bySubject[r.subject_id]) {
      bySubject[r.subject_id] = { subjectId: r.subject_id, subjectName: r.subject_name, subjectCode: r.subject_code, exams: [] };
    }
    bySubject[r.subject_id].exams.push({
      examinationId: r.examination_id, examName: r.exam_name, maxMarks: r.max_marks,
      total: r.total_marks, percentage: r.percentage, grade: r.grade, gpa: r.gpa,
    });
  }
  const subjects = Object.values(bySubject).map(s => {
    const avgPct = s.exams.reduce((a, e) => a + Number(e.percentage), 0) / (s.exams.length || 1);
    const avgGpa = s.exams.reduce((a, e) => a + Number(e.gpa || 0), 0) / (s.exams.length || 1);
    return { ...s, averagePercentage: Math.round(avgPct * 10) / 10, averageGpa: Math.round(avgGpa * 100) / 100 };
  });
  const allPct = subjects.flatMap(s => s.exams.map(e => Number(e.percentage)));
  return {
    studentId: sid,
    overallAverage: allPct.length ? Math.round((allPct.reduce((a, b) => a + b, 0) / allPct.length) * 10) / 10 : null,
    subjects,
  };
}

async function getStudentFees(ctx, { studentId }) {
  const sid = int(studentId, 0);
  if (!sid) return { error: 'A valid student id is required.' };
  const [feeRows] = await pool.query(
    'SELECT f.id, f.total_fees, f.due_date, f.status FROM fees f WHERE f.student_id = ? ORDER BY f.id DESC LIMIT 1',
    [sid]
  );
  if (!feeRows.length) return { studentId: sid, fee: null, payments: [], paid: 0, outstanding: 0 };
  const fee = feeRows[0];
  const [payments] = await pool.query(
    'SELECT amount, payment_date, method, reference, receipt_number FROM fee_payments WHERE fee_id = ? ORDER BY payment_date',
    [fee.id]
  );
  const paid = payments.reduce((a, p) => a + Number(p.amount), 0);
  const outstanding = Math.max(0, Number(fee.total_fees) - paid);
  return { studentId: sid, fee, payments, paid, outstanding };
}

async function getRecentStudents(ctx, { limit }) {
  const n = int(limit, 10);
  const [rows] = await pool.query(`${BASE_SQL} ORDER BY s.created_at DESC LIMIT ?`, [Math.min(n, 50)]);
  return { students: rows };
}

// Search with the validated filter object. Mirrors the student list page filters.
async function searchStudents(ctx, f) {
  const where = [];
  const params = [];

  if (f.search) {
    where.push(`(s.name LIKE ? OR s.student_id LIKE ? OR s.email LIKE ? OR s.enrollment_number LIKE ?)`);
    const like = `%${f.search}%`;
    params.push(like, like, like, like);
  }
  if (f.branch) { where.push('s.branch = ?'); params.push(f.branch); }
  if (f.semester) { where.push('s.semester = ?'); params.push(f.semester); }
  if (f.gender) { where.push('s.gender = ?'); params.push(f.gender); }
  if (f.status) { where.push('s.status = ?'); params.push(f.status); }
  if (f.institute) { where.push('s.institute LIKE ?'); params.push(`%${f.institute}%`); }
  if (f.admissionYear) { where.push('s.admission_year = ?'); params.push(f.admissionYear); }
  if (f.admissionYearAfter) { where.push('s.admission_year >= ?'); params.push(f.admissionYearAfter); }
  if (f.minCGPA !== null) { where.push('s.cgpa >= ?'); params.push(f.minCGPA); }
  if (f.maxCGPA !== null) { where.push('s.cgpa <= ?'); params.push(f.maxCGPA); }
  if (f.minAttendance !== null || f.maxAttendance !== null) {
    const op = f.maxAttendance !== null ? '<=' : '>=';
    const val = f.maxAttendance !== null ? f.maxAttendance : f.minAttendance;
    where.push(`EXISTS (
      SELECT 1 FROM (
        SELECT a.student_id, AVG(a.status IN ('Present', 'Approved Leave')) * 100 AS pct
        FROM attendance a GROUP BY a.student_id
      ) att WHERE att.student_id = s.id AND att.pct ${op} ?
    )`);
    params.push(val);
  }
  if (f.subjectId) {
    where.push(`EXISTS (SELECT 1 FROM student_subjects ss WHERE ss.student_id = s.id AND ss.subject_id = ?)`);
    params.push(f.subjectId);
  }
  if (f.feeStatus || f.feeOutstandingMin !== null) {
    where.push(`EXISTS (
      SELECT 1 FROM fees f
      WHERE f.student_id = s.id
        AND (? IS NULL OR f.status = ?)
        AND (? IS NULL OR (f.total_fees - COALESCE((SELECT SUM(p.amount) FROM fee_payments p WHERE p.fee_id = f.id), 0)) >= ?)
    )`);
    params.push(f.feeStatus, f.feeStatus, f.feeOutstandingMin, f.feeOutstandingMin);
  }

  const page = f.page || 1;
  const limit = Math.min(f.limit || 20, 50);
  const offset = (page - 1) * limit;

  let sql = BASE_SQL;
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  const [rows] = await pool.query(sql, params);
  sql += ` ORDER BY s.name LIMIT ${limit} OFFSET ${offset}`; // ints validated above
  const [pageRows] = await pool.query(sql, params);
  return { total: rows.length, page, limit, students: pageRows };
}

module.exports = {
  hasRole,
  getStudentById,
  getStudentAttendance,
  getStudentMarks,
  getStudentFees,
  getRecentStudents,
  searchStudents,
  ADMITTED,
  ADMITTED_OR_TEACHER,
  ADMITTED_OR_ACCOUNTANT,
};
