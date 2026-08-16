const express = require('express');
const router = express.Router();
const ExaminationController = require('../controllers/examinationController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const canRead = requireRole('super_admin', 'admin', 'accountant', 'teacher');
const canEdit = requireRole('super_admin', 'admin', 'teacher');

// GET /api/examinations — list
router.get('/', authMiddleware, canRead, ExaminationController.getExams);

// POST /api/examinations — create
router.post('/', authMiddleware, canEdit, ExaminationController.createExam);

// GET /api/examinations/:id
router.get('/:id', authMiddleware, canRead, ExaminationController.getExam);

// PUT /api/examinations/:id
router.put('/:id', authMiddleware, canEdit, ExaminationController.updateExam);

// DELETE /api/examinations/:id
router.delete('/:id', authMiddleware, canEdit, ExaminationController.deleteExam);

module.exports = router;
