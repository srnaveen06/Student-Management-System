const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const upload = require('../middleware/uploadMiddleware');
const csvUpload = require('../middleware/csvUploadMiddleware');
const docUpload = require('../middleware/documentUploadMiddleware');

// Every route below requires a valid JWT.
// Roles: super_admin + admin can manage students. Teachers can view/update attendance-relevant data.

// GET /api/students — Get all students (advanced filters)
router.get('/', authMiddleware, requireRole('super_admin', 'admin', 'teacher', 'accountant'), StudentController.getAll);

// GET /api/students/stats — Dashboard statistics
router.get('/stats', authMiddleware, StudentController.getStats);

// GET /api/students/branches — Unique branches
router.get('/branches', authMiddleware, StudentController.getBranches);

// GET /api/students/institutes — Unique institutes
router.get('/institutes', authMiddleware, StudentController.getInstitutes);

// GET /api/students/reports — Aggregated report data
router.get('/reports', authMiddleware, StudentController.getReports);

// POST /api/students/import — CSV import (preview with ?dryRun=true, then confirm)
router.post('/import', authMiddleware, requireRole('super_admin', 'admin'), csvUpload.single('file'), StudentController.importStudents);

// GET /api/students/profile/:id — Full student profile
router.get('/profile/:id', authMiddleware, StudentController.getProfile);

// POST /api/students/bulk/status — Bulk activate/deactivate
router.post('/bulk/status', authMiddleware, requireRole('super_admin', 'admin'), StudentController.bulkStatus);

// POST /api/students/bulk/delete — Bulk delete
router.post('/bulk/delete', authMiddleware, requireRole('super_admin', 'admin'), StudentController.bulkDelete);

// GET /api/students/:id — Get single student
router.get('/:id', authMiddleware, StudentController.getById);

// POST /api/students — Create student
router.post('/', authMiddleware, requireRole('super_admin', 'admin'), upload.single('image'), StudentController.create);

// PUT /api/students/:id — Update student
router.put('/:id', authMiddleware, requireRole('super_admin', 'admin'), upload.single('image'), StudentController.update);

// DELETE /api/students/:id — Delete student
router.delete('/:id', authMiddleware, requireRole('super_admin', 'admin'), StudentController.delete);

// Documents
router.post('/:id/documents', authMiddleware, requireRole('super_admin', 'admin'), docUpload.single('file'), StudentController.addDocument);
router.get('/:id/documents', authMiddleware, StudentController.getDocuments);
router.delete('/documents/:docId', authMiddleware, requireRole('super_admin', 'admin'), StudentController.deleteDocument);

module.exports = router;
