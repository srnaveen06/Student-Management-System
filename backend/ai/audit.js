// AI activity/audit logging. Records every AI interaction (prompt, tool calls,
// data sources, latency, errors) so administrators can review what the AI did.
// Never logs secrets.

const pool = require('../config/db');
const aiConfig = require('./config');

async function logActivity(entry) {
  if (aiConfig.enabled !== true) return;
  try {
    await pool.query(
      `INSERT INTO ai_activity_logs
        (user_id, username, role, feature, prompt, tool_calls, data_sources, status, model, latency_ms, error, ip_address)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        entry.userId || null,
        entry.username || null,
        entry.role || null,
        entry.feature || 'assistant',
        entry.prompt ? String(entry.prompt).slice(0, 2000) : null,
        entry.toolCalls ? JSON.stringify(entry.toolCalls) : null,
        entry.dataSources ? JSON.stringify(entry.dataSources) : null,
        entry.status || 'success',
        entry.model || null,
        entry.latencyMs || null,
        entry.error ? String(entry.error).slice(0, 1000) : null,
        entry.ipAddress || null,
      ]
    );
  } catch (err) {
    // Logging must never break the request.
    console.error('ai_activity_log insert failed:', err.message);
  }
}

module.exports = { logActivity };
