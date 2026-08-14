const StudentModel = require('../models/studentModel');
const fs = require('fs');
const path = require('path');

const StudentController = {

  // GET /api/students — Get all students with search, filter, sort, pagination
  async getAll(req, res) {
    try {
      const { search, branch, semester, gender, status, sort, page = 1, limit = 10 } = req.query;

      const result = await StudentModel.findAll({
        search, branch, semester, gender, status, sort,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.students,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Get all students error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching students' });
    }
  },

  // GET /api/students/stats — Get dashboard statistics
  async getStats(req, res) {
    try {
      const stats = await StudentModel.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching stats' });
    }
  },

  // GET /api/students/branches — Get all unique branches
  async getBranches(req, res) {
    try {
      const branches = await StudentModel.getBranches();
      res.json({ success: true, data: branches });
    } catch (error) {
      console.error('Get branches error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching branches' });
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
      const { student_id, name, email, phone, gender, branch, semester, dob, address, status } = req.body;

      // Validate required fields
      if (!student_id || !name || !email || !phone || !gender || !branch || !semester || !dob || !address) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }

      // Validate phone length
      if (phone.length < 10 || phone.length > 15) {
        return res.status(400).json({ success: false, message: 'Phone number must be between 10 and 15 digits' });
      }

      // Check for duplicate student_id
      const duplicateStudentId = await StudentModel.checkDuplicate('student_id', student_id);
      if (duplicateStudentId) {
        return res.status(400).json({ success: false, message: 'Student ID already exists' });
      }

      // Check for duplicate email
      const duplicateEmail = await StudentModel.checkDuplicate('email', email);
      if (duplicateEmail) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }

      // Handle image upload — multer adds file info to req.file
      const image = req.file ? req.file.filename : null;

      const student = await StudentModel.create({
        student_id, name, email, phone, gender,
        branch, semester: parseInt(semester), dob, address, image, status
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

      // Check if student exists
      const existing = await StudentModel.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      const { student_id, name, email, phone, gender, branch, semester, dob, address, status } = req.body;

      // Validate email format if provided
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ success: false, message: 'Invalid email format' });
        }
      }

      // Validate phone length if provided
      if (phone && (phone.length < 10 || phone.length > 15)) {
        return res.status(400).json({ success: false, message: 'Phone number must be between 10 and 15 digits' });
      }

      // Check for duplicate student_id (excluding current record)
      if (student_id) {
        const duplicateStudentId = await StudentModel.checkDuplicate('student_id', student_id, id);
        if (duplicateStudentId) {
          return res.status(400).json({ success: false, message: 'Student ID already exists' });
        }
      }

      // Check for duplicate email (excluding current record)
      if (email) {
        const duplicateEmail = await StudentModel.checkDuplicate('email', email, id);
        if (duplicateEmail) {
          return res.status(400).json({ success: false, message: 'Email already exists' });
        }
      }

      // Handle new image upload — delete old image if a new one is uploaded
      let image = existing.image;
      if (req.file) {
        // Delete old image file if it exists
        if (existing.image) {
          const oldPath = path.join(__dirname, '../uploads', existing.image);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        image = req.file.filename;
      }

      const studentData = {
        student_id, name, email, phone, gender,
        branch, semester: semester ? parseInt(semester) : undefined,
        dob, address, image, status
      };

      const updated = await StudentModel.update(id, studentData);
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

      // Delete the image file if it exists
      if (existing.image) {
        const imagePath = path.join(__dirname, '../uploads', existing.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      await StudentModel.delete(id);
      res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
      console.error('Delete student error:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting student' });
    }
  }
};

module.exports = StudentController;
