const express = require('express');
const router = express.Router();
const ExaminationController = require('../controllers/examinationController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const canRead = requireRole('super_admin', 'admin', 'accountant', 'teacher');
const canEdit = requireRole('super_admin', 'admin', 'teacher');

// GET /api/marks — marks list
router.get('/', authMiddleware, canRead, ExaminationController.getMarks);

// GET /api/marks/marksheet/:studentId — marksheet data
router.get('/marksheet/:studentId', authMiddleware, canRead, ExaminationController.getMarksheet);

// GET /api/marks/exam/:id/entry — students + existing marks for an exam
router.get('/exam/:id/entry', authMiddleware, canEdit, ExaminationController.getExamEntry);

// POST /api/marks/exam/:id — save marks for all students of an exam
router.post('/exam/:id', authMiddleware, canEdit, ExaminationController.saveMarks);

// PUT /api/marks/:id — edit single mark
router.put('/:id', authMiddleware, canEdit, ExaminationController.updateMark);

module.exports = router;
