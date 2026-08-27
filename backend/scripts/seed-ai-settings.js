const db = require('../config/db');

async function run() {
  // Seed AI settings
  await db.query(
    `INSERT INTO settings (setting_key, setting_value, setting_type) VALUES
      ('ai_enabled', 'true', 'boolean'),
      ('ai_assistant_enabled', 'true', 'boolean'),
      ('ai_search_enabled', 'true', 'boolean'),
      ('ai_insights_enabled', 'true', 'boolean'),
      ('ai_logging_enabled', 'true', 'boolean'),
      ('ai_document_processing_enabled', 'true', 'boolean'),
      ('ai_risk_prediction_enabled', 'true', 'boolean'),
      ('ai_roles', 'super_admin,admin,teacher,accountant', 'string'),
      ('ai_teacher_scope_branch', '', 'string')
    ON DUPLICATE KEY UPDATE setting_key = setting_key`
  );
  console.log('AI settings seeded');

  const [r] = await db.query("SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'ai_%'");
  console.log('AI settings:', JSON.stringify(r, null, 2));
  process.exit(0);
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
