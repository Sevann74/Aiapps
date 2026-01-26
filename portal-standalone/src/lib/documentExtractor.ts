import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ============================================
// TYPES & INTERFACES
// ============================================

export type BlockType = 'heading' | 'paragraph' | 'table' | 'appendix' | 'list';
export type MatchTier = 'TIER1_ID' | 'TIER2_HASH' | 'TIER3_SIMILARITY' | 'UNMATCHED';
export type ChangeClassification = 'NO_CHANGE' | 'EDITORIAL' | 'SUBSTANTIVE' | 'RELOCATED' | 'NEW' | 'RETIRED' | 'MANUAL_REVIEW';

export interface DocumentBlock {
  id: string;
  type: BlockType;
  heading: string;
  content: string;
  contentHash: string;
  normalizedContent: string;
  level: number;
  cellHashes?: string[]; // For tables
}

export interface ExtractedDocument {
  text: string;
  sections: DocumentSection[];
  blocks: DocumentBlock[];
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

export interface MatchResult {
  oldBlockId: string;
  newBlockId: string | null;
  tier: MatchTier;
  confidence: number;
  jaccardScore?: number;
  tfidfScore?: number;
}

export interface AuditTrailEntry {
  matchTier: MatchTier;
  confidence: number;
  jaccardScore?: number;
  tfidfScore?: number;
  ngramSearchPerformed: boolean;
  ngramFoundInDocument: boolean;
  keywordDeltaDetails?: KeywordDelta;
}

export interface KeywordDelta {
  obligationChanged: boolean;
  roleChanged: boolean;
  timingChanged: boolean;
  thresholdChanged: boolean;
  recordsChanged: boolean;
  oldKeywords: string[];
  newKeywords: string[];
}

export interface SectionChange {
  sectionId: string;
  sectionTitle: string;
  changeType: 'added' | 'modified' | 'removed' | 'relocated';
  classification: ChangeClassification;
  oldContent: string;
  newContent: string;
  matchTier: MatchTier;
  confidence: number;
  manualReviewRequired: boolean;
  auditTrail: AuditTrailEntry;
  relocatedFrom?: string;
  relocatedTo?: string;
}

export interface ComparisonResult {
  oldDocument: ExtractedDocument;
  newDocument: ExtractedDocument;
  changes: SectionChange[];
  summary: {
    totalBlocks: number;
    unchanged: number;
    editorial: number;
    substantive: number;
    relocated: number;
    new: number;
    retired: number;
    manualReview: number;
  };
}

// ============================================
// KEYWORD SETS FOR CLASSIFICATION
// ============================================

const OBLIGATION_KEYWORDS = ['must', 'shall', 'required', 'mandatory', 'is required to', 'will be', 'needs to', 'has to'];
const ROLE_KEYWORDS = ['operator', 'supervisor', 'manager', 'technician', 'analyst', 'qa', 'qc', 'quality', 'responsible', 'accountable', 'owner', 'approver', 'reviewer'];
const TIMING_KEYWORDS = ['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'hourly', 'within', 'hours', 'days', 'minutes', 'immediately', 'prior to', 'before', 'after'];
const THRESHOLD_KEYWORDS = ['minimum', 'maximum', 'at least', 'no more than', 'not exceed', 'greater than', 'less than', '%', 'percent', 'ppm', 'mg', 'ml', 'kg', 'celsius', 'fahrenheit'];
const RECORDS_KEYWORDS = ['document', 'record', 'log', 'form', 'checklist', 'signature', 'sign', 'date', 'batch record', 'logbook'];

// ============================================
// DOCUMENT EXTRACTION
// ============================================

export async function extractTextFromWord(file: File): Promise<ExtractedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;
  
  const sections = parseDocumentSections(text);
  const blocks = extractDocumentBlocks(text);
  const metadata = extractMetadata(text, file.name);
  
  return { text, sections, blocks, metadata };
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
  const blocks = extractDocumentBlocks(fullText);
  const metadata = extractMetadata(fullText, file.name);
  
  return { text: fullText, sections, blocks, metadata };
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
// BLOCK EXTRACTION
// ============================================

function extractDocumentBlocks(text: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  const lines = text.split('\n');
  
  // Patterns for different block types
  const headingPatterns = [
    /^(\d+\.?\d*\.?\d*)\s+(.+)$/,
    /^(Section\s+\d+):?\s*(.+)$/i,
    /^([A-Z]{1,3}\.?\d*\.?\d*)\s+(.+)$/,
    /^(Purpose|Scope|Procedure|Responsibilities|References|Definitions|Equipment|Materials|Safety|Quality|Documentation):?\s*$/i
  ];
  
  const appendixPattern = /^(Appendix\s+[A-Z0-9]+):?\s*(.*)$/i;
  const tablePattern = /^\|.*\|$/;
  
  let currentBlock: DocumentBlock | null = null;
  let blockCounter = 0;
  let inTable = false;
  let tableContent: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      if (inTable && tableContent.length > 0) {
        // End of table
        const tableText = tableContent.join('\n');
        blocks.push(createBlock(`TABLE_${blockCounter}`, 'table', 'Table', tableText, blockCounter));
        blockCounter++;
        tableContent = [];
        inTable = false;
      }
      continue;
    }
    
    // Check for table
    if (tablePattern.test(trimmedLine)) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      inTable = true;
      tableContent.push(trimmedLine);
      continue;
    }
    
    if (inTable) {
      // End of table, process remaining
      const tableText = tableContent.join('\n');
      blocks.push(createBlock(`TABLE_${blockCounter}`, 'table', 'Table', tableText, blockCounter));
      blockCounter++;
      tableContent = [];
      inTable = false;
    }
    
    // Check for appendix
    const appendixMatch = trimmedLine.match(appendixPattern);
    if (appendixMatch) {
      if (currentBlock) blocks.push(currentBlock);
      blockCounter++;
      currentBlock = createBlock(appendixMatch[1], 'appendix', appendixMatch[2] || appendixMatch[1], '', blockCounter);
      continue;
    }
    
    // Check for heading
    let isHeading = false;
    for (const pattern of headingPatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        if (currentBlock) blocks.push(currentBlock);
        blockCounter++;
        const id = match[1] || `BLOCK_${blockCounter}`;
        const heading = match[2] || match[1];
        currentBlock = createBlock(id, 'heading', heading, '', blockCounter);
        isHeading = true;
        break;
      }
    }
    
    if (!isHeading && currentBlock) {
      currentBlock.content += (currentBlock.content ? '\n' : '') + trimmedLine;
    } else if (!isHeading && !currentBlock) {
      blockCounter++;
      currentBlock = createBlock(`PREAMBLE`, 'paragraph', 'Document Header', trimmedLine, 0);
    }
  }
  
  // Handle remaining content
  if (inTable && tableContent.length > 0) {
    const tableText = tableContent.join('\n');
    blocks.push(createBlock(`TABLE_${blockCounter}`, 'table', 'Table', tableText, blockCounter));
  }
  if (currentBlock) blocks.push(currentBlock);
  
  // Finalize blocks with hashes
  return blocks.map(b => ({
    ...b,
    contentHash: simpleHash(b.normalizedContent),
    cellHashes: b.type === 'table' ? extractTableCellHashes(b.content) : undefined
  }));
}

function createBlock(id: string, type: BlockType, heading: string, content: string, level: number): DocumentBlock {
  const normalizedContent = normalizeForComparison(content);
  return {
    id,
    type,
    heading,
    content,
    contentHash: '', // Will be set later
    normalizedContent,
    level
  };
}

function extractTableCellHashes(tableContent: string): string[] {
  const cells: string[] = [];
  const rows = tableContent.split('\n');
  for (const row of rows) {
    const cellValues = row.split('|').filter(c => c.trim());
    for (const cell of cellValues) {
      cells.push(simpleHash(normalizeForComparison(cell)));
    }
  }
  return cells;
}

// ============================================
// NORMALIZATION & HASHING
// ============================================

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[•●○◦▪▫]/g, '-')
    .trim();
}

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function normalizeHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[:\-_]/g, '')
    .trim();
}

// ============================================
// SIMILARITY CALCULATIONS
// ============================================

function calculateJaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(text2.split(' ').filter(w => w.length > 2));
  
  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

function calculateTFIDFCosineSimilarity(text1: string, text2: string): number {
  const words1 = text1.split(' ').filter(w => w.length > 2);
  const words2 = text2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 && words2.length === 0) return 1;
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Build term frequency maps
  const tf1 = new Map<string, number>();
  const tf2 = new Map<string, number>();
  
  for (const w of words1) tf1.set(w, (tf1.get(w) || 0) + 1);
  for (const w of words2) tf2.set(w, (tf2.get(w) || 0) + 1);
  
  // Get all unique terms
  const allTerms = new Set([...tf1.keys(), ...tf2.keys()]);
  
  // Calculate dot product and magnitudes
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (const term of allTerms) {
    const v1 = tf1.get(term) || 0;
    const v2 = tf2.get(term) || 0;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  }
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

function headingSimilarity(h1: string, h2: string): number {
  const norm1 = normalizeHeading(h1);
  const norm2 = normalizeHeading(h2);
  if (norm1 === norm2) return 1.0;
  return calculateJaccardSimilarity(norm1, norm2);
}

// ============================================
// N-GRAM DOCUMENT-LEVEL SEARCH
// ============================================

function generateNgrams(text: string, n: number = 3): Set<string> {
  const words = text.split(' ').filter(w => w.length > 2);
  const ngrams = new Set<string>();
  
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(' '));
  }
  
  return ngrams;
}

function searchNgramsInDocument(sourceNgrams: Set<string>, targetText: string, threshold: number = 0.3): boolean {
  if (sourceNgrams.size === 0) return false;
  
  const targetNgrams = generateNgrams(targetText);
  let matchCount = 0;
  
  for (const ngram of sourceNgrams) {
    if (targetNgrams.has(ngram)) matchCount++;
  }
  
  return (matchCount / sourceNgrams.size) >= threshold;
}

// ============================================
// KEYWORD DELTA DETECTION
// ============================================

function detectKeywordDelta(oldText: string, newText: string): KeywordDelta {
  const oldLower = oldText.toLowerCase();
  const newLower = newText.toLowerCase();
  
  const findKeywords = (text: string, keywords: string[]) => 
    keywords.filter(k => text.includes(k));
  
  const oldObligations = findKeywords(oldLower, OBLIGATION_KEYWORDS);
  const newObligations = findKeywords(newLower, OBLIGATION_KEYWORDS);
  
  const oldRoles = findKeywords(oldLower, ROLE_KEYWORDS);
  const newRoles = findKeywords(newLower, ROLE_KEYWORDS);
  
  const oldTiming = findKeywords(oldLower, TIMING_KEYWORDS);
  const newTiming = findKeywords(newLower, TIMING_KEYWORDS);
  
  const oldThresholds = findKeywords(oldLower, THRESHOLD_KEYWORDS);
  const newThresholds = findKeywords(newLower, THRESHOLD_KEYWORDS);
  
  const oldRecords = findKeywords(oldLower, RECORDS_KEYWORDS);
  const newRecords = findKeywords(newLower, RECORDS_KEYWORDS);
  
  const arraysEqual = (a: string[], b: string[]) => 
    a.length === b.length && a.sort().every((v, i) => v === b.sort()[i]);
  
  return {
    obligationChanged: !arraysEqual(oldObligations, newObligations),
    roleChanged: !arraysEqual(oldRoles, newRoles),
    timingChanged: !arraysEqual(oldTiming, newTiming),
    thresholdChanged: !arraysEqual(oldThresholds, newThresholds),
    recordsChanged: !arraysEqual(oldRecords, newRecords),
    oldKeywords: [...oldObligations, ...oldRoles, ...oldTiming, ...oldThresholds, ...oldRecords],
    newKeywords: [...newObligations, ...newRoles, ...newTiming, ...newThresholds, ...newRecords]
  };
}

function isSubstantiveChange(delta: KeywordDelta): boolean {
  return delta.obligationChanged || delta.roleChanged || delta.timingChanged || 
         delta.thresholdChanged || delta.recordsChanged;
}

// ============================================
// TIERED MATCHING ENGINE
// ============================================

function performTieredMatching(
  oldBlocks: DocumentBlock[],
  newBlocks: DocumentBlock[]
): Map<string, MatchResult> {
  const matches = new Map<string, MatchResult>();
  const matchedNewBlocks = new Set<string>();
  
  // TIER 1: Section ID + Heading similarity (exact or near-exact)
  for (const oldBlock of oldBlocks) {
    for (const newBlock of newBlocks) {
      if (matchedNewBlocks.has(newBlock.id)) continue;
      
      const idMatch = oldBlock.id === newBlock.id;
      const headingSim = headingSimilarity(oldBlock.heading, newBlock.heading);
      
      if (idMatch && headingSim >= 0.8) {
        matches.set(oldBlock.id, {
          oldBlockId: oldBlock.id,
          newBlockId: newBlock.id,
          tier: 'TIER1_ID',
          confidence: 1.0
        });
        matchedNewBlocks.add(newBlock.id);
        break;
      }
    }
  }
  
  // TIER 2: Content hash exact match (RELOCATED)
  for (const oldBlock of oldBlocks) {
    if (matches.has(oldBlock.id)) continue;
    
    for (const newBlock of newBlocks) {
      if (matchedNewBlocks.has(newBlock.id)) continue;
      
      if (oldBlock.contentHash === newBlock.contentHash && oldBlock.contentHash !== simpleHash('')) {
        matches.set(oldBlock.id, {
          oldBlockId: oldBlock.id,
          newBlockId: newBlock.id,
          tier: 'TIER2_HASH',
          confidence: 1.0
        });
        matchedNewBlocks.add(newBlock.id);
        break;
      }
    }
  }
  
  // TIER 3: Dual similarity (Jaccard >= 0.70 AND TF-IDF cosine >= 0.80)
  for (const oldBlock of oldBlocks) {
    if (matches.has(oldBlock.id)) continue;
    
    let bestMatch: { newBlock: DocumentBlock; jaccard: number; tfidf: number } | null = null;
    
    for (const newBlock of newBlocks) {
      if (matchedNewBlocks.has(newBlock.id)) continue;
      
      const jaccard = calculateJaccardSimilarity(oldBlock.normalizedContent, newBlock.normalizedContent);
      const tfidf = calculateTFIDFCosineSimilarity(oldBlock.normalizedContent, newBlock.normalizedContent);
      
      // BOTH thresholds must be met
      if (jaccard >= 0.70 && tfidf >= 0.80) {
        if (!bestMatch || (jaccard + tfidf) > (bestMatch.jaccard + bestMatch.tfidf)) {
          bestMatch = { newBlock, jaccard, tfidf };
        }
      }
    }
    
    if (bestMatch) {
      const confidence = 0.80 + (0.15 * Math.min(bestMatch.jaccard, bestMatch.tfidf));
      matches.set(oldBlock.id, {
        oldBlockId: oldBlock.id,
        newBlockId: bestMatch.newBlock.id,
        tier: 'TIER3_SIMILARITY',
        confidence: Math.min(confidence, 0.95),
        jaccardScore: bestMatch.jaccard,
        tfidfScore: bestMatch.tfidf
      });
      matchedNewBlocks.add(bestMatch.newBlock.id);
    }
  }
  
  // Mark unmatched
  for (const oldBlock of oldBlocks) {
    if (!matches.has(oldBlock.id)) {
      matches.set(oldBlock.id, {
        oldBlockId: oldBlock.id,
        newBlockId: null,
        tier: 'UNMATCHED',
        confidence: 0
      });
    }
  }
  
  return matches;
}

// ============================================
// MAIN COMPARISON FUNCTION
// ============================================

export function compareDocuments(oldDoc: ExtractedDocument, newDoc: ExtractedDocument): ComparisonResult {
  const changes: SectionChange[] = [];
  const oldBlocks = oldDoc.blocks;
  const newBlocks = newDoc.blocks;
  
  // Perform tiered matching
  const matchResults = performTieredMatching(oldBlocks, newBlocks);
  const matchedNewBlockIds = new Set<string>();
  
  // Process each old block
  for (const oldBlock of oldBlocks) {
    const match = matchResults.get(oldBlock.id)!;
    
    if (match.newBlockId) {
      matchedNewBlockIds.add(match.newBlockId);
      const newBlock = newBlocks.find(b => b.id === match.newBlockId)!;
      
      // Check if content is identical
      if (oldBlock.contentHash === newBlock.contentHash) {
        // NO_CHANGE - skip unless relocated
        if (match.tier === 'TIER2_HASH' && oldBlock.id !== newBlock.id) {
          changes.push(createChange(oldBlock, newBlock, 'relocated', 'RELOCATED', match, false, oldDoc, newDoc));
        }
        continue;
      }
      
      // Content differs - classify as EDITORIAL or SUBSTANTIVE
      const keywordDelta = detectKeywordDelta(oldBlock.content, newBlock.content);
      const classification: ChangeClassification = isSubstantiveChange(keywordDelta) ? 'SUBSTANTIVE' : 'EDITORIAL';
      
      changes.push(createChange(oldBlock, newBlock, 'modified', classification, match, false, oldDoc, newDoc, keywordDelta));
      
    } else {
      // Unmatched old block - check document-level for content
      const ngrams = generateNgrams(oldBlock.normalizedContent);
      const foundInNewDoc = searchNgramsInDocument(ngrams, newDoc.text);
      
      if (foundInNewDoc) {
        // Content exists somewhere - MANUAL_REVIEW
        changes.push(createChange(oldBlock, null, 'removed', 'MANUAL_REVIEW', match, true, oldDoc, newDoc));
      } else {
        // Content truly absent - RETIRED
        changes.push(createChange(oldBlock, null, 'removed', 'RETIRED', match, false, oldDoc, newDoc));
      }
    }
  }
  
  // Find new blocks (in new but not matched)
  for (const newBlock of newBlocks) {
    if (!matchedNewBlockIds.has(newBlock.id)) {
      // Check if content exists in old document
      const ngrams = generateNgrams(newBlock.normalizedContent);
      const foundInOldDoc = searchNgramsInDocument(ngrams, oldDoc.text);
      
      if (foundInOldDoc) {
        // Content exists somewhere in old - MANUAL_REVIEW
        const match: MatchResult = { oldBlockId: '', newBlockId: newBlock.id, tier: 'UNMATCHED', confidence: 0 };
        changes.push(createChange(null, newBlock, 'added', 'MANUAL_REVIEW', match, true, oldDoc, newDoc));
      } else {
        // Truly new content
        const match: MatchResult = { oldBlockId: '', newBlockId: newBlock.id, tier: 'UNMATCHED', confidence: 0 };
        changes.push(createChange(null, newBlock, 'added', 'NEW', match, false, oldDoc, newDoc));
      }
    }
  }
  
  // Sort by section ID
  changes.sort((a, b) => a.sectionId.localeCompare(b.sectionId, undefined, { numeric: true }));
  
  return {
    oldDocument: oldDoc,
    newDocument: newDoc,
    changes,
    summary: {
      totalBlocks: Math.max(oldBlocks.length, newBlocks.length),
      unchanged: oldBlocks.length - changes.filter(c => c.changeType !== 'added').length,
      editorial: changes.filter(c => c.classification === 'EDITORIAL').length,
      substantive: changes.filter(c => c.classification === 'SUBSTANTIVE').length,
      relocated: changes.filter(c => c.classification === 'RELOCATED').length,
      new: changes.filter(c => c.classification === 'NEW').length,
      retired: changes.filter(c => c.classification === 'RETIRED').length,
      manualReview: changes.filter(c => c.classification === 'MANUAL_REVIEW').length
    }
  };
}

function createChange(
  oldBlock: DocumentBlock | null,
  newBlock: DocumentBlock | null,
  changeType: 'added' | 'modified' | 'removed' | 'relocated',
  classification: ChangeClassification,
  match: MatchResult,
  manualReview: boolean,
  oldDoc: ExtractedDocument,
  newDoc: ExtractedDocument,
  keywordDelta?: KeywordDelta
): SectionChange {
  const ngramSearch = !match.newBlockId || !oldBlock;
  const ngrams = oldBlock ? generateNgrams(oldBlock.normalizedContent) : (newBlock ? generateNgrams(newBlock.normalizedContent) : new Set<string>());
  const foundInDoc = ngramSearch ? searchNgramsInDocument(ngrams, changeType === 'removed' ? newDoc.text : oldDoc.text) : false;
  
  return {
    sectionId: oldBlock?.id || newBlock?.id || 'UNKNOWN',
    sectionTitle: oldBlock?.heading || newBlock?.heading || 'Unknown Section',
    changeType,
    classification,
    oldContent: oldBlock?.content || '',
    newContent: newBlock?.content || '',
    matchTier: match.tier,
    confidence: match.confidence,
    manualReviewRequired: manualReview,
    relocatedFrom: classification === 'RELOCATED' ? oldBlock?.id : undefined,
    relocatedTo: classification === 'RELOCATED' ? newBlock?.id : undefined,
    auditTrail: {
      matchTier: match.tier,
      confidence: match.confidence,
      jaccardScore: match.jaccardScore,
      tfidfScore: match.tfidfScore,
      ngramSearchPerformed: ngramSearch,
      ngramFoundInDocument: foundInDoc,
      keywordDeltaDetails: keywordDelta
    }
  };
}
