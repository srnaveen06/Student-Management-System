const CalendarModel = require('../models/calendarModel');
const NotificationModel = require('../models/notificationModel');
const { logActivity } = require('../utils/activity');

const CalendarController = {

  // GET /api/calendar — list events (filters + pagination)
  async getEvents(req, res) {
    try {
      const { search, eventType, branch, semester, month, status, page = 1, limit = 12 } = req.query;
      const result = await CalendarModel.findAllEvents({
        search, eventType, branch, semester, month, status,
        page: parseInt(page), limit: parseInt(limit)
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching events' });
    }
  },

  // GET /api/calendar/range?from=&to= — events in a date range (calendar view)
  async getRange(req, res) {
    try {
      const { from, to, branch, semester } = req.query;
      if (!from || !to) {
        return res.status(400).json({ success: false, message: 'from and to dates are required' });
      }
      const events = await CalendarModel.findInRange(from, to, { branch, semester });
      res.json({ success: true, data: events });
    } catch (error) {
      console.error('Get events range error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching events' });
    }
  },

  // GET /api/calendar/upcoming — upcoming events (dashboard widget)
  async getUpcoming(req, res) {
    try {
      const events = await CalendarModel.getUpcoming(Number(req.query.limit) || 5);
      res.json({ success: true, data: events });
    } catch (error) {
      console.error('Get upcoming events error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/calendar/types — distinct event types
  async getTypes(req, res) {
    try {
      const types = await CalendarModel.getEventTypes();
      res.json({ success: true, data: types });
    } catch (error) {
      console.error('Get event types error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/calendar/:id — single event
  async getEvent(req, res) {
    try {
      const event = await CalendarModel.findById(req.params.id);
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
      res.json({ success: true, data: event });
    } catch (error) {
      console.error('Get event error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // POST /api/calendar — create event
  async createEvent(req, res) {
    try {
      const { title, eventType, startDate, endDate, branch, semester, location, description, status } = req.body;
      if (!title) return res.status(400).json({ success: false, message: 'Event title is required' });
      if (!startDate) return res.status(400).json({ success: false, message: 'Start date is required' });
      if (endDate && endDate < startDate) {
        return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
      }

      const event = await CalendarModel.createEvent({
        title, eventType, startDate, endDate, branch, semester, location, description, status, createdBy: req.user.id
      });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'event_created',
        description: `${req.user.username} created event "${title}" (${startDate})`,
        relatedType: 'event', relatedId: event.id
      });

      // Notify staff about the new event
      await NotificationModel.createNotification({
        title: 'New academic event',
        message: `"${title}" scheduled for ${startDate}`,
        type: 'info',
        userId: null,
        relatedType: 'event', relatedId: event.id
      });

      res.status(201).json({ success: true, message: 'Event created successfully', data: event });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ success: false, message: 'Server error while creating event' });
    }
  },

  // PUT /api/calendar/:id — update event
  async updateEvent(req, res) {
    try {
      const { title, eventType, startDate, endDate, branch, semester, location, description, status } = req.body;
      const existing = await CalendarModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: 'Event not found' });
      if (!title) return res.status(400).json({ success: false, message: 'Event title is required' });
      if (!startDate) return res.status(400).json({ success: false, message: 'Start date is required' });
      if (endDate && endDate < startDate) {
        return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
      }

      await CalendarModel.updateEvent(req.params.id, {
        title, eventType, startDate, endDate, branch, semester, location, description, status: status || 'Active'
      });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'event_updated',
        description: `${req.user.username} updated event "${title}"`,
        relatedType: 'event', relatedId: Number(req.params.id)
      });

      res.json({ success: true, message: 'Event updated successfully' });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ success: false, message: 'Server error while updating event' });
    }
  },

  // DELETE /api/calendar/:id — delete event
  async deleteEvent(req, res) {
    try {
      const event = await CalendarModel.deleteEvent(req.params.id);
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'event_deleted',
        description: `${req.user.username} deleted event "${event.title}"`,
        relatedType: 'event', relatedId: Number(req.params.id)
      });

      res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting event' });
    }
  }
};

module.exports = CalendarController;
