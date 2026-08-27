const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const uploadProfileMiddleware = require('../middleware/uploadProfileMiddleware');

// POST /api/auth/login — Admin login (public route)
router.post('/login', AuthController.login);

// POST /api/auth/register — Public account creation (public route)
router.post('/register', AuthController.register);

// GET /api/auth/check-availability — Public username/email availability check
router.get('/check-availability', AuthController.checkAvailability);

// GET /api/auth/verify — Verify token is still valid (protected route)
router.get('/verify', authMiddleware, AuthController.verify);

// PUT /api/auth/password — Change own password (protected route)
router.put('/password', authMiddleware, AuthController.changePassword);

// PUT /api/auth/profile — Update own profile (protected route)
router.put('/profile', authMiddleware, AuthController.updateProfile);

// PUT /api/auth/profile/image — Upload own profile picture (protected route)
router.post('/profile/image', authMiddleware, uploadProfileMiddleware.single('image'), AuthController.uploadProfileImage);

// User management (super_admin only)
router.get('/users', authMiddleware, requireRole('super_admin'), AuthController.getUsers);
router.post('/users', authMiddleware, requireRole('super_admin'), AuthController.createUser);
router.put('/users/:id/role', authMiddleware, requireRole('super_admin'), AuthController.changeRole);
router.delete('/users/:id', authMiddleware, requireRole('super_admin'), AuthController.deleteUser);

module.exports = router;
