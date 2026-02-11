/**
 * Client-side validation utilities for Course Builder
 * Validates inputs before expensive API calls
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate document text before AI generation
 */
export function validateDocumentForAI(documentText: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if document is empty
  if (!documentText || documentText.trim().length === 0) {
    errors.push('Document is empty. Please upload or paste document content.');
    return { valid: false, errors, warnings };
  }

  // Check minimum length (too short for meaningful course)
  if (documentText.trim().length < 100) {
    errors.push('Document is too short (less than 100 characters). Please provide more content.');
    return { valid: false, errors, warnings };
  }

  // Check maximum length (likely to exceed token limits)
  const charCount = documentText.length;
  const estimatedTokens = Math.ceil(charCount / 4); // Rough estimate: 4 chars per token

  if (charCount > 500000) {
    errors.push(`Document is too large (${(charCount / 1000).toFixed(0)}K characters). Maximum is 500K characters. Consider splitting into multiple courses.`);
    return { valid: false, errors, warnings };
  }

  if (charCount > 200000) {
    warnings.push(`Large document detected (${(charCount / 1000).toFixed(0)}K characters). Generation may take longer.`);
  }

  if (estimatedTokens > 100000) {
    warnings.push(`Estimated ${(estimatedTokens / 1000).toFixed(0)}K tokens. This may approach API limits.`);
  }

  return { valid: true, errors, warnings };
}

/**
 * Validate course configuration before generation
 */
export function validateCourseConfig(config: {
  clientName?: string;
  courseTitle?: string;
  questionCount?: number;
  passingScore?: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Client name validation
  if (!config.clientName || config.clientName.trim().length === 0) {
    errors.push('Organization / Business Unit is required.');
  }

  // Question count validation
  if (config.questionCount !== undefined) {
    if (config.questionCount < 1) {
      errors.push('Question count must be at least 1.');
    }
    if (config.questionCount > 50) {
      warnings.push('High question count (>50) may result in lower quality questions.');
    }
  }

  // Passing score validation
  if (config.passingScore !== undefined) {
    if (config.passingScore < 0 || config.passingScore > 100) {
      errors.push('Passing score must be between 0 and 100.');
    }
    if (config.passingScore < 50) {
      warnings.push('Passing score below 50% may not meet compliance requirements.');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate file before upload
 */
export function validateFileUpload(file: File, options: {
  maxSizeMB?: number;
  allowedTypes?: string[];
} = {}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const { maxSizeMB = 50, allowedTypes } = options;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Check file size
  if (file.size > maxSizeBytes) {
    errors.push(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is ${maxSizeMB}MB.`);
  } else if (file.size > maxSizeBytes * 0.8) {
    warnings.push(`File is close to size limit (${(file.size / 1024 / 1024).toFixed(1)}MB of ${maxSizeMB}MB).`);
  }

  // Check file type
  if (allowedTypes && allowedTypes.length > 0) {
    const fileType = file.type || '';
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    
    const isAllowed = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExt === type.slice(1);
      }
      if (type.endsWith('/*')) {
        return fileType.startsWith(type.slice(0, -1));
      }
      return fileType === type;
    });

    if (!isAllowed) {
      errors.push(`File type not allowed. Accepted types: ${allowedTypes.join(', ')}`);
    }
  }

  // Check if file is empty
  if (file.size === 0) {
    errors.push('File is empty.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Format validation result for display
 */
export function formatValidationMessage(result: ValidationResult): string {
  const messages: string[] = [];
  
  if (result.errors.length > 0) {
    messages.push('❌ Errors:\n' + result.errors.map(e => `  • ${e}`).join('\n'));
  }
  
  if (result.warnings.length > 0) {
    messages.push('⚠️ Warnings:\n' + result.warnings.map(w => `  • ${w}`).join('\n'));
  }
  
  return messages.join('\n\n');
}
