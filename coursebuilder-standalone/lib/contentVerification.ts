/**
 * Content Verification Module
 * Verifies that all source document content is present in the generated SCORM output
 */

export interface VerificationResult {
  sectionsFound: number;
  sectionsTotal: number;
  sourceCharCount: number;
  outputCharCount: number;
  contentPercentage: number;
  keyTermsFound: number;
  keyTermsTotal: number;
  missingContent: MissingContentItem[];
  missingSections: string[];
  isComplete: boolean;
}

export interface MissingContentItem {
  text: string;
  sourceSection: string;
  type: 'section' | 'key_term' | 'phrase';
}

interface Module {
  id: string;
  title: string;
  content: Array<{
    type: string;
    heading: string;
    body: string;
  }>;
}

/**
 * Extract section headings from source document text
 * Matches numbered patterns, "Section X:" format, and common document section names
 */
function extractSectionHeadings(text: string): string[] {
  const headings: string[] = [];
  
  // Pattern 1: Numbered sections (1.0, 2.1, 5.1.2, etc.)
  const numberedPattern = /^[\s]*(\d+(?:\.\d+)*)\s+([A-Z][^\n]{2,60})/gm;
  let match;
  while ((match = numberedPattern.exec(text)) !== null) {
    const heading = `${match[1]} ${match[2].trim()}`;
    if (!headings.includes(heading)) {
      headings.push(heading);
    }
  }
  
  // Pattern 2: "Section X:" format
  const sectionPattern = /Section\s+(\d+)[\s:]+([^\n]{2,60})/gi;
  while ((match = sectionPattern.exec(text)) !== null) {
    const heading = `Section ${match[1]}: ${match[2].trim()}`;
    if (!headings.includes(heading)) {
      headings.push(heading);
    }
  }
  
  // Pattern 3: Common document section names (Purpose, Scope, Procedures, etc.)
  const commonSections = [
    'Purpose', 'Scope', 'Objective', 'Objectives', 'Background',
    'Definitions', 'Key Terms', 'Glossary', 'Terminology',
    'Responsibilities', 'Roles and Responsibilities', 'Applicable Groups',
    'Procedures', 'Process', 'Workflow', 'Steps',
    'Requirements', 'Specifications', 'Criteria',
    'References', 'Related Documents', 'Attachments', 'Appendix', 'Appendices',
    'Revision History', 'Document History', 'Change History',
    'Policies', 'Policy', 'Guidelines', 'Guidance',
    'Introduction', 'Overview', 'Summary', 'Conclusion',
    'Training', 'Compliance', 'Quality', 'Safety',
    'Initiation', 'Execution', 'Closure', 'Activities',
    'Non-Interventional Clinical Activity', 'Clinical Activities',
    'Pharmacovigilance', 'Adverse Events', 'Safety Reporting'
  ];
  
  for (const section of commonSections) {
    // Match section name at start of line, possibly with colon
    const escapedSection = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sectionRegex = new RegExp(`(?:^|\\n)\\s*(${escapedSection}s?)\\s*(?::|\\n|$)`, 'gim');
    while ((match = sectionRegex.exec(text)) !== null) {
      const heading = match[1].trim();
      // Avoid duplicates (case-insensitive)
      if (!headings.some(h => h.toLowerCase() === heading.toLowerCase())) {
        headings.push(heading);
      }
    }
  }
  
  return headings;
}

/**
 * Extract key terms and phrases that should appear in output
 * Focus on: numbers, form references, technical terms, specific values
 */
function extractKeyTerms(text: string): string[] {
  const terms: Set<string> = new Set();
  
  // Form/document references (Form QA-123, Document ABC-001, etc.)
  const formPattern = /(?:Form|Document|SOP|WI|Procedure)\s+[A-Z0-9]+-?\d+/gi;
  let match;
  while ((match = formPattern.exec(text)) !== null) {
    terms.add(match[0]);
  }
  
  // Specific time periods (30 days, 24 hours, 5 years, etc.)
  const timePattern = /\d+\s+(?:days?|hours?|minutes?|years?|months?|weeks?)/gi;
  while ((match = timePattern.exec(text)) !== null) {
    terms.add(match[0].toLowerCase());
  }
  
  // Temperature values (25°C, 37 degrees, etc.)
  const tempPattern = /\d+\s*(?:°[CF]|degrees?\s*[CF]?)/gi;
  while ((match = tempPattern.exec(text)) !== null) {
    terms.add(match[0]);
  }
  
  // Percentage values
  const percentPattern = /\d+(?:\.\d+)?\s*%/g;
  while ((match = percentPattern.exec(text)) !== null) {
    terms.add(match[0]);
  }
  
  // ISO/regulatory references
  const isoPattern = /ISO\s+\d+(?::\d+)?/gi;
  while ((match = isoPattern.exec(text)) !== null) {
    terms.add(match[0]);
  }
  
  // CFR references (21 CFR Part 11, etc.)
  const cfrPattern = /\d+\s*CFR\s*(?:Part\s*)?\d+/gi;
  while ((match = cfrPattern.exec(text)) !== null) {
    terms.add(match[0]);
  }
  
  // GxP references
  const gxpPattern = /\b(?:GMP|GLP|GCP|GDP|GVP)\b/g;
  while ((match = gxpPattern.exec(text)) !== null) {
    terms.add(match[0]);
  }
  
  return Array.from(terms);
}

/**
 * Normalize text for comparison (remove extra whitespace, normalize characters)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[•\-\*]/g, '-')
    .trim();
}

/**
 * Get all text content from generated modules
 * Robust extraction with defensive checks
 */
function getModulesText(modules: Module[]): string {
  if (!modules || !Array.isArray(modules)) {
    console.warn('getModulesText: modules is not an array', modules);
    return '';
  }
  
  let text = '';
  for (const module of modules) {
    if (!module) continue;
    
    // Add module title
    text += (module.title || '') + ' ';
    
    // Add module content
    if (Array.isArray(module.content)) {
      for (const section of module.content) {
        if (!section) continue;
        text += (section.heading || '') + ' ';
        text += (section.body || '') + ' ';
      }
    }
    
    // Also check for alternative content structures
    // Some modules might have 'sections' instead of 'content'
    const anyModule = module as any;
    if (Array.isArray(anyModule.sections)) {
      for (const section of anyModule.sections) {
        if (!section) continue;
        text += (section.heading || section.title || '') + ' ';
        text += (section.body || section.content || section.text || '') + ' ';
      }
    }
    
    // Check for direct body/text on module
    if (anyModule.body) text += anyModule.body + ' ';
    if (anyModule.text) text += anyModule.text + ' ';
    if (anyModule.description) text += anyModule.description + ' ';
  }
  
  return text;
}

/**
 * Find the section in source where a term appears
 */
function findSourceSection(text: string, term: string): string {
  const normalizedText = text.toLowerCase();
  const normalizedTerm = term.toLowerCase();
  const index = normalizedText.indexOf(normalizedTerm);
  
  if (index === -1) return 'Unknown section';
  
  // Common section names to look for
  const commonSectionNames = /^(Purpose|Scope|Objectives?|Background|Definitions|Key Terms|Glossary|Responsibilities|Applicable Groups|Procedures?|Process|Requirements|References|Related Documents|Attachments|Revision History|Policies?|Guidelines|Introduction|Overview|Summary|Conclusion|Training|Compliance|Quality|Safety|Initiation|Execution|Closure|Activities|Pharmacovigilance|Clinical Activities)\s*:?$/i;
  
  // Look backwards for a section heading
  const textBefore = text.substring(0, index);
  const lines = textBefore.split('\n');
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    // Check if line looks like a section heading (numbered or common name)
    if (/^\d+(?:\.\d+)*\s+[A-Z]/.test(line) || /^Section\s+\d+/i.test(line) || commonSectionNames.test(line)) {
      return line.substring(0, 60) + (line.length > 60 ? '...' : '');
    }
  }
  
  return 'Document beginning';
}

/**
 * Filter out metadata patterns from source text
 * (page headers, footers, version stamps that appear on every page)
 */
function filterMetadata(text: string): string {
  return text
    // Remove "Page X of Y" patterns
    .replace(/Page\s+\d+\s+of\s+\d+/gi, '')
    // Remove repeated document headers (company name, doc number on every page)
    .replace(/^.*(?:Confidential|Internal Use Only|Proprietary).*$/gim, '')
    // Remove version/revision stamps
    .replace(/(?:Version|Rev(?:ision)?|Ver\.?)\s*:?\s*\d+(?:\.\d+)*/gi, '')
    // Remove effective date stamps
    .replace(/Effective\s+Date\s*:?\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/gi, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Main verification function
 * Compares source document text against generated modules
 */
export function verifyContentCompleteness(
  sourceText: string,
  modules: Module[]
): VerificationResult {
  // Filter metadata from source
  const filteredSource = filterMetadata(sourceText);
  const normalizedSource = normalizeText(filteredSource);
  
  // Get output text from modules
  const outputText = getModulesText(modules);
  const normalizedOutput = normalizeText(outputText);
  
  // Extract and verify section headings
  const sourceHeadings = extractSectionHeadings(sourceText);
  const missingSections: string[] = [];
  
  for (const heading of sourceHeadings) {
    const normalizedHeading = normalizeText(heading);
    // Check if heading number and key words appear in output
    const headingParts = normalizedHeading.split(' ').filter(p => p.length > 2);
    const foundParts = headingParts.filter(part => normalizedOutput.includes(part));
    
    // If less than 50% of heading parts found, consider it missing
    if (foundParts.length < headingParts.length * 0.5) {
      missingSections.push(heading);
    }
  }
  
  // Extract and verify key terms
  const keyTerms = extractKeyTerms(sourceText);
  const missingTerms: string[] = [];
  
  for (const term of keyTerms) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedOutput.includes(normalizedTerm)) {
      missingTerms.push(term);
    }
  }
  
  // Build missing content list
  const missingContent: MissingContentItem[] = [];
  
  for (const section of missingSections) {
    missingContent.push({
      text: section,
      sourceSection: 'Section heading',
      type: 'section'
    });
  }
  
  for (const term of missingTerms) {
    missingContent.push({
      text: term,
      sourceSection: findSourceSection(sourceText, term),
      type: 'key_term'
    });
  }
  
  // Calculate metrics
  const sourceCharCount = filteredSource.length;
  const outputCharCount = outputText.length;
  const contentPercentage = sourceCharCount > 0 
    ? Math.round((outputCharCount / sourceCharCount) * 100) 
    : 0;
  
  const sectionsFound = sourceHeadings.length - missingSections.length;
  const keyTermsFound = keyTerms.length - missingTerms.length;
  
  // Determine if content is complete (no missing sections, >90% key terms)
  const isComplete = missingSections.length === 0 && 
    (keyTerms.length === 0 || keyTermsFound / keyTerms.length >= 0.9);
  
  return {
    sectionsFound,
    sectionsTotal: sourceHeadings.length,
    sourceCharCount,
    outputCharCount,
    contentPercentage,
    keyTermsFound,
    keyTermsTotal: keyTerms.length,
    missingContent,
    missingSections,
    isComplete
  };
}

/**
 * Generate a human-readable verification report
 */
export function generateVerificationReport(result: VerificationResult): string {
  const lines: string[] = [];
  
  lines.push('📊 Content Verification Report\n');
  
  // Section coverage
  const sectionStatus = result.sectionsFound === result.sectionsTotal ? '✅' : '⚠️';
  lines.push(`${sectionStatus} Sections: ${result.sectionsFound}/${result.sectionsTotal} found`);
  
  // Content volume
  const volumeStatus = result.contentPercentage >= 90 ? '✅' : '⚠️';
  lines.push(`${volumeStatus} Content Volume: ${result.outputCharCount.toLocaleString()} / ${result.sourceCharCount.toLocaleString()} chars (${result.contentPercentage}%)`);
  
  // Key terms
  if (result.keyTermsTotal > 0) {
    const termsStatus = result.keyTermsFound === result.keyTermsTotal ? '✅' : '⚠️';
    lines.push(`${termsStatus} Key Terms: ${result.keyTermsFound}/${result.keyTermsTotal} detected`);
  }
  
  // Missing content
  if (result.missingContent.length > 0) {
    lines.push('\n⚠️ Potentially Missing Content (please verify):');
    lines.push('─'.repeat(50));
    
    for (const item of result.missingContent.slice(0, 10)) { // Limit to 10 items
      lines.push(`• "${item.text}"`);
      lines.push(`  (Found in: ${item.sourceSection})`);
    }
    
    if (result.missingContent.length > 10) {
      lines.push(`\n... and ${result.missingContent.length - 10} more items`);
    }
  } else {
    lines.push('\n✅ No missing content detected');
  }
  
  return lines.join('\n');
}
