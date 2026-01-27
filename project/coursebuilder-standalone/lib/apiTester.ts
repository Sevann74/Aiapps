const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-proxy`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface APITestResult {
  success: boolean;
  message: string;
  details?: string;
  latency?: number;
}

export async function testEdgeFunctionConnection(): Promise<APITestResult> {
  const startTime = Date.now();

  try {
    const testPayload = {
      operation: 'extract-facts',
      text: 'Test document with sample content. This is a safety procedure. Step 1: Wash hands for 20 seconds. Step 2: Wear protective equipment. Step 3: Follow all safety guidelines carefully.'
    };

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(testPayload)
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        message: 'Edge Function responded with an error',
        details: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        latency
      };
    }

    const result = await response.json();

    if (result.error) {
      if (result.error.includes('ANTHROPIC_API_KEY')) {
        return {
          success: false,
          message: 'Anthropic API key is not configured',
          details: 'The Edge Function is working, but the Anthropic API key needs to be set up. See ANTHROPIC_SETUP.md for instructions.',
          latency
        };
      }

      return {
        success: false,
        message: 'API test failed',
        details: result.error,
        latency
      };
    }

    const hasContent = result.content && result.content.length > 0;

    if (!hasContent) {
      return {
        success: false,
        message: 'API returned empty response',
        details: 'The Edge Function connected but returned no content. Check the Anthropic API key configuration.',
        latency
      };
    }

    return {
      success: true,
      message: 'API connection successful',
      details: `Edge Function is working correctly. Response time: ${latency}ms`,
      latency
    };

  } catch (error) {
    const latency = Date.now() - startTime;

    return {
      success: false,
      message: 'Failed to connect to Edge Function',
      details: error instanceof Error ? error.message : 'Unknown network error',
      latency
    };
  }
}

export async function testSupabaseConnection(): Promise<APITestResult> {
  const startTime = Date.now();

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        message: 'Supabase configuration missing',
        details: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in environment variables'
      };
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    });

    const latency = Date.now() - startTime;

    if (response.ok || response.status === 404) {
      return {
        success: true,
        message: 'Supabase connection successful',
        details: `Connected to Supabase instance. Response time: ${latency}ms`,
        latency
      };
    }

    return {
      success: false,
      message: 'Supabase connection failed',
      details: `HTTP ${response.status}: ${response.statusText}`,
      latency
    };

  } catch (error) {
    const latency = Date.now() - startTime;

    return {
      success: false,
      message: 'Failed to connect to Supabase',
      details: error instanceof Error ? error.message : 'Unknown network error',
      latency
    };
  }
}

export async function runFullDiagnostics(): Promise<{
  supabase: APITestResult;
  edgeFunction: APITestResult;
  overallStatus: 'ready' | 'partial' | 'not-ready';
}> {
  const supabase = await testSupabaseConnection();
  const edgeFunction = await testEdgeFunctionConnection();

  let overallStatus: 'ready' | 'partial' | 'not-ready' = 'not-ready';

  if (supabase.success && edgeFunction.success) {
    overallStatus = 'ready';
  } else if (supabase.success) {
    overallStatus = 'partial';
  }

  return {
    supabase,
    edgeFunction,
    overallStatus
  };
}
