const db = require('../config/db');
async function run() {
  await db.query("ALTER TABLE attendance MODIFY COLUMN status ENUM('Present','Absent','Approved Leave') NOT NULL DEFAULT 'Present'");
  console.log('attendance status enum updated');
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
