const AnnouncementModel = require('../models/announcementModel');
const NotificationModel = require('../models/notificationModel');
const { logActivity } = require('../utils/activity');

const AnnouncementController = {

  // GET /api/announcements — list with filters
  async getAnnouncements(req, res) {
    try {
      const { search, type, audience, pinned, page = 1, limit = 10 } = req.query;
      const result = await AnnouncementModel.findAll({
        search, type, audience, pinned,
        page: parseInt(page), limit: parseInt(limit)
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get announcements error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching announcements' });
    }
  },

  // GET /api/announcements/latest — latest announcements (dashboard)
  async getLatest(req, res) {
    try {
      const announcements = await AnnouncementModel.getLatest(Number(req.query.limit) || 5);
      res.json({ success: true, data: announcements });
    } catch (error) {
      console.error('Get latest announcements error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/announcements/:id — single announcement
  async getAnnouncement(req, res) {
    try {
      const announcement = await AnnouncementModel.findById(req.params.id);
      if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });
      res.json({ success: true, data: announcement });
    } catch (error) {
      console.error('Get announcement error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // POST /api/announcements — create
  async createAnnouncement(req, res) {
    try {
      const { title, content, announcementType, audience, isPinned } = req.body;
      if (!title) return res.status(400).json({ success: false, message: 'Announcement title is required' });
      if (!content) return res.status(400).json({ success: false, message: 'Announcement content is required' });

      const announcement = await AnnouncementModel.create({
        title, content, announcementType, audience, isPinned, publishedBy: req.user.id
      });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'announcement_created',
        description: `${req.user.username} published announcement "${title}"`,
        relatedType: 'announcement', relatedId: announcement.id
      });

      await NotificationModel.createNotification({
        title: '📢 New announcement',
        message: title,
        type: 'info',
        userId: null,
        relatedType: 'announcement', relatedId: announcement.id
      });

      res.status(201).json({ success: true, message: 'Announcement published', data: announcement });
    } catch (error) {
      console.error('Create announcement error:', error);
      res.status(500).json({ success: false, message: 'Server error while creating announcement' });
    }
  },

  // PUT /api/announcements/:id — update
  async updateAnnouncement(req, res) {
    try {
      const { title, content, announcementType, audience, isPinned } = req.body;
      const existing = await AnnouncementModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: 'Announcement not found' });
      if (!title) return res.status(400).json({ success: false, message: 'Announcement title is required' });
      if (!content) return res.status(400).json({ success: false, message: 'Announcement content is required' });

      await AnnouncementModel.update(req.params.id, {
        title, content, announcementType, audience, isPinned
      });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'announcement_updated',
        description: `${req.user.username} updated announcement "${title}"`,
        relatedType: 'announcement', relatedId: Number(req.params.id)
      });

      res.json({ success: true, message: 'Announcement updated successfully' });
    } catch (error) {
      console.error('Update announcement error:', error);
      res.status(500).json({ success: false, message: 'Server error while updating announcement' });
    }
  },

  // DELETE /api/announcements/:id — delete
  async deleteAnnouncement(req, res) {
    try {
      const announcement = await AnnouncementModel.delete(req.params.id);
      if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'announcement_deleted',
        description: `${req.user.username} deleted announcement "${announcement.title}"`,
        relatedType: 'announcement', relatedId: Number(req.params.id)
      });

      res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (error) {
      console.error('Delete announcement error:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting announcement' });
    }
  }
};

module.exports = AnnouncementController;
