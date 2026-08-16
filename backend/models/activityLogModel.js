const db = require('../config/db');

const ActivityLogModel = {

  async findAll({ search, action, username, dateFrom, dateTo, page = 1, limit = 20 }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (search) {
      where += ' AND (al.username LIKE ? OR al.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (action) { where += ' AND al.action = ?'; params.push(action); }
    if (username) { where += ' AND al.username = ?'; params.push(username); }
    if (dateFrom) { where += ' AND al.created_at >= ?'; params.push(`${dateFrom} 00:00:00`); }
    if (dateTo) { where += ' AND al.created_at <= ?'; params.push(`${dateTo} 23:59:59`); }

    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 20;
    const offset = (validPage - 1) * validLimit;
    const [rows] = await db.execute(
      `SELECT al.* FROM activity_logs al ${where} ORDER BY al.created_at DESC LIMIT ${validLimit} OFFSET ${offset}`,
      params
    );
    const [[count]] = await db.execute(
      `SELECT COUNT(*) AS c FROM activity_logs al ${where}`, params
    );

    const [[summary]] = await db.execute(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN al.action LIKE '%created%' OR al.action LIKE '%added%' OR al.action LIKE '%assigned%' OR al.action LIKE '%received%' THEN 1 ELSE 0 END),0) AS additions,
              COALESCE(SUM(CASE WHEN al.action LIKE '%updated%' OR al.action LIKE '%changed%' THEN 1 ELSE 0 END),0) AS updates,
              COALESCE(SUM(CASE WHEN al.action LIKE '%deleted%' OR al.action LIKE '%removed%' THEN 1 ELSE 0 END),0) AS deletions
       FROM activity_logs al`
    );

    return {
      logs: rows, total: count.c, page: validPage, totalPages: Math.ceil(count.c / validLimit),
      summary: { total: summary.total, additions: summary.additions, updates: summary.updates, deletions: summary.deletions }
    };
  },

  async getDistinctActions() {
    const [rows] = await db.execute('SELECT DISTINCT action FROM activity_logs ORDER BY action');
    return rows.map(r => r.action);
  }
};

module.exports = ActivityLogModel;
