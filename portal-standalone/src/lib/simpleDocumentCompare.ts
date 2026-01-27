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
  number: string;
  heading: string;
  fullTitle: string;
  content: string;
  level: number;
  matchKey: string;
}

export type ChangeCategory = 'obligation' | 'timing' | 'threshold' | 'role' | 'records' | 'procedure' | 'definition' | 'other';
export type ChangeSignificance = 'substantive' | 'editorial';

export interface SectionChange {
  sectionId: string;
  sectionNumber: string;
  sectionTitle: string;
  changeType: 'added' | 'removed' | 'modified';
  significance: ChangeSignificance;
  category: ChangeCategory;
  oldContent: string;
  newContent: string;
  diffParts?: Diff.Change[];
  keyChanges: string[];
}

export interface SimpleComparisonResult {
  changes: SectionChange[];
  summary: {
    totalSections: number;
    unchanged: number;
    modified: number;
    added: number;
    removed: number;
    substantive: number;
    editorial: number;
  };
  oldSections: DocumentSection[];
  newSections: DocumentSection[];
}

export interface ExtractedDocument {
  sections: DocumentSection[];
  metadata: { title: string; version: string };
  rawText: string;
}

// ============================================
// KEYWORD SETS FOR CLASSIFICATION
// ============================================

const OBLIGATION_KEYWORDS = ['must', 'shall', 'required', 'mandatory', 'is required to', 'will be', 'needs to', 'has to', 'prohibited', 'not allowed'];
const TIMING_KEYWORDS = ['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'hourly', 'within', 'hours', 'days', 'minutes', 'immediately', 'prior to', 'before', 'after'];
const THRESHOLD_KEYWORDS = ['minimum', 'maximum', 'at least', 'no more than', 'not exceed', 'greater than', 'less than', '%', 'percent', 'ppm', 'mg', 'ml', 'kg', 'celsius', 'fahrenheit', '°c', '°f'];
const ROLE_KEYWORDS = ['operator', 'supervisor', 'manager', 'technician', 'analyst', 'qa', 'qc', 'quality', 'responsible', 'accountable', 'owner', 'approver', 'reviewer'];
const RECORDS_KEYWORDS = ['document', 'record', 'log', 'form', 'checklist', 'signature', 'sign', 'date', 'batch record', 'logbook'];
const PROCEDURE_KEYWORDS = ['step', 'procedure', 'process', 'method', 'technique', 'perform', 'execute', 'conduct', 'carry out'];
const DEFINITION_KEYWORDS = ['means', 'defined as', 'refers to', 'definition', 'terminology', 'glossary'];

const KEYWORD_HEADINGS = [
  'purpose', 'scope', 'procedure', 'responsibilities', 'references', 'definitions',
  'equipment', 'materials', 'safety', 'quality', 'documentation', 'objective',
  'background', 'introduction', 'summary', 'glossary', 'revision history',
  'training requirements', 'related documents', 'attachments', 'forms'
];

// ============================================
// SECTION DETECTION - MULTI-STRATEGY
// ============================================

interface DetectedSection {
  number: string;
  heading: string;
  fullTitle: string;
  level: number;
  index: number;
  matchKey: string;
}

function detectSections(text: string): DetectedSection[] {
  const detected: DetectedSection[] = [];
  
  // Strategy 1: Numbered sections (1.0, 2.1, 3.2.1, etc.)
  const numberedPattern = /^(?:Section\s+)?(\d+(?:\.\d+)*\.?)\s*[:\.]?\s*([A-Z][^\n]{2,100})/gm;
  let match;
  while ((match = numberedPattern.exec(text)) !== null) {
    const number = match[1].replace(/\.$/, '');
    const heading = match[2].trim();
    if (heading.length >= 3 && !/^(the|and|or|but|if|is|are|was|were)\s/i.test(heading)) {
      detected.push({
        number,
        heading,
        fullTitle: `${number} ${heading}`,
        level: (number.match(/\./g) || []).length + 1,
        index: match.index,
        matchKey: number
      });
    }
  }
  
  // Strategy 2: Keyword headings (Purpose, Scope, etc.)
  for (const keyword of KEYWORD_HEADINGS) {
    const keywordPattern = new RegExp(`^(${keyword})[:\s]*(.*)$`, 'gim');
    while ((match = keywordPattern.exec(text)) !== null) {
      const heading = match[1].trim();
      const subtitle = match[2]?.trim() || '';
      const fullTitle = subtitle ? `${heading}: ${subtitle}` : heading;
      // Avoid duplicates at same index
      if (!detected.some(d => Math.abs(d.index - match!.index) < 5)) {
        detected.push({
          number: '',
          heading: fullTitle,
          fullTitle,
          level: 1,
          index: match.index,
          matchKey: heading.toLowerCase()
        });
      }
    }
  }
  
  // Strategy 3: All-caps headings
  const allCapsPattern = /^([A-Z][A-Z\s]{2,58})$/gm;
  while ((match = allCapsPattern.exec(text)) !== null) {
    const heading = match[1].trim();
    if (heading.length >= 4 && heading.length <= 60 && !/^\d/.test(heading)) {
      // Avoid duplicates
      if (!detected.some(d => Math.abs(d.index - match!.index) < 5)) {
        detected.push({
          number: '',
          heading,
          fullTitle: heading,
          level: 1,
          index: match.index,
          matchKey: heading.toLowerCase().replace(/\s+/g, '_')
        });
      }
    }
  }
  
  // Strategy 4: Appendix patterns
  const appendixPattern = /^(Appendix\s+[A-Z0-9]+)[:\s]*(.*)$/gim;
  while ((match = appendixPattern.exec(text)) !== null) {
    const number = match[1].replace(/\s+/g, ' ').trim();
    const heading = match[2]?.trim() || '';
    const fullTitle = heading ? `${number} – ${heading}` : number;
    if (!detected.some(d => Math.abs(d.index - match!.index) < 5)) {
      detected.push({
        number,
        heading: heading || number,
        fullTitle,
        level: 1,
        index: match.index,
        matchKey: number.toLowerCase().replace(/\s+/g, '_')
      });
    }
  }
  
  // Sort by index and remove duplicates
  detected.sort((a, b) => a.index - b.index);
  const unique = detected.filter((d, i, arr) => 
    i === 0 || d.index - arr[i - 1].index > 10
  );
  
  return unique;
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
    },
    rawText
  };
}

function parseIntoSections(text: string): DocumentSection[] {
  const detected = detectSections(text);
  
  // If no sections detected, use paragraph chunking fallback
  if (detected.length === 0) {
    return chunkIntoParagraphs(text);
  }
  
  const sections: DocumentSection[] = [];
  
  for (let i = 0; i < detected.length; i++) {
    const current = detected[i];
    const nextIndex = i < detected.length - 1 ? detected[i + 1].index : text.length;
    const sectionText = text.substring(current.index, nextIndex).trim();
    
    // Remove the heading line from content
    const contentWithoutHeading = sectionText.replace(/^[^\n]+\n?/, '').trim();
    
    sections.push({
      id: current.number || current.matchKey,
      number: current.number,
      heading: current.heading,
      fullTitle: current.fullTitle,
      content: contentWithoutHeading,
      level: current.level,
      matchKey: current.matchKey
    });
  }
  
  return sections;
}

function chunkIntoParagraphs(text: string, targetWords: number = 300): DocumentSection[] {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  const sections: DocumentSection[] = [];
  let chunkNum = 1;
  let currentChunk = '';
  
  for (const para of paragraphs) {
    currentChunk += (currentChunk ? '\n\n' : '') + para.trim();
    const wordCount = currentChunk.split(/\s+/).length;
    
    if (wordCount >= targetWords) {
      sections.push({
        id: `CHUNK_${chunkNum}`,
        number: `${chunkNum}`,
        heading: `Section ${chunkNum}`,
        fullTitle: `Section ${chunkNum}`,
        content: currentChunk,
        level: 1,
        matchKey: `chunk_${chunkNum}`
      });
      chunkNum++;
      currentChunk = '';
    }
  }
  
  // Don't forget remaining content
  if (currentChunk.trim()) {
    sections.push({
      id: `CHUNK_${chunkNum}`,
      number: `${chunkNum}`,
      heading: `Section ${chunkNum}`,
      fullTitle: `Section ${chunkNum}`,
      content: currentChunk,
      level: 1,
      matchKey: `chunk_${chunkNum}`
    });
  }
  
  return sections;
}

// ============================================
// COMPARISON HELPERS
// ============================================

function normalizeContent(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeHeading(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function calculateJaccard(text1: string, text2: string): number {
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

function detectCategory(oldContent: string, newContent: string): ChangeCategory {
  const combined = (oldContent + ' ' + newContent).toLowerCase();
  
  if (OBLIGATION_KEYWORDS.some(k => combined.includes(k))) return 'obligation';
  if (THRESHOLD_KEYWORDS.some(k => combined.includes(k))) return 'threshold';
  if (TIMING_KEYWORDS.some(k => combined.includes(k))) return 'timing';
  if (ROLE_KEYWORDS.some(k => combined.includes(k))) return 'role';
  if (RECORDS_KEYWORDS.some(k => combined.includes(k))) return 'records';
  if (PROCEDURE_KEYWORDS.some(k => combined.includes(k))) return 'procedure';
  if (DEFINITION_KEYWORDS.some(k => combined.includes(k))) return 'definition';
  
  return 'other';
}

function detectSignificance(oldContent: string, newContent: string, diffParts?: Diff.Change[]): ChangeSignificance {
  const oldLower = oldContent.toLowerCase();
  const newLower = newContent.toLowerCase();
  
  const allKeywords = [...OBLIGATION_KEYWORDS, ...THRESHOLD_KEYWORDS, ...TIMING_KEYWORDS, ...ROLE_KEYWORDS, ...RECORDS_KEYWORDS];
  
  // Check for keyword changes
  for (const kw of allKeywords) {
    const inOld = oldLower.includes(kw);
    const inNew = newLower.includes(kw);
    if (inOld !== inNew) return 'substantive';
  }
  
  // Check for number changes
  const oldNums = oldContent.match(/\d+\.?\d*/g) || [];
  const newNums = newContent.match(/\d+\.?\d*/g) || [];
  if (JSON.stringify(oldNums.sort()) !== JSON.stringify(newNums.sort())) return 'substantive';
  
  // Check diff parts for significant changes
  if (diffParts) {
    const changedText = diffParts
      .filter(p => p.added || p.removed)
      .map(p => p.value)
      .join(' ')
      .toLowerCase();
    
    if (allKeywords.some(k => changedText.includes(k))) return 'substantive';
  }
  
  return 'editorial';
}

function extractKeyChanges(diffParts: Diff.Change[]): string[] {
  const keyChanges: string[] = [];
  
  const removed = diffParts.filter(p => p.removed).map(p => p.value.trim()).filter(v => v.length > 3);
  const added = diffParts.filter(p => p.added).map(p => p.value.trim()).filter(v => v.length > 3);
  
  if (removed.length > 0) {
    const samples = removed.slice(0, 3).map(r => r.length > 50 ? r.substring(0, 50) + '...' : r);
    keyChanges.push(`Removed: "${samples.join('", "')}"`);
  }
  if (added.length > 0) {
    const samples = added.slice(0, 3).map(a => a.length > 50 ? a.substring(0, 50) + '...' : a);
    keyChanges.push(`Added: "${samples.join('", "')}"`);
  }
  
  return keyChanges;
}

// ============================================
// 3-PASS MATCHING ENGINE
// ============================================

interface MatchResult {
  oldSection: DocumentSection;
  newSection: DocumentSection | null;
  matchType: 'number' | 'heading' | 'content' | 'unmatched';
  confidence: number;
}

function performThreePassMatching(
  oldSections: DocumentSection[],
  newSections: DocumentSection[]
): MatchResult[] {
  const results: MatchResult[] = [];
  const matchedNewKeys = new Set<string>();
  
  // PASS 1: Exact number match (for numbered sections)
  for (const oldSec of oldSections) {
    if (oldSec.number) {
      const exactMatch = newSections.find(
        n => n.number === oldSec.number && !matchedNewKeys.has(n.matchKey)
      );
      if (exactMatch) {
        matchedNewKeys.add(exactMatch.matchKey);
        results.push({
          oldSection: oldSec,
          newSection: exactMatch,
          matchType: 'number',
          confidence: 1.0
        });
        continue;
      }
    }
  }
  
  // PASS 2: Fuzzy heading match (Jaccard >= 0.5 on heading words)
  const unmatchedOld = oldSections.filter(
    o => !results.some(r => r.oldSection.matchKey === o.matchKey)
  );
  
  for (const oldSec of unmatchedOld) {
    let bestMatch: { section: DocumentSection; score: number } | null = null;
    
    for (const newSec of newSections) {
      if (matchedNewKeys.has(newSec.matchKey)) continue;
      
      const headingSim = calculateJaccard(
        normalizeHeading(oldSec.heading),
        normalizeHeading(newSec.heading)
      );
      
      if (headingSim >= 0.5 && (!bestMatch || headingSim > bestMatch.score)) {
        bestMatch = { section: newSec, score: headingSim };
      }
    }
    
    if (bestMatch) {
      matchedNewKeys.add(bestMatch.section.matchKey);
      results.push({
        oldSection: oldSec,
        newSection: bestMatch.section,
        matchType: 'heading',
        confidence: bestMatch.score
      });
    }
  }
  
  // PASS 3: Content similarity fallback (Jaccard >= 0.4 on content)
  const stillUnmatchedOld = oldSections.filter(
    o => !results.some(r => r.oldSection.matchKey === o.matchKey)
  );
  
  for (const oldSec of stillUnmatchedOld) {
    if (oldSec.content.trim().length < 20) continue;
    
    let bestMatch: { section: DocumentSection; score: number } | null = null;
    
    for (const newSec of newSections) {
      if (matchedNewKeys.has(newSec.matchKey)) continue;
      if (newSec.content.trim().length < 20) continue;
      
      const contentSim = calculateJaccard(oldSec.content, newSec.content);
      
      if (contentSim >= 0.4 && (!bestMatch || contentSim > bestMatch.score)) {
        bestMatch = { section: newSec, score: contentSim };
      }
    }
    
    if (bestMatch) {
      matchedNewKeys.add(bestMatch.section.matchKey);
      results.push({
        oldSection: oldSec,
        newSection: bestMatch.section,
        matchType: 'content',
        confidence: bestMatch.score
      });
    } else {
      // Truly unmatched
      results.push({
        oldSection: oldSec,
        newSection: null,
        matchType: 'unmatched',
        confidence: 0
      });
    }
  }
  
  return results;
}

// ============================================
// MAIN COMPARISON FUNCTION
// ============================================

export function compareDocuments(oldDoc: ExtractedDocument, newDoc: ExtractedDocument): SimpleComparisonResult {
  const changes: SectionChange[] = [];
  
  // Perform 3-pass matching
  const matchResults = performThreePassMatching(oldDoc.sections, newDoc.sections);
  const matchedNewKeys = new Set(matchResults.filter(r => r.newSection).map(r => r.newSection!.matchKey));
  
  // Process matched and unmatched old sections
  for (const result of matchResults) {
    const oldSec = result.oldSection;
    const newSec = result.newSection;
    
    if (newSec) {
      // Check if content differs
      const oldNorm = normalizeContent(oldSec.content);
      const newNorm = normalizeContent(newSec.content);
      
      if (oldNorm !== newNorm) {
        const diffParts = Diff.diffWords(oldSec.content, newSec.content);
        const hasRealChange = diffParts.some(p => (p.added || p.removed) && p.value.trim().length > 2);
        
        if (hasRealChange) {
          const significance = detectSignificance(oldSec.content, newSec.content, diffParts);
          const category = detectCategory(oldSec.content, newSec.content);
          const keyChanges = extractKeyChanges(diffParts);
          
          changes.push({
            sectionId: oldSec.id,
            sectionNumber: oldSec.number || '',
            sectionTitle: oldSec.fullTitle,
            changeType: 'modified',
            significance,
            category,
            oldContent: oldSec.content,
            newContent: newSec.content,
            diffParts,
            keyChanges
          });
        }
      }
      // else: unchanged
    } else {
      // Removed section
      if (oldSec.content.trim().length > 10) {
        changes.push({
          sectionId: oldSec.id,
          sectionNumber: oldSec.number || '',
          sectionTitle: oldSec.fullTitle,
          changeType: 'removed',
          significance: 'substantive',
          category: detectCategory(oldSec.content, ''),
          oldContent: oldSec.content,
          newContent: '',
          keyChanges: ['Entire section removed']
        });
      }
    }
  }
  
  // Find added sections (in new but not matched)
  for (const newSec of newDoc.sections) {
    if (!matchedNewKeys.has(newSec.matchKey) && newSec.content.trim().length > 10) {
      changes.push({
        sectionId: newSec.id,
        sectionNumber: newSec.number || '',
        sectionTitle: newSec.fullTitle,
        changeType: 'added',
        significance: 'substantive',
        category: detectCategory('', newSec.content),
        oldContent: '',
        newContent: newSec.content,
        keyChanges: ['New section added']
      });
    }
  }
  
  // Sort by section number/id
  changes.sort((a, b) => {
    const aNum = a.sectionNumber || a.sectionId;
    const bNum = b.sectionNumber || b.sectionId;
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });
  
  const totalSections = Math.max(oldDoc.sections.length, newDoc.sections.length);
  const modified = changes.filter(c => c.changeType === 'modified').length;
  const added = changes.filter(c => c.changeType === 'added').length;
  const removed = changes.filter(c => c.changeType === 'removed').length;
  const unchanged = Math.max(0, oldDoc.sections.length - modified - removed);
  
  return {
    changes,
    summary: {
      totalSections,
      unchanged,
      modified,
      added,
      removed,
      substantive: changes.filter(c => c.significance === 'substantive').length,
      editorial: changes.filter(c => c.significance === 'editorial').length
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
