/**
 * AI-Powered Document Comparison with Verification
 * 
 * Uses Claude AI to identify ALL changes between two documents,
 * then verifies each claim against the actual source text to prevent hallucination.
 */

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-proxy`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ============================================
// TYPES
// ============================================

export interface DocumentMetadata {
  version: string;
  effectiveDate: string;
  reviewFrequency: string;
  documentOwner: string;
  sopNumber: string;
  title: string;
}

export interface AIDetectedChange {
  id: string;
  section: string;
  sectionNumber: string;
  changeType: 'added' | 'removed' | 'modified';
  category: 'document_control' | 'policy' | 'procedure' | 'access_control' | 'timing' | 'threshold' | 'responsibility' | 'other';
  significance: 'substantive' | 'editorial';
  description: string;
  oldValue: string;
  newValue: string;
  oldContext: string; // Surrounding text for verification
  newContext: string;
  impact: string;
  // Verification fields (populated after verification)
  verified?: boolean;
  verificationMethod?: 'exact_match' | 'fuzzy_match' | 'context_match' | 'unverified';
  confidence?: number;
}

export interface AIComparisonResult {
  oldMetadata: DocumentMetadata;
  newMetadata: DocumentMetadata;
  metadataChanges: AIDetectedChange[];
  contentChanges: AIDetectedChange[];
  summary: {
    totalChanges: number;
    substantive: number;
    editorial: number;
    verified: number;
    unverified: number;
    sectionsAffected: string[];
  };
  aiAnalysis: string;
}

// ============================================
// AI API CALL
// ============================================

async function callClaudeForComparison(oldText: string, newText: string): Promise<any> {
  const prompt = `You are a document comparison specialist for regulated environments. Analyze these two versions of an SOP (Standard Operating Procedure) and identify EVERY change between them.

## OLD VERSION:
${oldText.substring(0, 30000)}

## NEW VERSION:
${newText.substring(0, 30000)}

## INSTRUCTIONS:
1. Compare the documents thoroughly - do NOT miss any changes
2. Pay special attention to:
   - Document control metadata (version, effective date, review frequency, document owner)
   - Numerical values (quantities, percentages, time periods, character counts)
   - Table content (access levels, permissions, roles)
   - Added or removed bullet points
   - Changed requirements or procedures

3. For EACH change found, provide:
   - The exact section where it occurs
   - The EXACT old value (copy directly from old version)
   - The EXACT new value (copy directly from new version)
   - Classification

## CRITICAL — DO NOT REPORT THESE AS CHANGES:
- Whitespace or spacing differences (e.g., "enviro nments" vs "environments") — these are PDF/Word extraction artifacts, NOT real document changes
- Line break differences or paragraph reformatting where the actual words are identical
- Differences that are ONLY in spacing, hyphenation, or character encoding between old and new values
- If the only difference between old and new values is whitespace or word-splitting, skip it entirely — it is NOT a real change

## IMPORTANT TONE GUIDELINES:
- Use neutral, factual language - describe WHAT changed, not WHY or whether it's better/worse
- Avoid value judgments like "improved", "strengthened", "enhanced", "more secure"
- Do NOT interpret intent or make claims about benefits
- Simply state the change as defined in the revised policy
- Example: Instead of "Strengthens security by requiring longer passwords" write "Updates password minimum length requirement from 12 to 14 characters"
- Example: Instead of "Improves user experience while maintaining security" write "Updates password change interval as defined in revised policy"

## RESPOND WITH VALID JSON ONLY:
{
  "oldMetadata": {
    "version": "extracted version number",
    "effectiveDate": "extracted date",
    "reviewFrequency": "extracted frequency",
    "documentOwner": "extracted owner",
    "sopNumber": "extracted SOP number",
    "title": "document title"
  },
  "newMetadata": {
    "version": "extracted version number",
    "effectiveDate": "extracted date",
    "reviewFrequency": "extracted frequency",
    "documentOwner": "extracted owner",
    "sopNumber": "extracted SOP number",
    "title": "document title"
  },
  "changes": [
    {
      "section": "Section name or number",
      "sectionNumber": "e.g. 5.2",
      "changeType": "modified|added|removed",
      "category": "document_control|policy|procedure|access_control|timing|threshold|responsibility|other",
      "significance": "substantive|editorial",
      "description": "Neutral description of what changed (e.g., 'Password minimum length updated from 12 to 14 characters')",
      "oldValue": "EXACT text from old version (or empty if added)",
      "newValue": "EXACT text from new version (or empty if removed)",
      "oldContext": "Surrounding sentence or phrase from old version",
      "newContext": "Surrounding sentence or phrase from new version",
      "impact": "Factual statement of what the change affects (e.g., 'Revises password policy requirements' NOT 'Improves security')"
    }
  ],
  "summary": "Factual summary of document changes without value judgments"
}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      operation: 'compare-documents',
      prompt,
      maxTokens: 8000
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error.message || 'API request failed');
  }

  let responseText = result.content?.[0]?.text || '';

  if (!responseText) {
    throw new Error('Empty response from AI. Check that ANTHROPIC_API_KEY is configured.');
  }

  // Clean up JSON
  responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Failed to parse AI response:', responseText.substring(0, 500));
    throw new Error('AI returned invalid JSON format');
  }
}

// ============================================
// VERIFICATION LOGIC
// ============================================

/**
 * Normalize text for comparison - handles whitespace, case, special chars
 */
function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\n\r\t]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Check if a value exists in the document text
 */
function findInDocument(searchValue: string, documentText: string): {
  found: boolean;
  method: 'exact_match' | 'fuzzy_match' | 'context_match' | 'unverified';
  confidence: number;
} {
  if (!searchValue || searchValue.trim().length < 2) {
    return { found: true, method: 'exact_match', confidence: 1.0 }; // Empty values are trivially verified
  }

  const normalizedSearch = normalizeForSearch(searchValue);
  const normalizedDoc = normalizeForSearch(documentText);

  // Method 1: Exact match
  if (normalizedDoc.includes(normalizedSearch)) {
    return { found: true, method: 'exact_match', confidence: 1.0 };
  }

  // Method 2: Number extraction match (for "12 characters" -> find "12" near "character")
  const numbers = searchValue.match(/\d+/g);
  if (numbers) {
    for (const num of numbers) {
      // Check if this number exists in the document
      const numPattern = new RegExp(`\\b${num}\\b`);
      if (numPattern.test(documentText)) {
        // Check if related context words are nearby
        const contextWords = searchValue.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !/^\d+$/.test(w));
        const foundNearby = contextWords.some(word => {
          const wordPattern = new RegExp(`${num}[^.]*${word}|${word}[^.]*${num}`, 'i');
          return wordPattern.test(documentText);
        });
        if (foundNearby) {
          return { found: true, method: 'fuzzy_match', confidence: 0.9 };
        }
      }
    }
  }

  // Method 3: Key phrase match (check if main words exist)
  const keyWords = normalizedSearch.split(' ').filter(w => w.length > 3);
  if (keyWords.length > 0) {
    const matchedWords = keyWords.filter(w => normalizedDoc.includes(w));
    const matchRatio = matchedWords.length / keyWords.length;
    if (matchRatio >= 0.6) {
      return { found: true, method: 'context_match', confidence: matchRatio };
    }
  }

  // Method 4: Levenshtein distance for short values (like "Limited" vs "No")
  if (searchValue.length < 20) {
    // For short values, check if they appear anywhere
    const words = documentText.split(/\s+/);
    const searchWords = searchValue.trim().split(/\s+/);
    for (const searchWord of searchWords) {
      if (words.some(w => w.toLowerCase() === searchWord.toLowerCase())) {
        return { found: true, method: 'fuzzy_match', confidence: 0.8 };
      }
    }
  }

  return { found: false, method: 'unverified', confidence: 0 };
}

/**
 * Verify a single change claim against source documents
 */
function verifyChange(
  change: AIDetectedChange,
  oldDocText: string,
  newDocText: string
): AIDetectedChange {
  const verified = { ...change };

  // For 'added' changes, only need to verify in new doc
  if (change.changeType === 'added') {
    const newCheck = findInDocument(change.newValue, newDocText);
    verified.verified = newCheck.found;
    verified.verificationMethod = newCheck.method;
    verified.confidence = newCheck.confidence;
    return verified;
  }

  // For 'removed' changes, only need to verify in old doc
  if (change.changeType === 'removed') {
    const oldCheck = findInDocument(change.oldValue, oldDocText);
    verified.verified = oldCheck.found;
    verified.verificationMethod = oldCheck.method;
    verified.confidence = oldCheck.confidence;
    return verified;
  }

  // For 'modified' changes, verify both old and new values
  const oldCheck = findInDocument(change.oldValue, oldDocText);
  const newCheck = findInDocument(change.newValue, newDocText);

  verified.verified = oldCheck.found && newCheck.found;
  verified.verificationMethod = oldCheck.found && newCheck.found 
    ? (oldCheck.method === 'exact_match' && newCheck.method === 'exact_match' ? 'exact_match' : 'fuzzy_match')
    : 'unverified';
  verified.confidence = (oldCheck.confidence + newCheck.confidence) / 2;

  return verified;
}

// ============================================
// MAIN COMPARISON FUNCTION
// ============================================

export async function compareDocumentsWithAI(
  oldDocText: string,
  newDocText: string
): Promise<AIComparisonResult> {
  console.log('Starting AI-powered document comparison...');
  console.log(`Old doc: ${oldDocText.length} chars, New doc: ${newDocText.length} chars`);

  // Step 1: Get AI analysis
  const aiResult = await callClaudeForComparison(oldDocText, newDocText);
  console.log('AI analysis complete, verifying changes...');

  // Step 2: Process and verify each change
  const allChanges: AIDetectedChange[] = (aiResult.changes || []).map((change: any, idx: number) => ({
    id: `change_${idx}`,
    section: change.section || 'Unknown',
    sectionNumber: change.sectionNumber || '',
    changeType: change.changeType || 'modified',
    category: change.category || 'other',
    significance: change.significance || 'substantive',
    description: change.description || '',
    oldValue: change.oldValue || '',
    newValue: change.newValue || '',
    oldContext: change.oldContext || '',
    newContext: change.newContext || '',
    impact: change.impact || ''
  }));

  // Step 3: Verify each change against source documents
  const rawVerified = allChanges.map(change => 
    verifyChange(change, oldDocText, newDocText)
  );

  // Step 3b: Filter out whitespace-only changes (PDF/Word extraction artifacts)
  const verifiedChanges = rawVerified.filter(change => {
    const oldNorm = (change.oldValue || '').replace(/[\s\-]+/g, '').toLowerCase();
    const newNorm = (change.newValue || '').replace(/[\s\-]+/g, '').toLowerCase();
    if (oldNorm === newNorm && change.oldValue && change.newValue) {
      console.log(`Filtered whitespace-only change: "${change.oldValue}" → "${change.newValue}"`);
      return false;
    }
    return true;
  });

  // Step 4: Separate metadata changes from content changes
  const metadataChanges = verifiedChanges.filter(c => c.category === 'document_control');
  const contentChanges = verifiedChanges.filter(c => c.category !== 'document_control');

  // Step 5: Calculate summary stats
  const verifiedCount = verifiedChanges.filter(c => c.verified).length;
  const unverifiedCount = verifiedChanges.filter(c => !c.verified).length;
  const sectionsAffected = [...new Set(verifiedChanges.map(c => c.section))];

  console.log(`Verification complete: ${verifiedCount} verified, ${unverifiedCount} unverified`);

  return {
    oldMetadata: aiResult.oldMetadata || {
      version: '',
      effectiveDate: '',
      reviewFrequency: '',
      documentOwner: '',
      sopNumber: '',
      title: ''
    },
    newMetadata: aiResult.newMetadata || {
      version: '',
      effectiveDate: '',
      reviewFrequency: '',
      documentOwner: '',
      sopNumber: '',
      title: ''
    },
    metadataChanges,
    contentChanges,
    summary: {
      totalChanges: verifiedChanges.length,
      substantive: verifiedChanges.filter(c => c.significance === 'substantive').length,
      editorial: verifiedChanges.filter(c => c.significance === 'editorial').length,
      verified: verifiedCount,
      unverified: unverifiedCount,
      sectionsAffected
    },
    aiAnalysis: aiResult.summary || ''
  };
}

// ============================================
// FILE EXTRACTION HELPER
// ============================================

import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'docx' || extension === 'doc') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } else if (extension === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      text += pageText + '\n\n';
    }
    return text;
  } else {
    throw new Error('Unsupported file format. Please upload Word (.docx) or PDF files.');
  }
}

// ============================================
// MAIN ENTRY POINT
// ============================================

export async function compareDocumentFilesWithAI(
  oldFile: File,
  newFile: File
): Promise<AIComparisonResult> {
  const [oldText, newText] = await Promise.all([
    extractTextFromFile(oldFile),
    extractTextFromFile(newFile)
  ]);
  
  return compareDocumentsWithAI(oldText, newText);
}
