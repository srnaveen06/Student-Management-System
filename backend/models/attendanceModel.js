const db = require('../config/db');

const AttendanceModel = {

  // Students belonging to branch+semester, with their attendance for a given date+subject.
  async studentsForMarking({ branch, semester, subjectId, date }) {
    const where = ['s.status = ?'];
    const params = ['Active'];
    if (branch) { where.push('s.branch = ?'); params.push(branch); }
    if (semester) { where.push('s.semester = ?'); params.push(semester); }

    const [rows] = await db.execute(
      `SELECT s.id, s.student_id, s.name, s.image, s.branch, s.semester,
              (SELECT a.status FROM attendance a
               WHERE a.student_id = s.id AND a.subject_id = ? AND a.attendance_date = ?) AS current_status
       FROM students s
       WHERE ${where.join(' AND ')}
       ORDER BY s.name ASC`,
      [subjectId, date, ...params]
    );
    return rows;
  },

  // Upsert attendance for a list of students. Transaction ensures atomicity.
  async saveAttendance({ rows, subjectId, date, markedBy }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const r of rows) {
        await conn.execute(
          `INSERT INTO attendance (student_id, subject_id, attendance_date, status, marked_by)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)`,
          [r.studentId, subjectId, date, r.status === 'Present' ? 'Present' : 'Absent', markedBy]
        );
      }
      await conn.commit();
      return { affected: rows.length };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // Attendance records list (joined view) with filters.
  async getOverview({ search, branch, semester, subjectId, dateFrom, dateTo, page = 1, limit = 50 }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (search) {
      where += ' AND (s.name LIKE ? OR s.student_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (branch) { where += ' AND s.branch = ?'; params.push(branch); }
    if (semester) { where += ' AND s.semester = ?'; params.push(semester); }
    if (subjectId) { where += ' AND a.subject_id = ?'; params.push(subjectId); }
    if (dateFrom) { where += ' AND a.attendance_date >= ?'; params.push(dateFrom); }
    if (dateTo) { where += ' AND a.attendance_date <= ?'; params.push(dateTo); }

    const [[count]] = await db.execute(
      `SELECT COUNT(*) AS total FROM attendance a JOIN students s ON s.id = a.student_id ${where}`, params
    );
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 50;
    const offset = (validPage - 1) * validLimit;
    const [rows] = await db.execute(
      `SELECT a.*, s.name, s.student_id, s.branch, s.semester, sub.subject_name, sub.subject_code
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       JOIN subjects sub ON sub.id = a.subject_id
       ${where}
       ORDER BY a.attendance_date DESC, s.name ASC
       LIMIT ${validLimit} OFFSET ${offset}`,
      params
    );
    return { records: rows, total: count.total, page: validPage, totalPages: Math.ceil(count.total / validLimit) };
  },

  // Per-student summary: overall + per subject + date-wise history.
  async getStudentSummary(studentId) {
    const [overall] = await db.execute(
      `SELECT COUNT(*) AS total,
               SUM(status IN ('Present', 'Approved Leave')) AS present,
               SUM(status = 'Absent') AS absent
       FROM attendance WHERE student_id = ?`,
      [studentId]
    );

    const [bySubject] = await db.execute(
      `SELECT sub.subject_name, sub.subject_code,
              COUNT(a.id) AS total,
              SUM(a.status IN ('Present', 'Approved Leave')) AS present,
              SUM(a.status = 'Absent') AS absent
       FROM attendance a
       JOIN subjects sub ON sub.id = a.subject_id
       WHERE a.student_id = ?
       GROUP BY sub.id, sub.subject_name, sub.subject_code`,
      [studentId]
    );

    const [history] = await db.execute(
      `SELECT a.*, sub.subject_name
       FROM attendance a
       JOIN subjects sub ON sub.id = a.subject_id
       WHERE a.student_id = ?
       ORDER BY a.attendance_date DESC LIMIT 200`,
      [studentId]
    );

    const o = overall[0] || { total: 0, present: 0, absent: 0 };
    return {
      overall: { ...o, percentage: o.total > 0 ? Math.round((o.present / o.total) * 100) : null },
      bySubject,
      history
    };
  },

  // Students below a given attendance threshold (used for dashboard warning).
  async lowAttendance(threshold) {
    const [rows] = await db.execute(
      `SELECT s.id, s.student_id, s.name, s.branch, s.semester,
              COUNT(a.id) AS total,
              SUM(a.status IN ('Present', 'Approved Leave')) AS present,
              ROUND((SUM(a.status IN ('Present', 'Approved Leave')) / COUNT(a.id)) * 100, 1) AS percentage
       FROM students s
       JOIN attendance a ON a.student_id = s.id
       GROUP BY s.id, s.student_id, s.name, s.branch, s.semester
       HAVING percentage < ?
       ORDER BY percentage ASC`,
      [threshold]
    );
    return rows;
  }
};

module.exports = AttendanceModel;
