const db = require('../config/db');

const NotificationModel = {

  async createNotification({ title, message, type = 'info', userId = null, relatedType = null, relatedId = null }) {
    const [result] = await db.execute(
      `INSERT INTO notifications (user_id, title, message, type, related_type, related_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, title, message, type, relatedType, relatedId]
    );
    return result.insertId;
  },

  async findByUser(userId, { page = 1, limit = 20 }) {
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 20;
    const offset = (validPage - 1) * validLimit;
    const [rows] = await db.execute(
      `SELECT * FROM notifications
       WHERE user_id IS NULL OR user_id = ? OR user_id = 0
       ORDER BY created_at DESC LIMIT ${validLimit} OFFSET ${offset}`,
      [userId]
    );
    const [[count]] = await db.execute(
      'SELECT COUNT(*) AS c FROM notifications WHERE user_id IS NULL OR user_id = ? OR user_id = 0',
      [userId]
    );
    return { notifications: rows, total: count.c, page: validPage, totalPages: Math.ceil(count.c / validLimit) };
  },

  async getUnreadCount(userId) {
    const [[count]] = await db.execute(
      'SELECT COUNT(*) AS c FROM notifications WHERE is_read = 0 AND (user_id IS NULL OR user_id = ? OR user_id = 0)',
      [userId]
    );
    return count.c;
  },

  async markRead(id) {
    const [result] = await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    return result.affectedRows;
  },

  async markAllRead(userId) {
    const [result] = await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE is_read = 0 AND (user_id IS NULL OR user_id = ? OR user_id = 0)',
      [userId]
    );
    return result.affectedRows;
  },

  async delete(id) {
    const [result] = await db.execute('DELETE FROM notifications WHERE id = ?', [id]);
    return result.affectedRows;
  }
};

module.exports = NotificationModel;
