const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

// POST /api/auth/login — Admin login (public route)
router.post('/login', AuthController.login);

// GET /api/auth/verify — Verify token is still valid (protected route)
router.get('/verify', authMiddleware, AuthController.verify);

// PUT /api/auth/password — Change own password (protected route)
router.put('/password', authMiddleware, AuthController.changePassword);

// User management (super_admin only)
router.get('/users', authMiddleware, requireRole('super_admin'), AuthController.getUsers);
router.post('/users', authMiddleware, requireRole('super_admin'), AuthController.createUser);
router.put('/users/:id/role', authMiddleware, requireRole('super_admin'), AuthController.changeRole);
router.delete('/users/:id', authMiddleware, requireRole('super_admin'), AuthController.deleteUser);

module.exports = router;
