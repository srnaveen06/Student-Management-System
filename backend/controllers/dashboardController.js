const DashboardModel = require('../models/dashboardModel');

const DashboardController = {
  // GET /api/dashboard
  async getDashboard(req, res) {
    try {
      const data = await DashboardModel.getDashboardData();
      res.json({ success: true, data });
    } catch (error) {
      console.error('Dashboard data error:', error);
      res.status(500).json({ success: false, message: 'Server error while loading dashboard' });
    }
  }
};

module.exports = DashboardController;
