const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const canRead = requireRole('super_admin', 'admin', 'teacher', 'accountant');
const canEdit = requireRole('super_admin', 'admin', 'teacher');

// GET /api/attendance/students — students for marking (subject + date required)
router.get('/students', authMiddleware, canRead, AttendanceController.getStudentsForMarking);

// GET /api/attendance/low — students below threshold
router.get('/low', authMiddleware, canRead, AttendanceController.getLowAttendance);

// GET /api/attendance/students/:id/summary — per-student summary
router.get('/students/:id/summary', authMiddleware, canRead, AttendanceController.getStudentSummary);

// GET /api/attendance — filtered records
router.get('/', authMiddleware, canRead, AttendanceController.getOverview);

// POST /api/attendance/save — save attendance
router.post('/save', authMiddleware, canEdit, AttendanceController.save);

module.exports = router;
