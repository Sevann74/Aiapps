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

// ============================================
// AUDIT-SAFE DOCUMENT COMPARISON ENGINE
// Deterministic, reproducible, GxP-compliant
// ============================================

export type ChangeClassification = 'NO_CHANGE' | 'EDITORIAL' | 'REVISED' | 'RELOCATED' | 'RETIRED' | 'NEW';

export interface ComparisonResult {
  oldDocument: ExtractedDocument;
  newDocument: ExtractedDocument;
  changes: SectionChange[];
  summary: {
    totalChanges: number;
    added: number;
    modified: number;
    removed: number;
    editorial: number;
    relocated: number;
  };
}

export interface SectionChange {
  sectionId: string;
  sectionTitle: string;
  changeType: 'added' | 'modified' | 'removed';
  classification: ChangeClassification;
  oldContent: string;
  newContent: string;
  confidence: number; // 0-1, if < 0.9 flag for manual review
  manualReviewRequired: boolean;
  relocatedTo?: string; // If relocated, where it moved
}

// Reference normalization families
const REFERENCE_FAMILIES: Record<string, string[]> = {
  'EU_GMP': [
    'eu gmp', 'eu-gmp', 'eugmp', 'eudralex', 'eudralex volume 4',
    'eu gmp guidelines', 'eu gmp chapter', 'european gmp'
  ],
  'FDA_CFR': [
    '21 cfr', 'cfr part', 'fda regulations', 'code of federal regulations'
  ],
  'ICH': [
    'ich q', 'ich guideline', 'ich guidelines'
  ],
  'ISO': [
    'iso 9001', 'iso 13485', 'iso 14644', 'iso standard'
  ]
};

// Obligation keywords that trigger REVISED classification
const OBLIGATION_KEYWORDS = [
  'must', 'shall', 'required', 'mandatory', 'is required to',
  'will be', 'needs to', 'has to', 'is obligated'
];

// Timing keywords
const TIMING_KEYWORDS = [
  'daily', 'weekly', 'monthly', 'quarterly', 'annually', 'hourly',
  'within', 'hours', 'days', 'minutes', 'immediately', 'prior to',
  'before', 'after', 'during', 'upon completion'
];

// Role keywords
const ROLE_KEYWORDS = [
  'operator', 'supervisor', 'manager', 'technician', 'analyst',
  'qa', 'qc', 'quality', 'responsible', 'accountable', 'owner',
  'approver', 'reviewer', 'author', 'administrator'
];

export function compareDocuments(oldDoc: ExtractedDocument, newDoc: ExtractedDocument): ComparisonResult {
  const changes: SectionChange[] = [];
  
  // Normalize all sections first (mandatory step)
  const normalizedOldSections = oldDoc.sections.map(s => ({
    ...s,
    normalizedContent: normalizeForComparison(s.content),
    normalizedTitle: normalizeHeader(s.title)
  }));
  
  const normalizedNewSections = newDoc.sections.map(s => ({
    ...s,
    normalizedContent: normalizeForComparison(s.content),
    normalizedTitle: normalizeHeader(s.title)
  }));
  
  const oldSectionMap = new Map(normalizedOldSections.map(s => [s.id, s]));
  const newSectionMap = new Map(normalizedNewSections.map(s => [s.id, s]));
  
  // Track which old sections have been matched (for relocation detection)
  const matchedOldSections = new Set<string>();
  const matchedNewSections = new Set<string>();
  
  // PASS 1: Find exact matches and modifications by section ID
  for (const [id, oldSection] of oldSectionMap) {
    const newSection = newSectionMap.get(id);
    
    if (newSection) {
      const similarity = calculateTextSimilarity(oldSection.normalizedContent, newSection.normalizedContent);
      
      if (similarity >= 0.95) {
        // NO_CHANGE - skip, don't add to changes
        matchedOldSections.add(id);
        matchedNewSections.add(id);
      } else {
        // Classify the modification
        const classification = classifyModification(oldSection.content, newSection.content, similarity);
        
        changes.push({
          sectionId: id,
          sectionTitle: newSection.title,
          changeType: 'modified',
          classification: classification.type,
          oldContent: oldSection.content,
          newContent: newSection.content,
          confidence: classification.confidence,
          manualReviewRequired: classification.confidence < 0.9
        });
        
        matchedOldSections.add(id);
        matchedNewSections.add(id);
      }
    }
  }
  
  // PASS 2: Check for relocations (content moved to different section)
  const unmatchedOldSections = normalizedOldSections.filter(s => !matchedOldSections.has(s.id));
  const unmatchedNewSections = normalizedNewSections.filter(s => !matchedNewSections.has(s.id));
  
  for (const oldSection of unmatchedOldSections) {
    let bestMatch: { section: typeof normalizedNewSections[0]; similarity: number } | null = null;
    
    for (const newSection of unmatchedNewSections) {
      if (matchedNewSections.has(newSection.id)) continue;
      
      const similarity = calculateTextSimilarity(oldSection.normalizedContent, newSection.normalizedContent);
      
      if (similarity >= 0.80 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { section: newSection, similarity };
      }
    }
    
    if (bestMatch) {
      // RELOCATED - content moved to different section
      changes.push({
        sectionId: oldSection.id,
        sectionTitle: oldSection.title,
        changeType: 'modified',
        classification: 'RELOCATED',
        oldContent: oldSection.content,
        newContent: bestMatch.section.content,
        confidence: bestMatch.similarity,
        manualReviewRequired: bestMatch.similarity < 0.9,
        relocatedTo: bestMatch.section.id
      });
      
      matchedOldSections.add(oldSection.id);
      matchedNewSections.add(bestMatch.section.id);
    }
  }
  
  // PASS 3: Check for truly retired content (strict rule)
  for (const oldSection of unmatchedOldSections) {
    if (matchedOldSections.has(oldSection.id)) continue;
    
    // Before marking as RETIRED, check if content exists ANYWHERE in new doc
    const existsElsewhere = checkContentExistsElsewhere(
      oldSection.normalizedContent, 
      normalizedNewSections,
      matchedNewSections
    );
    
    if (existsElsewhere.found) {
      // Content exists elsewhere - NOT retired, mark for manual review
      changes.push({
        sectionId: oldSection.id,
        sectionTitle: oldSection.title,
        changeType: 'removed',
        classification: 'RELOCATED',
        oldContent: oldSection.content,
        newContent: '',
        confidence: existsElsewhere.confidence,
        manualReviewRequired: true,
        relocatedTo: existsElsewhere.location
      });
    } else {
      // Content truly absent - RETIRED
      changes.push({
        sectionId: oldSection.id,
        sectionTitle: oldSection.title,
        changeType: 'removed',
        classification: 'RETIRED',
        oldContent: oldSection.content,
        newContent: '',
        confidence: 0.95,
        manualReviewRequired: false
      });
    }
  }
  
  // PASS 4: Find truly new content
  for (const newSection of unmatchedNewSections) {
    if (matchedNewSections.has(newSection.id)) continue;
    
    changes.push({
      sectionId: newSection.id,
      sectionTitle: newSection.title,
      changeType: 'added',
      classification: 'NEW',
      oldContent: '',
      newContent: newSection.content,
      confidence: 1.0,
      manualReviewRequired: false
    });
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
      modified: changes.filter(c => c.changeType === 'modified' && c.classification !== 'RELOCATED').length,
      removed: changes.filter(c => c.changeType === 'removed' && c.classification === 'RETIRED').length,
      editorial: changes.filter(c => c.classification === 'EDITORIAL').length,
      relocated: changes.filter(c => c.classification === 'RELOCATED').length
    }
  };
}

// ============================================
// NORMALIZATION FUNCTIONS
// ============================================

function normalizeForComparison(text: string): string {
  let normalized = text.toLowerCase();
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Normalize punctuation
  normalized = normalized.replace(/[""]/g, '"');
  normalized = normalized.replace(/['']/g, "'");
  normalized = normalized.replace(/[–—]/g, '-');
  normalized = normalized.replace(/…/g, '...');
  
  // Normalize bullets
  normalized = normalized.replace(/[•●○◦▪▫]/g, '-');
  normalized = normalized.replace(/^\s*[-*]\s*/gm, '- ');
  
  // Normalize references
  normalized = normalizeReferences(normalized);
  
  return normalized.trim();
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[:\-_]/g, '')
    .trim();
}

function normalizeReferences(text: string): string {
  let normalized = text;
  
  for (const [family, variants] of Object.entries(REFERENCE_FAMILIES)) {
    for (const variant of variants) {
      const regex = new RegExp(variant.replace(/\s+/g, '\\s*'), 'gi');
      normalized = normalized.replace(regex, `[REF:${family}]`);
    }
  }
  
  return normalized;
}

// ============================================
// CLASSIFICATION FUNCTIONS
// ============================================

function classifyModification(
  oldText: string, 
  newText: string, 
  similarity: number
): { type: ChangeClassification; confidence: number } {
  const oldNorm = oldText.toLowerCase();
  const newNorm = newText.toLowerCase();
  
  // Check for obligation changes
  const oldObligations = OBLIGATION_KEYWORDS.filter(k => oldNorm.includes(k));
  const newObligations = OBLIGATION_KEYWORDS.filter(k => newNorm.includes(k));
  const obligationChanged = !arraysEqual(oldObligations.sort(), newObligations.sort());
  
  // Check for timing changes
  const oldTiming = TIMING_KEYWORDS.filter(k => oldNorm.includes(k));
  const newTiming = TIMING_KEYWORDS.filter(k => newNorm.includes(k));
  const timingChanged = !arraysEqual(oldTiming.sort(), newTiming.sort());
  
  // Check for role changes
  const oldRoles = ROLE_KEYWORDS.filter(k => oldNorm.includes(k));
  const newRoles = ROLE_KEYWORDS.filter(k => newNorm.includes(k));
  const roleChanged = !arraysEqual(oldRoles.sort(), newRoles.sort());
  
  // REVISED: substantive changes
  if (obligationChanged || timingChanged || roleChanged) {
    return { type: 'REVISED', confidence: 0.95 };
  }
  
  // EDITORIAL: wording only, no substantive change
  if (similarity >= 0.80) {
    return { type: 'EDITORIAL', confidence: similarity };
  }
  
  // Default to REVISED if significant difference but uncertain
  if (similarity < 0.80) {
    return { type: 'REVISED', confidence: similarity };
  }
  
  return { type: 'EDITORIAL', confidence: similarity };
}

function checkContentExistsElsewhere(
  normalizedContent: string,
  newSections: Array<{ id: string; normalizedContent: string }>,
  alreadyMatched: Set<string>
): { found: boolean; confidence: number; location?: string } {
  // Check if significant portions exist anywhere in new document
  const contentWords = normalizedContent.split(' ').filter(w => w.length > 3);
  
  if (contentWords.length < 5) {
    return { found: false, confidence: 1.0 };
  }
  
  for (const section of newSections) {
    if (alreadyMatched.has(section.id)) continue;
    
    const matchedWords = contentWords.filter(w => section.normalizedContent.includes(w));
    const matchRatio = matchedWords.length / contentWords.length;
    
    if (matchRatio >= 0.5) {
      return { found: true, confidence: matchRatio, location: section.id };
    }
  }
  
  return { found: false, confidence: 1.0 };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 && !text2) return 1;
  if (!text1 || !text2) return 0;
  
  const words1 = new Set(text1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(text2.split(' ').filter(w => w.length > 2));
  
  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size; // Jaccard similarity
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}
