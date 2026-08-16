const db = require('../config/db');

// Record an entry in the activity / audit log.
// Never throws — logging failures must not break the main operation.
const logActivity = async ({ userId, username, action, description, relatedType, relatedId, ip }) => {
  try {
    await db.execute(
      `INSERT INTO activity_logs (user_id, username, action, description, related_type, related_id, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        username || null,
        action,
        description,
        relatedType || null,
        relatedId || null,
        ip || null
      ]
    );
  } catch (error) {
    console.error('Activity log error:', error.message);
  }
};

// Convenience wrapper that builds a logger from the current request.
const activityFor = (req) => (payload) =>
  logActivity({
    userId: req.user?.id,
    username: req.user?.username,
    ip: req.ip,
    ...payload
  });

module.exports = { logActivity, activityFor };
