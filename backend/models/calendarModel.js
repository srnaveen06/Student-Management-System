const db = require('../config/db');

const CalendarModel = {

  // Events list with filters + pagination.
  async findAllEvents({ search, eventType, branch, semester, month, status, page = 1, limit = 12 }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (search) { where += ' AND e.title LIKE ?'; params.push(`%${search}%`); }
    if (eventType) { where += ' AND e.event_type = ?'; params.push(eventType); }
    if (branch) { where += ' AND (e.branch = ? OR e.branch IS NULL)'; params.push(branch); }
    if (semester) { where += ' AND (e.semester = ? OR e.semester IS NULL)'; params.push(semester); }
    if (status) { where += ' AND e.status = ?'; params.push(status); }
    if (month) { where += ' AND MONTH(e.start_date) = ?'; params.push(month); }

    const [[count]] = await db.execute(
      `SELECT COUNT(*) AS total FROM academic_events e ${where}`, params
    );
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 12;
    const offset = (validPage - 1) * validLimit;

    const [rows] = await db.execute(
      `SELECT e.*, a.name AS created_by_name
       FROM academic_events e
       LEFT JOIN admins a ON a.id = e.created_by
       ${where}
       ORDER BY e.start_date ASC
       LIMIT ${validLimit} OFFSET ${offset}`,
      params
    );

    return { events: rows, total: count.total, page: validPage, totalPages: Math.ceil(count.total / validLimit) };
  },

  // Events overlapping a date range (used for calendar/agenda views).
  async findInRange(fromDate, toDate, { branch, semester } = {}) {
    let where = `WHERE e.start_date <= ? AND (e.end_date IS NULL OR e.end_date >= ?) AND e.status = 'Active'`;
    const params = [toDate, fromDate];
    if (branch) { where += ' AND (e.branch = ? OR e.branch IS NULL)'; params.push(branch); }
    if (semester) { where += ' AND (e.semester = ? OR e.semester IS NULL)'; params.push(semester); }
    const [rows] = await db.execute(
      `SELECT e.*, a.name AS created_by_name
       FROM academic_events e
       LEFT JOIN admins a ON a.id = e.created_by
       ${where}
       ORDER BY e.start_date ASC`,
      params
    );
    return rows;
  },

  // Upcoming events (dashboard widget).
  async getUpcoming(limit = 5) {
    const [rows] = await db.execute(
      `SELECT e.*, a.name AS created_by_name
       FROM academic_events e
       LEFT JOIN admins a ON a.id = e.created_by
       WHERE e.status = 'Active' AND e.end_date >= CURDATE()
       ORDER BY e.start_date ASC
       LIMIT ${Math.min(Number(limit) || 5, 20)}`
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT e.*, a.name AS created_by_name
       FROM academic_events e
       LEFT JOIN admins a ON a.id = e.created_by
       WHERE e.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async createEvent({ title, eventType, startDate, endDate, branch, semester, location, description, status, createdBy }) {
    const [result] = await db.execute(
      `INSERT INTO academic_events
         (title, event_type, start_date, end_date, branch, semester, location, description, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, eventType || 'Other', startDate,
        endDate || null, branch || null, semester || null,
        location || null, description || null, status || 'Active', createdBy || null
      ]
    );
    return this.findById(result.insertId);
  },

  async updateEvent(id, { title, eventType, startDate, endDate, branch, semester, location, description, status }) {
    const [result] = await db.execute(
      `UPDATE academic_events
       SET title = ?, event_type = ?, start_date = ?, end_date = ?, branch = ?,
           semester = ?, location = ?, description = ?, status = ?
       WHERE id = ?`,
      [
        title, eventType, startDate,
        endDate || null, branch || null, semester || null,
        location || null, description || null, status, id
      ]
    );
    return result.affectedRows;
  },

  async deleteEvent(id) {
    const [rows] = await db.execute('SELECT * FROM academic_events WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    await db.execute('DELETE FROM academic_events WHERE id = ?', [id]);
    return rows[0];
  },

  // Distinct event types (for filter dropdowns).
  async getEventTypes() {
    const [rows] = await db.execute(
      "SELECT DISTINCT event_type FROM academic_events ORDER BY event_type"
    );
    return rows.map(r => r.event_type);
  }
};

module.exports = CalendarModel;
