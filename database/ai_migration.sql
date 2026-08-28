-- ============================================================
-- College Management System - AI Platform Migration
-- Adds tables needed by the AI features (assistant, logs,
-- reports, risk predictions, questions, documents).
-- Idempotent — safe to run multiple times.
--
-- Run with:  source database/ai_migration.sql;
-- ============================================================

USE student_management;

-- ------------------------------------------------------------
-- 1. AI Conversations (CampusAI sessions)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) DEFAULT 'New Chat',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_aiconv_user FOREIGN KEY (user_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ai_messages (
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
) ENGINE=InnoDB;
CREATE INDEX idx_aimsg_conv ON ai_messages (conversation_id, created_at);

-- ------------------------------------------------------------
-- 2. AI Activity / Audit Log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_activity_logs (
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
) ENGINE=InnoDB;
CREATE INDEX idx_aiact_user_time ON ai_activity_logs (user_id, created_at);
CREATE INDEX idx_aiact_feature ON ai_activity_logs (feature, created_at);

-- ------------------------------------------------------------
-- 3. AI Reports
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  filters JSON DEFAULT NULL,
  content JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_airpt_user FOREIGN KEY (user_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_airpt_user ON ai_reports (user_id, created_at);

-- ------------------------------------------------------------
-- 4. AI Risk Predictions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_risk_predictions (
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
) ENGINE=InnoDB;
CREATE INDEX idx_airisk_student ON ai_risk_predictions (student_id, created_at);

-- ------------------------------------------------------------
-- 5. ML Model Versions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_model_versions (
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
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. AI Document Extractions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_document_extractions (
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
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. Default AI settings
-- ------------------------------------------------------------
INSERT INTO settings (setting_key, setting_value, setting_type) VALUES
  ('ai_enabled', 'true', 'boolean'),
  ('ai_assistant_enabled', 'true', 'boolean'),
  ('ai_search_enabled', 'true', 'boolean'),
  ('ai_insights_enabled', 'true', 'boolean'),
  ('ai_logging_enabled', 'true', 'boolean'),
  ('ai_document_processing_enabled', 'true', 'boolean'),
  ('ai_risk_prediction_enabled', 'true', 'boolean'),
  ('ai_roles', 'super_admin,admin,teacher,accountant', 'string'),
  ('ai_teacher_scope_branch', '', 'string')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- ============================================================
-- Cleanup helper procedures (re-run idempotent guards if present)
-- ============================================================
