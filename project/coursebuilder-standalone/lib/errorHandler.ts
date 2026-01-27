export interface ErrorDetails {
  title: string;
  message: string;
  suggestions: string[];
  technicalDetails?: string;
  recoveryActions?: string[];
}

export function parseAPIError(error: Error | unknown): ErrorDetails {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes('ANTHROPIC_API_KEY')) {
    return {
      title: 'Anthropic API Key Not Configured',
      message: 'The AI-powered course generation requires an Anthropic API key to function.',
      suggestions: [
        'Get an API key from https://console.anthropic.com/',
        'Add the key as a secret in your Supabase Edge Functions settings',
        'See ANTHROPIC_SETUP.md for detailed setup instructions'
      ],
      recoveryActions: [
        'Configure the API key',
        'Try using Manual Question mode instead'
      ]
    };
  }

  if (errorMessage.includes('No critical or important facts found') ||
      errorMessage.includes('No facts could be extracted')) {
    return {
      title: 'Document Analysis Failed',
      message: 'The system could not extract meaningful information from your document.',
      suggestions: [
        'Ensure the PDF contains clear, readable text (not just images)',
        'Try a different PDF with more structured content',
        'Check that the document has clear sections and procedures',
        'Consider using Manual Question mode to create questions yourself'
      ],
      technicalDetails: errorMessage,
      recoveryActions: [
        'Upload a different document',
        'Switch to Manual Question mode',
        'Review the extracted text preview'
      ]
    };
  }

  if (errorMessage.includes('Failed to parse response')) {
    return {
      title: 'API Response Error',
      message: 'The AI service returned an unexpected response format.',
      suggestions: [
        'The Anthropic API key may not be configured correctly',
        'Your API quota may have been exceeded',
        'There may be a temporary issue with the AI service'
      ],
      technicalDetails: errorMessage,
      recoveryActions: [
        'Check your API key configuration',
        'Wait a few minutes and try again',
        'Use Manual Question mode as an alternative'
      ]
    };
  }

  if (errorMessage.includes('establish connection') ||
      errorMessage.includes('Receiving end does not exist') ||
      errorMessage.includes('Failed to fetch')) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to the AI service.',
      suggestions: [
        'Check your internet connection',
        'Verify that the Edge Function is deployed',
        'Ensure the Anthropic API key is configured',
        'Check browser console for network errors'
      ],
      technicalDetails: errorMessage,
      recoveryActions: [
        'Refresh the page and try again',
        'Check your network connection',
        'Use Manual Question mode'
      ]
    };
  }

  if (errorMessage.includes('Document text is too short') ||
      errorMessage.includes('Document text is empty')) {
    return {
      title: 'Invalid Document Content',
      message: 'The uploaded document does not contain sufficient text content.',
      suggestions: [
        'Ensure the PDF is not just scanned images',
        'Try a document with at least 100 words',
        'Verify the PDF is not corrupted or password-protected'
      ],
      technicalDetails: errorMessage,
      recoveryActions: [
        'Upload a different document',
        'Check the text preview to verify extraction worked'
      ]
    };
  }

  return {
    title: 'Course Generation Error',
    message: 'An unexpected error occurred while generating the course.',
    suggestions: [
      'Check the browser console for detailed error information',
      'Try refreshing the page and uploading again',
      'Consider using Manual Question mode',
      'Contact support if the problem persists'
    ],
    technicalDetails: errorMessage,
    recoveryActions: [
      'Refresh and try again',
      'Upload a different document',
      'Switch to Manual Question mode'
    ]
  };
}

export function getErrorSeverity(error: ErrorDetails): 'critical' | 'warning' | 'info' {
  if (error.title.includes('API Key') || error.title.includes('Connection')) {
    return 'critical';
  }

  if (error.title.includes('Document') || error.title.includes('Analysis')) {
    return 'warning';
  }

  return 'info';
}
