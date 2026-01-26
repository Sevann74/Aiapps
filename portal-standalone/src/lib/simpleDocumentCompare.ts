import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import * as Diff from 'diff';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ============================================
// TYPES
// ============================================

export interface SimpleChange {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  lineNumber: number;
  oldText: string;
  newText: string;
  diffParts?: Diff.Change[];
}

export interface SimpleComparisonResult {
  changes: SimpleChange[];
  summary: {
    totalChanges: number;
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
  oldText: string;
  newText: string;
}

export interface ExtractedText {
  text: string;
  paragraphs: string[];
  metadata: {
    title: string;
    version: string;
  };
}

// ============================================
// EXTRACTION
// ============================================

export async function extractText(file: File): Promise<ExtractedText> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  let text = '';
  
  if (extension === 'docx' || extension === 'doc') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value;
  } else if (extension === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      text += pageText + '\n\n';
    }
  } else {
    throw new Error('Unsupported file format. Please upload Word (.docx) or PDF files.');
  }
  
  // Split into paragraphs (non-empty lines)
  const paragraphs = text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  // Extract metadata from filename
  const versionMatch = file.name.match(/v?(\d+\.?\d*)/i);
  const version = versionMatch ? versionMatch[1] : '1.0';
  const title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
  
  return {
    text,
    paragraphs,
    metadata: { title, version }
  };
}

// ============================================
// SIMPLE COMPARISON
// ============================================

export function compareTexts(oldDoc: ExtractedText, newDoc: ExtractedText): SimpleComparisonResult {
  const changes: SimpleChange[] = [];
  
  const oldParagraphs = oldDoc.paragraphs;
  const newParagraphs = newDoc.paragraphs;
  
  // Use diff library to compare paragraph arrays
  const diff = Diff.diffArrays(oldParagraphs, newParagraphs);
  
  let lineNumber = 0;
  let oldIndex = 0;
  let newIndex = 0;
  
  for (const part of diff) {
    if (part.added) {
      // New content added
      for (const value of part.value) {
        lineNumber++;
        changes.push({
          type: 'added',
          lineNumber,
          oldText: '',
          newText: value
        });
        newIndex++;
      }
    } else if (part.removed) {
      // Content removed
      for (const value of part.value) {
        lineNumber++;
        changes.push({
          type: 'removed',
          lineNumber,
          oldText: value,
          newText: ''
        });
        oldIndex++;
      }
    } else {
      // Unchanged - but check for word-level changes
      for (const value of part.value) {
        lineNumber++;
        const oldValue = oldParagraphs[oldIndex] || '';
        const newValue = newParagraphs[newIndex] || '';
        
        // Check if there are word-level differences
        if (oldValue !== newValue) {
          const wordDiff = Diff.diffWords(oldValue, newValue);
          const hasChanges = wordDiff.some(d => d.added || d.removed);
          
          if (hasChanges) {
            changes.push({
              type: 'modified',
              lineNumber,
              oldText: oldValue,
              newText: newValue,
              diffParts: wordDiff
            });
          }
        }
        oldIndex++;
        newIndex++;
      }
    }
  }
  
  // Also do a line-by-line comparison to catch modifications
  const maxLen = Math.max(oldParagraphs.length, newParagraphs.length);
  const lineChanges: SimpleChange[] = [];
  
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldParagraphs[i] || '';
    const newLine = newParagraphs[i] || '';
    
    if (oldLine === newLine) {
      // Unchanged
      continue;
    } else if (!oldLine && newLine) {
      // Added
      lineChanges.push({
        type: 'added',
        lineNumber: i + 1,
        oldText: '',
        newText: newLine
      });
    } else if (oldLine && !newLine) {
      // Removed
      lineChanges.push({
        type: 'removed',
        lineNumber: i + 1,
        oldText: oldLine,
        newText: ''
      });
    } else {
      // Modified - get word-level diff
      const wordDiff = Diff.diffWords(oldLine, newLine);
      lineChanges.push({
        type: 'modified',
        lineNumber: i + 1,
        oldText: oldLine,
        newText: newLine,
        diffParts: wordDiff
      });
    }
  }
  
  // Use line-by-line comparison if it found more changes
  const finalChanges = lineChanges.length > changes.filter(c => c.type !== 'unchanged').length 
    ? lineChanges 
    : changes.filter(c => c.type !== 'unchanged');
  
  // Calculate summary
  const summary = {
    totalChanges: finalChanges.length,
    added: finalChanges.filter(c => c.type === 'added').length,
    removed: finalChanges.filter(c => c.type === 'removed').length,
    modified: finalChanges.filter(c => c.type === 'modified').length,
    unchanged: Math.max(oldParagraphs.length, newParagraphs.length) - finalChanges.length
  };
  
  return {
    changes: finalChanges,
    summary,
    oldText: oldDoc.text,
    newText: newDoc.text
  };
}

// ============================================
// FULL DOCUMENT COMPARISON (entry point)
// ============================================

export async function compareDocumentsSimple(oldFile: File, newFile: File): Promise<SimpleComparisonResult> {
  const [oldDoc, newDoc] = await Promise.all([
    extractText(oldFile),
    extractText(newFile)
  ]);
  
  return compareTexts(oldDoc, newDoc);
}
