const db = require('../config/db');

const DocumentModel = {

  // All documents across students, joined with student info + filters.
  async findAll({ search, docType, page = 1, limit = 10 }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (search) { where += ' AND (s.name LIKE ? OR s.student_id LIKE ? OR d.title LIKE ? OR d.doc_type LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
    if (docType) { where += ' AND d.doc_type = ?'; params.push(docType); }

    const [[count]] = await db.execute(
      `SELECT COUNT(*) AS total FROM student_documents d JOIN students s ON s.id = d.student_id ${where}`, params
    );
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 10;
    const offset = (validPage - 1) * validLimit;

    const [rows] = await db.execute(
      `SELECT d.*, s.name, s.student_id AS roll_number, s.branch, s.semester,
              u.name AS uploaded_by_name
       FROM student_documents d
       JOIN students s ON s.id = d.student_id
       LEFT JOIN admins u ON u.id = d.uploaded_by
       ${where}
       ORDER BY d.created_at DESC
       LIMIT ${validLimit} OFFSET ${offset}`,
      params
    );

    return { documents: rows, total: count.total, page: validPage, totalPages: Math.ceil(count.total / validLimit) };
  },

  // Doc-type distribution + totals (summary cards).
  async getSummary() {
    const [byType] = await db.execute(
      `SELECT doc_type, COUNT(*) AS count FROM student_documents GROUP BY doc_type ORDER BY count DESC`
    );
    const [[totalRow]] = await db.execute('SELECT COUNT(*) AS total FROM student_documents');
    const [[studentRow]] = await db.execute(
      'SELECT COUNT(DISTINCT student_id) AS students FROM student_documents'
    );
    return {
      total: totalRow.total,
      students: studentRow.students,
      byType
    };
  }
};

module.exports = DocumentModel;
