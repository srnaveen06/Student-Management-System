const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const anyRole = requireRole('super_admin', 'admin', 'accountant', 'teacher');

// GET /api/notifications/unread-count
router.get('/unread-count', authMiddleware, anyRole, NotificationController.getUnreadCount);

// GET /api/notifications
router.get('/', authMiddleware, anyRole, NotificationController.getNotifications);

// PUT /api/notifications/read-all
router.put('/read-all', authMiddleware, anyRole, NotificationController.markAllRead);

// PUT /api/notifications/:id/read
router.put('/:id/read', authMiddleware, anyRole, NotificationController.markRead);

// DELETE /api/notifications/:id
router.delete('/:id', authMiddleware, anyRole, NotificationController.deleteNotification);

module.exports = router;
