import { supabase } from './supabase';

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
   * Compare two SOP documents
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
