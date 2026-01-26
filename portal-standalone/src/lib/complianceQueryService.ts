import { supabase } from './supabaseClient';

// Get Supabase URL from environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface SOPComparisonResponse {
  summary: {
    totalSections: number;
    identicalSections: number;
    modifiedSections: number;
    newSections: number;
    removedSections: number;
  };
  differences: Array<{
    section: string;
    type: 'modified' | 'new' | 'removed';
    severity: 'high' | 'medium' | 'low';
    sop1Text: string | null;
    sop2Text: string | null;
    impact: string;
    page1: number | null;
    page2: number | null;
  }>;
  criticalChanges: string[];
  recommendations: string[];
}

class ComplianceQueryService {
  private edgeFunctionUrl: string;

  constructor() {
    this.edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/compliance-query`;
  }

  /**
   * Compare two SOP documents using AI (Claude)
   */
  async compareSOPs(
    sop1: { id: string; title: string; content: string; version?: string },
    sop2: { id: string; title: string; content: string; version?: string }
  ): Promise<SOPComparisonResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          operation: 'compare-sops',
          sop1,
          sop2
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'SOP comparison failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'SOP comparison failed');
      }

      return result.data;
    } catch (error) {
      console.error('SOP comparison error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const complianceQueryService = new ComplianceQueryService();
