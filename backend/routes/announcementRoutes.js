const express = require('express');
const router = express.Router();
const AnnouncementController = require('../controllers/announcementController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const anyRole = requireRole('super_admin', 'admin', 'teacher', 'accountant');
const canEdit = requireRole('super_admin', 'admin', 'teacher');

// GET /api/announcements/latest — latest announcements (dashboard widget)
router.get('/latest', authMiddleware, anyRole, AnnouncementController.getLatest);

// GET /api/announcements/:id — single announcement
router.get('/:id', authMiddleware, anyRole, AnnouncementController.getAnnouncement);

// GET /api/announcements — list announcements
router.get('/', authMiddleware, anyRole, AnnouncementController.getAnnouncements);

// POST /api/announcements — create announcement
router.post('/', authMiddleware, canEdit, AnnouncementController.createAnnouncement);

// PUT /api/announcements/:id — update announcement
router.put('/:id', authMiddleware, canEdit, AnnouncementController.updateAnnouncement);

// DELETE /api/announcements/:id — delete announcement
router.delete('/:id', authMiddleware, canEdit, AnnouncementController.deleteAnnouncement);

module.exports = router;
