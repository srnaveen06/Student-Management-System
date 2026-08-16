const express = require('express');
const router = express.Router();
const LeaveController = require('../controllers/leaveController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const docUpload = require('../middleware/documentUploadMiddleware');

const anyRole = requireRole('super_admin', 'admin', 'teacher', 'accountant');
const canManage = requireRole('super_admin', 'admin', 'teacher');
const canApprove = requireRole('super_admin', 'admin');

// GET /api/leaves/summary — status distribution
router.get('/summary', authMiddleware, anyRole, LeaveController.getSummary);

// GET /api/leaves/recent — recent requests (dashboard widget)
router.get('/recent', authMiddleware, anyRole, LeaveController.getRecent);

// GET /api/leaves/students/:studentId/summary — per-student summary
router.get('/students/:studentId/summary', authMiddleware, anyRole, LeaveController.getStudentSummary);

// GET /api/leaves/students/:studentId — student's leave history
router.get('/students/:studentId', authMiddleware, anyRole, LeaveController.getStudentLeaves);

// PUT /api/leaves/:id/status — approve / reject / cancel
router.put('/:id/status', authMiddleware, canApprove, LeaveController.setStatus);

// GET /api/leaves/:id — single request
router.get('/:id', authMiddleware, anyRole, LeaveController.getLeave);

// DELETE /api/leaves/:id — delete a request
router.delete('/:id', authMiddleware, canApprove, LeaveController.deleteLeave);

// GET /api/leaves — list requests
router.get('/', authMiddleware, anyRole, LeaveController.getLeaves);

// POST /api/leaves — create request
router.post('/', authMiddleware, canManage, docUpload.single('attachment'), LeaveController.createLeave);

// PUT /api/leaves/:id — edit a pending request
router.put('/:id', authMiddleware, canManage, docUpload.single('attachment'), LeaveController.updateLeave);

module.exports = router;
