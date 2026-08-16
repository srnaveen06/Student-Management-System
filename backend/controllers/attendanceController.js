const AttendanceModel = require('../models/attendanceModel');
const { logActivity } = require('../utils/activity');

const AttendanceController = {

  // GET /api/attendance/students?branch=&semester=&subjectId=&date= — students for marking
  async getStudentsForMarking(req, res) {
    try {
      const { branch, semester, subjectId, date } = req.query;
      if (!subjectId || !date) {
        return res.status(400).json({ success: false, message: 'Subject and date are required' });
      }
      const students = await AttendanceModel.studentsForMarking({ branch, semester, subjectId, date });
      res.json({ success: true, data: students });
    } catch (error) {
      console.error('Get students for marking error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // POST /api/attendance/save — Save attendance for a subject + date
  async save(req, res) {
    try {
      const { rows, subjectId, date } = req.body;
      if (!subjectId || !date || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Subject, date and student rows are required' });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, message: 'Invalid date format' });
      }
      for (const r of rows) {
        if (!r.studentId || !['Present', 'Absent'].includes(r.status)) {
          return res.status(400).json({ success: false, message: 'Invalid attendance row' });
        }
      }

      const result = await AttendanceModel.saveAttendance({
        rows, subjectId, date, markedBy: req.user.id
      });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'attendance_updated',
        description: `${req.user.username} marked attendance for subject #${subjectId} on ${date} (${result.affected} students)`,
        relatedType: 'subject', relatedId: Number(subjectId)
      });

      res.json({ success: true, message: `Attendance saved for ${result.affected} students` });
    } catch (error) {
      console.error('Save attendance error:', error);
      res.status(500).json({ success: false, message: 'Server error while saving attendance' });
    }
  },

  // GET /api/attendance — Attendance records with filters
  async getOverview(req, res) {
    try {
      const { search, branch, semester, subjectId, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
      const result = await AttendanceModel.getOverview({
        search, branch, semester, subjectId, dateFrom, dateTo,
        page: parseInt(page), limit: parseInt(limit)
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get attendance error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching attendance' });
    }
  },

  // GET /api/attendance/students/:id/summary — Per-student attendance summary
  async getStudentSummary(req, res) {
    try {
      const summary = await AttendanceModel.getStudentSummary(req.params.id);
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Get attendance summary error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/attendance/low — Students below attendance threshold
  async getLowAttendance(req, res) {
    try {
      const threshold = parseInt(req.query.threshold) || 75;
      const students = await AttendanceModel.lowAttendance(threshold);
      res.json({ success: true, data: students, threshold });
    } catch (error) {
      console.error('Get low attendance error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = AttendanceController;
