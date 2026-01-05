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
  
  // Find added and modified sections (in current but not in previous, or content changed)
  for (const [key, current] of currentSections.entries()) {
    const previous = previousSections.get(key);
    if (!previous) {
      // Section exists in current but not in previous = added
      addedSections.push({ sectionNumber: current.number, heading: current.heading, changeDescriptor: 'New section' });
    } else if (normalizeContent(current.content) !== normalizeContent(previous.content)) {
      // Section exists in both but content differs = updated
      const changeDescriptor = detectChangeType();
      updatedSections.push({ sectionNumber: current.number, heading: current.heading, changeDescriptor });
    }
  }
  
  // Find removed sections (in previous but not in current)
  for (const [key, previous] of previousSections.entries()) {
    if (!currentSections.has(key)) {
      removedSections.push({ sectionNumber: previous.number, heading: previous.heading });
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

/**
 * Extract sections from document text
 * Looks for patterns like "1.0 Purpose", "2.1 Scope", "3.2.1 Definitions"
 */
function extractSections(text: string): Map<string, ExtractedSection> {
  const sections = new Map<string, ExtractedSection>();
  
  // Match section patterns: number (like 1.0, 2.1, 3.2.1) followed by text
  // Supports formats: "1.0 Title", "1.0. Title", "Section 1.0 Title", "1.0: Title"
  const sectionPattern = /^(?:Section\s+)?(\d+(?:\.\d+)*\.?)\s*[:\.]?\s*([A-Z][^\n]{2,80})/gm;
  
  const matches: Array<{ number: string; heading: string; index: number }> = [];
  let match;
  
  while ((match = sectionPattern.exec(text)) !== null) {
    const number = match[1].replace(/\.$/, ''); // Remove trailing dot
    const heading = match[2].trim();
    
    // Skip if heading looks like a sentence continuation or is too generic
    if (heading.length < 3 || /^(the|and|or|but|if|is|are|was|were)\s/i.test(heading)) {
      continue;
    }
    
    matches.push({
      number,
      heading,
      index: match.index
    });
  }
  
  // Extract content between sections
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextIndex = i < matches.length - 1 ? matches[i + 1].index : text.length;
    const content = text.substring(current.index, nextIndex);
    
    sections.set(current.number, {
      number: current.number,
      heading: current.heading,
      content: content
    });
  }
  
  return sections;
}

/**
 * Normalize content for comparison
 * Removes extra whitespace and converts to lowercase
 */
function normalizeContent(content: string): string {
  return content
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
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
