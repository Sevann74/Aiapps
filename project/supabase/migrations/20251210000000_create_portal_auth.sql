-- Portal Authentication Schema
-- Creates user profiles table and security policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  company_logo TEXT, -- Base64 encoded logo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can insert new profiles
CREATE POLICY "Admins can create profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON public.user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON public.user_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization ON public.user_profiles(organization);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;

-- ============================================
-- JOBS TABLE (for document submissions)
-- ============================================

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.user_profiles(id),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_progress', 'preview_ready', 'revision_requested', 'approved', 'delivered', 'completed')),
  course_title TEXT NOT NULL,
  sop_number TEXT,
  document_version TEXT,
  effective_date DATE,
  regulatory_status TEXT,
  quiz_mode TEXT DEFAULT 'ai',
  question_count INTEGER DEFAULT 5,
  passing_score INTEGER DEFAULT 80,
  max_attempts INTEGER DEFAULT 3,
  scorm_version TEXT DEFAULT '1.2',
  comments TEXT,
  file_name TEXT NOT NULL,
  file_checksum TEXT NOT NULL,
  file_storage_path TEXT, -- Path in Supabase Storage
  preview_content TEXT,
  scorm_file_name TEXT,
  scorm_storage_path TEXT, -- Path in Supabase Storage
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Clients can read their own jobs
CREATE POLICY "Clients can read own jobs"
  ON public.jobs
  FOR SELECT
  USING (client_id = auth.uid());

-- Policy: Admins can read all jobs
CREATE POLICY "Admins can read all jobs"
  ON public.jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Clients can create jobs
CREATE POLICY "Clients can create jobs"
  ON public.jobs
  FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Policy: Admins can update any job
CREATE POLICY "Admins can update jobs"
  ON public.jobs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Clients can update their own jobs (limited fields)
CREATE POLICY "Clients can update own jobs"
  ON public.jobs
  FOR UPDATE
  USING (client_id = auth.uid());

-- Trigger for jobs updated_at
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for jobs
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);

-- Grant access
GRANT SELECT, INSERT, UPDATE ON public.jobs TO authenticated;

-- ============================================
-- AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES public.user_profiles(id),
  actor_email TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Clients can read audit logs for their jobs
CREATE POLICY "Clients can read own job audit logs"
  ON public.audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = audit_log.job_id AND jobs.client_id = auth.uid()
    )
  );

-- Policy: Admins can read all audit logs
CREATE POLICY "Admins can read all audit logs"
  ON public.audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: System can insert audit logs (via service role)
CREATE POLICY "Authenticated users can create audit logs"
  ON public.audit_log
  FOR INSERT
  WITH CHECK (true);

-- Index for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_job_id ON public.audit_log(job_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Grant access
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
