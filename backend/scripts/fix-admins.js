const db = require('../config/db');

async function migrate() {
  try {
    await db.execute("ALTER TABLE admins ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin' AFTER password");
    console.log('Added role column');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('role column already exists');
    else throw e;
  }

  try {
    await db.execute('ALTER TABLE admins ADD COLUMN name VARCHAR(100) DEFAULT NULL AFTER role');
    console.log('Added name column');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('name column already exists');
    else throw e;
  }

  try {
    await db.execute('ALTER TABLE admins ADD COLUMN email VARCHAR(100) DEFAULT NULL AFTER name');
    console.log('Added email column');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('email column already exists');
    else throw e;
  }

  try {
    await db.execute('ALTER TABLE admins ADD COLUMN image VARCHAR(255) DEFAULT NULL AFTER email');
    console.log('Added image column');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('image column already exists');
    else throw e;
  }

  await db.execute("UPDATE admins SET role = 'super_admin' WHERE username = 'admin'");
  console.log('Set admin user to super_admin role');

  const [rows] = await db.execute('SELECT id, username, role, name, email FROM admins');
  console.log('Admins after migration:', JSON.stringify(rows, null, 2));

  process.exit(0);
}

migrate().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
