/*
  # Audit Trail & Version Control System

  This migration creates a comprehensive audit trail system for tracking relationships
  between source documents (SOPs/policies) and generated courses, enabling complete
  version control and compliance auditing.

  ## 1. New Tables

  ### `documents`
  Stores metadata for all uploaded source documents (PDFs, SOPs, policies)
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users) - Document owner
  - `name` (text) - Original filename
  - `version` (text) - Document version number
  - `file_hash` (text) - SHA-256 hash for change detection
  - `file_size` (bigint) - File size in bytes
  - `page_count` (integer) - Number of pages in PDF
  - `word_count` (integer) - Extracted word count
  - `content_preview` (text) - First 500 characters of extracted text
  - `upload_date` (timestamptz) - When document was uploaded
  - `metadata` (jsonb) - Additional document metadata
  - `created_at` (timestamptz)

  ### `courses`
  Stores metadata for all generated courses
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users) - Course creator
  - `title` (text) - Course title
  - `status` (text) - Draft, published, archived
  - `module_count` (integer) - Number of modules
  - `question_count` (integer) - Number of quiz questions
  - `scorm_version` (text) - SCORM version used
  - `has_quiz` (boolean) - Whether course includes quiz
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `course_document_relationships`
  Links courses to their source documents with version tracking
  - `id` (uuid, primary key)
  - `course_id` (uuid, foreign key to courses)
  - `document_id` (uuid, foreign key to documents)
  - `document_version` (text) - Version of document used
  - `relationship_type` (text) - Source, reference, etc.
  - `created_at` (timestamptz)

  ### `course_generations`
  Tracks each course generation event with full configuration
  - `id` (uuid, primary key)
  - `course_id` (uuid, foreign key to courses)
  - `user_id` (uuid, foreign key to auth.users)
  - `document_id` (uuid, foreign key to documents)
  - `generation_type` (text) - Initial, regenerate, update
  - `configuration` (jsonb) - Full generation config (passing score, max attempts, etc.)
  - `verification_report` (jsonb) - AI verification results
  - `generation_date` (timestamptz)
  - `export_date` (timestamptz) - When SCORM was exported
  - `created_at` (timestamptz)

  ## 2. Security

  - Enable RLS on all tables
  - Users can only view/manage their own documents and courses
  - Admins can view all audit trail data
  - Audit trail tables are insert-only for users (no updates/deletes)

  ## 3. Important Notes

  - This system provides complete traceability for compliance audits
  - All relationships are timestamped and immutable once created
  - Document versions are tracked using file hash and version numbers
  - Course generations include full configuration for reproducibility
*/

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  version text DEFAULT '1.0',
  file_hash text NOT NULL,
  file_size bigint DEFAULT 0,
  page_count integer DEFAULT 0,
  word_count integer DEFAULT 0,
  content_preview text DEFAULT '',
  upload_date timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Courses Table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  status text DEFAULT 'draft',
  module_count integer DEFAULT 0,
  question_count integer DEFAULT 0,
  scorm_version text DEFAULT '1.2',
  has_quiz boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own courses"
  ON courses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all courses"
  ON courses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Course Document Relationships Table
CREATE TABLE IF NOT EXISTS course_document_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  document_version text NOT NULL,
  relationship_type text DEFAULT 'source',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE course_document_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own course relationships"
  ON course_document_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_document_relationships.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own course relationships"
  ON course_document_relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_document_relationships.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all relationships"
  ON course_document_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Course Generations Table (Audit Trail)
CREATE TABLE IF NOT EXISTS course_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  generation_type text DEFAULT 'initial',
  configuration jsonb DEFAULT '{}'::jsonb,
  verification_report jsonb DEFAULT '{}'::jsonb,
  generation_date timestamptz DEFAULT now(),
  export_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE course_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own course generations"
  ON course_generations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own course generations"
  ON course_generations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all course generations"
  ON course_generations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date);

CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_created ON courses(created_at);

CREATE INDEX IF NOT EXISTS idx_course_relationships_course ON course_document_relationships(course_id);
CREATE INDEX IF NOT EXISTS idx_course_relationships_document ON course_document_relationships(document_id);

CREATE INDEX IF NOT EXISTS idx_generations_course ON course_generations(course_id);
CREATE INDEX IF NOT EXISTS idx_generations_document ON course_generations(document_id);
CREATE INDEX IF NOT EXISTS idx_generations_user ON course_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_date ON course_generations(generation_date);