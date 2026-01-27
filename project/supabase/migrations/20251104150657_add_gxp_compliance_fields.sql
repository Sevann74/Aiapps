/*
  # Add GxP Compliance Fields to Audit Trail System

  This migration enhances the audit trail system with critical fields required for 
  GxP/FDA 21 CFR Part 11 compliance in pharmaceutical and regulated industries.

  ## 1. Enhanced Tables

  ### `documents` - New Columns
  - `sop_number` (text) - SOP/Policy identification number (e.g., "PV-SYS-SOP-002")
  - `effective_date` (date) - Document effective/enforcement date
  - `review_cycle` (text) - Review frequency (Annual, Biennial, etc.)
  - `regulatory_status` (text) - Approval status (Draft, Under Review, Approved, Superseded)
  - `checksum` (text) - File integrity hash (SHA-256)
  - `data_classification` (text) - Data sensitivity level (Public, Internal, Confidential, Restricted)
  - `retention_period` (text) - How long to retain (e.g., "10 years", "25 years", "Permanent")

  ### `courses` - New Columns
  - `regulatory_status` (text) - Course approval status
  - `approved_by_user_id` (uuid) - Who approved this course
  - `approval_date` (timestamptz) - When it was approved
  - `supersedes_course_id` (uuid) - Previous version this replaces
  - `requires_sme_review` (boolean) - Whether SME review is required
  - `sme_reviewer_id` (uuid) - Assigned SME reviewer
  - `sme_review_status` (text) - Pending, Approved, Rejected
  - `sme_review_date` (timestamptz) - When SME reviewed
  - `sme_review_comments` (text) - SME feedback

  ### `course_generations` - New Columns
  - `ai_model_version` (text) - Which AI model was used
  - `ai_temperature` (numeric) - AI temperature setting
  - `question_source` (text) - How questions were created (ai, manual, hybrid)
  - `generation_checksum` (text) - Hash of generated content
  - `performed_by_user_id` (uuid) - Who triggered generation
  - `performed_by_role` (text) - User's role at time of generation
  - `performed_by_department` (text) - User's department

  ### New Table: `question_reviews`
  Tracks SME review of each AI-generated question
  - `id` (uuid, primary key)
  - `course_generation_id` (uuid) - Which generation this belongs to
  - `question_id` (text) - Question identifier
  - `question_text` (text) - The actual question
  - `source_reference` (text) - Section/page reference
  - `exact_quote` (text) - Source material quote
  - `reviewer_id` (uuid) - SME who reviewed
  - `review_status` (text) - Pending, Approved, Rejected, Needs Revision
  - `review_date` (timestamptz) - When reviewed
  - `review_comments` (text) - SME feedback
  - `revision_count` (integer) - Number of times revised
  - `created_at` (timestamptz)

  ## 2. Security & Compliance
  - All new fields support audit trail requirements
  - RLS policies ensure data access control
  - Integrity checks via checksums
  - Complete traceability of approval workflows

  ## 3. Important Notes
  - Supports FDA 21 CFR Part 11 requirements
  - Enables complete GxP audit trail
  - Tracks who did what, when, and why
  - Maintains data integrity and security
*/

-- Add compliance fields to documents table
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS sop_number text,
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS review_cycle text DEFAULT 'Annual',
  ADD COLUMN IF NOT EXISTS regulatory_status text DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS checksum text,
  ADD COLUMN IF NOT EXISTS data_classification text DEFAULT 'Internal',
  ADD COLUMN IF NOT EXISTS retention_period text DEFAULT '10 years';

-- Add compliance fields to courses table
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS regulatory_status text DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS approved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_date timestamptz,
  ADD COLUMN IF NOT EXISTS supersedes_course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requires_sme_review boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sme_reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sme_review_status text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS sme_review_date timestamptz,
  ADD COLUMN IF NOT EXISTS sme_review_comments text;

-- Add compliance fields to course_generations table
ALTER TABLE course_generations
  ADD COLUMN IF NOT EXISTS ai_model_version text,
  ADD COLUMN IF NOT EXISTS ai_temperature numeric(3,2) DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS question_source text DEFAULT 'ai',
  ADD COLUMN IF NOT EXISTS generation_checksum text,
  ADD COLUMN IF NOT EXISTS performed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS performed_by_role text,
  ADD COLUMN IF NOT EXISTS performed_by_department text;

-- Create question_reviews table
CREATE TABLE IF NOT EXISTS question_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_generation_id uuid REFERENCES course_generations(id) ON DELETE CASCADE NOT NULL,
  question_id text NOT NULL,
  question_text text NOT NULL,
  source_reference text,
  exact_quote text,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_status text DEFAULT 'Pending',
  review_date timestamptz,
  review_comments text,
  revision_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE question_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view question reviews for their courses"
  ON question_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_generations cg
      JOIN courses c ON c.id = cg.course_id
      WHERE cg.id = question_reviews.course_generation_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "SME reviewers can view assigned question reviews"
  ON question_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = reviewer_id);

CREATE POLICY "System can insert question reviews"
  ON question_reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "SME reviewers can update their reviews"
  ON question_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Admins can view all question reviews"
  ON question_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_documents_sop_number ON documents(sop_number);
CREATE INDEX IF NOT EXISTS idx_documents_regulatory_status ON documents(regulatory_status);
CREATE INDEX IF NOT EXISTS idx_documents_effective_date ON documents(effective_date);

CREATE INDEX IF NOT EXISTS idx_courses_regulatory_status ON courses(regulatory_status);
CREATE INDEX IF NOT EXISTS idx_courses_sme_review_status ON courses(sme_review_status);
CREATE INDEX IF NOT EXISTS idx_courses_approved_by ON courses(approved_by_user_id);
CREATE INDEX IF NOT EXISTS idx_courses_sme_reviewer ON courses(sme_reviewer_id);

CREATE INDEX IF NOT EXISTS idx_generations_ai_model ON course_generations(ai_model_version);
CREATE INDEX IF NOT EXISTS idx_generations_question_source ON course_generations(question_source);
CREATE INDEX IF NOT EXISTS idx_generations_performed_by ON course_generations(performed_by_user_id);

CREATE INDEX IF NOT EXISTS idx_question_reviews_generation ON question_reviews(course_generation_id);
CREATE INDEX IF NOT EXISTS idx_question_reviews_reviewer ON question_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_question_reviews_status ON question_reviews(review_status);
CREATE INDEX IF NOT EXISTS idx_question_reviews_date ON question_reviews(review_date);