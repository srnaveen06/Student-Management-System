const db = require('../config/db');

const statements = [
  // ---- migration.sql: extend admins ----
  "ALTER TABLE admins ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin' AFTER password",
  "ALTER TABLE admins ADD COLUMN name VARCHAR(100) DEFAULT NULL AFTER role",
  "ALTER TABLE admins ADD COLUMN email VARCHAR(100) DEFAULT NULL AFTER name",
  "ALTER TABLE admins ADD COLUMN image VARCHAR(255) DEFAULT NULL AFTER email",
  "ALTER TABLE admins ADD COLUMN last_login TIMESTAMP NULL DEFAULT NULL AFTER image",

  // ---- student_documents ----
  `CREATE TABLE IF NOT EXISTS student_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    doc_type VARCHAR(30) NOT NULL DEFAULT 'Other',
    title VARCHAR(150) DEFAULT NULL,
    file_path VARCHAR(255) NOT NULL,
    uploaded_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_doc_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_doc_user FOREIGN KEY (uploaded_by) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // ---- courses ----
  `CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_name VARCHAR(150) NOT NULL,
    course_code VARCHAR(30) NOT NULL UNIQUE,
    branch VARCHAR(50) DEFAULT NULL,
    semester INT DEFAULT NULL,
    credits INT DEFAULT 0,
    description TEXT,
    status ENUM('Active','Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,

  // ---- subjects ----
  `CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_name VARCHAR(150) NOT NULL,
    subject_code VARCHAR(30) NOT NULL UNIQUE,
    branch VARCHAR(50) NOT NULL DEFAULT '',
    semester INT NOT NULL DEFAULT 1,
    credits INT DEFAULT 0,
    teacher VARCHAR(100) DEFAULT NULL,
    course_id INT DEFAULT NULL,
    status ENUM('Active','Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_subject_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // ---- attendance ----
  `CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('Present','Absent') NOT NULL DEFAULT 'Present',
    marked_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_attendance (student_id, subject_id, attendance_date),
    CONSTRAINT fk_att_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_att_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    CONSTRAINT fk_att_markedby FOREIGN KEY (marked_by) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // ---- examinations ----
  `CREATE TABLE IF NOT EXISTS examinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_name VARCHAR(150) NOT NULL,
    academic_year VARCHAR(20) DEFAULT NULL,
    semester INT NOT NULL DEFAULT 1,
    exam_date DATE DEFAULT NULL,
    subject_id INT NOT NULL,
    max_marks INT NOT NULL DEFAULT 100,
    status ENUM('Scheduled','Completed','Cancelled') DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_exam_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  // ---- marks ----
  `CREATE TABLE IF NOT EXISTS marks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    examination_id INT NOT NULL,
    subject_id INT NOT NULL,
    internal_marks DECIMAL(5,2) NOT NULL DEFAULT 0,
    external_marks DECIMAL(5,2) NOT NULL DEFAULT 0,
    practical_marks DECIMAL(5,2) NOT NULL DEFAULT 0,
    assignment_marks DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_marks DECIMAL(6,2) NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    grade VARCHAR(5) DEFAULT NULL,
    gpa DECIMAL(3,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_marks (student_id, examination_id, subject_id),
    CONSTRAINT fk_mark_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_mark_exam FOREIGN KEY (examination_id) REFERENCES examinations(id) ON DELETE CASCADE,
    CONSTRAINT fk_mark_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  // ---- fees ----
  `CREATE TABLE IF NOT EXISTS fees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    total_fees DECIMAL(12,2) NOT NULL DEFAULT 0,
    due_date DATE DEFAULT NULL,
    status ENUM('Paid','Partially Paid','Pending') DEFAULT 'Pending',
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_fee_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_fee_user FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // ---- fee_payments ----
  `CREATE TABLE IF NOT EXISTS fee_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fee_id INT NOT NULL,
    student_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_date DATE NOT NULL,
    method VARCHAR(30) DEFAULT 'Cash',
    reference VARCHAR(100) DEFAULT NULL,
    receipt_number VARCHAR(50) DEFAULT NULL,
    recorded_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pay_fee FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE,
    CONSTRAINT fk_pay_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_pay_user FOREIGN KEY (recorded_by) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // ---- notifications ----
  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT,
    type VARCHAR(30) DEFAULT 'info',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    related_type VARCHAR(50) DEFAULT NULL,
    related_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES admins(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  // ---- activity_logs ----
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    username VARCHAR(50) DEFAULT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    related_type VARCHAR(50) DEFAULT NULL,
    related_id INT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // ---- settings ----
  `CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,

  // ---- student_courses ----
  `CREATE TABLE IF NOT EXISTS student_courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    assigned_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_student_course (student_id, course_id),
    CONSTRAINT fk_sc_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_sc_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_sc_user FOREIGN KEY (assigned_by) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // ---- student_subjects ----
  `CREATE TABLE IF NOT EXISTS student_subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    assigned_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_student_subject (student_id, subject_id),
    CONSTRAINT fk_ss_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_ss_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    CONSTRAINT fk_ss_user FOREIGN KEY (assigned_by) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // ---- academic_events ----
  `CREATE TABLE IF NOT EXISTS academic_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    event_type ENUM('Exam','Holiday','Cultural','Seminar','Workshop','Sports','Other') DEFAULT 'Other',
    start_date DATE NOT NULL,
    end_date DATE DEFAULT NULL,
    branch VARCHAR(50) DEFAULT NULL,
    semester INT DEFAULT NULL,
    location VARCHAR(150) DEFAULT NULL,
    description TEXT,
    status ENUM('Active','Inactive') DEFAULT 'Active',
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_createdby FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // ---- announcements ----
  `CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    announcement_type ENUM('General','Exam','Notice','Event','Fee','Result','Urgent') DEFAULT 'General',
    audience ENUM('All','Students','Teachers','Staff') DEFAULT 'All',
    is_pinned TINYINT(1) NOT NULL DEFAULT 0,
    published_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_announce_publishedby FOREIGN KEY (published_by) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // ---- leave_requests ----
  `CREATE TABLE IF NOT EXISTS leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    leave_type ENUM('Sick','Casual','Emergency','Study','Other') DEFAULT 'Casual',
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    days INT NOT NULL DEFAULT 1,
    reason TEXT,
    attachment VARCHAR(255) DEFAULT NULL,
    status ENUM('Pending','Approved','Rejected','Cancelled') DEFAULT 'Pending',
    remarks TEXT,
    requested_by INT DEFAULT NULL,
    approved_by INT DEFAULT NULL,
    approved_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_leave_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_leave_requestedby FOREIGN KEY (requested_by) REFERENCES admins(id) ON DELETE SET NULL,
    CONSTRAINT fk_leave_approvedby FOREIGN KEY (approved_by) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // ---- student_id_cards ----
  `CREATE TABLE IF NOT EXISTS student_id_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    card_number VARCHAR(30) NOT NULL,
    verification_token VARCHAR(64) NOT NULL,
    issued_on DATE DEFAULT NULL,
    valid_until DATE DEFAULT NULL,
    status ENUM('Active','Inactive','Revoked') DEFAULT 'Active',
    issued_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_idcard_student (student_id),
    UNIQUE KEY uq_idcard_number (card_number),
    UNIQUE KEY uq_idcard_token (verification_token),
    CONSTRAINT fk_idcard_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_idcard_issuedby FOREIGN KEY (issued_by) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // ---- AI tables ----
  `CREATE TABLE IF NOT EXISTS ai_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) DEFAULT 'New Chat',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_aiconv_user FOREIGN KEY (user_id) REFERENCES admins(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS ai_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('user','assistant','system') NOT NULL,
    content TEXT NOT NULL,
    intent VARCHAR(50) DEFAULT NULL,
    tool_calls JSON DEFAULT NULL,
    data_sources JSON DEFAULT NULL,
    model VARCHAR(50) DEFAULT NULL,
    status ENUM('success','error','partial') DEFAULT 'success',
    error TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_aimsg_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_aimsg_user FOREIGN KEY (user_id) REFERENCES admins(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS ai_activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    username VARCHAR(50) DEFAULT NULL,
    role VARCHAR(20) DEFAULT NULL,
    feature VARCHAR(50) NOT NULL,
    prompt TEXT DEFAULT NULL,
    tool_calls JSON DEFAULT NULL,
    data_sources JSON DEFAULT NULL,
    status ENUM('success','error','blocked') DEFAULT 'success',
    model VARCHAR(50) DEFAULT NULL,
    latency_ms INT DEFAULT NULL,
    error TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_aiact_user FOREIGN KEY (user_id) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS ai_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    filters JSON DEFAULT NULL,
    content JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_airpt_user FOREIGN KEY (user_id) REFERENCES admins(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS ai_risk_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    model_type ENUM('rule_based','ml') DEFAULT 'rule_based',
    risk_score DECIMAL(5,2) NOT NULL,
    risk_level ENUM('LOW','MODERATE','HIGH') NOT NULL,
    academic_risk DECIMAL(5,2) DEFAULT 0,
    attendance_risk DECIMAL(5,2) DEFAULT 0,
    factors JSON DEFAULT NULL,
    recommendations JSON DEFAULT NULL,
    confidence DECIMAL(5,2) DEFAULT NULL,
    model_version VARCHAR(20) DEFAULT 'rule-v1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_airisk_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS ai_model_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    status ENUM('draft','active','retired') DEFAULT 'draft',
    metrics JSON DEFAULT NULL,
    sample_count INT DEFAULT 0,
    trained_by INT DEFAULT NULL,
    trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_model_version (name, version),
    CONSTRAINT fk_aimodel_user FOREIGN KEY (trained_by) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS ai_document_extractions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    document_id INT DEFAULT NULL,
    doc_type VARCHAR(50) NOT NULL,
    extracted JSON NOT NULL,
    status ENUM('pending','reviewed','applied','failed') DEFAULT 'pending',
    reviewed_by INT DEFAULT NULL,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_aidoc_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_aidoc_doc FOREIGN KEY (document_id) REFERENCES student_documents(id) ON DELETE SET NULL,
    CONSTRAINT fk_aidoc_user FOREIGN KEY (reviewed_by) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // ---- seed default settings ----
  `INSERT INTO settings (setting_key, setting_value, setting_type) VALUES
    ('college_name', 'My College of Engineering', 'string'),
    ('college_address', '123 College Road, Mumbai, Maharashtra', 'string'),
    ('college_phone', '+91 9876543210', 'string'),
    ('college_email', 'info@college.edu.in', 'string'),
    ('college_website', 'www.college.edu.in', 'string'),
    ('academic_year', '2026-2027', 'string'),
    ('principal_name', '', 'string'),
    ('affiliation_no', '', 'string'),
    ('attendance_threshold', '75', 'number'),
    ('fee_due_reminder_days', '7', 'number'),
    ('default_max_marks', '100', 'number'),
    ('currency', 'INR', 'string'),
    ('ai_enabled', 'true', 'boolean'),
    ('ai_assistant_enabled', 'true', 'boolean'),
    ('ai_search_enabled', 'true', 'boolean'),
    ('ai_insights_enabled', 'true', 'boolean'),
    ('ai_logging_enabled', 'true', 'boolean'),
    ('ai_document_processing_enabled', 'true', 'boolean'),
    ('ai_risk_prediction_enabled', 'true', 'boolean'),
    ('ai_roles', 'super_admin,admin,teacher,accountant', 'string'),
    ('ai_teacher_scope_branch', '', 'string')
  ON DUPLICATE KEY UPDATE setting_key = setting_key`,

  // ---- seed default users ----
  `INSERT IGNORE INTO admins (username, password, role, name, email) VALUES
    ('superadmin', '$2a$10$6ZrEKl9AoJsfzPx6jMK7ue5poxz.R/wOu.naGxcK53a3FiKSaWa32', 'super_admin', 'Super Admin', 'superadmin@college.edu.in'),
    ('teacher', '$2a$10$6ZrEKl9AoJsfzPx6jMK7ue5poxz.R/wOu.naGxcK53a3FiKSaWa32', 'teacher', 'Teacher', 'teacher@college.edu.in'),
    ('accountant', '$2a$10$6ZrEKl9AoJsfzPx6jMK7ue5poxz.R/wOu.naGxcK53a3FiKSaWa32', 'accountant', 'Accountant', 'accountant@college.edu.in')`,

  "UPDATE admins SET role = 'super_admin' WHERE username = 'admin'",
];

async function run() {
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  let done = 0, skipped = 0;
  for (const sql of statements) {
    try {
      await db.query(sql);
      done++;
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_ENTRY' || e.code === 'ER_TABLE_EXISTS_ERROR' || e.code === 1050 || e.code === 1061 || e.code === 1062) {
        skipped++;
      } else {
        console.error(`FAILED (${e.code}): ${sql.substring(0, 80)}...`);
        console.error(`  ${e.message}`);
      }
    }
  }
  console.log(`Migration complete: ${done} applied, ${skipped} skipped (already exist)`);

  const [tables] = await db.query('SHOW TABLES');
  console.log(`Total tables: ${tables.length}`);
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
  process.exit(0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
