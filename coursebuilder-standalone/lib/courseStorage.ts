// Course Storage Library - Persist courses to localStorage for retrieval
// Allows users to return to the app and continue editing courses

export interface StoredCourse {
  id: string;
  clientName: string;
  courseTitle: string;
  documentText: string;
  courseData: any;
  config: {
    passingScore: number;
    maxAttempts: number;
    scormVersion: string;
    brandingLogo: string | null;
    generationMode: string;
    questionMode: string;
    includeQuiz: boolean;
    questionCount: number;
  };
  gxpFields: {
    sopNumber: string;
    effectiveDate: string;
    reviewCycle: string;
    regulatoryStatus: string;
    dataClassification: string;
    retentionPeriod: string;
  };
  documentVersion: string;
  verificationReport: any;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'generated' | 'exported' | 'completed';
  // For cleanup tracking
  sopContentCleared: boolean;
}

const STORAGE_KEY = 'coursebuilder_saved_courses';

// Get all saved courses
export function getAllCourses(): StoredCourse[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading courses from storage:', error);
    return [];
  }
}

// Get courses filtered by client name
export function getCoursesByClient(clientName: string): StoredCourse[] {
  const courses = getAllCourses();
  if (!clientName) return courses;
  return courses.filter(c => 
    c.clientName.toLowerCase().includes(clientName.toLowerCase())
  );
}

// Get unique client names
export function getUniqueClients(): string[] {
  const courses = getAllCourses();
  const clients = [...new Set(courses.map(c => c.clientName).filter(c => c))];
  return clients.sort();
}

// Get a single course by ID
export function getCourseById(id: string): StoredCourse | null {
  const courses = getAllCourses();
  return courses.find(c => c.id === id) || null;
}

// Save a new course or update existing
export function saveCourse(course: Omit<StoredCourse, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): StoredCourse {
  const courses = getAllCourses();
  const now = new Date().toISOString();
  
  if (course.id) {
    // Update existing course
    const index = courses.findIndex(c => c.id === course.id);
    if (index !== -1) {
      const updatedCourse: StoredCourse = {
        ...courses[index],
        ...course,
        id: course.id,
        updatedAt: now
      };
      courses[index] = updatedCourse;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
      return updatedCourse;
    }
  }
  
  // Create new course
  const newCourse: StoredCourse = {
    ...course,
    id: `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
    status: course.status || 'draft',
    sopContentCleared: false
  } as StoredCourse;
  
  courses.push(newCourse);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  return newCourse;
}

// Delete a course
export function deleteCourse(id: string): boolean {
  const courses = getAllCourses();
  const index = courses.findIndex(c => c.id === id);
  if (index === -1) return false;
  
  courses.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  return true;
}

// Update course status
export function updateCourseStatus(id: string, status: StoredCourse['status']): boolean {
  const courses = getAllCourses();
  const index = courses.findIndex(c => c.id === id);
  if (index === -1) return false;
  
  courses[index].status = status;
  courses[index].updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  return true;
}

// Complete & Cleanup - removes SOP content but keeps metadata and quiz
export function completeAndCleanup(id: string): boolean {
  const courses = getAllCourses();
  const index = courses.findIndex(c => c.id === id);
  if (index === -1) return false;
  
  // Clear sensitive SOP content but keep quiz questions and metadata
  courses[index].documentText = '[CONTENT CLEARED - Course Completed]';
  courses[index].status = 'completed';
  courses[index].sopContentCleared = true;
  courses[index].updatedAt = new Date().toISOString();
  
  // Keep courseData but clear any raw text within it
  if (courses[index].courseData) {
    // Preserve modules structure but could clear detailed content if needed
    // For now, we keep the course structure for reference
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  return true;
}

// Export all courses as JSON (for backup)
export function exportCoursesAsJSON(): string {
  const courses = getAllCourses();
  return JSON.stringify(courses, null, 2);
}

// Import courses from JSON (restore backup)
export function importCoursesFromJSON(json: string): number {
  try {
    const importedCourses = JSON.parse(json) as StoredCourse[];
    const existingCourses = getAllCourses();
    
    // Merge, avoiding duplicates by ID
    const existingIds = new Set(existingCourses.map(c => c.id));
    const newCourses = importedCourses.filter(c => !existingIds.has(c.id));
    
    const merged = [...existingCourses, ...newCourses];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    
    return newCourses.length;
  } catch (error) {
    console.error('Error importing courses:', error);
    throw new Error('Invalid JSON format');
  }
}

// Get storage usage info
export function getStorageInfo(): { used: number; courses: number } {
  const data = localStorage.getItem(STORAGE_KEY) || '[]';
  return {
    used: new Blob([data]).size,
    courses: getAllCourses().length
  };
}

// Clear all stored courses (use with caution)
export function clearAllCourses(): void {
  localStorage.removeItem(STORAGE_KEY);
}
