const ActivityLogModel = require('../models/activityLogModel');

const ActivityLogController = {

  // GET /api/activity-logs
  async getLogs(req, res) {
    try {
      const { search, action, username, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
      const result = await ActivityLogModel.findAll({
        search, action, username, dateFrom, dateTo, page: parseInt(page), limit: parseInt(limit)
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get activity logs error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching activity logs' });
    }
  },

  // GET /api/activity-logs/actions
  async getActions(req, res) {
    try {
      const actions = await ActivityLogModel.getDistinctActions();
      res.json({ success: true, data: actions });
    } catch (error) {
      console.error('Get log actions error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = ActivityLogController;
