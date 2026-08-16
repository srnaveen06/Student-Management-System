const db = require('../config/db');
const { getGrade } = require('../utils/grade');

// Column whitelist for INSERT/UPDATE so only known columns are ever written.
const STUDENT_COLUMNS = [
  'student_id', 'enrollment_number', 'name', 'email', 'phone', 'gender',
  'blood_group', 'branch', 'institute', 'semester', 'admission_year',
  'dob', 'enrollment_date', 'address', 'city', 'state', 'pincode',
  'cgpa', 'previous_qualification', 'father_name', 'mother_name',
  'guardian_name', 'guardian_phone', 'emergency_contact', 'relationship',
  'image', 'status'
];

// Students LEFT JOINed with fee + attendance aggregates. Used by findAll (listing)
// and findById so every student row already carries fee/attendance context.
const BASE_SELECT = `
  SELECT s.*,
         COALESCE(fe.total_fees, 0) AS total_fees,
         COALESCE(fe.paid_fees, 0) AS paid_fees,
         (COALESCE(fe.total_fees, 0) - COALESCE(fe.paid_fees, 0)) AS remaining_fees,
         CASE WHEN att.total > 0 THEN ROUND((att.present / att.total) * 100, 1) ELSE NULL END AS attendance_pct,
         att.total AS total_classes,
         att.present AS present_days,
         att.absent AS absent_days
  FROM students s
  LEFT JOIN (
    SELECT f.student_id,
           SUM(f.total_fees) AS total_fees,
           COALESCE(SUM(p.amount), 0) AS paid_fees
    FROM fees f
    LEFT JOIN fee_payments p ON p.fee_id = f.id
    GROUP BY f.student_id
  ) fe ON fe.student_id = s.id
  LEFT JOIN (
    SELECT student_id,
           COUNT(*) AS total,
           SUM(status IN ('Present', 'Approved Leave')) AS present,
           SUM(status = 'Absent') AS absent
    FROM attendance
    GROUP BY student_id
  ) att ON att.student_id = s.id`;

// StudentModel handles all database queries related to students.
const StudentModel = {

  // Get all students with search, filter, sort, and pagination.
  async findAll({ search, branch, semester, gender, status, institute, admissionYear, feeStatus, attendanceMin, dateFrom, dateTo, sort, page = 1, limit = 10 }) {
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 10;
    const offset = (validPage - 1) * validLimit;

    const where = [];
    const params = [];

    if (search) {
      where.push('(s.name LIKE ? OR s.student_id LIKE ? OR s.email LIKE ? OR s.phone LIKE ? OR s.institute LIKE ?)');
      const t = `%${search}%`;
      params.push(t, t, t, t, t);
    }
    if (branch) { where.push('s.branch = ?'); params.push(branch); }
    if (semester) { where.push('s.semester = ?'); params.push(semester); }
    if (gender) { where.push('s.gender = ?'); params.push(gender); }
    if (status) { where.push('s.status = ?'); params.push(status); }
    if (institute) { where.push('s.institute LIKE ?'); params.push(`%${institute}%`); }
    if (admissionYear) { where.push('s.admission_year = ?'); params.push(admissionYear); }
    if (dateFrom) { where.push('DATE(s.created_at) >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('DATE(s.created_at) <= ?'); params.push(dateTo); }

    if (feeStatus === 'Paid') {
      where.push('fe.total_fees > 0 AND (fe.total_fees - COALESCE(fe.paid_fees, 0)) <= 0');
    } else if (feeStatus === 'Partially Paid' || feeStatus === 'Partial') {
      where.push('fe.total_fees > 0 AND fe.paid_fees > 0 AND (fe.total_fees - fe.paid_fees) > 0');
    } else if (feeStatus === 'Pending') {
      where.push('(fe.total_fees IS NULL OR (fe.total_fees - COALESCE(fe.paid_fees, 0)) > 0)');
    }

    if (attendanceMin !== undefined && attendanceMin !== '') {
      where.push('att.total > 0 AND (att.present / att.total) * 100 >= ?');
      params.push(attendanceMin);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[countRow]] = await db.execute(
      `SELECT COUNT(DISTINCT s.id) AS total FROM students s
       LEFT JOIN (SELECT f.student_id, SUM(f.total_fees) AS total_fees, COALESCE(SUM(p.amount),0) AS paid_fees
                  FROM fees f LEFT JOIN fee_payments p ON p.fee_id = f.id GROUP BY f.student_id) fe ON fe.student_id = s.id
       LEFT JOIN (SELECT student_id, COUNT(*) AS total, SUM(status IN ('Present', 'Approved Leave')) AS present FROM attendance GROUP BY student_id) att ON att.student_id = s.id
       ${whereClause}`,
      params
    );
    const total = countRow.total;

    let order = 's.created_at DESC';
    if (sort === 'name_asc') order = 's.name ASC';
    else if (sort === 'name_desc') order = 's.name DESC';
    else if (sort === 'oldest') order = 's.created_at ASC';

    const [rows] = await db.execute(
      `${BASE_SELECT} ${whereClause} ORDER BY ${order} LIMIT ${validLimit} OFFSET ${offset}`,
      params
    );

    return { students: rows, total, page: validPage, totalPages: Math.ceil(total / validLimit) };
  },

  // Get a single student by ID (with fee + attendance context)
  async findById(id) {
    const [rows] = await db.execute(`${BASE_SELECT} WHERE s.id = ?`, [id]);
    return rows[0] || null;
  },

  // Create a new student
  async create(data) {
    const pick = {};
    for (const col of STUDENT_COLUMNS) {
      if (data[col] !== undefined) pick[col] = data[col];
    }
    const columns = Object.keys(pick);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => (pick[col] === '' ? null : pick[col]));

    const [result] = await db.execute(
      `INSERT INTO students (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
    return this.findById(result.insertId);
  },

  // Create a student together with optional attendance, fees, course/subject
  // enrollments and exam/marks entries — all in a single transaction.
  async createWithDetails(data, createdBy = null) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Insert the student row
      const pick = {};
      for (const col of STUDENT_COLUMNS) {
        if (data[col] !== undefined) pick[col] = data[col];
      }
      const columns = Object.keys(pick);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(col => (pick[col] === '' ? null : pick[col]));
      const [result] = await conn.execute(
        `INSERT INTO students (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );
      const studentId = result.insertId;

      // 2. Fee assignment + optional initial payment
      if (data.fees && Number(data.fees.total_fees) > 0) {
        const totalFees = Number(data.fees.total_fees);
        const initialPayment = Math.min(Math.max(Number(data.fees.initial_payment) || 0, 0), totalFees);
        const status = initialPayment >= totalFees ? 'Paid'
          : initialPayment > 0 ? 'Partially Paid' : 'Pending';
        const [feeResult] = await conn.execute(
          `INSERT INTO fees (student_id, total_fees, due_date, status, created_by)
           VALUES (?, ?, ?, ?, ?)`,
          [studentId, totalFees, data.fees.due_date || null, status, createdBy]
        );
        const feeId = feeResult.insertId;
        if (initialPayment > 0) {
          const [payResult] = await conn.execute(
            `INSERT INTO fee_payments (fee_id, student_id, amount, payment_date, method, reference, recorded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [feeId, studentId, initialPayment,
              data.fees.payment_date || new Date().toISOString().slice(0, 10),
              data.fees.payment_method || 'Cash', data.fees.reference || null, createdBy]
          );
          const receiptNumber = `RCP-${new Date().getFullYear()}-${String(payResult.insertId).padStart(6, '0')}`;
          await conn.execute('UPDATE fee_payments SET receipt_number = ? WHERE id = ?', [receiptNumber, payResult.insertId]);
        }
      }

      // 3. Attendance, course/subject enrollments and exam marks
      await this._syncCoreSections(conn, studentId, data, createdBy, false);

      await conn.commit();
      return this.findById(studentId);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // Update an existing student (only provided fields)
  async update(id, data) {
    const fields = [];
    const values = [];
    for (const col of STUDENT_COLUMNS) {
      if (data[col] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(data[col] === '' ? null : data[col]);
      }
    }
    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await db.execute(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  // Sync attendance, course/subject enrollments and exam marks for a student.
  // Used by createWithDetails (clearExisting=false) and updateWithDetails (clearExisting=true).
  // MUST be called inside an open transaction.
  async _syncCoreSections(conn, studentId, data, userId = null, clearExisting = false) {
    // Attendance records (one row per subject + date)
    if (clearExisting) {
      await conn.execute('DELETE FROM attendance WHERE student_id = ?', [studentId]);
      await conn.execute('DELETE FROM student_courses WHERE student_id = ?', [studentId]);
      await conn.execute('DELETE FROM student_subjects WHERE student_id = ?', [studentId]);
      await conn.execute('DELETE FROM marks WHERE student_id = ?', [studentId]);
    }

    if (Array.isArray(data.attendance) && data.attendance.length > 0) {
      for (const a of data.attendance) {
        if (!a.subject_id || !a.attendance_date) continue;
        await conn.execute(
          `INSERT INTO attendance (student_id, subject_id, attendance_date, status, marked_by)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)`,
          [studentId, a.subject_id, a.attendance_date,
            a.status === 'Present' ? 'Present' : 'Absent', userId]
        );
      }
    }

    // Course enrollments (existing or created inline)
    if (Array.isArray(data.courses) && data.courses.length > 0) {
      for (const c of data.courses) {
        let courseId = Number(c.course_id) || null;
        if (!courseId && c.is_new) {
          const [[existing]] = await conn.execute(
            'SELECT id FROM courses WHERE course_code = ?', [c.course_code]
          );
          if (existing) {
            courseId = existing.id;
          } else {
            const [cr] = await conn.execute(
              `INSERT INTO courses (course_name, course_code, branch, semester, credits, description, status)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [c.course_name, c.course_code, c.branch || null, c.semester || null,
                c.credits || 0, c.description || null, c.status || 'Active']
            );
            courseId = cr.insertId;
          }
        }
        if (courseId) {
          await conn.execute(
            'INSERT INTO student_courses (student_id, course_id, assigned_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE course_id = course_id',
            [studentId, courseId, userId]
          );
        }
      }
    }

    // Subject enrollments (existing or created inline)
    if (Array.isArray(data.subjects) && data.subjects.length > 0) {
      for (const s of data.subjects) {
        let subjectId = Number(s.subject_id) || null;
        if (!subjectId && s.is_new) {
          const [[existing]] = await conn.execute(
            'SELECT id FROM subjects WHERE subject_code = ?', [s.subject_code]
          );
          if (existing) {
            subjectId = existing.id;
          } else {
            const [sr] = await conn.execute(
              `INSERT INTO subjects (subject_name, subject_code, branch, semester, credits, teacher, course_id, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [s.subject_name, s.subject_code, s.branch || '', s.semester || 1,
                s.credits || 0, s.teacher || null, s.course_id || null, s.status || 'Active']
            );
            subjectId = sr.insertId;
          }
        }
        if (subjectId) {
          await conn.execute(
            'INSERT INTO student_subjects (student_id, subject_id, assigned_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE subject_id = subject_id',
            [studentId, subjectId, userId]
          );
        }
      }
    }

    // Examinations: enroll in an existing exam OR create a new one, then insert marks
    if (Array.isArray(data.examinations) && data.examinations.length > 0) {
      for (const ex of data.examinations) {
        let examId = Number(ex.exam_id) || null;
        let subjectId = Number(ex.subject_id) || null;
        let maxMarks = 100;
        if (!examId && ex.is_new) {
          const [[existingExam]] = await conn.execute(
            'SELECT id FROM examinations WHERE exam_name = ? AND subject_id = ?',
            [ex.exam_name, ex.subject_id]
          );
          if (existingExam) {
            examId = existingExam.id;
            const [[examRow]] = await conn.execute(
              'SELECT max_marks, subject_id FROM examinations WHERE id = ?', [examId]
            );
            maxMarks = Number(examRow?.max_marks || 100);
            subjectId = examRow?.subject_id || subjectId;
          } else {
            const [exr] = await conn.execute(
              `INSERT INTO examinations (exam_name, academic_year, semester, exam_date, subject_id, max_marks, status)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [ex.exam_name, ex.academic_year || null, ex.semester || 1,
                ex.exam_date || null, ex.subject_id, ex.max_marks || 100, ex.status || 'Scheduled']
            );
            examId = exr.insertId;
            maxMarks = Number(ex.max_marks) || 100;
          }
        } else if (examId) {
          const [[examRow]] = await conn.execute(
            'SELECT max_marks, subject_id FROM examinations WHERE id = ?', [examId]
          );
          maxMarks = Number(examRow?.max_marks || 100);
          subjectId = examRow?.subject_id || subjectId;
        }
        if (examId && subjectId) {
          const internal = Math.max(0, Number(ex.internal_marks) || 0);
          const external = Math.max(0, Number(ex.external_marks) || 0);
          const practical = Math.max(0, Number(ex.practical_marks) || 0);
          const assignment = Math.max(0, Number(ex.assignment_marks) || 0);
          const total = internal + external + practical + assignment;
          const percentage = maxMarks > 0 ? Number(((total / maxMarks) * 100).toFixed(2)) : 0;
          const { grade, gpa } = getGrade(percentage);
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
            [studentId, examId, subjectId, internal, external, practical, assignment,
              Number(total.toFixed(2)), percentage, grade, gpa]
          );
        }
      }
    }
  },

  // Update a student together with optional attendance, fees, course/subject
  // enrollments and exam/marks entries — all in a single transaction.
  // Replacement semantics: attendance, enrollments and marks are synced to what
  // the form sends. Fees are upserted (existing payment history is preserved).
  async updateWithDetails(id, data, updatedBy = null) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Update the student row
      const fields = [];
      const values = [];
      for (const col of STUDENT_COLUMNS) {
        if (data[col] !== undefined) {
          fields.push(`${col} = ?`);
          values.push(data[col] === '' ? null : data[col]);
        }
      }
      if (fields.length > 0) {
        values.push(id);
        await conn.execute(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      // 2. Fee assignment — upsert the fee row, optionally record a new payment.
      //    Existing fees/payments are never deleted (preserves payment history).
      const [[feeRow]] = await conn.execute(
        'SELECT id, total_fees FROM fees WHERE student_id = ? ORDER BY created_at DESC LIMIT 1', [id]
      );
      if (data.fees && Number(data.fees.total_fees) > 0) {
        const totalFees = Number(data.fees.total_fees);
        const initialPayment = Math.min(Math.max(Number(data.fees.initial_payment) || 0, 0), totalFees);
        let feeId;
        if (feeRow) {
          await conn.execute(
            'UPDATE fees SET total_fees = ?, due_date = ? WHERE id = ?',
            [totalFees, data.fees.due_date || null, feeRow.id]
          );
          feeId = feeRow.id;
        } else {
          const [feeResult] = await conn.execute(
            `INSERT INTO fees (student_id, total_fees, due_date, status, created_by)
             VALUES (?, ?, ?, 'Pending', ?)`,
            [id, totalFees, data.fees.due_date || null, updatedBy]
          );
          feeId = feeResult.insertId;
        }
        if (initialPayment > 0) {
          const [[dupPayment]] = await conn.execute(
            `SELECT id FROM fee_payments
             WHERE fee_id = ? AND amount = ? AND payment_date = ? AND method = ?`,
            [feeId, initialPayment,
              data.fees.payment_date || new Date().toISOString().slice(0, 10),
              data.fees.payment_method || 'Cash']
          );
          if (!dupPayment) {
            const [payResult] = await conn.execute(
              `INSERT INTO fee_payments (fee_id, student_id, amount, payment_date, method, reference, recorded_by)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [feeId, id, initialPayment,
                data.fees.payment_date || new Date().toISOString().slice(0, 10),
                data.fees.payment_method || 'Cash', data.fees.reference || null, updatedBy]
            );
            const receiptNumber = `RCP-${new Date().getFullYear()}-${String(payResult.insertId).padStart(6, '0')}`;
            await conn.execute('UPDATE fee_payments SET receipt_number = ? WHERE id = ?', [receiptNumber, payResult.insertId]);
          }
        }
        // Recompute fee status from the actual payments
        const [[paidRow]] = await conn.execute(
          'SELECT COALESCE(SUM(amount), 0) AS paid FROM fee_payments WHERE fee_id = ?', [feeId]
        );
        const paid = Number(paidRow.paid || 0);
        const status = paid >= totalFees ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Pending';
        await conn.execute('UPDATE fees SET status = ? WHERE id = ?', [status, feeId]);
      }

      // 3. Attendance, course/subject enrollments and exam marks (replacement)
      await this._syncCoreSections(conn, id, data, updatedBy, true);

      await conn.commit();
      return this.findById(id);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // Bulk update (used for bulk activate / deactivate)
  async bulkUpdate(ids, fields) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const cols = Object.keys(fields);
    const set = cols.map(c => `${c} = ?`).join(', ');
    const values = cols.map(c => fields[c]);
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await db.execute(
      `UPDATE students SET ${set} WHERE id IN (${placeholders})`,
      [...values, ...ids]
    );
    return result.affectedRows;
  },

  // Bulk delete
  async bulkDelete(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await db.execute(`DELETE FROM students WHERE id IN (${placeholders})`, ids);
    return result.affectedRows;
  },

  // Delete a single student
  async delete(id) {
    const [result] = await db.execute('DELETE FROM students WHERE id = ?', [id]);
    return { affectedRows: result.affectedRows };
  },

  // Dashboard statistics
  async getStats() {
    const [total] = await db.execute('SELECT COUNT(*) AS count FROM students');
    const [active] = await db.execute("SELECT COUNT(*) AS count FROM students WHERE status = 'Active'");
    const [inactive] = await db.execute("SELECT COUNT(*) AS count FROM students WHERE status = 'Inactive'");
    const [branches] = await db.execute('SELECT COUNT(DISTINCT branch) AS count FROM students');
    const [institutes] = await db.execute('SELECT COUNT(DISTINCT institute) AS count FROM students');
    const [male] = await db.execute("SELECT COUNT(*) AS count FROM students WHERE gender = 'Male'");
    const [female] = await db.execute("SELECT COUNT(*) AS count FROM students WHERE gender = 'Female'");
    const [recent] = await db.execute('SELECT * FROM students ORDER BY created_at DESC LIMIT 5');
    const [recentUpdated] = await db.execute('SELECT * FROM students ORDER BY updated_at DESC LIMIT 5');

    return {
      totalStudents: total[0].count,
      activeStudents: active[0].count,
      inactiveStudents: inactive[0].count,
      totalBranches: branches[0].count,
      totalInstitutes: institutes[0].count,
      maleStudents: male[0].count,
      femaleStudents: female[0].count,
      recentStudents: recent,
      recentUpdatedStudents: recentUpdated
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

  // Get all unique branches
  async getBranches() {
    const [rows] = await db.execute('SELECT DISTINCT branch FROM students ORDER BY branch');
    return rows.map(r => r.branch);
  },

  // Get all unique institutes
  async getInstitutes() {
    const [rows] = await db.execute("SELECT DISTINCT institute FROM students WHERE institute != '' ORDER BY institute");
    return rows.map(r => r.institute);
  },

  // Get aggregated data for reports
  async getReports() {
    const [total] = await db.execute('SELECT COUNT(*) AS count FROM students');
    const [active] = await db.execute("SELECT COUNT(*) AS count FROM students WHERE status = 'Active'");
    const [inactive] = await db.execute("SELECT COUNT(*) AS count FROM students WHERE status = 'Inactive'");
    const [branches] = await db.execute('SELECT COUNT(DISTINCT branch) AS count FROM students');
    const [byBranch] = await db.execute('SELECT branch, COUNT(*) AS count FROM students GROUP BY branch ORDER BY count DESC, branch ASC');
    const [byInstitute] = await db.execute('SELECT institute, COUNT(*) AS count FROM students GROUP BY institute ORDER BY count DESC, institute ASC');
    const [byGender] = await db.execute('SELECT gender, COUNT(*) AS count FROM students GROUP BY gender ORDER BY count DESC, gender ASC');
    const [bySemester] = await db.execute('SELECT semester, COUNT(*) AS count FROM students GROUP BY semester ORDER BY semester ASC');
    const [byStatus] = await db.execute('SELECT status, COUNT(*) AS count FROM students GROUP BY status ORDER BY count DESC');

    return {
      totalStudents: total[0].count,
      activeStudents: active[0].count,
      inactiveStudents: inactive[0].count,
      totalBranches: branches[0].count,
      byBranch, byInstitute, byGender, bySemester, byStatus
    };
  },

  // -------- Documents --------
  async addDocument({ studentId, docType, title, filePath, uploadedBy }) {
    const [result] = await db.execute(
      'INSERT INTO student_documents (student_id, doc_type, title, file_path, uploaded_by) VALUES (?, ?, ?, ?, ?)',
      [studentId, docType, title || null, filePath, uploadedBy || null]
    );
    return result.insertId;
  },

  async getDocuments(studentId) {
    const [rows] = await db.execute(
      'SELECT * FROM student_documents WHERE student_id = ? ORDER BY created_at DESC',
      [studentId]
    );
    return rows;
  },

  async deleteDocument(docId) {
    const [rows] = await db.execute('SELECT * FROM student_documents WHERE id = ?', [docId]);
    if (rows.length === 0) return null;
    await db.execute('DELETE FROM student_documents WHERE id = ?', [docId]);
    return rows[0];
  },

  // -------- Import helpers --------
  async getStudentIdsAndEmails() {
    const [rows] = await db.execute('SELECT student_id, email FROM students');
    return rows;
  },

  async insertImportedStudents(list) {
    const results = { imported: 0 };
    for (const row of list) {
      try {
        await this.create(row);
        results.imported += 1;
      } catch (e) {
        results.failed = (results.failed || 0) + 1;
      }
    }
    return results;
  },

  // Full profile aggregation: student + documents + attendance + fees + marks
  async getProfile(id) {
    const student = await this.findById(id);
    if (!student) return null;

    const [documents] = await db.execute(
      'SELECT * FROM student_documents WHERE student_id = ? ORDER BY created_at DESC',
      [id]
    );

    const [overallAttendance] = await db.execute(
      `SELECT COUNT(*) AS total,
              SUM(status IN ('Present', 'Approved Leave')) AS present,
              SUM(status = 'Absent') AS absent
       FROM attendance WHERE student_id = ?`,
      [id]
    );

    const [subjectAttendance] = await db.execute(
      `SELECT sub.id AS subject_id, sub.subject_name, sub.subject_code,
              COUNT(a.id) AS total,
              SUM(a.status IN ('Present', 'Approved Leave')) AS present,
              SUM(a.status = 'Absent') AS absent
       FROM attendance a
       JOIN subjects sub ON sub.id = a.subject_id
       WHERE a.student_id = ?
       GROUP BY sub.id, sub.subject_name, sub.subject_code
       ORDER BY sub.subject_name`,
      [id]
    );

    // Raw attendance rows (date-level) for the edit form
    const [attendanceRecords] = await db.execute(
      `SELECT id, subject_id, attendance_date, status
       FROM attendance WHERE student_id = ?
       ORDER BY attendance_date DESC, subject_id`,
      [id]
    );

    // Enrolled courses (for the edit form checkboxes)
    const [courses] = await db.execute(
      `SELECT c.id, c.course_name, c.course_code, c.semester
       FROM student_courses sc
       JOIN courses c ON c.id = sc.course_id
       WHERE sc.student_id = ?
       ORDER BY c.course_name`,
      [id]
    );

    // Enrolled subjects (for the edit form checkboxes)
    const [subjects] = await db.execute(
      `SELECT s.id, s.subject_name, s.subject_code, s.semester
       FROM student_subjects ss
       JOIN subjects s ON s.id = ss.subject_id
       WHERE ss.student_id = ?
       ORDER BY s.subject_name`,
      [id]
    );

    const [fees] = await db.execute(
      `SELECT f.*, COALESCE(SUM(p.amount), 0) AS paid,
              (f.total_fees - COALESCE(SUM(p.amount), 0)) AS remaining
       FROM fees f
       LEFT JOIN fee_payments p ON p.fee_id = f.id
       WHERE f.student_id = ?
       GROUP BY f.id
       ORDER BY f.created_at DESC`,
      [id]
    );

    const [payments] = await db.execute(
      `SELECT p.*, f.id AS fee_id
       FROM fee_payments p
       LEFT JOIN fees f ON f.id = p.fee_id
       WHERE p.student_id = ?
       ORDER BY p.payment_date DESC`,
      [id]
    );

    const [marks] = await db.execute(
      `SELECT m.*, sub.subject_name, sub.subject_code, e.exam_name, e.max_marks
       FROM marks m
       JOIN subjects sub ON sub.id = m.subject_id
       JOIN examinations e ON e.id = m.examination_id
       WHERE m.student_id = ?
       ORDER BY e.exam_date DESC`,
      [id]
    );

    const overall = overallAttendance[0] || { total: 0, present: 0, absent: 0 };
    const attendancePct = overall.total > 0 ? Math.round((overall.present / overall.total) * 100) : null;

    const feeTotals = (fees || []).reduce(
      (acc, f) => ({
        total: acc.total + Number(f.total_fees || 0),
        paid: acc.paid + Number(f.paid || 0),
        remaining: acc.remaining + Number(f.remaining || 0)
      }),
      { total: 0, paid: 0, remaining: 0 }
    );

    return {
      ...student,
      documents,
      attendance: {
        overall: { ...overall, percentage: attendancePct },
        bySubject: subjectAttendance,
        records: attendanceRecords
      },
      fees: {
        items: fees,
        summary: feeTotals,
        payments
      },
      marks,
      courses,
      subjects
    };
  }
};

module.exports = StudentModel;
