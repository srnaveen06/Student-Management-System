const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const anyRole = requireRole('super_admin', 'admin', 'teacher', 'accountant');

// GET /api/documents/summary — doc-type distribution
router.get('/summary', authMiddleware, anyRole, DocumentController.getSummary);

// GET /api/documents — cross-student listing
router.get('/', authMiddleware, anyRole, DocumentController.getDocuments);

module.exports = router;
