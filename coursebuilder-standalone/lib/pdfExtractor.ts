import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  characterCount: number;
  wordCount: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export async function extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pageCount = pdf.numPages;
    const textPages: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');

        if (pageText.trim().length > 0) {
          textPages.push(pageText);
        }
      } catch (pageError) {
        warnings.push(`Failed to extract text from page ${i}`);
        console.warn(`Page ${i} extraction error:`, pageError);
      }
    }

    const fullText = textPages.join('\n\n');
    const cleanedText = cleanExtractedText(fullText);

    const characterCount = cleanedText.length;
    const wordCount = cleanedText.split(/\s+/).filter(w => w.length > 0).length;

    if (characterCount < 100) {
      errors.push('Document contains too little text (minimum 100 characters required)');
    }

    if (wordCount < 20) {
      errors.push('Document contains too few words (minimum 20 words required)');
    }

    if (pageCount === 0) {
      errors.push('PDF has no pages');
    }

    const binaryCharCount = (fullText.match(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g) || []).length;
    if (binaryCharCount > characterCount * 0.1) {
      warnings.push('Document may contain significant binary content. Text extraction may be incomplete.');
    }

    const isValid = errors.length === 0 && characterCount >= 100 && wordCount >= 20;

    return {
      text: cleanedText,
      pageCount,
      characterCount,
      wordCount,
      isValid,
      errors,
      warnings
    };

  } catch (error) {
    errors.push(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return {
      text: '',
      pageCount: 0,
      characterCount: 0,
      wordCount: 0,
      isValid: false,
      errors,
      warnings
    };
  }
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

export function validateDocumentText(text: string): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!text || text.trim().length === 0) {
    errors.push('Document text is empty');
    return { isValid: false, errors, warnings };
  }

  const characterCount = text.length;
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

  if (characterCount < 100) {
    errors.push(`Document is too short (${characterCount} characters, minimum 100 required)`);
  }

  if (wordCount < 20) {
    errors.push(`Document has too few words (${wordCount} words, minimum 20 required)`);
  }

  if (sentences.length < 3) {
    warnings.push('Document may not contain enough complete sentences for effective question generation');
  }

  const averageWordLength = characterCount / wordCount;
  if (averageWordLength > 15) {
    warnings.push('Document may contain encoding issues or unusual characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function getTextPreview(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength) + '...';
}
