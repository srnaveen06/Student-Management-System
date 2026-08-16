const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const anyRole = requireRole('super_admin', 'admin', 'accountant', 'teacher');
const canEdit = requireRole('super_admin', 'admin');

// GET /api/settings
router.get('/', authMiddleware, anyRole, SettingsController.getSettings);

// PUT /api/settings
router.put('/', authMiddleware, canEdit, SettingsController.updateSettings);

module.exports = router;
