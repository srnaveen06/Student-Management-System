const express = require('express');
const router = express.Router();
const ActivityLogController = require('../controllers/activityLogController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

// Activity logs are sensitive — super_admin and admin only.
const adminOnly = requireRole('super_admin', 'admin');

// GET /api/activity-logs/actions
router.get('/actions', authMiddleware, adminOnly, ActivityLogController.getActions);

// GET /api/activity-logs
router.get('/', authMiddleware, adminOnly, ActivityLogController.getLogs);

module.exports = router;
