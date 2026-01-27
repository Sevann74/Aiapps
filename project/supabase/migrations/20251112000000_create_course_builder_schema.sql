/*
  # AI Course Builder Portal - Complete Database Schema

  ## Overview
  This migration creates a complete database schema for the AI Course Builder Portal,
  enabling clients to submit SOP documents for conversion to SCORM courses with
  full workflow management, file storage, and audit trail capabilities.

  ## New Tables

  ### 1. course_requests
  Main table for tracking course conversion requests from clients
  - `id` (uuid, primary key) - Unique job identifier
  - `job_number` (text, unique) - Human-readable job number (e.g., J001)
  - `user_id` (uuid, foreign key) - Client who submitted the request
  - `client_name` (text) - Client's full name
  - `client_email` (text) - Client's contact email
  - `organization` (text) - Client's organization name
  - `status` (text) - Current status of the request
  - `course_title` (text) - Title of the course
  - `sop_number` (text) - SOP document number
  - `effective_date` (date) - SOP effective date
  - `estimated_seat_time` (integer) - Estimated time in minutes
  - `regulatory_status` (text) - Regulatory approval status
  - `quiz_mode` (text) - Type of quiz (ai, manual, hybrid, none)
  - `comments` (text) - Special instructions from client
  - `file_name` (text) - Original uploaded file name
  - `file_path` (text) - Storage path for the uploaded SOP
  - `file_checksum` (text) - File integrity checksum
  - `preview_file_name` (text) - Preview file name
  - `preview_file_path` (text) - Storage path for preview
  - `scorm_file_name` (text) - Final SCORM package name
  - `scorm_file_path` (text) - Storage path for SCORM package
  - `audit_file_name` (text) - Audit trail file name
  - `audit_file_path` (text) - Storage path for audit trail
  - `download_expires_at` (timestamptz) - When download link expires
  - `eta` (text) - Estimated time of completion
  - `admin_notes` (text) - Internal admin notes
  - `created_at` (timestamptz) - When request was created
  - `updated_at` (timestamptz) - Last update timestamp
  - `submitted_at` (timestamptz) - When request was submitted

  ### 2. course_questions
  Stores manual quiz questions provided by clients
  - `id` (uuid, primary key)
  - `course_request_id` (uuid, foreign key) - Related course request
  - `question_order` (integer) - Order of question
  - `question` (text) - Question text
  - `option_a` (text) - First answer option
  - `option_b` (text) - Second answer option
  - `option_c` (text) - Third answer option
  - `option_d` (text) - Fourth answer option
  - `correct_answer` (integer) - Index of correct answer (0-3)
  - `explanation` (text) - Explanation for correct answer
  - `created_at` (timestamptz)

  ### 3. course_revisions
  Tracks revision requests from clients
  - `id` (uuid, primary key)
  - `course_request_id` (uuid, foreign key) - Related course request
  - `requested_by` (uuid, foreign key) - User who requested revision
  - `revision_comment` (text) - Detailed revision request
  - `status` (text) - Status of revision (pending, in_progress, completed)
  - `admin_response` (text) - Admin's response to revision
  - `created_at` (timestamptz)
  - `resolved_at` (timestamptz) - When revision was resolved

  ### 4. course_audit_logs
  Comprehensive audit trail for all course-related actions
  - `id` (uuid, primary key)
  - `course_request_id` (uuid, foreign key) - Related course request
  - `action` (text) - Action performed
  - `actor_id` (uuid, foreign key) - User who performed action
  - `actor_email` (text) - Email of actor
  - `details` (text) - Additional details about action
  - `ip_address` (text) - IP address of actor
  - `user_agent` (text) - Browser/client information
  - `created_at` (timestamptz)

  ## Security
  - Enable Row Level Security (RLS) on all tables
  - Clients can only view/modify their own requests
  - Admins can view/modify all requests
  - Comprehensive audit logging for compliance

  ## Indexes
  - Performance indexes on frequently queried columns
  - Full-text search capabilities on course titles and SOP numbers
*/

-- Course Requests Table
CREATE TABLE IF NOT EXISTS course_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_name text NOT NULL DEFAULT '',
  client_email text NOT NULL DEFAULT '',
  organization text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'submitted',
  course_title text NOT NULL,
  sop_number text DEFAULT '',
  effective_date date,
  estimated_seat_time integer DEFAULT 30,
  regulatory_status text DEFAULT 'Draft',
  quiz_mode text NOT NULL DEFAULT 'ai',
  comments text DEFAULT '',
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_checksum text NOT NULL,
  preview_file_name text,
  preview_file_path text,
  scorm_file_name text,
  scorm_file_path text,
  audit_file_name text,
  audit_file_path text,
  download_expires_at timestamptz,
  eta text DEFAULT '48-72 hours',
  admin_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  submitted_at timestamptz DEFAULT now()
);

-- Add constraint for valid status values
ALTER TABLE course_requests ADD CONSTRAINT valid_status
  CHECK (status IN ('submitted', 'in_progress', 'pending_review', 'revision_requested', 'approved', 'delivered', 'closed'));

-- Add constraint for valid quiz modes
ALTER TABLE course_requests ADD CONSTRAINT valid_quiz_mode
  CHECK (quiz_mode IN ('ai', 'manual', 'hybrid', 'none'));

-- Course Questions Table
CREATE TABLE IF NOT EXISTS course_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_request_id uuid REFERENCES course_requests(id) ON DELETE CASCADE NOT NULL,
  question_order integer NOT NULL DEFAULT 0,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer integer NOT NULL DEFAULT 0,
  explanation text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Add constraint for valid correct answer
ALTER TABLE course_questions ADD CONSTRAINT valid_correct_answer
  CHECK (correct_answer >= 0 AND correct_answer <= 3);

-- Course Revisions Table
CREATE TABLE IF NOT EXISTS course_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_request_id uuid REFERENCES course_requests(id) ON DELETE CASCADE NOT NULL,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revision_comment text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_response text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Add constraint for valid revision status
ALTER TABLE course_revisions ADD CONSTRAINT valid_revision_status
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

-- Course Audit Logs Table
CREATE TABLE IF NOT EXISTS course_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_request_id uuid REFERENCES course_requests(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text NOT NULL DEFAULT '',
  details text DEFAULT '',
  ip_address text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE course_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- COURSE REQUESTS POLICIES
-- ============================================

-- Clients can view their own requests
CREATE POLICY "Clients can view own course requests"
  ON course_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all course requests"
  ON course_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Clients can create their own requests
CREATE POLICY "Clients can create course requests"
  ON course_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Clients can update their own requests (limited fields)
CREATE POLICY "Clients can update own course requests"
  ON course_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can update any request
CREATE POLICY "Admins can update all course requests"
  ON course_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admins can delete requests
CREATE POLICY "Admins can delete course requests"
  ON course_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- ============================================
-- COURSE QUESTIONS POLICIES
-- ============================================

-- Clients can view questions for their requests
CREATE POLICY "Clients can view own course questions"
  ON course_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_requests
      WHERE course_requests.id = course_questions.course_request_id
      AND course_requests.user_id = auth.uid()
    )
  );

-- Admins can view all questions
CREATE POLICY "Admins can view all course questions"
  ON course_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Clients can create questions for their requests
CREATE POLICY "Clients can create course questions"
  ON course_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_requests
      WHERE course_requests.id = course_questions.course_request_id
      AND course_requests.user_id = auth.uid()
    )
  );

-- Clients can update their own questions
CREATE POLICY "Clients can update own course questions"
  ON course_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_requests
      WHERE course_requests.id = course_questions.course_request_id
      AND course_requests.user_id = auth.uid()
    )
  );

-- Clients can delete their own questions
CREATE POLICY "Clients can delete own course questions"
  ON course_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_requests
      WHERE course_requests.id = course_questions.course_request_id
      AND course_requests.user_id = auth.uid()
    )
  );

-- ============================================
-- COURSE REVISIONS POLICIES
-- ============================================

-- Clients can view revisions for their requests
CREATE POLICY "Clients can view own course revisions"
  ON course_revisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_requests
      WHERE course_requests.id = course_revisions.course_request_id
      AND course_requests.user_id = auth.uid()
    )
  );

-- Admins can view all revisions
CREATE POLICY "Admins can view all course revisions"
  ON course_revisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Clients can create revisions for their requests
CREATE POLICY "Clients can create course revisions"
  ON course_revisions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_requests
      WHERE course_requests.id = course_revisions.course_request_id
      AND course_requests.user_id = auth.uid()
    )
    AND auth.uid() = requested_by
  );

-- Admins can update revisions
CREATE POLICY "Admins can update course revisions"
  ON course_revisions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- ============================================
-- COURSE AUDIT LOGS POLICIES
-- ============================================

-- Clients can view audit logs for their requests
CREATE POLICY "Clients can view own course audit logs"
  ON course_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_requests
      WHERE course_requests.id = course_audit_logs.course_request_id
      AND course_requests.user_id = auth.uid()
    )
  );

-- Admins can view all audit logs
CREATE POLICY "Admins can view all course audit logs"
  ON course_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Anyone authenticated can insert audit logs (system logging)
CREATE POLICY "Authenticated users can create audit logs"
  ON course_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Course Requests indexes
CREATE INDEX IF NOT EXISTS idx_course_requests_user_id ON course_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_course_requests_status ON course_requests(status);
CREATE INDEX IF NOT EXISTS idx_course_requests_job_number ON course_requests(job_number);
CREATE INDEX IF NOT EXISTS idx_course_requests_created_at ON course_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_requests_updated_at ON course_requests(updated_at DESC);

-- Full-text search index for course titles and SOP numbers
CREATE INDEX IF NOT EXISTS idx_course_requests_search ON course_requests
  USING gin(to_tsvector('english', course_title || ' ' || COALESCE(sop_number, '')));

-- Course Questions indexes
CREATE INDEX IF NOT EXISTS idx_course_questions_course_id ON course_questions(course_request_id);
CREATE INDEX IF NOT EXISTS idx_course_questions_order ON course_questions(course_request_id, question_order);

-- Course Revisions indexes
CREATE INDEX IF NOT EXISTS idx_course_revisions_course_id ON course_revisions(course_request_id);
CREATE INDEX IF NOT EXISTS idx_course_revisions_status ON course_revisions(status);
CREATE INDEX IF NOT EXISTS idx_course_revisions_created_at ON course_revisions(created_at DESC);

-- Course Audit Logs indexes
CREATE INDEX IF NOT EXISTS idx_course_audit_logs_course_id ON course_audit_logs(course_request_id);
CREATE INDEX IF NOT EXISTS idx_course_audit_logs_created_at ON course_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_audit_logs_actor ON course_audit_logs(actor_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate next job number
CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS text AS $$
DECLARE
  next_num integer;
  job_num text;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num FROM course_requests;
  job_num := 'J' || LPAD(next_num::text, 3, '0');
  RETURN job_num;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_course_requests_updated_at
  BEFORE UPDATE ON course_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKETS (to be created separately)
-- ============================================

-- NOTE: Storage buckets need to be created using Supabase dashboard or API:
-- 1. course-sop-files (for uploaded SOP documents)
-- 2. course-previews (for preview files)
-- 3. course-scorm-packages (for final SCORM deliverables)
-- 4. course-audit-trails (for audit trail Excel files)
