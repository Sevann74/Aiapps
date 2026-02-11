import { supabase } from './supabaseClient';

// Get Supabase URL from environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface Document {
  id: string;
  title: string;
  content: string;
  type?: string;
  department?: string;
  lastUpdated?: string;
  version?: string;
  author?: string;
  status?: string;
  path?: string;
  pages?: number;
  metadata?: any;
}

export interface SearchResponse {
  answer: string;
  confidence: number;
  sources: Array<{
    document: string;
    section: string;
    page: number;
    exactQuote: string;
    relevance: number;
  }>;
  relatedDocuments?: string[];
  suggestedQuestions?: string[];
}

export type ResponseType = 'EXACT_REFERENCE' | 'EXPLANATION' | 'SUMMARY' | 'GAP_ANALYSIS' | 'COMPARISON' | 'ACTION_EXTRACTION' | 'WRITING_ASSIST' | 'REFUSAL' | 'NEEDS_DOCS';

export interface Citation {
  docId: string;
  docTitle: string;
  version: string;
  section: string;
  page: number;
  quote: string;
}

export interface UnifiedQAResponse {
  answer: string;
  responseType: ResponseType;
  confidence: number;
  citations: Citation[];
  suggestedQuestions: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

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

export interface SOPChangeForSummary {
  sectionId: string;
  sectionTitle: string;
  changeType: 'added' | 'removed' | 'modified';
  oldContent: string;
  newContent: string;
}

export interface SOPChangeSummary {
  sectionId: string;
  sectionTitle: string;
  changeType: 'added' | 'removed' | 'modified';
  summary: string;
  significance: 'substantive' | 'editorial';
  category: 'obligation' | 'timing' | 'threshold' | 'role' | 'records' | 'procedure' | 'definition' | 'other';
  confidence: number;
  evidenceOld: string | null;
  evidenceNew: string | null;
}

export interface SOPChangeSummariesResponse {
  summaries: SOPChangeSummary[];
}

class ComplianceQueryService {
  private edgeFunctionUrl: string;

  constructor() {
    this.edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/compliance-query`;
  }

  /**
   * Search across documents using Claude AI
   */
  async search(query: string, documents: Document[]): Promise<SearchResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          operation: 'search',
          query,
          documents: documents.map(doc => ({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            metadata: doc.metadata
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Search failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Search failed');
      }

      return result.data;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Chat with AI assistant about documents
   */
  async chat(
    query: string,
    conversationHistory: ChatMessage[],
    documents: Document[]
  ): Promise<SearchResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          operation: 'chat',
          query,
          conversationHistory,
          documents: documents.map(doc => ({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            metadata: doc.metadata
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chat failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Chat failed');
      }

      return result.data;
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
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

  /**
   * Unified Q&A — auto-classifies question type and routes to appropriate prompt
   */
  async unifiedQA(
    query: string,
    conversationHistory: ChatMessage[],
    documents: Document[]
  ): Promise<UnifiedQAResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          operation: 'unified-qa',
          query,
          conversationHistory,
          documents: documents.map(doc => ({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            metadata: doc.metadata
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Unified QA failed');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Unified QA failed');
      }

      return result.data;
    } catch (error) {
      console.error('Unified QA error:', error);
      throw error;
    }
  }

  /**
   * Writing Assistant — template-driven, document-anchored drafting
   */
  async writingAssist(
    query: string,
    writingMode: string,
    documents: Document[],
    conversationHistory: ChatMessage[] = [],
    writingContext: Record<string, string> = {}
  ): Promise<UnifiedQAResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          operation: 'writing-assist',
          query,
          writingMode,
          writingContext,
          conversationHistory,
          documents: documents.map(doc => ({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            metadata: doc.metadata
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Writing assist failed');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Writing assist failed');
      }

      return result.data;
    } catch (error) {
      console.error('Writing assist error:', error);
      throw error;
    }
  }

  async summarizeSOPChanges(input: {
    sop1: { id: string; title: string; version?: string };
    sop2: { id: string; title: string; version?: string };
    changes: SOPChangeForSummary[];
  }): Promise<SOPChangeSummariesResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          operation: 'summarize-sop-changes',
          sop1: input.sop1,
          sop2: input.sop2,
          changes: input.changes,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'SOP change summarization failed');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'SOP change summarization failed');
      }

      return result.data;
    } catch (error) {
      console.error('SOP change summarization error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const complianceQueryService = new ComplianceQueryService();
