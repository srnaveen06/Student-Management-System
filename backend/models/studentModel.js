const db = require('../config/db');

// Model handles all database queries related to students
const StudentModel = {

  // Get all students with search, filter, sort, and pagination
  async findAll({ search, branch, semester, gender, status, sort, page = 1, limit = 10 }) {
    // Validate pagination parameters — ensure they are safe positive integers
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 10;
    const offset = (validPage - 1) * validLimit;

    let query = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    // Search by name, student_id, email, or phone
    if (search) {
      query += ' AND (name LIKE ? OR student_id LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Filter by branch
    if (branch) {
      query += ' AND branch = ?';
      params.push(branch);
    }

    // Filter by semester
    if (semester) {
      query += ' AND semester = ?';
      params.push(semester);
    }

    // Filter by gender
    if (gender) {
      query += ' AND gender = ?';
      params.push(gender);
    }

    // Filter by status
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    // Get total count for pagination before adding LIMIT
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;

    // Sorting
    if (sort === 'name_asc') {
      query += ' ORDER BY name ASC';
    } else if (sort === 'name_desc') {
      query += ' ORDER BY name DESC';
    } else if (sort === 'oldest') {
      query += ' ORDER BY created_at ASC';
    } else {
      // Default: newest first
      query += ' ORDER BY created_at DESC';
    }

    // Pagination: interpolate validated integers directly into SQL
    // Safe because validPage and validLimit are guaranteed to be positive integers
    query += ` LIMIT ${validLimit} OFFSET ${offset}`;

    const [rows] = await db.execute(query, params);

    return {
      students: rows,
      total,
      page: validPage,
      totalPages: Math.ceil(total / validLimit)
    };
  },

  // Get a single student by ID
  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM students WHERE id = ?', [id]);
    return rows[0] || null;
  },

  // Create a new student
  async create(studentData) {
    const {
      student_id, name, email, phone, gender,
      branch, semester, dob, address, image, status
    } = studentData;

    const [result] = await db.execute(
      `INSERT INTO students 
       (student_id, name, email, phone, gender, branch, semester, dob, address, image, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_id, name, email, phone, gender, branch, semester, dob, address, image || null, status || 'Active']
    );

    return { id: result.insertId, ...studentData };
  },

  // Update an existing student
  async update(id, studentData) {
    const {
      student_id, name, email, phone, gender,
      branch, semester, dob, address, image, status
    } = studentData;

    // Build dynamic update query — only update fields that are provided
    const fields = [];
    const values = [];

    if (student_id !== undefined) { fields.push('student_id = ?'); values.push(student_id); }
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
    if (gender !== undefined) { fields.push('gender = ?'); values.push(gender); }
    if (branch !== undefined) { fields.push('branch = ?'); values.push(branch); }
    if (semester !== undefined) { fields.push('semester = ?'); values.push(semester); }
    if (dob !== undefined) { fields.push('dob = ?'); values.push(dob); }
    if (address !== undefined) { fields.push('address = ?'); values.push(address); }
    if (image !== undefined) { fields.push('image = ?'); values.push(image); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }

    if (fields.length === 0) return null;

    values.push(id);
    await db.execute(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, values);

    return this.findById(id);
  },

  // Delete a student
  async delete(id) {
    const student = await this.findById(id);
    const [result] = await db.execute('DELETE FROM students WHERE id = ?', [id]);
    return { affectedRows: result.affectedRows, student };
  },

  // Get dashboard statistics
  async getStats() {
    const [total] = await db.execute('SELECT COUNT(*) as count FROM students');
    const [active] = await db.execute("SELECT COUNT(*) as count FROM students WHERE status = 'Active'");
    const [inactive] = await db.execute("SELECT COUNT(*) as count FROM students WHERE status = 'Inactive'");
    const [branches] = await db.execute('SELECT COUNT(DISTINCT branch) as count FROM students');
    const [recent] = await db.execute('SELECT * FROM students ORDER BY created_at DESC LIMIT 5');

    return {
      totalStudents: total[0].count,
      activeStudents: active[0].count,
      inactiveStudents: inactive[0].count,
      totalBranches: branches[0].count,
      recentStudents: recent
    };
  },

  // Check for duplicate email or student_id
  async checkDuplicate(field, value, excludeId = null) {
    let query = `SELECT id FROM students WHERE ${field} = ?`;
    const params = [value];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await db.execute(query, params);
    return rows.length > 0;
  },

  // Get all unique branches for filter dropdown
  async getBranches() {
    const [rows] = await db.execute('SELECT DISTINCT branch FROM students ORDER BY branch');
    return rows.map(row => row.branch);
  }
};

module.exports = StudentModel;
