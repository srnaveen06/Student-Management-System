const StudentModel = require('../models/studentModel');
const { parseCSV } = require('../utils/csv');
const { logActivity } = require('../utils/activity');
const fs = require('fs');
const path = require('path');

const VALID_IMPORT_HEADERS = {
  'Student ID': 'student_id',
  'student_id': 'student_id',
  'Name': 'name',
  'name': 'name',
  'Email': 'email',
  'email': 'email',
  'Phone': 'phone',
  'phone': 'phone',
  'Gender': 'gender',
  'gender': 'gender',
  'Branch': 'branch',
  'branch': 'branch',
  'Institute': 'institute',
  'institute': 'institute',
  'Semester': 'semester',
  'semester': 'semester',
  'Admission Year': 'admission_year',
  'admission_year': 'admission_year',
  'Date of Birth': 'dob',
  'dob': 'dob'
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Optional add-on sections arrive as JSON strings via multipart form.
const parseSection = (str, fallback) => {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
};

const parseSections = (body) => ({
  attendance: parseSection(body.attendance, []),
  fees: parseSection(body.fees, null),
  courses: parseSection(body.courses, []),
  subjects: parseSection(body.subjects, []),
  examinations: parseSection(body.examinations, [])
});

// Validate optional sections before touching the DB. Returns an error message or null.
const validateSections = ({ attendance, fees, courses, subjects, examinations }) => {
  if (Array.isArray(attendance)) {
    for (const a of attendance) {
      if (!a.subject_id || !a.attendance_date) {
        return 'Each attendance record needs a subject and date';
      }
      if (!['Present', 'Absent'].includes(a.status)) a.status = 'Present';
    }
  }
  if (fees && Number(fees.total_fees) > 0) {
    const totalFees = Number(fees.total_fees);
    const initialPayment = Number(fees.initial_payment) || 0;
    if (initialPayment > totalFees) {
      return 'Initial payment cannot exceed total fees';
    }
  }
  for (const c of Array.isArray(courses) ? courses : []) {
    if (!c.course_id && c.is_new && (!c.course_name || !c.course_code)) {
      return 'New course needs a name and course code';
    }
  }
  for (const s of Array.isArray(subjects) ? subjects : []) {
    if (!s.subject_id && s.is_new && (!s.subject_name || !s.subject_code)) {
      return 'New subject needs a name and subject code';
    }
  }
  for (const ex of Array.isArray(examinations) ? examinations : []) {
    if (!ex.exam_id && ex.is_new && (!ex.exam_name || !ex.subject_id)) {
      return 'New examination needs an exam name and subject';
    }
  }
  return null;
};

const StudentController = {

  // GET /api/students — Get all students (with advanced filters)
  async getAll(req, res) {
    try {
      const {
        search, branch, semester, gender, status, institute,
        admissionYear, feeStatus, attendanceMin, dateFrom, dateTo,
        sort, page = 1, limit = 10
      } = req.query;

      const result = await StudentModel.findAll({
        search, branch, semester, gender, status, institute,
        admissionYear, feeStatus, attendanceMin, dateFrom, dateTo,
        sort,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.students,
        pagination: { total: result.total, page: result.page, totalPages: result.totalPages }
      });
    } catch (error) {
      console.error('Get all students error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching students' });
    }
  },

  // GET /api/students/stats — Dashboard statistics
  async getStats(req, res) {
    try {
      const stats = await StudentModel.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching stats' });
    }
  },

  // GET /api/students/branches — All unique branches
  async getBranches(req, res) {
    try {
      const branches = await StudentModel.getBranches();
      res.json({ success: true, data: branches });
    } catch (error) {
      console.error('Get branches error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching branches' });
    }
  },

  // GET /api/students/institutes — All unique institutes
  async getInstitutes(req, res) {
    try {
      const institutes = await StudentModel.getInstitutes();
      res.json({ success: true, data: institutes });
    } catch (error) {
      console.error('Get institutes error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching institutes' });
    }
  },

  // GET /api/students/reports — Aggregated report data
  async getReports(req, res) {
    try {
      const reports = await StudentModel.getReports();
      res.json({ success: true, data: reports });
    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching reports' });
    }
  },

  // GET /api/students/profile/:id — Full student profile
  async getProfile(req, res) {
    try {
      const profile = await StudentModel.getProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }
      res.json({ success: true, data: profile });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching profile' });
    }
  },

  // GET /api/students/:id — Get a single student
  async getById(req, res) {
    try {
      const student = await StudentModel.findById(req.params.id);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }
      res.json({ success: true, data: student });
    } catch (error) {
      console.error('Get student error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching student' });
    }
  },

  // POST /api/students — Create a new student
  async create(req, res) {
    try {
      const {
        student_id, name, email, phone, gender, blood_group, branch, institute,
        semester, admission_year, dob, enrollment_date, address, city, state, pincode,
        cgpa, previous_qualification, father_name, mother_name, guardian_name,
        guardian_phone, emergency_contact, relationship, status
      } = req.body;

      if (!student_id || !name || !email || !phone || !gender || !branch || !semester || !dob) {
        return res.status(400).json({ success: false, message: 'Required fields missing (student_id, name, email, phone, gender, branch, semester, dob)' });
      }
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }
      if (phone.length < 10 || phone.length > 15) {
        return res.status(400).json({ success: false, message: 'Phone number must be between 10 and 15 digits' });
      }
      if (await StudentModel.checkDuplicate('student_id', student_id)) {
        return res.status(400).json({ success: false, message: 'Student ID already exists' });
      }
      if (await StudentModel.checkDuplicate('email', email)) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }

      const image = req.file ? req.file.filename : null;

      // Optional add-on sections (attendance, fees, courses, subjects, exams)
      const sections = parseSections(req.body);
      const sectionError = validateSections(sections);
      if (sectionError) {
        return res.status(400).json({ success: false, message: sectionError });
      }

      const student = await StudentModel.createWithDetails({
        student_id, name, email, phone, gender, blood_group, branch, institute: institute || '',
        semester: parseInt(semester), admission_year: admission_year || null, dob,
        enrollment_date: enrollment_date || null, address, city, state, pincode,
        cgpa: cgpa || null, previous_qualification, father_name, mother_name, guardian_name,
        guardian_phone, emergency_contact, relationship, image, status: status || 'Active',
        ...sections
      }, req.user.id);

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'student_created',
        description: `${req.user.username} added student ${name} (${student_id})`,
        relatedType: 'student', relatedId: student.id
      });

      res.status(201).json({ success: true, message: 'Student created successfully', data: student });
    } catch (error) {
      console.error('Create student error:', error);
      res.status(500).json({ success: false, message: 'Server error while creating student' });
    }
  },

  // PUT /api/students/:id — Update a student
  async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await StudentModel.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      const {
        student_id, name, email, phone, gender, blood_group, branch, institute,
        semester, admission_year, dob, enrollment_date, address, city, state, pincode,
        cgpa, previous_qualification, father_name, mother_name, guardian_name,
        guardian_phone, emergency_contact, relationship, status
      } = req.body;

      if (email) {
        if (!emailRegex.test(email)) {
          return res.status(400).json({ success: false, message: 'Invalid email format' });
        }
        if (await StudentModel.checkDuplicate('email', email, id)) {
          return res.status(400).json({ success: false, message: 'Email already exists' });
        }
      }
      if (student_id) {
        if (await StudentModel.checkDuplicate('student_id', student_id, id)) {
          return res.status(400).json({ success: false, message: 'Student ID already exists' });
        }
      }
      if (phone && (phone.length < 10 || phone.length > 15)) {
        return res.status(400).json({ success: false, message: 'Phone number must be between 10 and 15 digits' });
      }

      let image = existing.image;
      if (req.file) {
        if (existing.image) {
          const oldPath = path.join(__dirname, '../uploads', existing.image);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        image = req.file.filename;
      }

      // Optional add-on sections (attendance, fees, courses, subjects, exams)
      const sections = parseSections(req.body);
      const sectionError = validateSections(sections);
      if (sectionError) {
        return res.status(400).json({ success: false, message: sectionError });
      }

      const updated = await StudentModel.updateWithDetails(id, {
        student_id, name, email, phone, gender, blood_group, branch, institute,
        semester: semester ? parseInt(semester) : undefined,
        admission_year: admission_year !== undefined ? admission_year : undefined,
        dob, enrollment_date, address, city, state, pincode,
        cgpa, previous_qualification, father_name, mother_name, guardian_name,
        guardian_phone, emergency_contact, relationship, image, status,
        ...sections
      }, req.user.id);

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'student_updated',
        description: `${req.user.username} updated student ${updated.name}`,
        relatedType: 'student', relatedId: Number(id)
      });

      res.json({ success: true, message: 'Student updated successfully', data: updated });
    } catch (error) {
      console.error('Update student error:', error);
      res.status(500).json({ success: false, message: 'Server error while updating student' });
    }
  },

  // DELETE /api/students/:id — Delete a student
  async delete(req, res) {
    try {
      const { id } = req.params;
      const existing = await StudentModel.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      if (existing.image) {
        const imagePath = path.join(__dirname, '../uploads', existing.image);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }

      await StudentModel.delete(id);

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'student_deleted',
        description: `${req.user.username} deleted student ${existing.name}`,
        relatedType: 'student', relatedId: Number(id)
      });

      res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
      console.error('Delete student error:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting student' });
    }
  },

  // POST /api/students/bulk/status — Bulk activate/deactivate
  async bulkStatus(req, res) {
    try {
      const { ids, status } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No students selected' });
      }
      if (!['Active', 'Inactive'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      const affected = await StudentModel.bulkUpdate(ids, { status });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'students_bulk_status',
        description: `${req.user.username} set ${affected} students to ${status}`,
        relatedType: 'student'
      });

      res.json({ success: true, message: `${affected} students updated`, data: { affected } });
    } catch (error) {
      console.error('Bulk status error:', error);
      res.status(500).json({ success: false, message: 'Server error during bulk update' });
    }
  },

  // POST /api/students/bulk/delete — Bulk delete
  async bulkDelete(req, res) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No students selected' });
      }
      const affected = await StudentModel.bulkDelete(ids);

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'students_bulk_delete',
        description: `${req.user.username} deleted ${affected} students`,
        relatedType: 'student'
      });

      res.json({ success: true, message: `${affected} students deleted`, data: { affected } });
    } catch (error) {
      console.error('Bulk delete error:', error);
      res.status(500).json({ success: false, message: 'Server error during bulk delete' });
    }
  },

  // -------- Documents --------
  // POST /api/students/:id/documents — Upload a document
  async addDocument(req, res) {
    try {
      const { id } = req.params;
      const student = await StudentModel.findById(id);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const { docType, title } = req.body;
      const docId = await StudentModel.addDocument({
        studentId: Number(id),
        docType: docType || 'Other',
        title,
        filePath: req.file.filename,
        uploadedBy: req.user.id
      });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'document_uploaded',
        description: `${req.user.username} uploaded ${docType || 'Other'} document for student #${id}`,
        relatedType: 'document', relatedId: docId
      });

      res.status(201).json({ success: true, message: 'Document uploaded successfully', data: { id: docId } });
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({ success: false, message: 'Server error while uploading document' });
    }
  },

  // GET /api/students/:id/documents — List documents
  async getDocuments(req, res) {
    try {
      const docs = await StudentModel.getDocuments(req.params.id);
      res.json({ success: true, data: docs });
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching documents' });
    }
  },

  // DELETE /api/students/documents/:docId — Delete a document
  async deleteDocument(req, res) {
    try {
      const doc = await StudentModel.deleteDocument(req.params.docId);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }
      const filePath = path.join(__dirname, '../uploads', doc.file_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'document_deleted',
        description: `${req.user.username} deleted ${doc.doc_type} document for student #${doc.student_id}`,
        relatedType: 'document', relatedId: Number(req.params.docId)
      });

      res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting document' });
    }
  },

  // -------- CSV Import --------
  // POST /api/students/import (multipart file) — preview or import
  async importStudents(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
      }

      const csvText = req.file.buffer.toString('utf-8');
      const rows = parseCSV(csvText);
      if (rows.length < 2) {
        return res.status(400).json({ success: false, message: 'CSV must contain a header row and at least one data row' });
      }

      // Map headers
      const headers = rows[0].map(h => h.trim());
      const colMap = headers.map(h => VALID_IMPORT_HEADERS[h] || null);
      const hasRequired = ['student_id', 'name', 'email', 'phone', 'branch', 'semester'].every(
        f => colMap.includes(f)
      );
      if (!hasRequired) {
        return res.status(400).json({
          success: false,
          message: 'Missing required columns. Expected: Student ID, Name, Email, Phone, Gender, Branch, Institute, Semester, Admission Year, Date of Birth'
        });
      }

      // Existing values for duplicate detection
      const existing = await StudentModel.getStudentIdsAndEmails();
      const existingIds = new Set(existing.map(r => r.student_id));
      const existingEmails = new Set(existing.map(r => r.email));
      const seenIds = new Set();
      const seenEmails = new Set();

      const validRows = [];
      const invalidRows = [];
      const duplicateRows = [];
      const preview = [];

      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i];
        const record = {};
        headers.forEach((h, idx) => {
          const field = colMap[idx];
          if (field) record[field] = (cells[idx] || '').trim();
        });

        const rowNo = i + 1;
        const problems = [];

        if (!record.student_id) problems.push('Student ID is required');
        if (!record.name) problems.push('Name is required');
        if (!record.email) problems.push('Email is required');
        else if (!emailRegex.test(record.email)) problems.push('Invalid email format');
        if (!record.phone) problems.push('Phone is required');
        if (!record.branch) problems.push('Branch is required');
        if (!record.semester) problems.push('Semester is required');

        if (record.student_id && existingIds.has(record.student_id)) problems.push('Duplicate Student ID');
        if (record.student_id && seenIds.has(record.student_id)) problems.push('Duplicate Student ID in file');
        if (record.email && existingEmails.has(record.email)) problems.push('Duplicate email');
        if (record.email && seenEmails.has(record.email)) problems.push('Duplicate email in file');

        const isDuplicate = problems.some(p => p.includes('Duplicate'));
        const hasErrors = problems.length > 0;

        if (record.student_id) seenIds.add(record.student_id);
        if (record.email) seenEmails.add(record.email);

        if (hasErrors && !isDuplicate) {
          invalidRows.push({ rowNo, data: record, problems });
        } else if (isDuplicate) {
          duplicateRows.push({ rowNo, data: record, problems });
        } else {
          validRows.push(record);
        }

        preview.push({ rowNo, data: record, problems, valid: !hasErrors });
      }

      // Actually import unless dryRun
      const dryRun = req.query.dryRun === 'true';
      let imported = 0;
      if (!dryRun && validRows.length > 0) {
        const result = await StudentModel.insertImportedStudents(validRows);
        imported = result.imported;

        logActivity({
          userId: req.user.id, username: req.user.username,
          action: 'students_imported',
          description: `${req.user.username} imported ${imported} students`,
          relatedType: 'student'
        });
      }

      res.json({
        success: true,
        data: {
          dryRun,
          totalRows: rows.length - 1,
          valid: validRows.length,
          invalid: invalidRows.length,
          duplicate: duplicateRows.length,
          imported,
          preview,
          invalidRows,
          duplicateRows
        }
      });
    } catch (error) {
      console.error('Import students error:', error);
      res.status(500).json({ success: false, message: 'Server error while importing students' });
    }
  }
};

module.exports = StudentController;
