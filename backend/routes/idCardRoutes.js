const express = require('express');
const router = express.Router();
const IDCardController = require('../controllers/idCardController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const anyRole = requireRole('super_admin', 'admin', 'teacher', 'accountant');
const canManage = requireRole('super_admin', 'admin');

// Public verification — no auth (used by QR code scan)
router.get('/verify/:token', IDCardController.verify);

// GET /api/id-cards/summary — status distribution
router.get('/summary', authMiddleware, anyRole, IDCardController.getSummary);

// GET /api/id-cards/student/:studentId — a student's card
router.get('/student/:studentId', authMiddleware, anyRole, IDCardController.getStudentCard);

// GET /api/id-cards — list
router.get('/', authMiddleware, anyRole, IDCardController.getCards);

// POST /api/id-cards — issue/regenerate a card
router.post('/', authMiddleware, canManage, IDCardController.createCard);

// PUT /api/id-cards/:id — update status/validity
router.put('/:id', authMiddleware, canManage, IDCardController.updateCard);

// DELETE /api/id-cards/:id
router.delete('/:id', authMiddleware, canManage, IDCardController.deleteCard);

module.exports = router;
