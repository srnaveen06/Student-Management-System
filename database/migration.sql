-- ============================================================
-- College Management System - Database Migration
-- Extends the existing student_management schema.
-- Safe to run multiple times (idempotent guards).
--
-- Run with:  source database/migration.sql;
-- ============================================================

USE student_management;

-- ------------------------------------------------------------
-- Helper: add a column only if it does not exist
-- ------------------------------------------------------------
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS add_col_if_missing(IN tbl_name VARCHAR(64), IN col_name VARCHAR(64), IN col_ddl VARCHAR(512))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl_name AND COLUMN_NAME = col_name
  ) THEN
    SET @s = CONCAT('ALTER TABLE ', tbl_name, ' ADD COLUMN ', col_ddl);
    PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//

CREATE PROCEDURE IF NOT EXISTS add_idx_if_missing(IN tbl_name VARCHAR(64), IN idx_name VARCHAR(64), IN idx_ddl VARCHAR(512))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl_name AND INDEX_NAME = idx_name
  ) THEN
    SET @s = CONCAT('CREATE INDEX ', idx_name, ' ON ', tbl_name, ' ', idx_ddl);
    PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

-- ------------------------------------------------------------
-- 1. Extend admins table with role-based access control
-- ------------------------------------------------------------
CALL add_col_if_missing('admins', 'role', "role VARCHAR(20) NOT NULL DEFAULT 'admin' AFTER password");
CALL add_col_if_missing('admins', 'name', 'name VARCHAR(100) DEFAULT NULL AFTER role');
CALL add_col_if_missing('admins', 'email', 'email VARCHAR(100) DEFAULT NULL AFTER name');
CALL add_col_if_missing('admins', 'image', 'image VARCHAR(255) DEFAULT NULL AFTER email');
CALL add_col_if_missing('admins', 'last_login', 'last_login TIMESTAMP NULL DEFAULT NULL AFTER image');

-- ------------------------------------------------------------
-- 2. Extend students table with profile fields
-- ------------------------------------------------------------
CALL add_col_if_missing('students', 'institute', "institute VARCHAR(100) NOT NULL DEFAULT '' AFTER branch");
CALL add_col_if_missing('students', 'enrollment_number', 'enrollment_number VARCHAR(50) DEFAULT NULL AFTER student_id');
CALL add_col_if_missing('students', 'blood_group', 'blood_group VARCHAR(10) DEFAULT NULL AFTER gender');
CALL add_col_if_missing('students', 'city', 'city VARCHAR(50) DEFAULT NULL AFTER address');
CALL add_col_if_missing('students', 'state', 'state VARCHAR(50) DEFAULT NULL AFTER city');
CALL add_col_if_missing('students', 'pincode', 'pincode VARCHAR(10) DEFAULT NULL AFTER state');
CALL add_col_if_missing('students', 'admission_year', 'admission_year INT DEFAULT NULL AFTER semester');
CALL add_col_if_missing('students', 'enrollment_date', 'enrollment_date DATE DEFAULT NULL AFTER dob');
CALL add_col_if_missing('students', 'cgpa', 'cgpa DECIMAL(4,2) DEFAULT NULL AFTER enrollment_date');
CALL add_col_if_missing('students', 'previous_qualification', 'previous_qualification VARCHAR(100) DEFAULT NULL AFTER cgpa');
CALL add_col_if_missing('students', 'father_name', 'father_name VARCHAR(100) DEFAULT NULL AFTER previous_qualification');
CALL add_col_if_missing('students', 'mother_name', 'mother_name VARCHAR(100) DEFAULT NULL AFTER father_name');
CALL add_col_if_missing('students', 'guardian_name', 'guardian_name VARCHAR(100) DEFAULT NULL AFTER mother_name');
CALL add_col_if_missing('students', 'guardian_phone', 'guardian_phone VARCHAR(20) DEFAULT NULL AFTER guardian_name');
CALL add_col_if_missing('students', 'emergency_contact', 'emergency_contact VARCHAR(20) DEFAULT NULL AFTER guardian_phone');
CALL add_col_if_missing('students', 'relationship', 'relationship VARCHAR(50) DEFAULT NULL AFTER emergency_contact');

-- ------------------------------------------------------------
-- 3. Student Documents
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  doc_type VARCHAR(30) NOT NULL DEFAULT 'Other',
  title VARCHAR(150) DEFAULT NULL,
  file_path VARCHAR(255) NOT NULL,
  uploaded_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doc_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_doc_user FOREIGN KEY (uploaded_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. Courses
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
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
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. Subjects (associated with branch & semester)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
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
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. Attendance (one row per student-subject-date)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
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
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. Examinations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS examinations (
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
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. Marks
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marks (
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
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 9. Fees & Payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fees (
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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fee_payments (
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
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 10. Notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
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
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 11. Activity / Audit Logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
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
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 12. Settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(50) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(20) DEFAULT 'string',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 13. Student Course & Subject Enrollment
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  assigned_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_course (student_id, course_id),
  CONSTRAINT fk_sc_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_sc_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_sc_user FOREIGN KEY (assigned_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  assigned_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_subject (student_id, subject_id),
  CONSTRAINT fk_ss_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_ss_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_ss_user FOREIGN KEY (assigned_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
CALL add_idx_if_missing('students', 'idx_student_branch', '(branch)');
CALL add_idx_if_missing('students', 'idx_student_status', '(status)');
CALL add_idx_if_missing('students', 'idx_student_institute', '(institute)');
CALL add_idx_if_missing('students', 'idx_student_semester', '(semester)');
CALL add_idx_if_missing('students', 'idx_student_admission_year', '(admission_year)');
CALL add_idx_if_missing('subjects', 'idx_subject_branch_sem', '(branch, semester)');
CALL add_idx_if_missing('attendance', 'idx_attendance_date', '(attendance_date)');
CALL add_idx_if_missing('attendance', 'idx_attendance_subject', '(subject_id)');
CALL add_idx_if_missing('fee_payments', 'idx_payment_date', '(payment_date)');
CALL add_idx_if_missing('marks', 'idx_marks_exam', '(examination_id)');
CALL add_idx_if_missing('notifications', 'idx_notif_user_read', '(user_id, is_read)');
CALL add_idx_if_missing('activity_logs', 'idx_log_user', '(user_id)');
CALL add_idx_if_missing('activity_logs', 'idx_log_created', '(created_at)');

-- ------------------------------------------------------------
-- Default settings
-- ------------------------------------------------------------
INSERT INTO settings (setting_key, setting_value, setting_type) VALUES
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
  ('currency', 'INR', 'string')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- ------------------------------------------------------------
-- Default users for each role (password: admin123, hashed)
-- ------------------------------------------------------------
INSERT IGNORE INTO admins (username, password, role, name, email) VALUES
  ('superadmin', '$2a$10$6ZrEKl9AoJsfzPx6jMK7ue5poxz.R/wOu.naGxcK53a3FiKSaWa32', 'super_admin', 'Super Admin', 'superadmin@college.edu.in'),
  ('teacher', '$2a$10$6ZrEKl9AoJsfzPx6jMK7ue5poxz.R/wOu.naGxcK53a3FiKSaWa32', 'teacher', 'Teacher', 'teacher@college.edu.in'),
  ('accountant', '$2a$10$6ZrEKl9AoJsfzPx6jMK7ue5poxz.R/wOu.naGxcK53a3FiKSaWa32', 'accountant', 'Accountant', 'accountant@college.edu.in');

-- Update the existing admin to super_admin role
UPDATE admins SET role = 'super_admin' WHERE username = 'admin' AND role = 'admin';

-- ------------------------------------------------------------
-- Cleanup helper procedures
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS add_col_if_missing;
DROP PROCEDURE IF EXISTS add_idx_if_missing;
