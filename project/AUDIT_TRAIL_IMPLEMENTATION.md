# Audit Trail & SCORM Scroll Fix Implementation

## Summary

This document outlines the implementation of two key features for the Course Builder:

1. **SCORM Navigation Scroll Fix** - Ensures pages scroll to top when advancing
2. **Audit Trail & Version Control System** - Complete tracking of document-to-course relationships

---

## 1. SCORM Navigation Scroll Fix

### Problem
When users clicked "Next" to advance to a new page in the SCORM course, the page would start at the bottom instead of scrolling to the top of the new content.

### Solution
Added `window.scrollTo({ top: 0, behavior: 'smooth' })` to two functions in `src/lib/scormGenerator.ts`:

- **goToSlide()** - Scrolls to top when navigating between course slides
- **showQuestion()** - Scrolls to top when navigating between quiz questions

This ensures users always see the beginning of new content when advancing through the course.

---

## 2. Audit Trail & Version Control System

### Overview
A comprehensive database-backed system that tracks the complete relationship between source documents (SOPs, policies) and generated courses. This enables compliance auditing by proving which document version was used to create which course version.

### Database Schema

Four new tables were created via migration `create_audit_trail_system`:

#### `documents` Table
Stores metadata for all uploaded source documents:
- Document ID, name, version, file hash
- Page count, word count, content preview
- Upload date and user ownership
- Metadata (original filename, mime type, last modified)

#### `courses` Table
Stores metadata for all generated courses:
- Course ID, title, status (draft/published/archived)
- Module count, question count, SCORM version
- Quiz inclusion flag
- Creation and update timestamps

#### `course_document_relationships` Table
Links courses to their source documents:
- Relationship ID
- Course ID and Document ID (foreign keys)
- Document version used
- Relationship type (source, reference, etc.)
- Creation timestamp

#### `course_generations` Table
Tracks each course generation event (audit trail):
- Generation ID
- Course ID, Document ID, User ID (foreign keys)
- Generation type (initial, regenerate, update)
- Full configuration (passing score, max attempts, SCORM version, etc.)
- Verification report (AI accuracy results)
- Generation date and export date
- Creation timestamp

### Security & Access Control

All tables have Row Level Security (RLS) enabled with policies that:
- Users can only view/manage their own documents and courses
- Admins can view all audit trail data for compliance
- Audit trail tables are insert-only for data integrity
- Anonymous users cannot access any audit data

### Code Implementation

#### New File: `src/lib/auditTrail.ts`
Core functions for audit trail operations:

**Document Management:**
- `createDocument()` - Creates document record with file hash and metadata
- `findExistingDocument()` - Checks for duplicate documents by hash

**Course Management:**
- `createCourse()` - Creates course record with metadata
- `linkCourseToDocument()` - Links course to source document version
- `recordCourseGeneration()` - Records generation event with full config
- `recordCourseExport()` - Updates export timestamp

**Querying:**
- `getCourseAuditTrail()` - Gets complete history for a course
- `getDocumentCourses()` - Gets all courses created from a document
- `getUserDocuments()` - Gets all documents for current user
- `getUserCourses()` - Gets all courses for current user

#### Updates to `src/pages/CourseBuilder.tsx`

**State Management:**
Added tracking variables:
- `currentDocumentId` - ID of uploaded document
- `currentCourseId` - ID of generated course
- `currentGenerationId` - ID of generation event
- `documentVersion` - User-specified version number

**Document Upload Flow:**
When a PDF is uploaded:
1. Extract text and metadata
2. Generate file hash for duplicate detection
3. Create document record in database
4. Store document ID for later linking

**Course Generation Flow:**
When a course is generated:
1. Generate course content (modules, quiz, etc.)
2. Create course record in database
3. Link course to source document with version
4. Record generation event with:
   - Full configuration (passing score, max attempts, etc.)
   - Verification report (accuracy scores)
   - Generation timestamp
5. Store generation ID for export tracking

**SCORM Export Flow:**
When SCORM package is exported:
1. Generate and download SCORM ZIP file
2. Update generation record with export timestamp
3. Complete audit trail is now established

**UI Enhancements:**
- Document version input field on upload step
- Document ID and version displayed after upload
- Audit trail badge on preview showing document version → course ID link
- All information persists across page refreshes (stored in database)

---

## Usage for Compliance Audits

### Proving Document-to-Course Relationship

To prove which document version was used for a specific course:

1. **Query course_generations table** by course_id
2. **View linked document** with document_id and document_version
3. **See full configuration** used for generation
4. **Check verification report** for quality assurance
5. **View timestamps** for generation and export dates

### Example Query

```sql
SELECT
  cg.generation_date,
  cg.export_date,
  d.name as document_name,
  d.version as document_version,
  d.upload_date,
  c.title as course_title,
  cg.configuration,
  cg.verification_report
FROM course_generations cg
JOIN documents d ON cg.document_id = d.id
JOIN courses c ON cg.course_id = c.id
WHERE c.id = 'course-uuid-here'
ORDER BY cg.generation_date DESC;
```

This returns the complete lineage showing:
- Which document (name and version) was used
- When the document was uploaded
- When the course was generated
- What configuration was used
- What the verification scores were
- When the SCORM package was exported

---

## Benefits

### For Compliance & Auditing
- Complete traceability from source document to SCORM export
- Immutable audit trail (insert-only tables)
- Timestamps on all operations
- Full configuration storage for reproducibility

### For Version Control
- Track document versions over time
- Link multiple course versions to document versions
- Detect duplicate documents via file hash
- Historical record of all regenerations

### For Quality Assurance
- Verification reports stored with each generation
- Configuration settings recorded for consistency
- Track which courses need regeneration after document updates

---

## Database Indexes

Optimized indexes created for efficient querying:
- Document lookups by user, hash, and upload date
- Course lookups by user, status, and creation date
- Relationship lookups by course and document
- Generation lookups by course, document, user, and date

---

## Testing the Implementation

1. **Upload a Document:**
   - Upload a PDF and note the Document ID displayed
   - Change the document version if needed (e.g., "2.0")

2. **Generate a Course:**
   - Configure and generate a course
   - Note the Course ID shown in the audit trail badge

3. **Export SCORM:**
   - Export the SCORM package
   - Export timestamp is automatically recorded

4. **Verify in Database:**
   - Query the `course_generations` table to see the complete record
   - All relationships and configurations are stored

---

## Future Enhancements

Potential additions to the audit trail system:

1. **Audit Trail Dashboard**
   - Visual timeline of document and course history
   - Filter by date ranges, users, documents

2. **Version Comparison**
   - Compare different course versions side-by-side
   - Show configuration differences

3. **Export Audit Reports**
   - Generate PDF/CSV reports for compliance
   - Include all relationships and timestamps

4. **Document Change Detection**
   - Alert when document is updated but courses not regenerated
   - Automatic version increment suggestions

5. **Approval Workflow**
   - Require admin approval before course publication
   - Track approval status in audit trail

---

## Technical Notes

- All database operations use Supabase client
- File hashing uses SHA-256 via Web Crypto API
- Timestamps use PostgreSQL timestamptz for timezone accuracy
- UUIDs generated by PostgreSQL gen_random_uuid()
- RLS policies ensure data security and privacy
