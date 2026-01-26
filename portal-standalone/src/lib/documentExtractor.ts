import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractedDocument {
  text: string;
  sections: DocumentSection[];
  metadata: {
    title?: string;
    version?: string;
    sopId?: string;
    department?: string;
  };
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  level: number;
}

export async function extractTextFromWord(file: File): Promise<ExtractedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;
  
  const sections = parseDocumentSections(text);
  const metadata = extractMetadata(text, file.name);
  
  return { text, sections, metadata };
}

export async function extractTextFromPDF(file: File): Promise<ExtractedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }
  
  const sections = parseDocumentSections(fullText);
  const metadata = extractMetadata(fullText, file.name);
  
  return { text: fullText, sections, metadata };
}

export async function extractDocument(file: File): Promise<ExtractedDocument> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'docx' || extension === 'doc') {
    return extractTextFromWord(file);
  } else if (extension === 'pdf') {
    return extractTextFromPDF(file);
  } else {
    throw new Error(`Unsupported file format: ${extension}. Please upload a Word (.docx) or PDF file.`);
  }
}

function parseDocumentSections(text: string): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const lines = text.split('\n');
  
  // Common section patterns in SOPs
  const sectionPatterns = [
    /^(\d+\.?\d*\.?\d*)\s+(.+)$/,           // 1. Section, 1.1 Subsection, 1.1.1 Sub-subsection
    /^(Section\s+\d+):?\s*(.+)$/i,          // Section 1: Title
    /^([A-Z]{1,3}\.?\d*\.?\d*)\s+(.+)$/,    // A. Section, A.1 Subsection
    /^(Purpose|Scope|Procedure|Responsibilities|References|Definitions|Equipment|Materials|Safety|Quality|Documentation):?\s*$/i
  ];
  
  let currentSection: DocumentSection | null = null;
  let sectionCounter = 0;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    let matchedSection = false;
    
    for (const pattern of sectionPatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        sectionCounter++;
        const sectionId = match[1] || `Section ${sectionCounter}`;
        const sectionTitle = match[2] || match[1];
        
        currentSection = {
          id: sectionId,
          title: sectionTitle || trimmedLine,
          content: '',
          level: calculateSectionLevel(sectionId)
        };
        matchedSection = true;
        break;
      }
    }
    
    if (!matchedSection && currentSection) {
      currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
    } else if (!matchedSection && !currentSection) {
      // Content before any section - create a preamble section
      if (sections.length === 0) {
        currentSection = {
          id: 'Preamble',
          title: 'Document Header',
          content: trimmedLine,
          level: 0
        };
      }
    }
  }
  
  // Don't forget the last section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
}

function calculateSectionLevel(sectionId: string): number {
  const dots = (sectionId.match(/\./g) || []).length;
  return dots + 1;
}

function extractMetadata(text: string, filename: string): ExtractedDocument['metadata'] {
  const metadata: ExtractedDocument['metadata'] = {};
  
  // Try to extract SOP ID
  const sopIdPatterns = [
    /SOP[-\s]?ID:?\s*([A-Z0-9-]+)/i,
    /Document\s*(?:ID|Number|No\.?):?\s*([A-Z0-9-]+)/i,
    /SOP[-\s]?(?:No\.?|Number):?\s*([A-Z0-9-]+)/i,
    /([A-Z]{2,4}-[A-Z]{2,4}-\d{4}-\d{3})/  // Pattern like SOP-QC-2024-089
  ];
  
  for (const pattern of sopIdPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.sopId = match[1];
      break;
    }
  }
  
  // Try to extract version
  const versionPatterns = [
    /Version:?\s*([\d.]+)/i,
    /Rev(?:ision)?\.?:?\s*([\d.]+)/i,
    /v([\d.]+)/i
  ];
  
  for (const pattern of versionPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.version = match[1];
      break;
    }
  }
  
  // Try to extract title (usually in first few lines)
  const firstLines = text.split('\n').slice(0, 10).join(' ');
  const titlePatterns = [
    /Title:?\s*(.+?)(?:\n|$)/i,
    /^(.+?Standard Operating Procedure.+?)(?:\n|$)/im,
    /SOP:?\s*(.+?)(?:\n|$)/i
  ];
  
  for (const pattern of titlePatterns) {
    const match = firstLines.match(pattern);
    if (match && match[1].length < 200) {
      metadata.title = match[1].trim();
      break;
    }
  }
  
  // Fallback to filename
  if (!metadata.title) {
    metadata.title = filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
  }
  
  if (!metadata.sopId) {
    // Try to extract from filename
    const filenameMatch = filename.match(/([A-Z]{2,4}[-_][A-Z]{2,4}[-_]\d{4}[-_]\d{3})/i);
    if (filenameMatch) {
      metadata.sopId = filenameMatch[1].replace(/_/g, '-');
    } else {
      metadata.sopId = 'N/A';
    }
  }
  
  // Try to extract department
  const deptPatterns = [
    /Department:?\s*(.+?)(?:\n|$)/i,
    /Dept\.?:?\s*(.+?)(?:\n|$)/i
  ];
  
  for (const pattern of deptPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.department = match[1].trim();
      break;
    }
  }
  
  return metadata;
}

export interface ComparisonResult {
  oldDocument: ExtractedDocument;
  newDocument: ExtractedDocument;
  changes: SectionChange[];
  summary: {
    totalChanges: number;
    added: number;
    modified: number;
    removed: number;
  };
}

export interface SectionChange {
  sectionId: string;
  sectionTitle: string;
  changeType: 'added' | 'modified' | 'removed';
  oldContent: string;
  newContent: string;
}

export function compareDocuments(oldDoc: ExtractedDocument, newDoc: ExtractedDocument): ComparisonResult {
  const changes: SectionChange[] = [];
  
  const oldSectionMap = new Map(oldDoc.sections.map(s => [s.id, s]));
  const newSectionMap = new Map(newDoc.sections.map(s => [s.id, s]));
  
  // Find modified and removed sections
  for (const [id, oldSection] of oldSectionMap) {
    const newSection = newSectionMap.get(id);
    
    if (!newSection) {
      // Section was removed
      changes.push({
        sectionId: id,
        sectionTitle: oldSection.title,
        changeType: 'removed',
        oldContent: oldSection.content,
        newContent: ''
      });
    } else if (normalizeText(oldSection.content) !== normalizeText(newSection.content)) {
      // Section was modified
      changes.push({
        sectionId: id,
        sectionTitle: newSection.title,
        changeType: 'modified',
        oldContent: oldSection.content,
        newContent: newSection.content
      });
    }
  }
  
  // Find added sections
  for (const [id, newSection] of newSectionMap) {
    if (!oldSectionMap.has(id)) {
      changes.push({
        sectionId: id,
        sectionTitle: newSection.title,
        changeType: 'added',
        oldContent: '',
        newContent: newSection.content
      });
    }
  }
  
  // Sort changes by section ID
  changes.sort((a, b) => a.sectionId.localeCompare(b.sectionId, undefined, { numeric: true }));
  
  return {
    oldDocument: oldDoc,
    newDocument: newDoc,
    changes,
    summary: {
      totalChanges: changes.length,
      added: changes.filter(c => c.changeType === 'added').length,
      modified: changes.filter(c => c.changeType === 'modified').length,
      removed: changes.filter(c => c.changeType === 'removed').length
    }
  };
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
