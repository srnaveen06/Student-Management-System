const db = require('../config/db');

const AnnouncementModel = {

  // List announcements with filters + pagination.
  async findAll({ search, type, audience, pinned, page = 1, limit = 10 }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (search) { where += ' AND (a.title LIKE ? OR a.content LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (type) { where += ' AND a.announcement_type = ?'; params.push(type); }
    if (audience) { where += ' AND a.audience = ?'; params.push(audience); }
    if (pinned === '1' || pinned === 'true') { where += ' AND a.is_pinned = 1'; }

    const [[count]] = await db.execute(
      `SELECT COUNT(*) AS total FROM announcements a ${where}`, params
    );
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 10;
    const offset = (validPage - 1) * validLimit;

    const [rows] = await db.execute(
      `SELECT a.*, ad.name AS published_by_name
       FROM announcements a
       LEFT JOIN admins ad ON ad.id = a.published_by
       ${where}
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT ${validLimit} OFFSET ${offset}`,
      params
    );

    return { announcements: rows, total: count.total, page: validPage, totalPages: Math.ceil(count.total / validLimit) };
  },

  // Latest announcements (dashboard widget).
  async getLatest(limit = 5) {
    const [rows] = await db.execute(
      `SELECT a.*, ad.name AS published_by_name
       FROM announcements a
       LEFT JOIN admins ad ON ad.id = a.published_by
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT ${Math.min(Number(limit) || 5, 20)}`
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT a.*, ad.name AS published_by_name
       FROM announcements a
       LEFT JOIN admins ad ON ad.id = a.published_by
       WHERE a.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async create({ title, content, announcementType, audience, isPinned, publishedBy }) {
    const [result] = await db.execute(
      `INSERT INTO announcements (title, content, announcement_type, audience, is_pinned, published_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, content, announcementType || 'General', audience || 'All', isPinned ? 1 : 0, publishedBy || null]
    );
    return this.findById(result.insertId);
  },

  async update(id, { title, content, announcementType, audience, isPinned }) {
    const [result] = await db.execute(
      `UPDATE announcements
       SET title = ?, content = ?, announcement_type = ?, audience = ?, is_pinned = ?
       WHERE id = ?`,
      [title, content, announcementType, audience, isPinned ? 1 : 0, id]
    );
    return result.affectedRows;
  },

  async delete(id) {
    const [rows] = await db.execute('SELECT * FROM announcements WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    await db.execute('DELETE FROM announcements WHERE id = ?', [id]);
    return rows[0];
  }
};

module.exports = AnnouncementModel;
