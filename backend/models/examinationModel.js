const db = require('../config/db');
const { getGrade } = require('../utils/grade');

// Compute total / percentage / grade / gpa for a mark row.
const computeMarks = (m, maxMarks) => {
  const total = Number(m.internal_marks || 0) + Number(m.external_marks || 0) +
                Number(m.practical_marks || 0) + Number(m.assignment_marks || 0);
  const percentage = Number(maxMarks) > 0 ? Number(((total / maxMarks) * 100).toFixed(2)) : 0;
  const { grade, gpa } = getGrade(percentage);
  return { total: Number(total.toFixed(2)), percentage, grade, gpa };
};

const ExaminationModel = {

  // -------- Examinations --------
  async findAllExams({ search, semester, subjectId, status, page = 1, limit = 50 }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (search) { where += ' AND (e.exam_name LIKE ? OR sub.subject_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (semester) { where += ' AND e.semester = ?'; params.push(semester); }
    if (subjectId) { where += ' AND e.subject_id = ?'; params.push(subjectId); }
    if (status) { where += ' AND e.status = ?'; params.push(status); }

    const [[count]] = await db.execute(
      `SELECT COUNT(*) AS total FROM examinations e JOIN subjects sub ON sub.id = e.subject_id ${where}`, params
    );
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 50;
    const offset = (validPage - 1) * validLimit;
    const [rows] = await db.execute(
      `SELECT e.*, sub.subject_name, sub.subject_code, sub.branch, sub.semester AS subject_semester
       FROM examinations e
       JOIN subjects sub ON sub.id = e.subject_id
       ${where}
       ORDER BY e.exam_date DESC LIMIT ${validLimit} OFFSET ${offset}`,
      params
    );
    return { exams: rows, total: count.total, page: validPage, totalPages: Math.ceil(count.total / validLimit) };
  },

  async findExamById(id) {
    const [rows] = await db.execute(
      `SELECT e.*, sub.subject_name, sub.subject_code, sub.branch, sub.semester
       FROM examinations e
       JOIN subjects sub ON sub.id = e.subject_id
       WHERE e.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async createExam(data) {
    const [result] = await db.execute(
      `INSERT INTO examinations (exam_name, academic_year, semester, exam_date, subject_id, max_marks, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.exam_name, data.academic_year || null, data.semester, data.exam_date || null,
        data.subject_id, data.max_marks || 100, data.status || 'Scheduled']
    );
    return this.findExamById(result.insertId);
  },

  async updateExam(id, data) {
    const fields = [];
    const values = [];
    for (const [k, v] of Object.entries({
      exam_name: data.exam_name, academic_year: data.academic_year, semester: data.semester,
      exam_date: data.exam_date, subject_id: data.subject_id, max_marks: data.max_marks, status: data.status
    })) {
      if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); }
    }
    if (fields.length === 0) return this.findExamById(id);
    values.push(id);
    await db.execute(`UPDATE examinations SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findExamById(id);
  },

  async deleteExam(id) {
    const [result] = await db.execute('DELETE FROM examinations WHERE id = ?', [id]);
    return result.affectedRows;
  },

  // Students eligible for an exam entry = students of the exam subject's branch+semester.
  async getExamEntry(examId) {
    const exam = await this.findExamById(examId);
    if (!exam) return null;

    const [students] = await db.execute(
      `SELECT s.id, s.student_id, s.name, s.image
       FROM students s
       WHERE s.branch = ? AND s.semester = ?
       ORDER BY s.name ASC`,
      [exam.branch, exam.semester]
    );

    const [existing] = await db.execute('SELECT * FROM marks WHERE examination_id = ?', [examId]);

    const rows = students.map(s => {
      const mark = existing.find(m => m.student_id === s.id);
      return { ...s, mark: mark || null };
    });

    return { exam, rows };
  },

  // -------- Marks --------
  async saveMarks({ examId, rows }) {
    const exam = await this.findExamById(examId);
    if (!exam) throw new Error('Exam not found');
    const maxMarks = Number(exam.max_marks);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const r of rows) {
        const internal = Number(r.internal_marks) || 0;
        const external = Number(r.external_marks) || 0;
        const practical = Number(r.practical_marks) || 0;
        const assignment = Number(r.assignment_marks) || 0;

        if (internal < 0 || external < 0 || practical < 0 || assignment < 0) {
          throw new Error('Marks cannot be negative');
        }
        if (internal + external + practical + assignment > maxMarks + 0.001) {
          throw new Error(`Total marks cannot exceed ${maxMarks}`);
        }

        const computed = computeMarks({ internal_marks: internal, external_marks: external, practical_marks: practical, assignment_marks: assignment }, maxMarks);

        await conn.execute(
          `INSERT INTO marks (student_id, examination_id, subject_id, internal_marks, external_marks,
                              practical_marks, assignment_marks, total_marks, percentage, grade, gpa)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             internal_marks = VALUES(internal_marks),
             external_marks = VALUES(external_marks),
             practical_marks = VALUES(practical_marks),
             assignment_marks = VALUES(assignment_marks),
             total_marks = VALUES(total_marks),
             percentage = VALUES(percentage),
             grade = VALUES(grade),
             gpa = VALUES(gpa)`,
          [r.studentId, examId, exam.subject_id, internal, external, practical, assignment,
            computed.total, computed.percentage, computed.grade, computed.gpa]
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

  async updateSingleMark(markId, data) {
    const [rows] = await db.execute('SELECT * FROM marks WHERE id = ?', [markId]);
    if (rows.length === 0) throw new Error('Mark not found');
    const mark = rows[0];

    const internal = Number(data.internal_marks ?? mark.internal_marks);
    const external = Number(data.external_marks ?? mark.external_marks);
    const practical = Number(data.practical_marks ?? mark.practical_marks);
    const assignment = Number(data.assignment_marks ?? mark.assignment_marks);

    const [[examRow]] = await db.execute('SELECT max_marks FROM examinations WHERE id = ?', [mark.examination_id]);
    const maxMarks = Number(examRow?.max_marks || 100);
    const computed = computeMarks({ internal_marks: internal, external_marks: external, practical_marks: practical, assignment_marks: assignment }, maxMarks);

    await db.execute(
      `UPDATE marks SET internal_marks = ?, external_marks = ?, practical_marks = ?,
       assignment_marks = ?, total_marks = ?, percentage = ?, grade = ?, gpa = ? WHERE id = ?`,
      [internal, external, practical, assignment, computed.total, computed.percentage, computed.grade, computed.gpa, markId]
    );
    return this.findMarkById(markId);
  },

  async findMarkById(id) {
    const [rows] = await db.execute(
      `SELECT m.*, s.name, s.student_id, sub.subject_name, sub.subject_code, e.exam_name, e.max_marks
       FROM marks m
       JOIN students s ON s.id = m.student_id
       JOIN subjects sub ON sub.id = m.subject_id
       JOIN examinations e ON e.id = m.examination_id
       WHERE m.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async getMarks({ examId, studentId, search, page = 1, limit = 50 }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (examId) { where += ' AND m.examination_id = ?'; params.push(examId); }
    if (studentId) { where += ' AND m.student_id = ?'; params.push(studentId); }
    if (search) { where += ' AND (s.name LIKE ? OR s.student_id LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 50;
    const offset = (validPage - 1) * validLimit;
    const [rows] = await db.execute(
      `SELECT m.*, s.name, s.student_id, sub.subject_name, sub.subject_code, e.exam_name
       FROM marks m
       JOIN students s ON s.id = m.student_id
       JOIN subjects sub ON sub.id = m.subject_id
       JOIN examinations e ON e.id = m.examination_id
       ${where} ORDER BY e.exam_date DESC LIMIT ${validLimit} OFFSET ${offset}`,
      params
    );
    const [[count]] = await db.execute(
      `SELECT COUNT(*) AS total FROM marks m JOIN students s ON s.id = m.student_id ${where}`, params
    );
    return { marks: rows, total: count.total, page: validPage, totalPages: Math.ceil(count.total / validLimit) };
  },

  // Marksheet data for a student in a given semester (or all).
  async getMarksheet(studentId, semester = null) {
    const [[student]] = await db.execute(
      `SELECT s.*, fe.total_fees, fe.paid_fees
       FROM students s
       LEFT JOIN (SELECT f.student_id, SUM(total_fees) AS total_fees, COALESCE(SUM(p.amount),0) AS paid_fees
                  FROM fees f LEFT JOIN fee_payments p ON p.fee_id = f.id GROUP BY f.student_id) fe ON fe.student_id = s.id
       WHERE s.id = ?`,
      [studentId]
    );
    if (!student) return null;

    let sql = `SELECT m.*, sub.subject_name, sub.subject_code, e.exam_name, e.academic_year
               FROM marks m
               JOIN subjects sub ON sub.id = m.subject_id
               JOIN examinations e ON e.id = m.examination_id
               WHERE m.student_id = ?`;
    const params = [studentId];
    if (semester) { sql += ' AND e.semester = ?'; params.push(semester); }
    sql += ' ORDER BY e.semester, sub.subject_name';

    const [marks] = await db.execute(sql, params);

    const gpaList = marks.map(m => Number(m.gpa)).filter(g => g > 0);
    const cgpa = gpaList.length > 0 ? (gpaList.reduce((a, b) => a + b, 0) / gpaList.length).toFixed(2) : null;
    const passed = marks.every(m => m.grade !== 'F');

    return { student, marks, cgpa, result: passed ? 'PASS' : 'FAIL', semester: semester || 'All' };
  }
};

module.exports = ExaminationModel;
