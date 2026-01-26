import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import * as Diff from 'diff';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ============================================
// TYPES
// ============================================

export interface DocumentSection {
  id: string;
  title: string;
  level: number;
  content: string;
}

export interface SectionChange {
  sectionId: string;
  sectionTitle: string;
  changeType: 'added' | 'removed' | 'modified';
  oldContent: string;
  newContent: string;
  diffParts?: Diff.Change[];
  significance: 'high' | 'medium' | 'low';
}

export interface SimpleComparisonResult {
  changes: SectionChange[];
  summary: {
    totalChanges: number;
    added: number;
    removed: number;
    modified: number;
    sectionsAnalyzed: number;
  };
  oldSections: DocumentSection[];
  newSections: DocumentSection[];
}

export interface ExtractedDocument {
  sections: DocumentSection[];
  metadata: { title: string; version: string };
}

// ============================================
// METADATA FILTERING
// ============================================

const METADATA_PATTERNS = [
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  /^\d{4}-\d{2}-\d{2}$/,
  /^[A-Z]{2,3}-\d{4}-\d{3}$/,
  /^v?\d+\.\d+$/i,
  /^page\s*\d+/i,
  /^draft$/i,
  /^final$/i,
  /^approved$/i,
  /^open$/i,
  /^closed$/i,
  /^n\/a$/i,
];

function isMetadataLine(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;
  if (trimmed.length > 200) return false;
  return METADATA_PATTERNS.some(p => p.test(trimmed));
}

// ============================================
// SECTION DETECTION
// ============================================

const SECTION_PATTERNS = [
  /^(\d+\.?\d*\.?\d*)\s+(.+)$/,
  /^(Section\s+\d+):?\s*(.*)$/i,
  /^([A-Z]\.?\d*\.?\d*)\s+(.+)$/,
  /^(Purpose|Scope|Procedure|Responsibilities|References|Definitions|Equipment|Materials|Safety|Quality|Documentation|Objective|Background|Introduction|Summary|Appendix\s*[A-Z]?):?\s*(.*)$/i,
];

function detectSection(line: string): { id: string; title: string; level: number } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 2) return null;
  
  for (const pattern of SECTION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const id = match[1];
      const title = match[2]?.trim() || match[1];
      const level = (id.match(/\./g) || []).length + 1;
      return { id, title: `${id} ${title}`.trim(), level };
    }
  }
  
  // All-caps headings (common in SOPs)
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 60 && !/^\d/.test(trimmed)) {
    return { id: trimmed.substring(0, 20), title: trimmed, level: 1 };
  }
  
  return null;
}

// ============================================
// EXTRACTION
// ============================================

export async function extractDocument(file: File): Promise<ExtractedDocument> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let rawText = '';
  
  if (extension === 'docx' || extension === 'doc') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    rawText = result.value;
  } else if (extension === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      rawText += pageText + '\n\n';
    }
  } else {
    throw new Error('Unsupported file format. Please upload Word (.docx) or PDF files.');
  }
  
  const sections = parseIntoSections(rawText);
  const versionMatch = file.name.match(/v?(\d+\.?\d*)/i);
  
  return {
    sections,
    metadata: {
      title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
      version: versionMatch ? versionMatch[1] : '1.0'
    }
  };
}

function parseIntoSections(text: string): DocumentSection[] {
  const lines = text.split('\n');
  const sections: DocumentSection[] = [];
  let currentSection: DocumentSection | null = null;
  let sectionCounter = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const sectionInfo = detectSection(trimmed);
    
    if (sectionInfo) {
      if (currentSection && currentSection.content.trim()) {
        sections.push(currentSection);
      }
      sectionCounter++;
      currentSection = {
        id: sectionInfo.id || `SEC_${sectionCounter}`,
        title: sectionInfo.title,
        level: sectionInfo.level,
        content: ''
      };
    } else if (currentSection) {
      if (!isMetadataLine(trimmed)) {
        currentSection.content += (currentSection.content ? '\n' : '') + trimmed;
      }
    } else {
      sectionCounter++;
      currentSection = {
        id: 'PREAMBLE',
        title: 'Document Header',
        level: 0,
        content: isMetadataLine(trimmed) ? '' : trimmed
      };
    }
  }
  
  if (currentSection && currentSection.content.trim()) {
    sections.push(currentSection);
  }
  
  return sections;
}

// ============================================
// COMPARISON HELPERS
// ============================================

function normalizeContent(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function calculateSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeContent(text1);
  const norm2 = normalizeContent(text2);
  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0;
  
  const words1 = new Set(norm1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(norm2.split(' ').filter(w => w.length > 2));
  if (words1.size === 0 && words2.size === 0) return 1.0;
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  return intersection / union;
}

function assessSignificance(oldContent: string, newContent: string): 'high' | 'medium' | 'low' {
  const highImpact = ['must', 'shall', 'required', 'mandatory', 'prohibited', 'immediately', 'critical', 'safety', 'calibration', 'validation', 'approval', 'signature', 'temperature', 'deviation', 'capa', 'oos', 'oot'];
  
  const oldLower = oldContent.toLowerCase();
  const newLower = newContent.toLowerCase();
  
  for (const kw of highImpact) {
    if (oldLower.includes(kw) !== newLower.includes(kw)) return 'high';
  }
  
  const oldNums = oldContent.match(/\d+\.?\d*/g) || [];
  const newNums = newContent.match(/\d+\.?\d*/g) || [];
  if (JSON.stringify(oldNums.sort()) !== JSON.stringify(newNums.sort())) return 'high';
  
  if (calculateSimilarity(oldContent, newContent) < 0.5) return 'medium';
  return 'low';
}

// ============================================
// SECTION COMPARISON
// ============================================

export function compareDocuments(oldDoc: ExtractedDocument, newDoc: ExtractedDocument): SimpleComparisonResult {
  const changes: SectionChange[] = [];
  const matchedNewIds = new Set<string>();
  
  for (const oldSec of oldDoc.sections) {
    let bestMatch: { section: DocumentSection; sim: number } | null = null;
    
    for (const newSec of newDoc.sections) {
      if (matchedNewIds.has(newSec.id + newSec.title)) continue;
      const titleSim = calculateSimilarity(oldSec.title, newSec.title);
      if (titleSim > 0.6 && (!bestMatch || titleSim > bestMatch.sim)) {
        bestMatch = { section: newSec, sim: titleSim };
      }
    }
    
    if (bestMatch) {
      matchedNewIds.add(bestMatch.section.id + bestMatch.section.title);
      const oldNorm = normalizeContent(oldSec.content);
      const newNorm = normalizeContent(bestMatch.section.content);
      
      if (oldNorm !== newNorm) {
        const diffParts = Diff.diffWords(oldSec.content, bestMatch.section.content);
        const hasReal = diffParts.some(p => (p.added || p.removed) && p.value.trim().length > 2);
        
        if (hasReal) {
          changes.push({
            sectionId: oldSec.id,
            sectionTitle: oldSec.title,
            changeType: 'modified',
            oldContent: oldSec.content,
            newContent: bestMatch.section.content,
            diffParts,
            significance: assessSignificance(oldSec.content, bestMatch.section.content)
          });
        }
      }
    } else if (oldSec.content.trim().length > 10) {
      changes.push({
        sectionId: oldSec.id,
        sectionTitle: oldSec.title,
        changeType: 'removed',
        oldContent: oldSec.content,
        newContent: '',
        significance: 'high'
      });
    }
  }
  
  for (const newSec of newDoc.sections) {
    if (!matchedNewIds.has(newSec.id + newSec.title) && newSec.content.trim().length > 10) {
      changes.push({
        sectionId: newSec.id,
        sectionTitle: newSec.title,
        changeType: 'added',
        oldContent: '',
        newContent: newSec.content,
        significance: 'medium'
      });
    }
  }
  
  const sigOrder = { high: 0, medium: 1, low: 2 };
  changes.sort((a, b) => sigOrder[a.significance] - sigOrder[b.significance] || a.sectionId.localeCompare(b.sectionId, undefined, { numeric: true }));
  
  return {
    changes,
    summary: {
      totalChanges: changes.length,
      added: changes.filter(c => c.changeType === 'added').length,
      removed: changes.filter(c => c.changeType === 'removed').length,
      modified: changes.filter(c => c.changeType === 'modified').length,
      sectionsAnalyzed: Math.max(oldDoc.sections.length, newDoc.sections.length)
    },
    oldSections: oldDoc.sections,
    newSections: newDoc.sections
  };
}

// ============================================
// ENTRY POINT
// ============================================

export async function compareDocumentsSimple(oldFile: File, newFile: File): Promise<SimpleComparisonResult> {
  const [oldDoc, newDoc] = await Promise.all([
    extractDocument(oldFile),
    extractDocument(newFile)
  ]);
  return compareDocuments(oldDoc, newDoc);
}
