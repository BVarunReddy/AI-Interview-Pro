-- ============================================================
-- InterviewPro — Database Schema
-- Reconstructed from backend/routes/*.js queries
-- (no schema.sql shipped in the original project/zip or git history)
-- ============================================================

CREATE DATABASE IF NOT EXISTS interview_system;
USE interview_system;

-- ─── USERS (recruiters / HR / admins) ──────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  role        VARCHAR(50)   NOT NULL DEFAULT 'hr',
  department  VARCHAR(100)  NULL,
  phone       VARCHAR(30)   NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── CANDIDATES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidates (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(150)  NOT NULL,
  email           VARCHAR(150)  NOT NULL UNIQUE,
  phone           VARCHAR(30)   NULL,
  position        VARCHAR(150)  NOT NULL,
  experience      INT           DEFAULT 0,
  skills          TEXT          NULL,
  resume_path     VARCHAR(255)  NULL,
  status          VARCHAR(30)   NOT NULL DEFAULT 'Pending',
  ai_score        DECIMAL(5,2)  NULL,
  ml_prediction   VARCHAR(100)  NULL,
  ml_probability  DECIMAL(5,2)  NULL,
  created_by      INT           NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── INTERVIEWS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interviews (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id    INT           NOT NULL,
  candidate_name  VARCHAR(150)  NOT NULL,
  interviewer     VARCHAR(150)  NOT NULL,
  round_name      VARCHAR(100)  NOT NULL,
  interview_date  DATE          NOT NULL,
  interview_time  TIME          NOT NULL,
  notes           TEXT          NULL,
  status          VARCHAR(30)   NOT NULL DEFAULT 'Scheduled',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- ─── FEEDBACK ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id           INT           NOT NULL,
  candidate_name         VARCHAR(150)  NOT NULL,
  interview_id           INT           NULL,
  technical_score        INT           NOT NULL,
  communication_score    INT           NOT NULL,
  problem_solving_score  INT           NOT NULL,
  overall_score          DECIMAL(5,2)  NOT NULL,
  recommendation         VARCHAR(30)   NOT NULL DEFAULT 'Maybe',
  remarks                TEXT          NULL,
  submitted_by           INT           NULL,
  created_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE SET NULL,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── NOTIFICATIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(150)  NOT NULL,
  message     TEXT          NOT NULL,
  type        VARCHAR(30)   NOT NULL DEFAULT 'info',
  user_id     INT           NULL,
  is_read     TINYINT(1)    NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Helpful indexes ────────────────────────────────────────
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX idx_feedback_candidate ON feedback(candidate_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
