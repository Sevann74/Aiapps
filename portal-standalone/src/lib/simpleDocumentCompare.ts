import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import * as Diff from 'diff';

// Configure PDF.js worker - use cdnjs with legacy js format
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

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
  parentSection?: string; // For hierarchical context
  // Uncertainty signaling fields
  matchConfidence?: number; // 0-1, for uncertainty badges
  possibleRelocation?: boolean; // Content may have moved
  structureUnclear?: boolean; // Section boundaries uncertain
}

// New: Change region for full-text diff approach
export interface ChangeRegion {
  id: string;
  startIndex: number;
  endIndex: number;
  changeType: 'added' | 'removed' | 'modified';
  significance: ChangeSignificance;
  category: ChangeCategory;
  parentSection: string;
  oldText: string;
  newText: string;
  diffParts: Diff.Change[];
  descriptor: string; // Human-readable description
  // Enhanced metadata for Change Cards
  changeSummary: string; // e.g., "Reporting timing requirement modified"
  affectedArea: string; // e.g., "Deviation reporting notification"
  changeNature: string; // e.g., "Requirement modified", "New step added"
  suggestedAction: string; // e.g., "Review training & SOP owner sign-off"
  // Layer 2: Sentence-level context (deterministic extraction)
  oldSentence: string; // Full sentence from old version containing the change
  newSentence: string; // Full sentence from new version containing the change
}

export interface FullTextComparisonResult {
  // Full document diff with inline highlighting
  fullDiff: Diff.Change[];
  // Grouped change regions with section context
  changeRegions: ChangeRegion[];
  // Section markers for navigation
  sections: Array<{
    id: string;
    title: string;
    level: number;
    hasChanges: boolean;
    changeCount: number;
    oldIndex: number;
    newIndex: number;
  }>;
  // Summary stats
  summary: {
    totalChanges: number;
    wordsAdded: number;
    wordsRemoved: number;
    wordsModified: number;
    substantive: number;
    editorial: number;
    sectionsAffected: number;
  };
  // Raw text for reference
  oldText: string;
  newText: string;
  // HTML with table structure preserved
  oldHtml?: string;
  newHtml?: string;
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
  // New: Full-text diff result
  fullTextResult?: FullTextComparisonResult;
}

export interface ExtractedDocument {
  sections: DocumentSection[];
  metadata: { title: string; version: string };
  rawText: string;
  rawHtml?: string; // HTML with table structure preserved
}

// ============================================
// CHANGE DESCRIPTOR - Rule-based summaries
// ============================================

interface ChangeMetadata {
  descriptor: string;
  changeSummary: string;
  affectedArea: string;
  changeNature: string;
  suggestedAction: string;
}

function generateChangeMetadata(oldText: string, newText: string, changeType: string, parentSection: string, category: ChangeCategory): ChangeMetadata {
  const oldLower = oldText.toLowerCase();
  const newLower = newText.toLowerCase();
  const combinedText = `${oldLower} ${newLower}`;
  
  // Default values
  let descriptor = 'Content revised';
  let changeSummary = 'Content updated';
  let affectedArea = parentSection || 'General';
  let changeNature = 'Modified';
  let suggestedAction = 'Review change';
  
  // Determine change nature based on changeType
  if (changeType === 'added') {
    changeNature = 'New content added';
    descriptor = 'New content added';
    suggestedAction = 'Review new requirement';
  } else if (changeType === 'removed') {
    changeNature = 'Content removed';
    descriptor = 'Content removed';
    suggestedAction = 'Confirm removal is intentional';
  }
  
  // Detect specific change patterns and generate rich summaries
  
  // Timing/frequency changes
  const freqTerms = ['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'hourly', 'immediately', 'without delay'];
  const oldFreq = freqTerms.find(t => oldLower.includes(t));
  const newFreq = freqTerms.find(t => newLower.includes(t));
  if (oldFreq && newFreq && oldFreq !== newFreq) {
    changeSummary = 'Timing requirement modified';
    affectedArea = extractAffectedArea(combinedText, parentSection);
    changeNature = `Frequency: ${oldFreq} → ${newFreq}`;
    descriptor = `Frequency changed: ${oldFreq} → ${newFreq}`;
    suggestedAction = 'Update schedules & notify affected staff';
  } else if (combinedText.includes('immediately') || combinedText.includes('without delay') || combinedText.includes('within')) {
    changeSummary = 'Timing requirement modified';
    affectedArea = extractAffectedArea(combinedText, parentSection);
    changeNature = 'Timing updated';
    descriptor = 'Timing requirement updated';
    suggestedAction = 'Review training & update procedures';
  }
  
  // Threshold/value changes
  const oldNums = oldText.match(/\d+\.?\d*/g) || [];
  const newNums = newText.match(/\d+\.?\d*/g) || [];
  if (oldNums.length > 0 && newNums.length > 0 && JSON.stringify(oldNums) !== JSON.stringify(newNums)) {
    changeSummary = 'Threshold or limit modified';
    affectedArea = extractAffectedArea(combinedText, parentSection);
    changeNature = `Value: ${oldNums[0]} → ${newNums[0]}`;
    descriptor = `Values changed: ${oldNums.slice(0,2).join(', ')} → ${newNums.slice(0,2).join(', ')}`;
    suggestedAction = 'Verify limits & update monitoring';
  }
  
  // Role/responsibility changes
  const roleTerms = ['operator', 'supervisor', 'manager', 'technician', 'analyst', 'qa', 'qc', 'responsible', 'accountable'];
  const oldRole = roleTerms.find(t => oldLower.includes(t));
  const newRole = roleTerms.find(t => newLower.includes(t));
  if ((oldRole && !newRole) || (!oldRole && newRole) || (oldRole && newRole && oldRole !== newRole)) {
    changeSummary = 'Responsibility assignment modified';
    affectedArea = extractAffectedArea(combinedText, parentSection);
    changeNature = 'Role/responsibility updated';
    descriptor = 'Role or responsibility updated';
    suggestedAction = 'Update RACI & notify affected personnel';
  }
  
  // Documentation requirements
  const docTerms = ['document', 'record', 'log', 'form', 'signature', 'sign-off'];
  if (docTerms.some(t => newLower.includes(t) && !oldLower.includes(t))) {
    changeSummary = 'Documentation requirement added';
    affectedArea = extractAffectedArea(combinedText, parentSection);
    changeNature = 'New documentation required';
    descriptor = 'Documentation requirement added';
    suggestedAction = 'Create/update forms & train staff';
  } else if (docTerms.some(t => oldLower.includes(t) && !newLower.includes(t))) {
    changeSummary = 'Documentation requirement removed';
    affectedArea = extractAffectedArea(combinedText, parentSection);
    changeNature = 'Documentation no longer required';
    descriptor = 'Documentation requirement removed';
    suggestedAction = 'Confirm removal & update forms';
  }
  
  // Safety changes
  const safetyTerms = ['warning', 'caution', 'danger', 'safety', 'ppe', 'hazard', 'risk'];
  if (safetyTerms.some(t => combinedText.includes(t))) {
    changeSummary = 'Safety requirement modified';
    affectedArea = extractAffectedArea(combinedText, parentSection);
    changeNature = 'Safety-related update';
    descriptor = 'Safety-related content updated';
    suggestedAction = 'Review with EHS & update training';
  }
  
  // Obligation changes (must, shall, required)
  const obligationTerms = ['must', 'shall', 'required', 'mandatory', 'prohibited'];
  const oldObligation = obligationTerms.some(t => oldLower.includes(t));
  const newObligation = obligationTerms.some(t => newLower.includes(t));
  if (!oldObligation && newObligation) {
    changeSummary = 'New mandatory requirement added';
    changeNature = 'Obligation added';
    suggestedAction = 'Review compliance & update training';
  } else if (oldObligation && !newObligation) {
    changeSummary = 'Mandatory requirement relaxed';
    changeNature = 'Obligation removed';
    suggestedAction = 'Confirm change is intentional';
  }
  
  // Step/procedure changes
  if (combinedText.includes('step') || combinedText.includes('procedure') || combinedText.includes('process')) {
    if (changeType === 'added') {
      changeSummary = 'New procedural step added';
      changeNature = 'New step added';
      suggestedAction = 'Update training & work instructions';
    } else if (changeType === 'removed') {
      changeSummary = 'Procedural step removed';
      changeNature = 'Step removed';
      suggestedAction = 'Confirm removal & update training';
    } else {
      changeSummary = 'Procedural step modified';
      changeNature = 'Step modified';
      suggestedAction = 'Review & update training materials';
    }
  }
  
  // Category-based fallbacks
  if (changeSummary === 'Content updated') {
    switch (category) {
      case 'obligation':
        changeSummary = 'Requirement modified';
        suggestedAction = 'Review compliance impact';
        break;
      case 'timing':
        changeSummary = 'Timing requirement modified';
        suggestedAction = 'Update schedules';
        break;
      case 'threshold':
        changeSummary = 'Limit or threshold modified';
        suggestedAction = 'Verify monitoring parameters';
        break;
      case 'role':
        changeSummary = 'Responsibility modified';
        suggestedAction = 'Update RACI matrix';
        break;
      case 'records':
        changeSummary = 'Documentation requirement modified';
        suggestedAction = 'Update forms & records';
        break;
      case 'procedure':
        changeSummary = 'Procedure step modified';
        suggestedAction = 'Update training materials';
        break;
      case 'definition':
        changeSummary = 'Definition or terminology modified';
        suggestedAction = 'Update glossary & training';
        break;
    }
  }
  
  return {
    descriptor,
    changeSummary,
    affectedArea,
    changeNature,
    suggestedAction
  };
}

// Extract affected area from text context
function extractAffectedArea(text: string, parentSection: string): string {
  const areaPatterns = [
    /(?:deviation|capa|change control|batch|release|stability|validation|calibration|training|audit)/i,
    /(?:reporting|notification|documentation|review|approval|investigation)/i,
    /(?:sampling|testing|inspection|monitoring|verification)/i
  ];
  
  for (const pattern of areaPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase();
    }
  }
  
  return parentSection || 'General procedure';
}

// Legacy function for backward compatibility
function generateChangeDescriptor(oldText: string, newText: string, changeType: string): string {
  const metadata = generateChangeMetadata(oldText, newText, changeType, '', 'other');
  return metadata.descriptor;
}

// ============================================
// SENTENCE EXTRACTION - Layer 2 Context
// ============================================

// Extract the full sentence containing a text fragment from the source document
function extractSentenceContext(fullText: string, fragment: string, position: number): string {
  if (!fragment.trim() || !fullText) return fragment.trim();
  
  // Find the approximate position of the fragment in the full text
  let searchStart = Math.max(0, position - 500);
  let searchEnd = Math.min(fullText.length, position + fragment.length + 500);
  let searchArea = fullText.substring(searchStart, searchEnd);
  
  // Try to find the fragment in the search area
  let fragmentIndex = searchArea.toLowerCase().indexOf(fragment.toLowerCase().substring(0, Math.min(50, fragment.length)));
  if (fragmentIndex === -1) {
    // Fallback: search the whole document
    fragmentIndex = fullText.toLowerCase().indexOf(fragment.toLowerCase().substring(0, Math.min(50, fragment.length)));
    if (fragmentIndex === -1) return fragment.trim();
    searchStart = 0;
    searchArea = fullText;
  }
  
  const absolutePosition = searchStart + fragmentIndex;
  
  // Find sentence boundaries (. ! ? or newline followed by capital letter or number)
  const sentenceEndPattern = /[.!?](?:\s|$)|[\n\r](?=\s*[A-Z0-9])/g;
  
  // Find the start of the sentence (look backwards for sentence end)
  let sentenceStart = 0;
  const textBefore = fullText.substring(0, absolutePosition);
  const beforeMatches = [...textBefore.matchAll(sentenceEndPattern)];
  if (beforeMatches.length > 0) {
    const lastMatch = beforeMatches[beforeMatches.length - 1];
    sentenceStart = (lastMatch.index || 0) + lastMatch[0].length;
  }
  
  // Find the end of the sentence (look forward for sentence end)
  let sentenceEnd = fullText.length;
  const textAfter = fullText.substring(absolutePosition);
  const afterMatch = textAfter.match(sentenceEndPattern);
  if (afterMatch && afterMatch.index !== undefined) {
    sentenceEnd = absolutePosition + afterMatch.index + 1; // Include the period
  }
  
  // Extract and clean the sentence
  let sentence = fullText.substring(sentenceStart, sentenceEnd).trim();
  
  // Limit length to avoid overly long sentences (max ~300 chars)
  if (sentence.length > 300) {
    // Try to find a natural break point
    const fragmentPos = sentence.toLowerCase().indexOf(fragment.toLowerCase().substring(0, 30));
    if (fragmentPos > 150) {
      sentence = '...' + sentence.substring(fragmentPos - 50);
    }
    if (sentence.length > 300) {
      sentence = sentence.substring(0, 297) + '...';
    }
  }
  
  return sentence;
}

// Reconstruct sentence with the change applied
function reconstructSentence(oldSentence: string, oldFragment: string, newFragment: string): string {
  if (!oldSentence || !oldFragment) return newFragment.trim();
  
  // Try to replace the old fragment with the new one in the sentence
  const lowerSentence = oldSentence.toLowerCase();
  const lowerFragment = oldFragment.toLowerCase().trim();
  
  const fragmentIndex = lowerSentence.indexOf(lowerFragment);
  if (fragmentIndex !== -1) {
    return oldSentence.substring(0, fragmentIndex) + 
           newFragment.trim() + 
           oldSentence.substring(fragmentIndex + oldFragment.trim().length);
  }
  
  // Fallback: just return the new fragment
  return newFragment.trim();
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
  'materials', 'safety', 'quality', 'documentation', 'objective',
  'background', 'introduction', 'summary', 'glossary', 'revision history',
  'training requirements', 'related documents', 'attachments', 'forms'
];

// Words that indicate table cell content, not section headers
const TABLE_CELL_INDICATORS = ['overdue', 'pending', 'completed', 'in progress', 'open', 'closed', 'calibration', 'deviation', 'capa', 'status'];

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
      
      // Skip if this looks like table cell content (contains indicators like 'overdue', 'pending', etc.)
      const fullLineLower = fullTitle.toLowerCase();
      const isTableCell = TABLE_CELL_INDICATORS.some(ind => fullLineLower.includes(ind));
      if (isTableCell) continue;
      
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
  let rawHtml = '';
  
  if (extension === 'docx' || extension === 'doc') {
    const arrayBuffer = await file.arrayBuffer();
    // Get both text and HTML - HTML preserves table structure
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    rawText = textResult.value;
    rawHtml = htmlResult.value;
  } else if (extension === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      rawText += pageText + '\n\n';
    }
    // PDF doesn't have HTML structure
    rawHtml = '';
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
    rawText,
    rawHtml
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
  // Very aggressive normalization to avoid false positives from table extraction
  // Remove ALL whitespace and non-alphanumeric characters
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');  // Keep only letters and numbers
}

// Check if content looks like table data (many short lines, IDs, dates)
function isTableContent(text: string): boolean {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 5) return false;
  
  const datePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}/;
  const idPattern = /[A-Z]{2,}-\d{4}-\d{3}/;
  const shortLineCount = lines.filter(l => l.trim().length < 40).length;
  const dateCount = lines.filter(l => datePattern.test(l)).length;
  const idCount = lines.filter(l => idPattern.test(l)).length;
  
  return (shortLineCount / lines.length > 0.6) && (dateCount > 0 || idCount > 0);
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
      // Check if content differs using aggressive normalization
      const oldNorm = normalizeContent(oldSec.content);
      const newNorm = normalizeContent(newSec.content);
      
      // If normalized content is identical, skip - no real change
      if (oldNorm === newNorm) {
        continue;
      }
      
      // There's a real difference - compute diff for display
      const diffParts = Diff.diffWords(oldSec.content, newSec.content);
      
      // Extra filter: only count changes with actual alphanumeric content
      const significantChanges = diffParts.filter((p: any) => {
        if (!p.added && !p.removed) return false;
        const cleaned = p.value.replace(/[^a-z0-9]/gi, '');
        return cleaned.length > 2;
      });
      
      if (significantChanges.length > 0) {
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
// FULL-TEXT DIFF WITH SECTION MARKERS
// ============================================

interface SectionMarker {
  id: string;
  title: string;
  level: number;
  index: number;
}

function findSectionMarkers(text: string): SectionMarker[] {
  const markers: SectionMarker[] = [];
  
  // Numbered sections (1.0, 2.1, etc.)
  const numberedPattern = /^(?:Section\s+)?(\d+(?:\.\d+)*\.?)\s*[:\.]?\s*([A-Z][^\n]{2,80})/gm;
  let match;
  while ((match = numberedPattern.exec(text)) !== null) {
    const number = match[1].replace(/\.$/, '');
    const heading = match[2].trim();
    markers.push({
      id: number,
      title: `${number} ${heading}`,
      level: (number.match(/\./g) || []).length + 1,
      index: match.index
    });
  }
  
  // Keyword headings
  const keywordPattern = /^(Purpose|Scope|Procedure|Responsibilities|References|Definitions|Equipment|Materials|Safety|Quality|Documentation|Objective|Background|Introduction|Summary|Glossary|Appendix\s*[A-Z0-9]*)[:\s]*/gim;
  while ((match = keywordPattern.exec(text)) !== null) {
    if (!markers.some(m => Math.abs(m.index - match!.index) < 10)) {
      markers.push({
        id: match[1].toLowerCase().replace(/\s+/g, '_'),
        title: match[1].trim(),
        level: 1,
        index: match.index
      });
    }
  }
  
  markers.sort((a, b) => a.index - b.index);
  return markers;
}

function findParentSection(index: number, markers: SectionMarker[]): string {
  let parent = 'Document';
  for (const marker of markers) {
    if (marker.index <= index) {
      parent = marker.title;
    } else {
      break;
    }
  }
  return parent;
}

// Strip table-like content that appears as plain text (table headers/cells extracted from docx)
function stripTableContent(text: string): string {
  // Remove sections that look like table data (short lines that are likely table cells)
  const lines = text.split('\n');
  const filteredLines: string[] = [];
  let inTableSection = false;
  let consecutiveShortLines = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect table headers pattern (very short lines in sequence)
    const isShortLine = line.length > 0 && line.length < 40 && !line.includes('.') && !line.match(/^[\d]+\./);
    const isTableHeader = /^(ID|Date|Status|Description|Name|Type|Number|Version|Revision|Action|Person|Responsible|Comments?|Notes?|Results?|Findings?|Priority|Category|Due|Completed?|Assigned|Owner|Reference|Section|Page|Title|Log|Table|Tracking)$/i.test(line);
    
    if (isTableHeader || (isShortLine && consecutiveShortLines >= 2)) {
      inTableSection = true;
      consecutiveShortLines++;
      continue; // Skip this line
    }
    
    if (isShortLine) {
      consecutiveShortLines++;
    } else {
      consecutiveShortLines = 0;
      inTableSection = false;
    }
    
    // Skip lines that look like table cell content
    if (inTableSection && line.length < 50) {
      continue;
    }
    
    // Keep lines that look like actual content
    if (line.length > 0) {
      filteredLines.push(lines[i]);
    }
  }
  
  return filteredLines.join('\n');
}

export function performFullTextComparison(oldDocText: string, newDocText: string): FullTextComparisonResult {
  // Strip table content to avoid duplicate display
  const cleanOldText = stripTableContent(oldDocText);
  const cleanNewText = stripTableContent(newDocText);
  
  // Perform word-level diff on entire document
  const fullDiff = Diff.diffWords(cleanOldText, cleanNewText);
  
  // Find section markers in both documents
  const oldMarkers = findSectionMarkers(oldDocText);
  const newMarkers = findSectionMarkers(newDocText);
  
  // Group consecutive changes into regions
  const changeRegions: ChangeRegion[] = [];
  let currentIndex = 0;
  let regionId = 0;
  
  let wordsAdded = 0;
  let wordsRemoved = 0;
  
  // Track which sections have changes
  const sectionsWithChanges = new Set<string>();
  
  for (let i = 0; i < fullDiff.length; i++) {
    const part = fullDiff[i];
    
    if (part.added || part.removed) {
      const parentSection = findParentSection(currentIndex, part.added ? newMarkers : oldMarkers);
      sectionsWithChanges.add(parentSection);
      
      // Count words
      const wordCount = part.value.trim().split(/\s+/).filter(w => w.length > 0).length;
      if (part.added) wordsAdded += wordCount;
      if (part.removed) wordsRemoved += wordCount;
      
      // Look for adjacent changes to group them
      let oldText = part.removed ? part.value : '';
      let newText = part.added ? part.value : '';
      let endIndex = i;
      
      // Check if next part is the counterpart (removed followed by added or vice versa)
      if (i + 1 < fullDiff.length) {
        const nextPart = fullDiff[i + 1];
        if ((part.removed && nextPart.added) || (part.added && nextPart.removed)) {
          if (nextPart.added) {
            newText = nextPart.value;
            wordsAdded += nextPart.value.trim().split(/\s+/).filter(w => w.length > 0).length;
          }
          if (nextPart.removed) {
            oldText = nextPart.value;
            wordsRemoved += nextPart.value.trim().split(/\s+/).filter(w => w.length > 0).length;
          }
          endIndex = i + 1;
          i++; // Skip next part since we've processed it
        }
      }
      
      // Determine change type
      let changeType: 'added' | 'removed' | 'modified' = 'modified';
      if (!oldText.trim()) changeType = 'added';
      else if (!newText.trim()) changeType = 'removed';
      
      // Classify significance
      const significance = detectSignificance(oldText, newText);
      const category = detectCategory(oldText, newText);
      const metadata = generateChangeMetadata(oldText, newText, changeType, parentSection, category);
      
      // Extract sentence-level context (Layer 2)
      const oldSentence = oldText.trim() ? extractSentenceContext(oldDocText, oldText, currentIndex) : '';
      let newSentence = '';
      if (newText.trim()) {
        if (oldSentence && oldText.trim()) {
          // Reconstruct the new sentence by replacing the changed fragment
          newSentence = reconstructSentence(oldSentence, oldText, newText);
        } else {
          // For additions, extract from new text
          newSentence = extractSentenceContext(newDocText, newText, currentIndex);
        }
      }
      
      // Only add if there's meaningful content
      if (oldText.trim().length > 2 || newText.trim().length > 2) {
        changeRegions.push({
          id: `change_${regionId++}`,
          startIndex: currentIndex,
          endIndex: currentIndex + (part.value?.length || 0),
          changeType,
          significance,
          category,
          parentSection,
          oldText: oldText.trim(),
          newText: newText.trim(),
          diffParts: [part, ...(endIndex > i ? [fullDiff[endIndex]] : [])].filter(Boolean),
          descriptor: metadata.descriptor,
          changeSummary: metadata.changeSummary,
          affectedArea: metadata.affectedArea,
          changeNature: metadata.changeNature,
          suggestedAction: metadata.suggestedAction,
          oldSentence: oldSentence || oldText.trim(),
          newSentence: newSentence || newText.trim()
        });
      }
    }
    
    if (!part.added) {
      currentIndex += part.value.length;
    }
  }
  
  // Build section summary with change counts
  const allMarkers = [...new Map([...oldMarkers, ...newMarkers].map(m => [m.title, m])).values()];
  const sections = allMarkers.map(marker => {
    const changeCount = changeRegions.filter(r => r.parentSection === marker.title).length;
    return {
      id: marker.id,
      title: marker.title,
      level: marker.level,
      hasChanges: changeCount > 0,
      changeCount,
      oldIndex: oldMarkers.find(m => m.title === marker.title)?.index ?? -1,
      newIndex: newMarkers.find(m => m.title === marker.title)?.index ?? -1
    };
  });
  
  return {
    fullDiff,
    changeRegions,
    sections,
    summary: {
      totalChanges: changeRegions.length,
      wordsAdded,
      wordsRemoved,
      wordsModified: Math.min(wordsAdded, wordsRemoved),
      substantive: changeRegions.filter(r => r.significance === 'substantive').length,
      editorial: changeRegions.filter(r => r.significance === 'editorial').length,
      sectionsAffected: sectionsWithChanges.size
    },
    oldText: oldDocText,
    newText: newDocText
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

// New entry point for full-text comparison
export async function compareDocumentsFullText(oldFile: File, newFile: File): Promise<FullTextComparisonResult> {
  const [oldDoc, newDoc] = await Promise.all([
    extractDocument(oldFile),
    extractDocument(newFile)
  ]);
  return performFullTextComparison(oldDoc.rawText, newDoc.rawText);
}

// Combined comparison - returns both section-based and full-text results
export async function compareDocumentsCombined(oldFile: File, newFile: File): Promise<SimpleComparisonResult> {
  const [oldDoc, newDoc] = await Promise.all([
    extractDocument(oldFile),
    extractDocument(newFile)
  ]);
  
  const sectionResult = compareDocuments(oldDoc, newDoc);
  const fullTextResult = performFullTextComparison(oldDoc.rawText, newDoc.rawText);
  
  // Add HTML to fullTextResult for table rendering
  if (fullTextResult) {
    fullTextResult.oldHtml = oldDoc.rawHtml;
    fullTextResult.newHtml = newDoc.rawHtml;
  }
  
  return {
    ...sectionResult,
    fullTextResult
  };
}
