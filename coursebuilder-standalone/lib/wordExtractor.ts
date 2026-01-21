import mammoth from 'mammoth';

export interface ExtractedImage {
  id: string;
  data: string;  // base64 data URL
  contentType: string;
  altText?: string;
}

export interface WordExtractionResult {
  text: string;
  html: string;
  htmlWithImages: string;  // HTML with embedded base64 images
  images: ExtractedImage[];
  characterCount: number;
  wordCount: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Extract text from Word document (.docx) using mammoth.js
 * Word documents preserve structure much better than PDFs:
 * - Bullets remain as proper lists
 * - Tables remain as proper tables
 * - No watermark interference
 */
export async function extractTextFromWord(file: File): Promise<WordExtractionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Track extracted images
    const extractedImages: ExtractedImage[] = [];
    let imageIndex = 0;
    
    // Configure mammoth to extract images inline
    const imageOptions = {
      convertImage: mammoth.images.imgElement(async (image: any) => {
        const imageId = `img_${imageIndex++}`;
        const base64Data = await image.read('base64');
        const contentType = image.contentType || 'image/png';
        const dataUrl = `data:${contentType};base64,${base64Data}`;
        
        extractedImages.push({
          id: imageId,
          data: dataUrl,
          contentType: contentType,
          altText: `Image ${imageIndex}`
        });
        
        return {
          src: dataUrl,
          alt: `Image ${imageIndex}`,
          'data-image-id': imageId
        };
      })
    };
    
    // Extract as HTML with images
    const htmlWithImagesResult = await mammoth.convertToHtml({ arrayBuffer }, imageOptions);
    
    // Extract as HTML without images (for text processing)
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    
    // Also extract as plain text
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    
    // Add any mammoth warnings
    if (htmlResult.messages.length > 0) {
      htmlResult.messages.forEach(msg => {
        if (msg.type === 'warning') {
          warnings.push(msg.message);
        }
      });
    }
    
    // Add image extraction info
    if (extractedImages.length > 0) {
      warnings.push(`Extracted ${extractedImages.length} image(s) from document`);
    }

    const rawText = textResult.value;
    const html = htmlResult.value;
    const htmlWithImages = htmlWithImagesResult.value;
    
    // Convert HTML to structured text that preserves bullets and tables
    const structuredText = convertHtmlToStructuredText(html);
    
    const characterCount = structuredText.length;
    const wordCount = structuredText.split(/\s+/).filter(w => w.length > 0).length;

    // Validation
    if (characterCount < 100) {
      errors.push('Document contains too little text (minimum 100 characters required)');
    }

    if (wordCount < 20) {
      errors.push('Document contains too few words (minimum 20 words required)');
    }

    const isValid = errors.length === 0 && characterCount >= 100 && wordCount >= 20;

    return {
      text: structuredText,
      html: html,
      htmlWithImages: htmlWithImages,
      images: extractedImages,
      characterCount,
      wordCount,
      isValid,
      errors,
      warnings
    };

  } catch (error) {
    errors.push(`Word document parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return {
      text: '',
      html: '',
      htmlWithImages: '',
      images: [],
      characterCount: 0,
      wordCount: 0,
      isValid: false,
      errors,
      warnings
    };
  }
}

/**
 * Convert HTML from mammoth to structured plain text
 * Preserves bullets, numbered lists, and table structure
 */
function convertHtmlToStructuredText(html: string): string {
  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let result = '';
  
  function processNode(node: Node): string {
    let text = '';
    
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      
      switch (tagName) {
        case 'p':
          text += processChildren(node) + '\n\n';
          break;
          
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          text += processChildren(node) + '\n\n';
          break;
          
        case 'ul':
          // Unordered list - use bullets
          element.querySelectorAll(':scope > li').forEach(li => {
            text += '• ' + li.textContent?.trim() + '\n';
          });
          text += '\n';
          break;
          
        case 'ol':
          // Ordered list - use numbers
          let num = 1;
          element.querySelectorAll(':scope > li').forEach(li => {
            text += `${num}. ` + li.textContent?.trim() + '\n';
            num++;
          });
          text += '\n';
          break;
          
        case 'table':
          // Convert table to pipe-separated format
          const rows = element.querySelectorAll('tr');
          rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td, th');
            const cellTexts: string[] = [];
            cells.forEach(cell => {
              cellTexts.push(cell.textContent?.trim() || '');
            });
            text += cellTexts.join(' | ') + '\n';
          });
          text += '\n';
          break;
          
        case 'br':
          text += '\n';
          break;
          
        case 'strong':
        case 'b':
          text += processChildren(node);
          break;
          
        case 'em':
        case 'i':
          text += processChildren(node);
          break;
          
        default:
          text += processChildren(node);
      }
    }
    
    return text;
  }
  
  function processChildren(node: Node): string {
    let text = '';
    node.childNodes.forEach(child => {
      text += processNode(child);
    });
    return text;
  }
  
  result = processNode(doc.body);
  
  // Clean up excessive whitespace
  result = result
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  
  return result;
}

/**
 * Check if a file is a Word document
 */
export function isWordDocument(file: File): boolean {
  const wordMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword' // .doc (older format - mammoth may not support)
  ];
  
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  return wordMimeTypes.includes(file.type) || extension === 'docx';
}
