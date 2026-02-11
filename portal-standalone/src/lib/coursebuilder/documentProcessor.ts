import * as pdfjsLib from 'pdfjs-dist';
import type { Document } from './complianceQueryService';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ProcessedDocument extends Document {
  rawText: string;
  pageCount: number;
}

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += `\n\n--- Page ${i} ---\n\n${pageText}`;
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Process uploaded document file and create Document object
 */
export async function processDocument(file: File): Promise<ProcessedDocument> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  let content = '';
  let pageCount = 0;
  
  if (fileExtension === 'pdf') {
    content = await extractTextFromPDF(file);
    // Estimate page count from content
    const pageMatches = content.match(/--- Page \d+ ---/g);
    pageCount = pageMatches ? pageMatches.length : 1;
  } else if (fileExtension === 'txt') {
    content = await file.text();
    pageCount = 1;
  } else {
    throw new Error(`Unsupported file type: ${fileExtension}. Please upload PDF or TXT files.`);
  }
  
  // Extract version from filename if present (e.g., "SOP-v3.2.pdf" -> "3.2")
  const versionMatch = file.name.match(/v?(\d+\.\d+)/i);
  const version = versionMatch ? versionMatch[1] : '1.0';
  
  return {
    id: `${file.name}-${Date.now()}`,
    title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
    content: content,
    rawText: content,
    type: 'SOP',
    department: 'Unknown',
    lastUpdated: new Date(file.lastModified).toISOString().split('T')[0],
    version: version,
    author: 'Uploaded Document',
    status: 'Uploaded',
    path: 'Local upload',
    pages: pageCount,
    pageCount: pageCount,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString()
    }
  };
}

/**
 * Process multiple document files
 */
export async function processDocuments(files: File[]): Promise<ProcessedDocument[]> {
  const processedDocs: ProcessedDocument[] = [];
  
  for (const file of files) {
    try {
      const doc = await processDocument(file);
      processedDocs.push(doc);
    } catch (error) {
      console.error(`Failed to process ${file.name}:`, error);
      // Continue processing other files
    }
  }
  
  return processedDocs;
}

/**
 * Create a mock document for testing (uses existing MOCK_DOCUMENTS structure)
 */
export function createMockDocument(
  id: string,
  title: string,
  content: string,
  metadata?: Partial<Document>
): Document {
  return {
    id,
    title,
    content,
    type: metadata?.type || 'SOP',
    department: metadata?.department || 'Quality Control',
    lastUpdated: metadata?.lastUpdated || new Date().toISOString().split('T')[0],
    version: metadata?.version || '1.0',
    author: metadata?.author || 'System',
    status: metadata?.status || 'Active',
    path: metadata?.path || '/documents/',
    pages: metadata?.pages || Math.ceil(content.length / 2000),
    metadata: metadata?.metadata || {}
  };
}
