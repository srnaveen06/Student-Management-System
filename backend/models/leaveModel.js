const db = require('../config/db');

// Normalize a value (JS Date from mysql2 or a YYYY-MM-DD string) to a YYYY-MM-DD string.
const toDateStr = (d) => {
  if (d instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return String(d);
};

// Build the list of ISO dates between two dates (inclusive).
const dateRange = (fromDate, toDate) => {
  const dates = [];
  const pad = (n) => String(n).padStart(2, '0');
  const cursor = new Date(`${toDateStr(fromDate)}T00:00:00`);
  const end = new Date(`${toDateStr(toDate)}T00:00:00`);
  while (cursor <= end) {
    dates.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const LeaveModel = {

  // Leave requests list (joined with student) + filters.
  async findAll({ search, status, leaveType, studentId, dateFrom, dateTo, page = 1, limit = 10 }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (search) { where += ' AND (s.name LIKE ? OR s.student_id LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (status) { where += ' AND l.status = ?'; params.push(status); }
    if (leaveType) { where += ' AND l.leave_type = ?'; params.push(leaveType); }
    if (studentId) { where += ' AND l.student_id = ?'; params.push(studentId); }
    if (dateFrom) { where += ' AND l.from_date >= ?'; params.push(dateFrom); }
    if (dateTo) { where += ' AND l.to_date <= ?'; params.push(dateTo); }

    const [[count]] = await db.execute(
      `SELECT COUNT(*) AS total FROM leave_requests l JOIN students s ON s.id = l.student_id ${where}`, params
    );
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 10;
    const offset = (validPage - 1) * validLimit;

    const [rows] = await db.execute(
      `SELECT l.*, s.name, s.student_id AS roll_number, s.branch, s.semester,
              req.name AS requested_by_name, appr.name AS approved_by_name
       FROM leave_requests l
       JOIN students s ON s.id = l.student_id
       LEFT JOIN admins req ON req.id = l.requested_by
       LEFT JOIN admins appr ON appr.id = l.approved_by
       ${where}
       ORDER BY l.created_at DESC
       LIMIT ${validLimit} OFFSET ${offset}`,
      params
    );

    return { leaves: rows, total: count.total, page: validPage, totalPages: Math.ceil(count.total / validLimit) };
  },

  // Leave requests for a single student (profile tab).
  async findByStudent(studentId, { page = 1, limit = 20 } = {}) {
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 20;
    const offset = (validPage - 1) * validLimit;
    const [rows] = await db.execute(
      `SELECT l.*, s.name, s.student_id AS roll_number, req.name AS requested_by_name, appr.name AS approved_by_name
       FROM leave_requests l
       JOIN students s ON s.id = l.student_id
       LEFT JOIN admins req ON req.id = l.requested_by
       LEFT JOIN admins appr ON appr.id = l.approved_by
       WHERE l.student_id = ?
       ORDER BY l.created_at DESC
       LIMIT ${validLimit} OFFSET ${offset}`,
      [studentId]
    );
    const [[count]] = await db.execute(
      'SELECT COUNT(*) AS total FROM leave_requests WHERE student_id = ?', [studentId]
    );
    return { leaves: rows, total: count.total, page: validPage, totalPages: Math.ceil(count.total / validLimit) };
  },

  // Status distribution across all requests (leave management summary cards).
  async getSummary() {
    const [[rows]] = await db.execute(
      `SELECT
         COALESCE(SUM(status = 'Pending'), 0) AS pending,
         COALESCE(SUM(status = 'Approved'), 0) AS approved,
         COALESCE(SUM(status = 'Rejected'), 0) AS rejected,
         COALESCE(SUM(status = 'Cancelled'), 0) AS cancelled,
         COUNT(*) AS total
       FROM leave_requests`
    );
    const [[monthTotal]] = await db.execute(
      "SELECT COALESCE(SUM(days), 0) AS days FROM leave_requests WHERE status = 'Approved' AND MONTH(from_date) = MONTH(CURDATE())"
    );
    const [[pendingToday]] = await db.execute(
      "SELECT COUNT(*) AS c FROM leave_requests WHERE status = 'Pending'"
    );
    return {
      pending: rows.pending,
      approved: rows.approved,
      rejected: rows.rejected,
      cancelled: rows.cancelled,
      total: rows.total,
      approvedDaysThisMonth: monthTotal.days,
      pendingToday: pendingToday.c
    };
  },

  // Per-student leave summary (profile tab).
  async getStudentSummary(studentId) {
    const [[rows]] = await db.execute(
      `SELECT
         COALESCE(SUM(status = 'Pending'), 0) AS pending,
         COALESCE(SUM(status = 'Approved'), 0) AS approved,
         COALESCE(SUM(status = 'Rejected'), 0) AS rejected,
         COALESCE(SUM(status = 'Cancelled'), 0) AS cancelled,
         COUNT(*) AS total
       FROM leave_requests WHERE student_id = ?`,
      [studentId]
    );
    const [[approvedDays]] = await db.execute(
      "SELECT COALESCE(SUM(days), 0) AS days FROM leave_requests WHERE student_id = ? AND status = 'Approved'",
      [studentId]
    );
    const [[upcoming]] = await db.execute(
      `SELECT COUNT(*) AS c FROM leave_requests
       WHERE student_id = ? AND status = 'Approved' AND to_date >= CURDATE()`,
      [studentId]
    );
    return {
      pending: rows.pending, approved: rows.approved,
      rejected: rows.rejected, cancelled: rows.cancelled,
      total: rows.total, approvedDays: approvedDays.days,
      upcomingDays: upcoming.c
    };
  },

  // Pending leave requests count (dashboard widget).
  async getPendingCount() {
    const [[row]] = await db.execute("SELECT COUNT(*) AS c FROM leave_requests WHERE status = 'Pending'");
    return row.c;
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT l.*, s.name, s.student_id AS roll_number, s.branch, s.semester,
              req.name AS requested_by_name, appr.name AS approved_by_name
       FROM leave_requests l
       JOIN students s ON s.id = l.student_id
       LEFT JOIN admins req ON req.id = l.requested_by
       LEFT JOIN admins appr ON appr.id = l.approved_by
       WHERE l.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async create({ studentId, leaveType, fromDate, toDate, days, reason, attachment, requestedBy }) {
    const [result] = await db.execute(
      `INSERT INTO leave_requests
         (student_id, leave_type, from_date, to_date, days, reason, attachment, status, requested_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
      [studentId, leaveType || 'Casual', fromDate, toDate, days, reason || null, attachment || null, requestedBy || null]
    );
    return this.findById(result.insertId);
  },

  // Edit a (still pending) leave request.
  async update(id, { studentId, leaveType, fromDate, toDate, days, reason, attachment }) {
    const [result] = await db.execute(
      `UPDATE leave_requests
       SET student_id = ?, leave_type = ?, from_date = ?, to_date = ?, days = ?, reason = ?, attachment = ?
       WHERE id = ? AND status = 'Pending'`,
      [studentId, leaveType, fromDate, toDate, days, reason || null, attachment || null, id]
    );
    return result.affectedRows;
  },

  async delete(id) {
    const [rows] = await db.execute('SELECT * FROM leave_requests WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    await db.execute('DELETE FROM leave_requests WHERE id = ?', [id]);
    return rows[0];
  },

  // Transition a request to Approved/Rejected/Cancelled.
  async setStatus(id, { status, remarks, approvedBy }) {
    const [result] = await db.execute(
      `UPDATE leave_requests
       SET status = ?, remarks = ?, approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [status, remarks || null, approvedBy || null, id]
    );
    return result.affectedRows;
  },

  // Mark every day in [fromDate, toDate] as 'Approved Leave' for the student
  // across their enrolled subjects (falling back to branch+semester subjects).
  async markLeaveInAttendance(studentId, fromDate, toDate) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [[student]] = await conn.execute(
        'SELECT branch, semester FROM students WHERE id = ?', [studentId]
      );
      if (!student) throw new Error('Student not found');

      let [subjects] = await conn.execute(
        'SELECT subject_id FROM student_subjects WHERE student_id = ?', [studentId]
      );
      if (subjects.length === 0) {
        [subjects] = await conn.execute(
          'SELECT id AS subject_id FROM subjects WHERE branch = ? AND semester = ?',
          [student.branch, student.semester]
        );
      }
      if (subjects.length === 0) {
        await conn.commit();
        return { affected: 0, dates: 0, subjects: 0 };
      }

      const dates = dateRange(fromDate, toDate);
      let affected = 0;
      for (const d of dates) {
        for (const s of subjects) {
          const [res] = await conn.execute(
            `INSERT INTO attendance (student_id, subject_id, attendance_date, status, marked_by)
             VALUES (?, ?, ?, 'Approved Leave', ?)
             ON DUPLICATE KEY UPDATE status = 'Approved Leave', marked_by = VALUES(marked_by)`,
            [studentId, s.subject_id, d, null]
          );
          affected += res.affectedRows;
        }
      }
      await conn.commit();
      return { affected, dates: dates.length, subjects: subjects.length };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // Remove 'Approved Leave' attendance rows for the given range
  // (used when an approved leave is revoked/cancelled).
  async clearLeaveInAttendance(studentId, fromDate, toDate) {
    const [result] = await db.execute(
      `DELETE FROM attendance
       WHERE student_id = ? AND status = 'Approved Leave'
         AND attendance_date BETWEEN ? AND ?`,
      [studentId, toDateStr(fromDate), toDateStr(toDate)]
    );
    return result.affectedRows;
  },

  // Leave requests for the dashboard (recent leaves widget).
  async getRecent(limit = 5) {
    const [rows] = await db.execute(
      `SELECT l.*, s.name, s.student_id AS roll_number, s.branch, s.semester
       FROM leave_requests l
       JOIN students s ON s.id = l.student_id
       ORDER BY l.created_at DESC
       LIMIT ${Math.min(Number(limit) || 5, 20)}`
    );
    return rows;
  }
};

module.exports = LeaveModel;
