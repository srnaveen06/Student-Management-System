const db = require('../config/db');

const CourseModel = {
  // -------- Courses --------
  async findAllCourses({ search, branch, semester, status, page = 1, limit = 50 }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (search) { where += ' AND (course_name LIKE ? OR course_code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (branch) { where += ' AND branch = ?'; params.push(branch); }
    if (semester) { where += ' AND semester = ?'; params.push(semester); }
    if (status) { where += ' AND status = ?'; params.push(status); }

    const [[count]] = await db.execute(`SELECT COUNT(*) AS total FROM courses ${where}`, params);
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 50;
    const offset = (validPage - 1) * validLimit;
    const [rows] = await db.execute(
      `SELECT * FROM courses ${where} ORDER BY course_name ASC LIMIT ${validLimit} OFFSET ${offset}`,
      params
    );
    return { courses: rows, total: count.total, page: validPage, totalPages: Math.ceil(count.total / validLimit) };
  },

  async findCourseById(id) {
    const [rows] = await db.execute('SELECT * FROM courses WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async createCourse(data) {
    const [result] = await db.execute(
      `INSERT INTO courses (course_name, course_code, branch, semester, credits, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.course_name, data.course_code, data.branch || null, data.semester || null,
        data.credits || 0, data.description || null, data.status || 'Active']
    );
    return this.findCourseById(result.insertId);
  },

  async updateCourse(id, data) {
    const fields = [];
    const values = [];
    for (const [k, v] of Object.entries({
      course_name: data.course_name, course_code: data.course_code, branch: data.branch,
      semester: data.semester, credits: data.credits, description: data.description, status: data.status
    })) {
      if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); }
    }
    if (fields.length === 0) return this.findCourseById(id);
    values.push(id);
    await db.execute(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findCourseById(id);
  },

  async deleteCourse(id) {
    const [result] = await db.execute('DELETE FROM courses WHERE id = ?', [id]);
    return result.affectedRows;
  },

  // -------- Subjects --------
  async findAllSubjects({ search, branch, semester, status, page = 1, limit = 50 }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (search) { where += ' AND (subject_name LIKE ? OR subject_code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (branch) { where += ' AND branch = ?'; params.push(branch); }
    if (semester) { where += ' AND semester = ?'; params.push(semester); }
    if (status) { where += ' AND status = ?'; params.push(status); }

    const [[count]] = await db.execute(`SELECT COUNT(*) AS total FROM subjects ${where}`, params);
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 50;
    const offset = (validPage - 1) * validLimit;
    const [rows] = await db.execute(
      `SELECT * FROM subjects ${where} ORDER BY semester ASC, subject_name ASC LIMIT ${validLimit} OFFSET ${offset}`,
      params
    );
    return { subjects: rows, total: count.total, page: validPage, totalPages: Math.ceil(count.total / validLimit) };
  },

  async findSubjectById(id) {
    const [rows] = await db.execute('SELECT * FROM subjects WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async createSubject(data) {
    const [result] = await db.execute(
      `INSERT INTO subjects (subject_name, subject_code, branch, semester, credits, teacher, course_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.subject_name, data.subject_code, data.branch || '', data.semester || 1,
        data.credits || 0, data.teacher || null, data.course_id || null, data.status || 'Active']
    );
    return this.findSubjectById(result.insertId);
  },

  async updateSubject(id, data) {
    const fields = [];
    const values = [];
    for (const [k, v] of Object.entries({
      subject_name: data.subject_name, subject_code: data.subject_code, branch: data.branch,
      semester: data.semester, credits: data.credits, teacher: data.teacher,
      course_id: data.course_id, status: data.status
    })) {
      if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); }
    }
    if (fields.length === 0) return this.findSubjectById(id);
    values.push(id);
    await db.execute(`UPDATE subjects SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findSubjectById(id);
  },

  async deleteSubject(id) {
    const [result] = await db.execute('DELETE FROM subjects WHERE id = ?', [id]);
    return result.affectedRows;
  },

  // Subjects for a given branch + semester (for attendance/marks dropdowns)
  async subjectsFor(branch, semester) {
    let where = "WHERE status = 'Active'";
    const params = [];
    if (branch) { where += ' AND branch = ?'; params.push(branch); }
    if (semester) { where += ' AND semester = ?'; params.push(semester); }
    const [rows] = await db.execute(`SELECT * FROM subjects ${where} ORDER BY subject_name`, params);
    return rows;
  }
};

module.exports = CourseModel;
