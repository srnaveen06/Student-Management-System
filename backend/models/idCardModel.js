const db = require('../config/db');
const crypto = require('crypto');

const IDCardModel = {

  // All ID cards with student info + filters.
  async findAll({ search, status, page = 1, limit = 10 }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (search) { where += ' AND (s.name LIKE ? OR s.student_id LIKE ? OR c.card_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (status) { where += ' AND c.status = ?'; params.push(status); }

    const [[count]] = await db.execute(
      `SELECT COUNT(*) AS total FROM student_id_cards c JOIN students s ON s.id = c.student_id ${where}`, params
    );
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 10;
    const offset = (validPage - 1) * validLimit;

    const [rows] = await db.execute(
      `SELECT c.id, c.card_number, c.verification_token, c.status, c.issued_on, c.valid_until, c.issued_by,
              s.id AS student_id, s.name, s.student_id AS roll_number, s.branch, s.semester, s.image
       FROM student_id_cards c
       JOIN students s ON s.id = c.student_id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT ${validLimit} OFFSET ${offset}`,
      params
    );

    return { cards: rows, total: count.total, page: validPage, totalPages: Math.ceil(count.total / validLimit) };
  },

  // Status distribution of all cards.
  async getSummary() {
    const [[rows]] = await db.execute(
      `SELECT
         COALESCE(SUM(status = 'Active'), 0) AS active,
         COALESCE(SUM(status = 'Inactive'), 0) AS inactive,
         COALESCE(SUM(status = 'Revoked'), 0) AS revoked,
         COUNT(*) AS total
       FROM student_id_cards`
    );
    const [[students]] = await db.execute('SELECT COUNT(*) AS total FROM students');
    return {
      active: rows.active, inactive: rows.inactive, revoked: rows.revoked,
      total: rows.total, studentsWithoutCard: students.total - rows.total
    };
  },

  // A single student's card (admins / profile tab).
  async findByStudent(studentId) {
    const [rows] = await db.execute(
      `SELECT c.*, s.name, s.student_id AS roll_number, s.branch, s.semester, s.email, s.phone, s.image
       FROM student_id_cards c JOIN students s ON s.id = c.student_id
       WHERE c.student_id = ?`,
      [studentId]
    );
    return rows[0] || null;
  },

  // Public verification lookup — exposes only non-sensitive fields.
  async findByToken(token) {
    const [rows] = await db.execute(
      `SELECT c.card_number, c.status, c.issued_on, c.valid_until,
              s.id AS student_id, s.name, s.student_id AS roll_number, s.branch, s.semester, s.image
       FROM student_id_cards c JOIN students s ON s.id = c.student_id
       WHERE c.verification_token = ?`,
      [token]
    );
    return rows[0] || null;
  },

  // Generate or regenerate a card for a student (idempotent upsert).
  async upsert({ studentId, issuedOn, validUntil, issuedBy }) {
    const [[student]] = await db.execute(
      'SELECT student_id, email FROM students WHERE id = ?', [studentId]
    );
    if (!student) return null;

    const year = new Date().getFullYear();
    const cardNumber = `SID-${year}-${String(studentId).padStart(4, '0')}`;
    const token = crypto.createHash('sha256')
      .update(`${student.student_id}|${student.email}|${crypto.randomUUID()}|${Math.random()}`)
      .digest('hex');

    const [result] = await db.execute(
      `INSERT INTO student_id_cards
         (student_id, card_number, verification_token, issued_on, valid_until, status, issued_by)
       VALUES (?, ?, ?, ?, ?, 'Active', ?)
       ON DUPLICATE KEY UPDATE
         card_number = VALUES(card_number),
         verification_token = VALUES(verification_token),
         issued_on = VALUES(issued_on),
         valid_until = VALUES(valid_until),
         status = 'Active',
         issued_by = VALUES(issued_by)`,
      [studentId, cardNumber, token, issuedOn || null, validUntil || null, issuedBy || null]
    );
    return this.findByStudent(studentId);
  },

  // Update status / validity of a card.
  async update(id, { status, issuedOn, validUntil }) {
    const [result] = await db.execute(
      `UPDATE student_id_cards
       SET status = ?, issued_on = COALESCE(?, issued_on), valid_until = COALESCE(?, valid_until)
       WHERE id = ?`,
      [status || 'Active', issuedOn || null, validUntil || null, id]
    );
    return result.affectedRows;
  },

  async delete(id) {
    const [rows] = await db.execute('SELECT * FROM student_id_cards WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    await db.execute('DELETE FROM student_id_cards WHERE id = ?', [id]);
    return rows[0];
  }
};

module.exports = IDCardModel;
