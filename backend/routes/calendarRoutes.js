const express = require('express');
const router = express.Router();
const CalendarController = require('../controllers/calendarController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const anyRole = requireRole('super_admin', 'admin', 'teacher', 'accountant');
const canEdit = requireRole('super_admin', 'admin');

// GET /api/calendar/types — distinct event types
router.get('/types', authMiddleware, anyRole, CalendarController.getTypes);

// GET /api/calendar/range?from=&to= — events in a date range
router.get('/range', authMiddleware, anyRole, CalendarController.getRange);

// GET /api/calendar/upcoming — upcoming events (dashboard widget)
router.get('/upcoming', authMiddleware, anyRole, CalendarController.getUpcoming);

// GET /api/calendar/:id — single event
router.get('/:id', authMiddleware, anyRole, CalendarController.getEvent);

// GET /api/calendar — list events
router.get('/', authMiddleware, anyRole, CalendarController.getEvents);

// POST /api/calendar — create event
router.post('/', authMiddleware, canEdit, CalendarController.createEvent);

// PUT /api/calendar/:id — update event
router.put('/:id', authMiddleware, canEdit, CalendarController.updateEvent);

// DELETE /api/calendar/:id — delete event
router.delete('/:id', authMiddleware, canEdit, CalendarController.deleteEvent);

module.exports = router;
