/**
 * Document Comparison Utility
 * Compares two document versions and produces a structural change summary.
 * 
 * Rules (per requirements):
 * - Allowed: Identify sections added, removed, modified using section numbers and headings only
 * - Output: Short bullet list with neutral wording
 * - Disallowed: No interpretation, no impact scoring, no recommendations, no "training required" logic, no risk language
 */

export interface SectionInfo {
  sectionNumber: string;
  heading: string;
  changeDescriptor?: string; // e.g., "Procedure steps updated", "Table structure updated"
}

export interface ChangeSummary {
  updatedSections: SectionInfo[];
  addedSections: SectionInfo[];
  removedSections: SectionInfo[];
  hasChanges: boolean;
}

interface ExtractedSection {
  number: string;
  heading: string;
  content: string;
}

/**
 * Compare two document versions and return a structural change summary
 * @param currentText - Text from the current (new) document version
 * @param previousText - Text from the previous (old) document version
 * @returns ChangeSummary with lists of updated, added, and removed sections
 */
export function compareDocumentVersions(
  currentText: string,
  previousText: string
): ChangeSummary {
  const currentSections = extractSections(currentText);
  const previousSections = extractSections(previousText);
  
  const updatedSections: SectionInfo[] = [];
  const addedSections: SectionInfo[] = [];
  const removedSections: SectionInfo[] = [];
  const matchedPreviousKeys = new Set<string>();
  
  // Find added and modified sections
  for (const [key, current] of currentSections.entries()) {
    let previous = previousSections.get(key);
    let matchedKey = key;
    
    // If no exact key match, try content-based matching for potential section number shifts
    if (!previous) {
      const currentNorm = normalizeContent(current.content);
      for (const [prevKey, prevSection] of previousSections.entries()) {
        if (matchedPreviousKeys.has(prevKey)) continue;
        const prevNorm = normalizeContent(prevSection.content);
        // If content is >80% similar, consider it the same section (moved/renumbered)
        if (currentNorm.length > 50 && prevNorm.length > 50) {
          const similarity = calculateSimilarity(currentNorm, prevNorm);
          if (similarity > 0.8) {
            previous = prevSection;
            matchedKey = prevKey;
            break;
          }
        }
      }
    }
    
    if (!previous) {
      // Section exists in current but not in previous = added
      addedSections.push({ sectionNumber: current.number || '–', heading: current.heading, changeDescriptor: 'New section' });
    } else {
      matchedPreviousKeys.add(matchedKey);
      const currentNorm = normalizeContent(current.content);
      const previousNorm = normalizeContent(previous.content);
      
      if (currentNorm !== previousNorm) {
        // Section exists in both but content differs = updated
        const changeDescriptor = detectChangeType();
        updatedSections.push({ sectionNumber: current.number || '–', heading: current.heading, changeDescriptor });
      }
    }
  }
  
  // Find removed sections (in previous but not matched to current)
  for (const [key, previous] of previousSections.entries()) {
    if (!matchedPreviousKeys.has(key)) {
      removedSections.push({ sectionNumber: previous.number || '–', heading: previous.heading });
    }
  }
  
  // Sort by section number
  const sortBySectionNumber = (a: SectionInfo, b: SectionInfo) => {
    const aParts = a.sectionNumber.split('.').map(Number);
    const bParts = b.sectionNumber.split('.').map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;
      if (aVal !== bVal) return aVal - bVal;
    }
    return 0;
  };
  
  updatedSections.sort(sortBySectionNumber);
  addedSections.sort(sortBySectionNumber);
  removedSections.sort(sortBySectionNumber);
  
  return {
    updatedSections,
    addedSections,
    removedSections,
    hasChanges: updatedSections.length > 0 || addedSections.length > 0 || removedSections.length > 0
  };
}

// Standard SOP keyword headings to detect unnumbered sections
const KEYWORD_HEADINGS = [
  'purpose', 'scope', 'procedure', 'responsibilities', 'references', 'definitions',
  'materials', 'safety', 'quality', 'documentation', 'objective',
  'background', 'introduction', 'summary', 'glossary', 'revision history',
  'training requirements', 'related documents', 'attachments', 'forms'
];

interface ExtractedSectionWithKey extends ExtractedSection {
  matchKey: string;
}

/**
 * Extract sections from document text
 * Uses multiple strategies: numbered sections, keyword headings, appendices
 */
function extractSections(text: string): Map<string, ExtractedSectionWithKey> {
  const sections = new Map<string, ExtractedSectionWithKey>();
  const matches: Array<{ number: string; heading: string; index: number; matchKey: string }> = [];
  let match;
  
  // Strategy 1: Numbered sections (1.0, 2.1, 3.2.1, etc.)
  const numberedPattern = /^(?:Section\s+)?(\d+(?:\.\d+)*\.?)\s*[:\.]?\s*([A-Z][^\n]{2,80})/gm;
  while ((match = numberedPattern.exec(text)) !== null) {
    const number = match[1].replace(/\.$/, '');
    const heading = match[2].trim();
    if (heading.length < 3 || /^(the|and|or|but|if|is|are|was|were)\s/i.test(heading)) continue;
    
    // Use normalized heading as key (handles section number shifts)
    const headingKey = heading.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);
    matches.push({
      number,
      heading,
      index: match.index,
      matchKey: `num_${headingKey}`
    });
  }
  
  // Strategy 2: Keyword headings (Purpose, Scope, etc.) - only if not already detected
  for (const keyword of KEYWORD_HEADINGS) {
    const keywordPattern = new RegExp(`^(${keyword})[:\\s]*(.{0,50})$`, 'gim');
    while ((match = keywordPattern.exec(text)) !== null) {
      const heading = match[1].trim();
      
      // Avoid duplicates at same position
      if (!matches.some(m => Math.abs(m.index - match!.index) < 10)) {
        matches.push({
          number: '',
          heading: heading,
          index: match.index,
          matchKey: `kw_${keyword.toLowerCase()}`
        });
      }
    }
  }
  
  // Strategy 3: Appendices
  const appendixPattern = /^(Appendix\s+[A-Z0-9]+)[:\s\-–]*([^\n]{0,50})/gim;
  while ((match = appendixPattern.exec(text)) !== null) {
    const appendixId = match[1].trim();
    const title = match[2]?.trim() || '';
    const fullTitle = title ? `${appendixId} – ${title}` : appendixId;
    
    if (!matches.some(m => Math.abs(m.index - match!.index) < 10)) {
      matches.push({
        number: appendixId,
        heading: fullTitle,
        index: match.index,
        matchKey: `app_${appendixId.toLowerCase().replace(/\s+/g, '')}`
      });
    }
  }
  
  // Sort by position in document
  matches.sort((a, b) => a.index - b.index);
  
  // Extract content between sections
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextIndex = i < matches.length - 1 ? matches[i + 1].index : text.length;
    const content = text.substring(current.index, nextIndex);
    
    sections.set(current.matchKey, {
      number: current.number,
      heading: current.heading,
      content: content,
      matchKey: current.matchKey
    });
  }
  
  return sections;
}

/**
 * Normalize content for comparison
 * Aggressive normalization to avoid false positives from formatting differences
 */
function normalizeContent(content: string): string {
  return content
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');  // Keep only letters and numbers
}

/**
 * Calculate similarity between two normalized strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  const minLen = Math.min(len1, len2);
  const maxLen = Math.max(len1, len2);
  
  let matches = 0;
  for (let i = 0; i < minLen; i++) {
    if (str1[i] === str2[i]) matches++;
  }
  
  return matches / maxLen;
}

/**
 * Returns a simple, accurate descriptor for updated sections
 * Using generic descriptor to avoid inaccurate detection
 */
function detectChangeType(): string {
  return 'Content updated';
}

/**
 * Format the change summary as HTML for display
 */
export function formatChangeSummaryHTML(summary: ChangeSummary): string {
  if (!summary.hasChanges) {
    return '<p>No structural changes detected between document versions.</p>';
  }
  
  let html = '';
  
  if (summary.updatedSections.length > 0) {
    html += '<h4>Updated Sections:</h4><ul>';
    summary.updatedSections.forEach(s => {
      html += `<li>Section ${s.sectionNumber} – ${escapeHtml(s.heading)}</li>`;
    });
    html += '</ul>';
  }
  
  if (summary.addedSections.length > 0) {
    html += '<h4>Added Sections:</h4><ul>';
    summary.addedSections.forEach(s => {
      html += `<li>Section ${s.sectionNumber} – ${escapeHtml(s.heading)}</li>`;
    });
    html += '</ul>';
  }
  
  if (summary.removedSections.length > 0) {
    html += '<h4>Removed Sections:</h4><ul>';
    summary.removedSections.forEach(s => {
      html += `<li>Section ${s.sectionNumber} – ${escapeHtml(s.heading)}</li>`;
    });
    html += '</ul>';
  }
  
  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
