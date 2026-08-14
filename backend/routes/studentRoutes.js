const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All student routes are protected with JWT authentication
// The authMiddleware checks for a valid token before allowing access

// GET /api/students — Get all students (with search, filter, sort, pagination)
router.get('/', authMiddleware, StudentController.getAll);

// GET /api/students/stats — Get dashboard statistics
router.get('/stats', authMiddleware, StudentController.getStats);

// GET /api/students/branches — Get all unique branches
router.get('/branches', authMiddleware, StudentController.getBranches);

// GET /api/students/:id — Get a single student by ID
router.get('/:id', authMiddleware, StudentController.getById);

// POST /api/students — Create a new student (with optional image upload)
router.post('/', authMiddleware, upload.single('image'), StudentController.create);

// PUT /api/students/:id — Update a student (with optional new image)
router.put('/:id', authMiddleware, upload.single('image'), StudentController.update);

// DELETE /api/students/:id — Delete a student
router.delete('/:id', authMiddleware, StudentController.delete);

module.exports = router;
