const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/courseController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const canRead = requireRole('super_admin', 'admin', 'teacher', 'accountant');
const canEdit = requireRole('super_admin', 'admin', 'teacher');

// GET /api/subjects/options — active subjects by branch/semester (for dropdowns)
router.get('/options', authMiddleware, canRead, CourseController.getSubjectOptions);

router.get('/', authMiddleware, canRead, CourseController.getSubjects);
router.get('/:id', authMiddleware, canRead, CourseController.getSubject);
router.post('/', authMiddleware, canEdit, CourseController.createSubject);
router.put('/:id', authMiddleware, canEdit, CourseController.updateSubject);
router.delete('/:id', authMiddleware, canEdit, CourseController.deleteSubject);

module.exports = router;
