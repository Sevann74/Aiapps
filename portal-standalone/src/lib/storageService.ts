// Storage Service
// Handles document upload/download with Supabase Storage

import { supabase } from './supabaseClient';

const BUCKET_NAME = 'documents';

// Check if Supabase is configured
const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key);
};

// Upload a document
export async function uploadDocument(
  file: File,
  jobId: string,
  clientId: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping upload');
    return { success: true, path: `mock/${jobId}/${file.name}` };
  }

  try {
    // Create a unique path: clients/{clientId}/jobs/{jobId}/{filename}
    const filePath = `clients/${clientId}/jobs/${jobId}/${file.name}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, path: data.path };
  } catch (err) {
    console.error('Upload error:', err);
    return { success: false, error: 'Failed to upload document' };
  }
}

// Download a document (returns signed URL)
export async function getDocumentUrl(
  filePath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Create a signed URL that expires in 1 hour
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Get URL error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, url: data.signedUrl };
  } catch (err) {
    console.error('Get URL error:', err);
    return { success: false, error: 'Failed to get document URL' };
  }
}

// Download document directly (triggers browser download)
export async function downloadDocument(
  filePath: string,
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (error) {
      console.error('Download error:', error);
      return { success: false, error: error.message };
    }

    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (err) {
    console.error('Download error:', err);
    return { success: false, error: 'Failed to download document' };
  }
}

// Delete a document
export async function deleteDocument(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Delete error:', err);
    return { success: false, error: 'Failed to delete document' };
  }
}

// List documents for a job
export async function listJobDocuments(
  jobId: string,
  clientId: string
): Promise<{ success: boolean; files?: string[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: true, files: [] };
  }

  try {
    const folderPath = `clients/${clientId}/jobs/${jobId}`;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath);

    if (error) {
      console.error('List error:', error);
      return { success: false, error: error.message };
    }

    const files = data.map(file => `${folderPath}/${file.name}`);
    return { success: true, files };
  } catch (err) {
    console.error('List error:', err);
    return { success: false, error: 'Failed to list documents' };
  }
}

// Upload preview HTML file (for admin to upload course preview)
export async function uploadPreview(
  htmlContent: string,
  jobId: string,
  clientId: string,
  fileName: string = 'preview.html'
): Promise<{ success: boolean; path?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: true, path: `mock/${jobId}/${fileName}` };
  }

  try {
    const filePath = `clients/${clientId}/jobs/${jobId}/previews/${fileName}`;
    const blob = new Blob([htmlContent], { type: 'text/html' });

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true // Allow overwriting previews
      });

    if (error) {
      console.error('Preview upload error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, path: data.path };
  } catch (err) {
    console.error('Preview upload error:', err);
    return { success: false, error: 'Failed to upload preview' };
  }
}

// Upload SCORM package (final deliverable)
export async function uploadScormPackage(
  file: File | Blob,
  jobId: string,
  clientId: string,
  fileName: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: true, path: `mock/${jobId}/${fileName}` };
  }

  try {
    const filePath = `clients/${clientId}/jobs/${jobId}/deliverables/${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('SCORM upload error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, path: data.path };
  } catch (err) {
    console.error('SCORM upload error:', err);
    return { success: false, error: 'Failed to upload SCORM package' };
  }
}
