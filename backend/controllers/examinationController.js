const ExaminationModel = require('../models/examinationModel');
const { logActivity } = require('../utils/activity');

const ExaminationController = {

  // -------- Examinations --------
  async getExams(req, res) {
    try {
      const { search, semester, subjectId, status, page = 1, limit = 50 } = req.query;
      const result = await ExaminationModel.findAllExams({
        search, semester, subjectId, status, page: parseInt(page), limit: parseInt(limit)
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get exams error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching examinations' });
    }
  },

  async getExam(req, res) {
    try {
      const exam = await ExaminationModel.findExamById(req.params.id);
      if (!exam) return res.status(404).json({ success: false, message: 'Examination not found' });
      res.json({ success: true, data: exam });
    } catch (error) {
      console.error('Get exam error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async createExam(req, res) {
    try {
      const { exam_name, academic_year, semester, exam_date, subject_id, max_marks, status } = req.body;
      if (!exam_name || !subject_id || !semester) {
        return res.status(400).json({ success: false, message: 'Exam name, subject and semester are required' });
      }
      if (!max_marks || Number(max_marks) <= 0) {
        return res.status(400).json({ success: false, message: 'Maximum marks must be greater than zero' });
      }
      const exam = await ExaminationModel.createExam({ exam_name, academic_year, semester, exam_date, subject_id, max_marks, status });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'exam_created',
        description: `${req.user.username} created examination ${exam_name}`,
        relatedType: 'examination', relatedId: exam.id
      });

      res.status(201).json({ success: true, message: 'Examination created successfully', data: exam });
    } catch (error) {
      console.error('Create exam error:', error);
      res.status(500).json({ success: false, message: 'Server error while creating examination' });
    }
  },

  async updateExam(req, res) {
    try {
      const exam = await ExaminationModel.updateExam(req.params.id, req.body);
      if (!exam) return res.status(404).json({ success: false, message: 'Examination not found' });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'exam_updated',
        description: `${req.user.username} updated examination ${exam.exam_name}`,
        relatedType: 'examination', relatedId: exam.id
      });

      res.json({ success: true, message: 'Examination updated successfully', data: exam });
    } catch (error) {
      console.error('Update exam error:', error);
      res.status(500).json({ success: false, message: 'Server error while updating examination' });
    }
  },

  async deleteExam(req, res) {
    try {
      const affected = await ExaminationModel.deleteExam(req.params.id);
      if (!affected) return res.status(404).json({ success: false, message: 'Examination not found' });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'exam_deleted',
        description: `${req.user.username} deleted examination #${req.params.id}`
      });

      res.json({ success: true, message: 'Examination deleted successfully' });
    } catch (error) {
      console.error('Delete exam error:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting examination' });
    }
  },

  // -------- Marks --------
  // GET /api/marks/exam/:id/entry — students + existing marks for an exam
  async getExamEntry(req, res) {
    try {
      const entry = await ExaminationModel.getExamEntry(req.params.id);
      if (!entry) return res.status(404).json({ success: false, message: 'Examination not found' });
      res.json({ success: true, data: entry });
    } catch (error) {
      console.error('Get exam entry error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // POST /api/marks/exam/:id — save marks for all students of an exam
  async saveMarks(req, res) {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows)) {
        return res.status(400).json({ success: false, message: 'Marks rows are required' });
      }
      try {
        const result = await ExaminationModel.saveMarks({ examId: req.params.id, rows });
        logActivity({
          userId: req.user.id, username: req.user.username,
          action: 'marks_updated',
          description: `${req.user.username} entered marks for examination #${req.params.id} (${result.affected} students)`,
          relatedType: 'examination', relatedId: Number(req.params.id)
        });
        res.json({ success: true, message: `Marks saved for ${result.affected} students` });
      } catch (err) {
        if (err.message === 'Exam not found') {
          return res.status(404).json({ success: false, message: 'Examination not found' });
        }
        if (err.message && err.message.startsWith('Total marks') || err.message === 'Marks cannot be negative') {
          return res.status(400).json({ success: false, message: err.message });
        }
        throw err;
      }
    } catch (error) {
      console.error('Save marks error:', error);
      res.status(500).json({ success: false, message: 'Server error while saving marks' });
    }
  },

  // PUT /api/marks/:id — edit a single mark entry
  async updateMark(req, res) {
    try {
      try {
        const mark = await ExaminationModel.updateSingleMark(req.params.id, req.body);
        logActivity({
          userId: req.user.id, username: req.user.username,
          action: 'marks_updated',
          description: `${req.user.username} updated marks for ${mark.name}`,
          relatedType: 'marks', relatedId: mark.id
        });
        res.json({ success: true, message: 'Marks updated successfully', data: mark });
      } catch (err) {
        if (err.message === 'Mark not found') {
          return res.status(404).json({ success: false, message: 'Mark not found' });
        }
        throw err;
      }
    } catch (error) {
      console.error('Update mark error:', error);
      res.status(500).json({ success: false, message: 'Server error while updating marks' });
    }
  },

  // GET /api/marks — marks list with filters
  async getMarks(req, res) {
    try {
      const { examId, studentId, search, page = 1, limit = 50 } = req.query;
      const result = await ExaminationModel.getMarks({
        examId, studentId, search, page: parseInt(page), limit: parseInt(limit)
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get marks error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching marks' });
    }
  },

  // GET /api/marks/marksheet/:studentId?semester= — marksheet data
  async getMarksheet(req, res) {
    try {
      const { semester } = req.query;
      const sheet = await ExaminationModel.getMarksheet(req.params.studentId, semester || null);
      if (!sheet) return res.status(404).json({ success: false, message: 'Student not found' });
      res.json({ success: true, data: sheet });
    } catch (error) {
      console.error('Get marksheet error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = ExaminationController;
