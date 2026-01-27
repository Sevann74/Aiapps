// Jobs Service
// Handles job CRUD operations with Supabase

import { supabase } from './supabaseClient';

// Check if Supabase is configured
const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key);
};

// Job type matching the database schema
export interface Job {
  id: string;
  client_id: string;
  status: 'submitted' | 'in_progress' | 'pending_review' | 'revision_requested' | 'approved' | 'delivered' | 'completed';
  course_title: string;
  sop_number?: string;
  document_version?: string;
  effective_date?: string;
  regulatory_status?: string;
  quiz_mode: string;
  question_count: number;
  passing_score: number;
  max_attempts: number;
  scorm_version: string;
  comments?: string;
  file_name: string;
  file_checksum: string;
  file_storage_path?: string;
  preview_content?: string;
  preview_file_name?: string;
  scorm_file_name?: string;
  scorm_storage_path?: string;
  company_logo?: string; // Base64 encoded
  manual_questions?: any[];
  approved_at?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  client_name?: string;
  client_email?: string;
  organization?: string;
}

// Convert frontend job format to database format
function toDbFormat(job: any): any {
  return {
    client_id: job.clientId,
    status: job.status,
    course_title: job.courseTitle,
    sop_number: job.sopNumber || null,
    document_version: job.documentVersion || null,
    effective_date: job.effectiveDate || null,
    regulatory_status: job.regulatoryStatus || null,
    quiz_mode: job.quizMode || 'ai',
    question_count: job.questionCount || 5,
    passing_score: job.passingScore || 80,
    max_attempts: job.maxAttempts || 3,
    scorm_version: job.scormVersion || '1.2',
    comments: job.comments || null,
    file_name: job.fileName,
    file_checksum: job.fileChecksum,
    file_storage_path: job.filePath || null,
    previous_file_name: job.previousFileName || null,
    previous_file_storage_path: job.previousFilePath || null,
    previous_file_checksum: job.previousFileChecksum || null,
    has_previous_version: job.hasPreviousVersion || false,
    preview_content: job.previewContent || null,
    preview_file_name: job.previewFileName || null,
    scorm_file_name: job.scormFileName || null,
    scorm_storage_path: job.scormStoragePath || null,
    company_logo: job.companyLogo ? JSON.stringify(job.companyLogo) : null,
    manual_questions: job.manualQuestions ? JSON.stringify(job.manualQuestions) : null,
    approved_at: job.approvedAt || null,
    approved_by: job.approvedBy || null
  };
}

// Convert database format to frontend format
function toFrontendFormat(dbJob: any): any {
  return {
    id: dbJob.id,
    clientId: dbJob.client_id,
    clientName: dbJob.client_name || dbJob.user_profiles?.name || 'Unknown',
    clientEmail: dbJob.client_email || dbJob.user_profiles?.email || 'Unknown',
    organization: dbJob.organization || dbJob.user_profiles?.organization || 'Unknown',
    status: dbJob.status,
    courseTitle: dbJob.course_title,
    sopNumber: dbJob.sop_number,
    documentVersion: dbJob.document_version,
    effectiveDate: dbJob.effective_date,
    regulatoryStatus: dbJob.regulatory_status,
    quizMode: dbJob.quiz_mode,
    questionCount: dbJob.question_count,
    passingScore: dbJob.passing_score,
    maxAttempts: dbJob.max_attempts,
    scormVersion: dbJob.scorm_version,
    comments: dbJob.comments,
    fileName: dbJob.file_name,
    fileChecksum: dbJob.file_checksum,
    filePath: dbJob.file_storage_path,
    previousFileName: dbJob.previous_file_name,
    previousFilePath: dbJob.previous_file_storage_path,
    previousFileChecksum: dbJob.previous_file_checksum,
    hasPreviousVersion: dbJob.has_previous_version || false,
    previewContent: dbJob.preview_content,
    previewFileName: dbJob.preview_file_name,
    scormFileName: dbJob.scorm_file_name,
    scormStoragePath: dbJob.scorm_storage_path,
    companyLogo: dbJob.company_logo ? JSON.parse(dbJob.company_logo) : null,
    manualQuestions: dbJob.manual_questions ? JSON.parse(dbJob.manual_questions) : [],
    approvedAt: dbJob.approved_at,
    approvedBy: dbJob.approved_by,
    submittedAt: dbJob.created_at,
    createdAt: dbJob.created_at,
    updatedAt: dbJob.updated_at,
    eta: 'Up to 24 hours',
    auditLog: [] // Will be loaded separately if needed
  };
}

// Create a new job
export async function createJob(jobData: any): Promise<{ success: boolean; job?: any; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const dbData = toDbFormat(jobData);
    
    const { data, error } = await supabase
      .from('jobs')
      .insert(dbData)
      .select(`
        *,
        user_profiles:client_id (name, email, organization)
      `)
      .single();

    if (error) {
      console.error('Create job error:', error);
      return { success: false, error: error.message };
    }

    // Add audit log entry
    await addAuditLog(data.id, 'Job submitted', jobData.clientId, `File: ${jobData.fileName}`);

    return { success: true, job: toFrontendFormat(data) };
  } catch (err) {
    console.error('Create job error:', err);
    return { success: false, error: 'Failed to create job' };
  }
}

// Get all jobs (admin sees all, client sees own)
export async function getJobs(): Promise<{ success: boolean; jobs?: any[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: true, jobs: [] };
  }

  try {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        user_profiles:client_id (name, email, organization)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get jobs error:', error);
      return { success: false, error: error.message };
    }

    const jobs = (data || []).map(toFrontendFormat);
    return { success: true, jobs };
  } catch (err) {
    console.error('Get jobs error:', err);
    return { success: false, error: 'Failed to load jobs' };
  }
}

// Get a single job by ID
export async function getJob(jobId: string): Promise<{ success: boolean; job?: any; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        user_profiles:client_id (name, email, organization)
      `)
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Get job error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, job: toFrontendFormat(data) };
  } catch (err) {
    console.error('Get job error:', err);
    return { success: false, error: 'Failed to load job' };
  }
}

// Update a job
export async function updateJob(jobId: string, updates: any, actorId?: string, auditAction?: string): Promise<{ success: boolean; job?: any; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Convert updates to DB format (only include fields that are being updated)
    const dbUpdates: any = {};
    
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.previewContent !== undefined) dbUpdates.preview_content = updates.previewContent;
    if (updates.previewFileName !== undefined) dbUpdates.preview_file_name = updates.previewFileName;
    if (updates.scormFileName !== undefined) dbUpdates.scorm_file_name = updates.scormFileName;
    if (updates.scormStoragePath !== undefined) dbUpdates.scorm_storage_path = updates.scormStoragePath;
    if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;
    if (updates.approvedBy !== undefined) dbUpdates.approved_by = updates.approvedBy;
    if (updates.comments !== undefined) dbUpdates.comments = updates.comments;

    const { data, error } = await supabase
      .from('jobs')
      .update(dbUpdates)
      .eq('id', jobId)
      .select(`
        *,
        user_profiles:client_id (name, email, organization)
      `)
      .single();

    if (error) {
      console.error('Update job error:', error);
      return { success: false, error: error.message };
    }

    // Add audit log if action provided
    if (auditAction && actorId) {
      await addAuditLog(jobId, auditAction, actorId);
    }

    return { success: true, job: toFrontendFormat(data) };
  } catch (err) {
    console.error('Update job error:', err);
    return { success: false, error: 'Failed to update job' };
  }
}

// Add audit log entry
export async function addAuditLog(
  jobId: string, 
  action: string, 
  actorId: string, 
  details?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    // Get actor email
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', actorId)
      .single();

    const { error } = await supabase
      .from('audit_log')
      .insert({
        job_id: jobId,
        action,
        actor_id: actorId,
        actor_email: profile?.email || 'unknown',
        details
      });

    if (error) {
      console.error('Add audit log error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Add audit log error:', err);
    return { success: false, error: 'Failed to add audit log' };
  }
}

// Get audit log for a job
export async function getAuditLog(jobId: string): Promise<{ success: boolean; entries?: any[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: true, entries: [] };
  }

  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Get audit log error:', error);
      return { success: false, error: error.message };
    }

    const entries = (data || []).map(entry => ({
      timestamp: entry.created_at,
      action: entry.action,
      actor: entry.actor_email,
      details: entry.details
    }));

    return { success: true, entries };
  } catch (err) {
    console.error('Get audit log error:', err);
    return { success: false, error: 'Failed to load audit log' };
  }
}
