const db = require('../config/db');

const columns = [
  ["enrollment_number", "VARCHAR(50) DEFAULT NULL AFTER student_id"],
  ["blood_group", "VARCHAR(10) DEFAULT NULL AFTER gender"],
  ["institute", "VARCHAR(100) NOT NULL DEFAULT '' AFTER branch"],
  ["admission_year", "INT DEFAULT NULL AFTER semester"],
  ["enrollment_date", "DATE DEFAULT NULL AFTER dob"],
  ["cgpa", "DECIMAL(4,2) DEFAULT NULL AFTER enrollment_date"],
  ["previous_qualification", "VARCHAR(100) DEFAULT NULL AFTER cgpa"],
  ["father_name", "VARCHAR(100) DEFAULT NULL AFTER previous_qualification"],
  ["mother_name", "VARCHAR(100) DEFAULT NULL AFTER father_name"],
  ["guardian_name", "VARCHAR(100) DEFAULT NULL AFTER mother_name"],
  ["guardian_phone", "VARCHAR(20) DEFAULT NULL AFTER guardian_name"],
  ["emergency_contact", "VARCHAR(20) DEFAULT NULL AFTER guardian_phone"],
  ["relationship", "VARCHAR(50) DEFAULT NULL AFTER emergency_contact"],
  ["city", "VARCHAR(50) DEFAULT NULL AFTER address"],
  ["state", "VARCHAR(50) DEFAULT NULL AFTER city"],
  ["pincode", "VARCHAR(10) DEFAULT NULL AFTER state"],
];

async function run() {
  let added = 0, exists = 0;
  for (const [col, ddl] of columns) {
    try {
      await db.query(`ALTER TABLE students ADD COLUMN ${col} ${ddl}`);
      added++;
      console.log(`  + ${col}`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') { exists++; }
      else { console.error(`  ! ${col}: ${e.message}`); }
    }
  }
  console.log(`Done: ${added} added, ${exists} already existed`);

  // Update existing students with missing institute
  await db.query("UPDATE students SET institute = branch WHERE institute = '' OR institute IS NULL");
  console.log('Updated institute defaults');

  const [rows] = await db.query('DESCRIBE students');
  console.log(`Students table: ${rows.length} columns`);
  process.exit(0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
