/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param options - Retry options
 * @returns Promise with the result of the function
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any, nextDelayMs: number) => void;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    retryCondition = () => true,
    onRetry
  } = options;

  let lastError: any;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt > maxRetries || !retryCondition(error)) {
        throw error;
      }

      // Calculate next delay with exponential backoff
      const nextDelay = Math.min(delay, maxDelayMs);
      
      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt, error, nextDelay);
      }

      console.warn(`Attempt ${attempt} failed, retrying in ${nextDelay}ms...`, error);

      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, nextDelay));
      
      // Increase delay for next attempt
      delay *= backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable (network errors, 5xx errors, rate limits)
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return true;
  }

  // HTTP status codes that are retryable
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  if (error.status && retryableStatuses.includes(error.status)) {
    return true;
  }

  // Supabase/API specific errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }

  return false;
}

/**
 * Wrapper for API calls with automatic retry
 */
export async function apiCallWithRetry<T>(
  fn: () => Promise<T>,
  context: string = 'API call'
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 8000,
    backoffMultiplier: 2,
    retryCondition: isRetryableError,
    onRetry: (attempt, error, nextDelay) => {
      console.log(`⚠️ ${context} failed (attempt ${attempt}), retrying in ${nextDelay}ms...`);
    }
  });
}
