// Courses Service - Supabase persistence for Course Builder
// Handles CRUD operations for courses in the database

import { supabase } from './supabase';

export interface CourseRecord {
  id: string;
  user_id?: string;
  client_name: string;
  course_title: string;
  document_text?: string;
  course_data?: any;
  config?: any;
  gxp_fields?: any;
  document_version?: string;
  verification_report?: any;
  status: 'draft' | 'generated' | 'exported' | 'completed';
  sop_content_cleared: boolean;
  file_path?: string;
  created_at: string;
  updated_at: string;
}

export interface CourseResponse {
  success: boolean;
  course?: CourseRecord;
  courses?: CourseRecord[];
  error?: string;
}

// Check if Supabase is configured
const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};

// Create a new course
export async function createCourse(course: Partial<CourseRecord>): Promise<CourseResponse> {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping cloud save');
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Get current user
    const { data: { user } } = await supabase!.auth.getUser();
    
    const courseData = {
      user_id: user?.id,
      client_name: course.client_name || '',
      course_title: course.course_title || '',
      document_text: course.document_text || null,
      course_data: course.course_data || null,
      config: course.config || null,
      gxp_fields: course.gxp_fields || null,
      document_version: course.document_version || null,
      verification_report: course.verification_report || null,
      status: course.status || 'draft',
      sop_content_cleared: false,
      file_path: course.file_path || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase!
      .from('coursebuilder_courses')
      .insert(courseData)
      .select()
      .single();

    if (error) {
      console.error('Error creating course:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Course saved to Supabase:', data.id);
    return { success: true, course: data };
  } catch (err) {
    console.error('Error creating course:', err);
    return { success: false, error: 'Failed to create course' };
  }
}

// Get all courses
export async function getCourses(): Promise<CourseResponse> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase!
      .from('coursebuilder_courses')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      return { success: false, error: error.message };
    }

    return { success: true, courses: data || [] };
  } catch (err) {
    console.error('Error fetching courses:', err);
    return { success: false, error: 'Failed to fetch courses' };
  }
}

// Get a single course by ID
export async function getCourseById(id: string): Promise<CourseResponse> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase!
      .from('coursebuilder_courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching course:', error);
      return { success: false, error: error.message };
    }

    return { success: true, course: data };
  } catch (err) {
    console.error('Error fetching course:', err);
    return { success: false, error: 'Failed to fetch course' };
  }
}

// Update a course
export async function updateCourse(id: string, updates: Partial<CourseRecord>): Promise<CourseResponse> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase!
      .from('coursebuilder_courses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating course:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Course updated in Supabase:', id);
    return { success: true, course: data };
  } catch (err) {
    console.error('Error updating course:', err);
    return { success: false, error: 'Failed to update course' };
  }
}

// Delete a course
export async function deleteCourse(id: string): Promise<CourseResponse> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase!
      .from('coursebuilder_courses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting course:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Course deleted from Supabase:', id);
    return { success: true };
  } catch (err) {
    console.error('Error deleting course:', err);
    return { success: false, error: 'Failed to delete course' };
  }
}

// Secure cleanup - clear all content but keep metadata
export async function secureCleanupCourse(id: string): Promise<CourseResponse> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // First get the course to check for file_path
    const { data: course, error: fetchError } = await supabase!
      .from('coursebuilder_courses')
      .select('file_path')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching course for cleanup:', fetchError);
      return { success: false, error: fetchError.message };
    }

    // Delete file from storage if exists
    if (course?.file_path) {
      const { error: storageError } = await supabase!.storage
        .from('documents')
        .remove([course.file_path]);
      
      if (storageError) {
        console.warn('Warning: Could not delete file from storage:', storageError);
      } else {
        console.log('✅ Document deleted from Supabase Storage');
      }
    }

    // Clear all sensitive content BUT KEEP config (contains reusable logo)
    const { data, error } = await supabase!
      .from('coursebuilder_courses')
      .update({
        document_text: null,
        course_data: null,  // Clears modules/quiz content
        verification_report: null,
        file_path: null,
        // NOTE: config is NOT cleared - it contains the reusable company logo
        status: 'completed',
        sop_content_cleared: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error cleaning up course:', error);
      return { success: false, error: error.message };
    }

    console.log('🔒 SECURE CLEANUP: Course content cleared from Supabase:', id);
    return { success: true, course: data };
  } catch (err) {
    console.error('Error cleaning up course:', err);
    return { success: false, error: 'Failed to cleanup course' };
  }
}

// Upload document to Supabase Storage
export async function uploadCourseDocument(
  file: File, 
  courseId: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data: { user } } = await supabase!.auth.getUser();
    const userId = user?.id || 'anonymous';
    
    // Create unique file path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `courses/${userId}/${courseId}/${timestamp}_${sanitizedName}`;

    const { data, error } = await supabase!.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Error uploading document:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Document uploaded to Supabase Storage:', filePath);
    return { success: true, path: data.path };
  } catch (err) {
    console.error('Error uploading document:', err);
    return { success: false, error: 'Failed to upload document' };
  }
}

// Delete document from Supabase Storage
export async function deleteCourseDocument(filePath: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase!.storage
      .from('documents')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting document:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Document deleted from Supabase Storage:', filePath);
    return { success: true };
  } catch (err) {
    console.error('Error deleting document:', err);
    return { success: false, error: 'Failed to delete document' };
  }
}
