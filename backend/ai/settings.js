// AI settings, read from the settings table (ai_* keys) with a short cache so
// middleware checks stay fast. Admins can toggle features in the Settings page.

const pool = require('../config/db');

let cache = null;
let cacheAt = 0;
const CACHE_MS = 30000;

async function getSettings(force = false) {
  if (!force && cache && Date.now() - cacheAt < CACHE_MS) return cache;
  const [rows] = await pool.query("SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'ai_%'");
  const map = {};
  for (const r of rows) {
    let v = r.setting_value;
    if (v === 'true') v = true;
    else if (v === 'false') v = false;
    map[r.setting_key] = v;
  }
  cache = map;
  cacheAt = Date.now();
  return map;
}

async function updateSettings(updates) {
  const allowed = [
    'ai_enabled', 'ai_assistant_enabled', 'ai_search_enabled', 'ai_insights_enabled',
    'ai_logging_enabled', 'ai_document_processing_enabled', 'ai_risk_prediction_enabled',
    'ai_roles', 'ai_teacher_scope_branch',
  ];
  for (const key of Object.keys(updates)) {
    if (!allowed.includes(key)) continue;
    const val = typeof updates[key] === 'boolean' ? String(updates[key]) : String(updates[key]);
    await pool.query(
      'INSERT INTO settings (setting_key, setting_value, setting_type) VALUES (?,?,?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      [key, val, 'string']
    );
  }
  await getSettings(true);
  return cache;
}

module.exports = { getSettings, updateSettings };
