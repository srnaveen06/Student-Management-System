-- ============================================================
-- College ERP - Migration for new features
-- Extends the existing student_management schema.
-- Adds: Academic Calendar, Announcements, Leave Management,
--       Student ID Cards + QR verification, and an
--       'Approved Leave' attendance status.
-- Safe to run multiple times (idempotent guards).
--
-- Run with:  source database/college_erp_migration.sql;
-- ============================================================

USE student_management;

-- ------------------------------------------------------------
-- Helper procedures (erp_ prefixed to avoid clashing with migration.sql)
-- ------------------------------------------------------------
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS erp_add_col_if_missing(IN tbl_name VARCHAR(64), IN col_name VARCHAR(64), IN col_ddl VARCHAR(512))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl_name AND COLUMN_NAME = col_name
  ) THEN
    SET @s = CONCAT('ALTER TABLE ', tbl_name, ' ADD COLUMN ', col_ddl);
    PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//

CREATE PROCEDURE IF NOT EXISTS erp_add_idx_if_missing(IN tbl_name VARCHAR(64), IN idx_name VARCHAR(64), IN idx_ddl VARCHAR(512))
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
-- 1. Extend attendance status so approved leave is distinguishable
--    (Present / Absent / Approved Leave).
--    All percentage queries treat 'Approved Leave' as present,
--    so approved leave never lowers a student's attendance rate.
-- ------------------------------------------------------------
ALTER TABLE attendance
  MODIFY COLUMN status ENUM('Present','Absent','Approved Leave') NOT NULL DEFAULT 'Present';

-- ------------------------------------------------------------
-- 2. Academic Calendar events
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academic_events (
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
) ENGINE=InnoDB;

CALL erp_add_idx_if_missing('academic_events', 'idx_event_start', '(start_date)');
CALL erp_add_idx_if_missing('academic_events', 'idx_event_type', '(event_type)');
CALL erp_add_idx_if_missing('academic_events', 'idx_event_branch_sem', '(branch, semester)');

-- ------------------------------------------------------------
-- 3. Announcements
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
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
) ENGINE=InnoDB;

CALL erp_add_idx_if_missing('announcements', 'idx_announce_pinned', '(is_pinned, announcement_type)');
CALL erp_add_idx_if_missing('announcements', 'idx_announce_type', '(announcement_type)');

-- ------------------------------------------------------------
-- 4. Leave Requests
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
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
) ENGINE=InnoDB;

CALL erp_add_idx_if_missing('leave_requests', 'idx_leave_student', '(student_id)');
CALL erp_add_idx_if_missing('leave_requests', 'idx_leave_status', '(status)');
CALL erp_add_idx_if_missing('leave_requests', 'idx_leave_from', '(from_date)');

-- ------------------------------------------------------------
-- 5. Student ID Cards + QR verification tokens
--    The verification token is a non-sequential SHA-256 hash —
--    it never encodes personal/sensitive data.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_id_cards (
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
) ENGINE=InnoDB;

CALL erp_add_idx_if_missing('student_id_cards', 'idx_idcard_status', '(status)');

-- ------------------------------------------------------------
-- Seed: Academic events (only when the table is empty)
-- ------------------------------------------------------------
INSERT INTO academic_events (title, event_type, start_date, end_date, branch, semester, location, description, status, created_by)
SELECT * FROM (
  SELECT 'Independence Day' AS title, 'Holiday' AS event_type, '2026-08-15' AS start_date, NULL AS end_date, NULL AS branch, NULL AS semester, 'College Grounds' AS location, 'National holiday - campus closed.' AS description, 'Active' AS status, NULL AS created_by
  UNION ALL SELECT 'Mid-Semester Examinations', 'Exam', '2026-09-14', '2026-09-20', NULL, NULL, 'All Campuses', 'Mid-semester exams for all branches.', 'Active', NULL
  UNION ALL SELECT 'Technical Symposium - TechNova', 'Cultural', '2026-09-25', '2026-09-27', NULL, NULL, 'Main Auditorium', 'Annual technical and cultural symposium.', 'Active', NULL
  UNION ALL SELECT 'Republic Day', 'Holiday', '2027-01-26', NULL, NULL, NULL, 'College Grounds', 'National holiday - campus closed.', 'Active', NULL
  UNION ALL SELECT 'Annual Sports Meet', 'Sports', '2027-02-10', '2027-02-12', NULL, NULL, 'Sports Complex', 'Inter-branch athletics and games.', 'Active', NULL
  UNION ALL SELECT 'Final Term Examinations', 'Exam', '2027-04-05', '2027-04-18', NULL, NULL, 'All Campuses', 'End of academic year examinations.', 'Active', NULL
  UNION ALL SELECT 'Workshop: AI & Machine Learning', 'Workshop', '2026-10-12', '2026-10-14', 'Computer Science', NULL, 'CS Block Lab 3', 'Hands-on ML workshop for CS students.', 'Active', NULL
) x
WHERE (SELECT COUNT(*) FROM academic_events) = 0;

-- ------------------------------------------------------------
-- Seed: Announcements (only when the table is empty)
-- ------------------------------------------------------------
INSERT INTO announcements (title, content, announcement_type, audience, is_pinned, published_by)
SELECT * FROM (
  SELECT 'Welcome to the Academic Year 2026-27' AS title, 'Welcome back to all students! The new academic session begins on Monday. Please collect your timetables from your departments.' AS content, 'General' AS announcement_type, 'All' AS audience, 1 AS is_pinned, NULL AS published_by
  UNION ALL SELECT 'Mid-Semester Exam Schedule Released', 'The mid-semester examination schedule has been published in the Academic Calendar. Kindly prepare accordingly and contact your HOD for any clashes.', 'Exam', 'Students', 1, NULL
  UNION ALL SELECT 'Fee Payment Reminder', 'Second installment of tuition fees is due by the 15th of next month. Late payments attract a penalty. Pay online via the portal.', 'Fee', 'All', 0, NULL
  UNION ALL SELECT 'Library Summer Hours', 'The central library will remain open from 8 AM to 8 PM during the exam period.', 'Notice', 'All', 0, NULL
  UNION ALL SELECT 'Campus Placement Drive', 'Leading tech companies will visit campus next month for final year placements. Register in the placement cell.', 'Event', 'Students', 0, NULL
) x
WHERE (SELECT COUNT(*) FROM announcements) = 0;

-- ------------------------------------------------------------
-- Seed: Leave requests (only when the table is empty)
-- ------------------------------------------------------------
INSERT INTO leave_requests (student_id, leave_type, from_date, to_date, days, reason, status, remarks, requested_by, approved_by)
SELECT * FROM (
  SELECT s.id AS student_id, 'Sick' AS leave_type, '2026-08-18' AS from_date, '2026-08-19' AS to_date, 2 AS days, 'High fever, doctor advised rest.' AS reason, 'Pending' AS status, NULL AS remarks, NULL AS requested_by, NULL AS approved_by
  FROM students s WHERE s.student_id = 'STU-2024-001'
  UNION ALL SELECT s.id, 'Casual', '2026-08-25', '2026-08-25', 1, 'Family function in hometown.', 'Pending', NULL, NULL, NULL
  FROM students s WHERE s.student_id = 'STU-2024-005'
  UNION ALL SELECT s.id, 'Emergency', '2026-08-10', '2026-08-12', 3, 'Medical emergency in family.', 'Approved', 'Approved - take care.', NULL, (SELECT id FROM admins WHERE username = 'admin' LIMIT 1)
  FROM students s WHERE s.student_id = 'STU-2024-004'
  UNION ALL SELECT s.id, 'Study', '2026-09-01', '2026-09-03', 3, 'Preparing for competitive exam.', 'Rejected', 'Not permitted during regular classes.', NULL, (SELECT id FROM admins WHERE username = 'admin' LIMIT 1)
  FROM students s WHERE s.student_id = 'STU-2024-010'
  UNION ALL SELECT s.id, 'Sick', '2026-08-14', '2026-08-14', 1, 'Viral fever.', 'Cancelled', NULL, NULL, NULL
  FROM students s WHERE s.student_id = 'STU-2024-002'
) x
WHERE (SELECT COUNT(*) FROM leave_requests) = 0;

-- ------------------------------------------------------------
-- Seed: Student ID cards for all existing students
--        (non-sequential SHA-256 verification tokens)
-- ------------------------------------------------------------
INSERT INTO student_id_cards (student_id, card_number, verification_token, issued_on, valid_until, status, issued_by)
SELECT s.id,
       CONCAT('SID-', YEAR(CURDATE()), '-', LPAD(s.id, 4, '0')),
       SHA2(CONCAT(s.student_id, '|', s.email, '|', UUID(), '|', RAND()), 256),
       CURDATE(),
       DATE_ADD(CURDATE(), INTERVAL 4 YEAR),
       'Active',
       (SELECT id FROM admins WHERE username = 'admin' LIMIT 1)
FROM students s
WHERE (SELECT COUNT(*) FROM student_id_cards) = 0;

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
CALL erp_add_idx_if_missing('student_documents', 'idx_doc_student', '(student_id)');

-- ------------------------------------------------------------
-- Cleanup helper procedures
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS erp_add_col_if_missing;
DROP PROCEDURE IF EXISTS erp_add_idx_if_missing;
