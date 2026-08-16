const NotificationModel = require('../models/notificationModel');

const NotificationController = {

  // GET /api/notifications
  async getNotifications(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await NotificationModel.findByUser(req.user.id, { page: parseInt(page), limit: parseInt(limit) });
      const unread = await NotificationModel.getUnreadCount(req.user.id);
      res.json({ success: true, ...result, unread });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching notifications' });
    }
  },

  // GET /api/notifications/unread-count
  async getUnreadCount(req, res) {
    try {
      const unread = await NotificationModel.getUnreadCount(req.user.id);
      res.json({ success: true, data: unread });
    } catch (error) {
      console.error('Unread count error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // PUT /api/notifications/:id/read
  async markRead(req, res) {
    try {
      const affected = await NotificationModel.markRead(req.params.id);
      if (!affected) return res.status(404).json({ success: false, message: 'Notification not found' });
      res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
      console.error('Mark read error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // PUT /api/notifications/read-all
  async markAllRead(req, res) {
    try {
      const affected = await NotificationModel.markAllRead(req.user.id);
      res.json({ success: true, message: `${affected} notification(s) marked as read` });
    } catch (error) {
      console.error('Mark all read error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // DELETE /api/notifications/:id
  async deleteNotification(req, res) {
    try {
      const affected = await NotificationModel.delete(req.params.id);
      if (!affected) return res.status(404).json({ success: false, message: 'Notification not found' });
      res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = NotificationController;
