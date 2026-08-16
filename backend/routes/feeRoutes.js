const express = require('express');
const router = express.Router();
const FeeController = require('../controllers/feeController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const canRead = requireRole('super_admin', 'admin', 'accountant', 'teacher');
const canEdit = requireRole('super_admin', 'admin', 'accountant');

// GET /api/fees/summary — dashboard fee summary
router.get('/summary', authMiddleware, canRead, FeeController.getSummary);

// GET /api/fees/payments — payments list
router.get('/payments', authMiddleware, canRead, FeeController.getPayments);

// POST /api/fees/payments — record payment
router.post('/payments', authMiddleware, canEdit, FeeController.recordPayment);

// PUT /api/fees/payments/:id — edit payment
router.put('/payments/:id', authMiddleware, canEdit, FeeController.editPayment);

// DELETE /api/fees/payments/:id — delete payment
router.delete('/payments/:id', authMiddleware, canEdit, FeeController.deletePayment);

// GET /api/fees/:id — single fee with payments
router.get('/:id', authMiddleware, canRead, FeeController.getFee);

// GET /api/fees — list fees
router.get('/', authMiddleware, canRead, FeeController.getFees);

// POST /api/fees — assign fee
router.post('/', authMiddleware, canEdit, FeeController.assignFee);

module.exports = router;
