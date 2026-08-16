const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/courseController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

// Teachers/accountants can read subjects (needed for attendance & marks).
const canManage = requireRole('super_admin', 'admin', 'teacher');
const canEdit = requireRole('super_admin', 'admin', 'teacher');

// -------- Courses --------
router.get('/', authMiddleware, canManage, CourseController.getCourses);
router.get('/:id', authMiddleware, canManage, CourseController.getCourse);
router.post('/', authMiddleware, canEdit, CourseController.createCourse);
router.put('/:id', authMiddleware, canEdit, CourseController.updateCourse);
router.delete('/:id', authMiddleware, canEdit, CourseController.deleteCourse);

module.exports = router;
