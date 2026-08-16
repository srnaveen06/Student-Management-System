const db = require('../config/db');

const SettingsModel = {

  // Returns settings as a flat object { key: value }.
  async getAll() {
    const [rows] = await db.execute('SELECT setting_key, setting_value FROM settings');
    const obj = {};
    for (const r of rows) obj[r.setting_key] = r.setting_value;
    return obj;
  },

  async update(data) {
    // Only allow updating known settings; upsert each.
    const allowed = [
      'college_name', 'college_address', 'college_phone', 'college_email', 'college_website',
      'academic_year', 'principal_name', 'affiliation_no', 'attendance_threshold',
      'default_max_marks', 'fee_due_reminder_days', 'currency'
    ];
    let updated = 0;
    for (const key of Object.keys(data)) {
      if (!allowed.includes(key)) continue;
      const value = String(data[key]).trim();
      const [result] = await db.execute(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value]
      );
      updated += result.affectedRows || 0;
    }
    return { updated };
  }
};

module.exports = SettingsModel;
