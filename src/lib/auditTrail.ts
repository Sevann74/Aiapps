import { supabase } from './supabase';

export interface Document {
  id: string;
  user_id: string;
  name: string;
  version: string;
  file_hash: string;
  file_size: number;
  page_count: number;
  word_count: number;
  content_preview: string;
  upload_date: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  title: string;
  status: string;
  module_count: number;
  question_count: number;
  scorm_version: string;
  has_quiz: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseGeneration {
  id: string;
  course_id: string;
  user_id: string;
  document_id: string;
  generation_type: string;
  configuration: Record<string, any>;
  verification_report: Record<string, any>;
  generation_date: string;
  export_date?: string;
  created_at: string;
}

async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function createDocument(
  file: File,
  extractionResult: {
    text: string;
    pageCount: number;
    wordCount: number;
  },
  version: string = '1.0',
  gxpFields?: {
    sopNumber?: string;
    effectiveDate?: string;
    reviewCycle?: string;
    regulatoryStatus?: string;
    dataClassification?: string;
    retentionPeriod?: string;
  }
): Promise<Document | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fileHash = await generateFileHash(file);
    const contentPreview = extractionResult.text.substring(0, 500);

    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        name: file.name,
        version,
        file_hash: fileHash,
        file_size: file.size,
        page_count: extractionResult.pageCount,
        word_count: extractionResult.wordCount,
        content_preview: contentPreview,
        checksum: fileHash,
        sop_number: gxpFields?.sopNumber || null,
        effective_date: gxpFields?.effectiveDate || null,
        review_cycle: gxpFields?.reviewCycle || 'Annual',
        regulatory_status: gxpFields?.regulatoryStatus || 'Draft',
        data_classification: gxpFields?.dataClassification || 'Internal',
        retention_period: gxpFields?.retentionPeriod || '10 years',
        metadata: {
          original_name: file.name,
          mime_type: file.type,
          last_modified: new Date(file.lastModified).toISOString()
        }
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating document record:', error);
    return null;
  }
}

export async function findExistingDocument(fileHash: string): Promise<Document | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('documents')
      .select()
      .eq('user_id', user.id)
      .eq('file_hash', fileHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error finding existing document:', error);
    return null;
  }
}

export async function createCourse(
  title: string,
  moduleCount: number,
  questionCount: number,
  scormVersion: string,
  hasQuiz: boolean
): Promise<Course | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('courses')
      .insert({
        user_id: user.id,
        title,
        module_count: moduleCount,
        question_count: questionCount,
        scorm_version: scormVersion,
        has_quiz: hasQuiz,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating course record:', error);
    return null;
  }
}

export async function linkCourseToDocument(
  courseId: string,
  documentId: string,
  documentVersion: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('course_document_relationships')
      .insert({
        course_id: courseId,
        document_id: documentId,
        document_version: documentVersion,
        relationship_type: 'source'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error linking course to document:', error);
    return false;
  }
}

export async function recordCourseGeneration(
  courseId: string,
  documentId: string,
  generationType: 'initial' | 'regenerate' | 'update',
  configuration: Record<string, any>,
  verificationReport: Record<string, any>
): Promise<CourseGeneration | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('course_generations')
      .insert({
        course_id: courseId,
        user_id: user.id,
        document_id: documentId,
        generation_type: generationType,
        configuration,
        verification_report: verificationReport
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error recording course generation:', error);
    return null;
  }
}

export async function recordCourseExport(generationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('course_generations')
      .update({ export_date: new Date().toISOString() })
      .eq('id', generationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error recording course export:', error);
    return false;
  }
}

export async function getCourseAuditTrail(courseId: string) {
  try {
    const { data, error } = await supabase
      .from('course_generations')
      .select(`
        *,
        document:documents(
          id,
          name,
          version,
          upload_date
        ),
        user:user_profiles(
          full_name,
          company_name
        )
      `)
      .eq('course_id', courseId)
      .order('generation_date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching course audit trail:', error);
    return [];
  }
}

export async function getDocumentCourses(documentId: string) {
  try {
    const { data, error } = await supabase
      .from('course_document_relationships')
      .select(`
        *,
        course:courses(
          id,
          title,
          status,
          created_at,
          scorm_version
        )
      `)
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching document courses:', error);
    return [];
  }
}

export async function getUserDocuments() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('documents')
      .select()
      .eq('user_id', user.id)
      .order('upload_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user documents:', error);
    return [];
  }
}

export async function getUserCourses() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('courses')
      .select()
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user courses:', error);
    return [];
  }
}

export async function exportAuditLog(format: 'json' | 'csv' = 'json') {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const [documents, courses, generations] = await Promise.all([
      getUserDocuments(),
      getUserCourses(),
      supabase
        .from('course_generations')
        .select('*')
        .eq('user_id', user.id)
        .order('generation_date', { ascending: false })
        .then(res => res.data || [])
    ]);

    const auditData = {
      exportDate: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
      documents,
      courses,
      generations
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      let csv = 'Type,ID,Name/Title,Date,Status,SOP Number,Version,Effective Date,Review Cycle,Data Classification,Retention,Details\n';

      documents.forEach(doc => {
        csv += `Document,${doc.id},"${doc.name}",${doc.upload_date},"${doc.regulatory_status || 'N/A'}","${doc.sop_number || 'N/A'}","${doc.version}","${doc.effective_date || 'N/A'}","${doc.review_cycle || 'N/A'}","${doc.data_classification || 'N/A'}","${doc.retention_period || 'N/A'}","Pages: ${doc.page_count}, Words: ${doc.word_count}"\n`;
      });

      courses.forEach(course => {
        csv += `Course,${course.id},"${course.title}",${course.created_at},"${course.status}",N/A,N/A,N/A,N/A,N/A,N/A,"Modules: ${course.module_count}, Questions: ${course.question_count}"\n`;
      });

      generations.forEach(gen => {
        csv += `Generation,${gen.id},"${gen.generation_type}",${gen.generation_date},Completed,N/A,N/A,N/A,N/A,N/A,N/A,"Course: ${gen.course_id}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    return true;
  } catch (error) {
    console.error('Error exporting audit log:', error);
    throw error;
  }
}
