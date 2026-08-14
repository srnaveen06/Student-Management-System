const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/login — Admin login (public route)
router.post('/login', AuthController.login);

// GET /api/auth/verify — Verify token is still valid (protected route)
router.get('/verify', authMiddleware, AuthController.verify);

module.exports = router;
