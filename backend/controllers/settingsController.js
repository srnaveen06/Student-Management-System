const SettingsModel = require('../models/settingsModel');
const { logActivity } = require('../utils/activity');

const SettingsController = {

  // GET /api/settings
  async getSettings(req, res) {
    try {
      const settings = await SettingsModel.getAll();
      res.json({ success: true, data: settings });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching settings' });
    }
  },

  // PUT /api/settings
  async updateSettings(req, res) {
    try {
      const result = await SettingsModel.update(req.body);

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'settings_updated',
        description: `${req.user.username} updated system settings`
      });

      res.json({ success: true, message: 'Settings updated successfully', ...result });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ success: false, message: 'Server error while updating settings' });
    }
  }
};

module.exports = SettingsController;
