import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, CheckCircle, AlertCircle, TrendingUp, Table, Sparkles, Filter, Download, Share2, BookOpen, Database, BarChart3, Eye, Clock, Shield, Zap, Brain, GitCompare, Copy, ExternalLink, MessageSquare, Send, Mic, User, Bot, Trash2, Star, MessageCircle, RefreshCw, Info, ArrowRight, AlertTriangle } from 'lucide-react';
import SOPUploader from '../components/SOPUploader';
import { complianceQueryService, type Document } from '../lib/complianceQueryService';
import { processDocuments, createMockDocument } from '../lib/documentProcessor';

// ============================================
// COMPLETE APP WITH 3 MODES:
// 1. Search Mode
// 2. Chat Mode
// 3. SOP Comparison Mode
// ============================================

const MOCK_DOCUMENTS = [
  {
    id: 'SOP-QC-2024-089',
    title: 'Quality Control Procedures for Compound X-147',
    type: 'SOP',
    department: 'Quality Control',
    lastUpdated: '2024-01-15',
    version: '3.2',
    author: 'Dr. Sarah Chen',
    status: 'Approved',
    path: '/QC/SOPs/2024/',
    pages: 45,
    content: `
Storage Requirements:
Compound X-147 must be stored at 2-8°C (refrigerated conditions) in a light-protected container.
Storage beyond 6 months requires re-validation.

Quality Specifications:
- Purity: ≥98.5%
- Yield: 85-92%
- Moisture content: <0.5%
- pH: 6.8-7.2

Testing Frequency:
All batches must be tested within 24 hours of production.
Stability testing required at 0, 3, 6, 12, and 24 months.
    `
  },
  {
    id: 'SOP-QC-2023-089',
    title: 'Quality Control Procedures for Compound X-147 (Previous Version)',
    type: 'SOP',
    department: 'Quality Control',
    lastUpdated: '2023-06-10',
    version: '3.1',
    author: 'Dr. Sarah Chen',
    status: 'Superseded',
    path: '/QC/SOPs/2023/',
    pages: 42,
    content: `
Storage Requirements:
Compound X-147 must be stored at 2-8°C (refrigerated conditions) in a light-protected container.
Storage beyond 3 months requires re-validation.

Quality Specifications:
- Purity: ≥98.0%
- Yield: 85-92%
- Moisture content: <0.5%
- pH: 6.8-7.2

Testing Frequency:
All batches must be tested within 24 hours of production.
    `
  },
  {
    id: 'SOP-QC-2024-090',
    title: 'Alternative Quality Control Procedures',
    type: 'SOP',
    department: 'Quality Control',
    lastUpdated: '2024-02-01',
    version: '1.0',
    author: 'Dr. James Martinez',
    status: 'Approved',
    path: '/QC/SOPs/2024/',
    pages: 38,
    content: `
Storage Requirements:
Store at controlled room temperature (15-25°C) with humidity control.

Quality Specifications:
- Purity: ≥98.5%
- Yield: 87-94%
- Moisture content: <0.3%
- pH: 6.9-7.1
    `
  }
];

const MOCK_QUERY_RESPONSES = {
  'storage temperature': {
    answer: 'Compound X-147 must be stored at 2-8°C (refrigerated conditions) in a light-protected container.',
    confidence: 98,
    sources: [
      {
        document: 'SOP-QC-2024-089',
        section: '3.4 Storage Requirements',
        page: 12,
        exactQuote: 'Compound X-147 must be stored at 2-8°C (refrigerated conditions) in a light-protected container.',
        relevance: 100
      }
    ],
    relatedDocuments: ['BATCH-2024-X147-001', 'STAB-2024-Q3'],
    suggestedQuestions: [
      'How long can it be stored?',
      'What happens if temperature exceeds 8°C?',
      'What type of container is required?'
    ]
  },
  'how long': {
    answer: 'Compound X-147 can be stored for up to 6 months under proper conditions (2-8°C, light-protected). Storage beyond 6 months requires re-validation.',
    confidence: 96,
    sources: [
      {
        document: 'SOP-QC-2024-089',
        section: '3.4 Storage Requirements',
        page: 12,
        exactQuote: 'Storage beyond 6 months requires re-validation.',
        relevance: 100
      }
    ],
    relatedDocuments: ['VAL-HPLC-2024'],
    suggestedQuestions: [
      'What does re-validation involve?',
      'Can we extend storage with testing?',
      'What are signs of degradation?'
    ]
  }
};

export default function ComplianceQueryProComplete() {
  // Mode State (search, chat, or comparison)
  const [activeMode, setActiveMode] = useState('search');
  
  // Chatbot State
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Search State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    documentType: 'all',
    department: 'all',
    dateRange: 'all'
  });
  
  // SOP Comparison State
  const [sop1, setSop1] = useState(''); // id of first uploaded SOP
  const [sop2, setSop2] = useState(''); // id of second uploaded SOP
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [uploadedSOPs, setUploadedSOPs] = useState<any[]>([]);
  
  // Document Management
  const [processedDocuments, setProcessedDocuments] = useState<Document[]>(() => {
    // Initialize with mock documents converted to proper format
    return MOCK_DOCUMENTS.map(doc => createMockDocument(
      doc.id,
      doc.title,
      doc.content,
      {
        type: doc.type,
        department: doc.department,
        lastUpdated: doc.lastUpdated,
        version: doc.version,
        author: doc.author,
        status: doc.status,
        path: doc.path,
        pages: doc.pages
      }
    ));
  });
  const [isProcessingDocs, setIsProcessingDocs] = useState(false);
  
  // GxP Compliance Modal
  const [showGxPModal, setShowGxPModal] = useState(false);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  
  // Add audit trail entry
  const addAuditEntry = (action: string, details: any) => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: 'demo.user@company.com',
      action,
      details,
      ipAddress: '192.168.1.100', // Mock IP
      sessionId: 'sess_' + Math.random().toString(36).substr(2, 9)
    };
    setAuditTrail(prev => [entry, ...prev.slice(0, 49)]); // Keep last 50 entries
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [currentConversation]);

  // When new SOPs are uploaded, auto-select the first two for comparison
  useEffect(() => {
    if (uploadedSOPs.length >= 2 && (!sop1 || !sop2)) {
      setSop1(uploadedSOPs[0].id);
      setSop2(uploadedSOPs[1].id);
    }
  }, [uploadedSOPs, sop1, sop2]);

  // Start new conversation
  const startNewConversation = () => {
    const newConv = {
      id: Date.now(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    setConversations([newConv, ...conversations]);
    setCurrentConversation(newConv);
    setActiveMode('chat');
  };

  // Send message in chat
  const sendMessage = async () => {
    if (!message.trim() || !currentConversation) return;
    
    const userMessage = {
      id: Date.now(),
      role: 'user' as const,
      content: message,
      timestamp: new Date().toISOString()
    };
    
    const updatedMessages = [...(currentConversation?.messages || []), userMessage];
    const updatedConv = {
      ...currentConversation,
      messages: updatedMessages,
      title: currentConversation.messages.length === 0 ? message.substring(0, 50) : currentConversation.title,
      lastActivity: new Date().toISOString()
    };
    
    setCurrentConversation(updatedConv);
    setConversations(conversations.map(c => c.id === updatedConv.id ? updatedConv : c));
    setMessage('');
    setIsTyping(true);
    
    try {
      // Use real Claude API for chat
      const conversationHistory = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add audit entry
      addAuditEntry('CHAT_QUERY', {
        message: message,
        conversationId: currentConversation.id,
        documentCount: processedDocuments.length
      });
      
      const response = await complianceQueryService.chat(
        message,
        conversationHistory,
        processedDocuments
      );
      
      // Add audit entry for response
      addAuditEntry('CHAT_RESPONSE', {
        conversationId: currentConversation.id,
        confidence: response.confidence,
        sourcesUsed: response.sources?.length || 0
      });
      
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant' as const,
        content: response.answer,
        confidence: response.confidence,
        sources: response.sources,
        relatedDocuments: response.relatedDocuments,
        suggestedQuestions: response.suggestedQuestions,
        timestamp: new Date().toISOString()
      };
      
      const finalMessages = [...updatedMessages, assistantMessage];
      const finalConv = {
        ...updatedConv,
        messages: finalMessages
      };
      
      setCurrentConversation(finalConv);
      setConversations(conversations.map(c => c.id === finalConv.id ? finalConv : c));
    } catch (error) {
      console.error('Chat error:', error);
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again.',
        confidence: 0,
        sources: [],
        timestamp: new Date().toISOString()
      };
      
      const finalMessages = [...updatedMessages, errorMessage];
      const finalConv = {
        ...updatedConv,
        messages: finalMessages
      };
      
      setCurrentConversation(finalConv);
      setConversations(conversations.map(c => c.id === finalConv.id ? finalConv : c));
    } finally {
      setIsTyping(false);
    }
  };

  const getContextualResponse = (newMessage, conversationHistory) => {
    const messageLower = newMessage.toLowerCase();
    
    if (messageLower.includes('how long') || messageLower.includes('duration')) {
      return MOCK_QUERY_RESPONSES['how long'];
    }
    
    if (messageLower.includes('temperature') || messageLower.includes('storage')) {
      return MOCK_QUERY_RESPONSES['storage temperature'];
    }
    
    return {
      answer: 'I found relevant information in the following documents. Could you please be more specific about what you\'d like to know?',
      confidence: 75,
      sources: MOCK_DOCUMENTS.slice(0, 2).map(doc => ({
        document: doc.id,
        section: 'Multiple sections',
        page: 1,
        exactQuote: doc.content.substring(0, 100) + '...',
        relevance: 75
      })),
      relatedDocuments: MOCK_DOCUMENTS.slice(2, 4).map(d => d.id),
      suggestedQuestions: [
        'Can you tell me about storage requirements?',
        'What are the quality specifications?',
        'How do we test this compound?'
      ]
    };
  };

  // Delete conversation
  const deleteConversation = (convId) => {
    setConversations(conversations.filter(c => c.id !== convId));
    if (currentConversation?.id === convId) {
      setCurrentConversation(null);
    }
  };

  // Export conversation
  const exportConversation = (conv) => {
    const exportData = {
      title: conv.title,
      createdAt: conv.createdAt,
      messages: conv.messages,
      audit: {
        user: 'demo.user@company.com',
        exportedAt: new Date().toISOString()
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conv.id}.json`;
    a.click();
  };

  // Search functionality
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    
    const historyItem = {
      id: Date.now(),
      query,
      timestamp: new Date().toISOString()
    };
    setSearchHistory([historyItem, ...searchHistory.slice(0, 9)]);
    
    try {
      // Add audit entry
      addAuditEntry('DOCUMENT_SEARCH', {
        query: query,
        documentCount: processedDocuments.length,
        searchType: 'AI_POWERED'
      });
      
      // Use real Claude API for search
      const response = await complianceQueryService.search(query, processedDocuments);
      setResults(response);
      
      // Add audit entry for successful search
      addAuditEntry('SEARCH_COMPLETED', {
        query: query,
        confidence: response.confidence,
        sourcesFound: response.sources?.length || 0
      });
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to mock response on error
      setResults({
        answer: 'Error performing search. Please try again.',
        confidence: 0,
        sources: [],
        relatedDocuments: [],
        suggestedQuestions: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle uploaded SOP files
  const handleSOPUpload = async (uploadedFiles: any[]) => {
    console.log('handleSOPUpload called with:', uploadedFiles);
    setIsProcessingDocs(true);
    try {
      // Extract File objects from UploadedFile wrappers
      const fileObjects = uploadedFiles.map(uf => uf.file);
      console.log('Processing files:', fileObjects);
      const processed = await processDocuments(fileObjects);
      console.log('Processed documents:', processed);
      setUploadedSOPs(processed);
      // Also add to general document pool
      setProcessedDocuments(prev => [...prev, ...processed]);
    } catch (error) {
      console.error('Error processing SOPs:', error);
    } finally {
      setIsProcessingDocs(false);
    }
  };

  // SOP Comparison functionality using real Claude API
  const compareSOPs = async () => {
    if (!sop1 || !sop2 || uploadedSOPs.length < 2) return;

    const file1 = uploadedSOPs.find((f: any) => f.id === sop1);
    const file2 = uploadedSOPs.find((f: any) => f.id === sop2);

    if (!file1 || !file2) return;

    setComparisonLoading(true);
    
    try {
      // Add audit entry
      addAuditEntry('SOP_COMPARISON_STARTED', {
        sop1: { id: file1.id, title: file1.title, version: file1.version },
        sop2: { id: file2.id, title: file2.title, version: file2.version },
        comparisonType: 'AI_POWERED_DIFF'
      });
      
      // Use real Claude API for SOP comparison
      const result = await complianceQueryService.compareSOPs(
        {
          id: file1.id,
          title: file1.title,
          content: file1.content,
          version: file1.version
        },
        {
          id: file2.id,
          title: file2.title,
          content: file2.content,
          version: file2.version
        }
      );
      
      // Add audit entry for completed comparison
      addAuditEntry('SOP_COMPARISON_COMPLETED', {
        sop1: file1.title,
        sop2: file2.title,
        differencesFound: result.differences?.length || 0,
        criticalChanges: result.criticalChanges?.length || 0
      });
      
      // Add SOP details to result
      const enrichedResult = {
        ...result,
        sop1Details: {
          id: file1.id,
          title: file1.title,
          type: file1.type,
          department: file1.department,
          lastUpdated: file1.lastUpdated,
          version: file1.version,
          author: file1.author,
          status: file1.status,
          path: file1.path,
          pages: file1.pages
        },
        sop2Details: {
          id: file2.id,
          title: file2.title,
          type: file2.type,
          department: file2.department,
          lastUpdated: file2.lastUpdated,
          version: file2.version,
          author: file2.author,
          status: file2.status,
          path: file2.path,
          pages: file2.pages
        }
      };
      
      setComparisonResult(enrichedResult);
    } catch (error) {
      console.error('SOP comparison error:', error);
      // Set error state
      setComparisonResult({
        error: 'Failed to compare SOPs. Please try again.',
        summary: {
          totalSections: 0,
          identicalSections: 0,
          modifiedSections: 0,
          newSections: 0,
          removedSections: 0
        },
        differences: [],
        criticalChanges: [],
        recommendations: []
      });
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeMode === 'chat') {
        sendMessage();
      } else if (activeMode === 'search') {
        handleSearch();
      }
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50';
    if (confidence >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  const getConfidenceIcon = (confidence) => {
    if (confidence >= 90) return <CheckCircle className="w-5 h-5" />;
    if (confidence >= 75) return <Zap className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high': return 'bg-red-50 border-red-300 text-red-900';
      case 'medium': return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      case 'low': return 'bg-blue-50 border-blue-300 text-blue-900';
      default: return 'bg-gray-50 border-gray-300 text-gray-900';
    }
  };

  const getSeverityIcon = (severity) => {
    switch(severity) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium': return <Info className="w-5 h-5 text-yellow-600" />;
      case 'low': return <Info className="w-5 h-5 text-blue-600" />;
      default: return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ComplianceQuery Pro</h1>
                <p className="text-sm text-gray-600">AI-Powered Document Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* 3-Mode Toggle */}
              <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setActiveMode('search')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    activeMode === 'search'
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
                <button
                  onClick={() => {
                    setActiveMode('chat');
                    if (!currentConversation) {
                      startNewConversation();
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    activeMode === 'chat'
                      ? 'bg-white text-purple-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </button>
                <button
                  onClick={() => setActiveMode('comparison')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    activeMode === 'comparison'
                      ? 'bg-white text-pink-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <GitCompare className="w-4 h-4" />
                  Compare SOPs
                </button>
              </div>
              
              <button
                onClick={() => setShowGxPModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
              >
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">GxP Compliant</span>
              </button>
              <div className="px-3 py-2 bg-gray-100 rounded-lg">
                <span className="text-sm text-gray-600">demo.user@company.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Changes based on activeMode */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* SEARCH MODE */}
        {activeMode === 'search' && (
          <div className="space-y-6">
            {/* Search Mode Features */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Search className="w-6 h-6 text-blue-600" />
                Search Mode Features
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-1">🔍 Quick Document Queries</h4>
                  <p className="text-gray-600">Ask natural language questions about your documents. AI analyzes content across all uploaded SOPs to find relevant information instantly.</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-1">📄 Source Citations</h4>
                  <p className="text-gray-600">Every answer includes exact document references with page numbers and direct quotes, ensuring full traceability for compliance.</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-1">🎯 Confidence Scoring</h4>
                  <p className="text-gray-600">AI provides confidence levels (0-100%) for each answer, helping you assess reliability and identify when human review is needed.</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-1">📚 Search History</h4>
                  <p className="text-gray-600">Track previous queries for audit purposes and quick re-access. Click any historical search to repeat the query.</p>
                </div>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-600">Total Docs</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{MOCK_DOCUMENTS.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-gray-600">Searches</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{searchHistory.length}</span>
                  </div>
                </div>
              </div>
              
              {searchHistory.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Searches</h3>
                  <div className="space-y-2">
                    {searchHistory.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setQuery(item.query)}
                        className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <p className="text-sm text-gray-700 truncate">{item.query}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Document Search</h2>
                <div className="flex gap-4">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question about your documents..."
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                    rows={3}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={loading || !query.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Search
                      </>
                    )}
                  </button>
                </div>
                
                {results && (
                  <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                    <p className="text-lg text-gray-900 leading-relaxed mb-4">{results.answer}</p>
                    {results.confidence && (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${getConfidenceColor(results.confidence)}`}>
                        {getConfidenceIcon(results.confidence)}
                        <span className="text-sm font-bold">{results.confidence}% Confident</span>
                      </div>
                    )}
                    
                    {results.sources && results.sources.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <p className="text-sm font-semibold text-gray-900">Sources:</p>
                        {results.sources.map((source, idx) => (
                          <div key={idx} className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <span className="font-bold text-blue-900">{source.document}</span>
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                Page {source.page}
                              </span>
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                {source.relevance}% Match
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 italic mb-1">"{source.exactQuote}"</p>
                            <p className="text-xs text-gray-500">Section: {source.section}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {!results && !loading && (
                  <div className="mt-6 p-8 text-center">
                    <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Ask a question to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        )}

        {/* CHAT MODE */}
        {activeMode === 'chat' && (
          <div className="space-y-6">
            {/* Chat Mode Features */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-purple-600" />
                Chat Mode Features
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-1">💬 Conversation Management</h4>
                  <p className="text-gray-600">Create multiple conversation threads, each with its own context and history. Perfect for different projects or topics.</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-1">🧠 Context Retention</h4>
                  <p className="text-gray-600">AI remembers your entire conversation history, allowing for follow-up questions and building on previous discussions.</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-1">💡 Suggested Follow-ups</h4>
                  <p className="text-gray-600">AI suggests relevant next questions based on the current topic, helping you explore documents more thoroughly.</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-1">📤 Export Conversations</h4>
                  <p className="text-gray-600">Download complete conversation logs as JSON files for compliance records, sharing with colleagues, or documentation.</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-1">🗂️ Multiple Conversations</h4>
                  <p className="text-gray-600">Organize discussions by topic, project, or SOP. Switch between conversations while maintaining separate contexts.</p>
                </div>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-4 gap-6">
            {/* Conversation List Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <button
                  onClick={startNewConversation}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <MessageSquare className="w-5 h-5" />
                  New Conversation
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 max-h-[600px] overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Conversations</h3>
                {conversations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No conversations yet.<br/>Start a new one!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          currentConversation?.id === conv.id
                            ? 'bg-purple-50 border-2 border-purple-300'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                        onClick={() => setCurrentConversation(conv)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium text-gray-900 truncate flex-1">
                            {conv.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                            }}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            {conv.messages.length} messages
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(conv.lastActivity).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-lg flex flex-col h-[700px]">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {currentConversation?.title || 'Start a conversation'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        AI Document Assistant • GxP Compliant
                      </p>
                    </div>
                  </div>
                  {currentConversation && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => exportConversation(currentConversation)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Export conversation"
                      >
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Share conversation"
                      >
                        <Share2 className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {!currentConversation || currentConversation.messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-6">
                        <MessageCircle className="w-10 h-10 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Start a Conversation</h3>
                      <p className="text-gray-600 mb-6 max-w-md">
                        Ask me anything about your documents. I can help you find information, 
                        compare data, and answer complex questions.
                      </p>
                      <div className="grid md:grid-cols-2 gap-3 max-w-2xl">
                        {[
                          'What are the storage requirements?',
                          'Compare Q3 2024 vs Q3 2023 yields',
                          'Show me quality specifications',
                          'What testing is required?'
                        ].map((example, idx) => (
                          <button
                            key={idx}
                            onClick={() => setMessage(example)}
                            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-left text-gray-700 transition-colors"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {currentConversation.messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.role === 'assistant' && (
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <Bot className="w-5 h-5 text-white" />
                            </div>
                          )}
                          
                          <div className={`max-w-[70%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                            <div className={`p-4 rounded-2xl ${
                              msg.role === 'user'
                                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}>
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                            </div>
                            
                            {/* Assistant message extras */}
                            {msg.role === 'assistant' && (
                              <div className="mt-2 space-y-2">
                                {msg.confidence && (
                                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${getConfidenceColor(msg.confidence)}`}>
                                    {getConfidenceIcon(msg.confidence)}
                                    {msg.confidence}% Confident
                                  </div>
                                )}
                                
                                {/* Sources - IMPROVED FORMAT */}
                                {msg.sources && msg.sources.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    {msg.sources.slice(0, 2).map((source, idx) => (
                                      <div key={idx} className="p-3 bg-white border-2 border-gray-200 rounded-lg">
                                        {/* Document ID prominently displayed */}
                                        <div className="flex items-center gap-2 mb-2">
                                          <FileText className="w-4 h-4 text-blue-600" />
                                          <span className="font-bold text-blue-900">
                                            {source.document}
                                          </span>
                                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                            Page {source.page}
                                          </span>
                                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                            {source.relevance}% Match
                                          </span>
                                        </div>
                                        {/* Quote */}
                                        <p className="text-xs text-gray-700 italic mb-1">
                                          "{source.exactQuote}"
                                        </p>
                                        {/* Section details */}
                                        <p className="text-xs text-gray-500">
                                          Section: {source.section}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Suggested follow-ups */}
                                {msg.suggestedQuestions && (
                                  <div className="mt-3">
                                    <p className="text-xs font-semibold text-gray-600 mb-2">Suggested questions:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {msg.suggestedQuestions.map((q, qIdx) => (
                                        <button
                                          key={qIdx}
                                          onClick={() => setMessage(q)}
                                          className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                          {q}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <p className="text-xs text-gray-400 mt-1 px-2">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          
                          {msg.role === 'user' && (
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Typing indicator */}
                      {isTyping && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                          <div className="bg-gray-100 rounded-2xl p-4">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything about your documents..."
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                      rows={2}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!message.trim() || isTyping}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Press Enter to send • Shift + Enter for new line
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* SOP COMPARISON MODE */}
        {activeMode === 'comparison' && (
          <div className="space-y-6">
            {/* SOP Comparison Features */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6 border border-pink-200">
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <GitCompare className="w-6 h-6 text-pink-600" />
                SOP Comparison Mode Features 🔄 <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">NEW!</span>
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-pink-900 mb-1">🔄 Side-by-side Comparison</h4>
                  <p className="text-gray-600">Upload two SOP versions and see them compared section by section. AI identifies every change, addition, and deletion.</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-pink-900 mb-1">🎨 Visual Difference Highlighting</h4>
                  <p className="text-gray-600">Changes are color-coded and clearly marked. See exactly what text was modified, added, or removed between versions.</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-pink-900 mb-1">⚠️ Severity Indicators</h4>
                  <p className="text-gray-600">Each change is classified as High, Medium, or Low priority based on compliance impact and operational significance.</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-pink-900 mb-1">🚨 Critical Changes Alert</h4>
                  <p className="text-gray-600">High-priority changes are highlighted at the top with clear warnings about compliance implications and required actions.</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-pink-900 mb-1">📊 Impact Assessment</h4>
                  <p className="text-gray-600">AI analyzes the business and compliance impact of each change, helping prioritize review and implementation efforts.</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-pink-900 mb-1">✅ Recommended Actions</h4>
                  <p className="text-gray-600">Get specific, actionable recommendations for each change including training needs, validation requirements, and timeline suggestions.</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-semibold text-pink-900 mb-1">📄 Export Report</h4>
                  <p className="text-gray-600">Generate comprehensive comparison reports for change control documentation, regulatory submissions, and team reviews.</p>
                </div>
              </div>
            </div>
            
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <GitCompare className="w-8 h-8" />
                <h2 className="text-2xl font-bold">SOP Comparison Tool</h2>
              </div>
              <p className="text-purple-100">
                Compare two SOPs side-by-side to identify differences, track changes, and ensure compliance
              </p>
            </div>

            {/* Upload + Selection */}
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
              {/* New SOP uploader */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Upload SOPs</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop PDF or DOCX SOPs here, then pick which versions you want to compare below.
                </p>
                <SOPUploader onFilesUploaded={handleSOPUpload} maxFiles={5} />
                {isProcessingDocs && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Processing documents...
                  </div>
                )}
                {uploadedSOPs.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    {uploadedSOPs.length} file{uploadedSOPs.length === 1 ? '' : 's'} ready for AI comparison.
                  </p>
                )}
              </div>

              {/* Selection */}
              <h3 className="text-lg font-bold text-gray-900 mb-4">Select SOPs to Compare</h3>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* SOP 1 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    SOP 1 (Baseline)
                  </label>
                  <select
                    value={sop1}
                    onChange={(e) => setSop1(e.target.value)}
                    disabled={uploadedSOPs.length < 2}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">{uploadedSOPs.length < 2 ? 'Upload at least two SOPs...' : 'Select SOP...'}</option>
                    {uploadedSOPs.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.title || file.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SOP 2 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    SOP 2 (Comparison)
                  </label>
                  <select
                    value={sop2}
                    onChange={(e) => setSop2(e.target.value)}
                    disabled={uploadedSOPs.length < 2}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">{uploadedSOPs.length < 2 ? 'Upload at least two SOPs...' : 'Select SOP...'}</option>
                    {uploadedSOPs.map((file) => (
                      <option
                        key={file.id}
                        value={file.id}
                        disabled={file.id === sop1}
                      >
                        {file.title || file.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={compareSOPs}
                disabled={!sop1 || !sop2 || comparisonLoading || uploadedSOPs.length < 2}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {comparisonLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Comparing SOPs...
                  </>
                ) : (
                  <>
                    <GitCompare className="w-5 h-5" />
                    Compare SOPs
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {comparisonResult && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Comparison Summary</h3>
                  
                  <div className="grid md:grid-cols-5 gap-4 mb-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-3xl font-bold text-gray-900">{comparisonResult.summary.totalSections}</p>
                      <p className="text-sm text-gray-600 mt-1">Total Sections</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-3xl font-bold text-green-600">{comparisonResult.summary.identicalSections}</p>
                      <p className="text-sm text-gray-600 mt-1">Identical</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-3xl font-bold text-yellow-600">{comparisonResult.summary.modifiedSections}</p>
                      <p className="text-sm text-gray-600 mt-1">Modified</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-3xl font-bold text-blue-600">{comparisonResult.summary.newSections}</p>
                      <p className="text-sm text-gray-600 mt-1">New</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-3xl font-bold text-red-600">{comparisonResult.summary.removedSections}</p>
                      <p className="text-sm text-gray-600 mt-1">Removed</p>
                    </div>
                  </div>

                  {/* Critical Changes Alert */}
                  {comparisonResult.criticalChanges.length > 0 && (
                    <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <p className="font-bold text-red-900 mb-2">Critical Changes Detected</p>
                          <ul className="space-y-1">
                            {comparisonResult.criticalChanges.map((change, idx) => (
                              <li key={idx} className="text-sm text-red-800">• {change}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detailed Differences */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Detailed Differences</h3>
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export Report
                    </button>
                  </div>

                  <div className="space-y-4">
                    {comparisonResult.differences.map((diff, idx) => (
                      <div key={idx} className={`border-2 rounded-xl p-5 ${getSeverityColor(diff.severity)}`}>
                        <div className="flex items-start gap-3 mb-4">
                          {getSeverityIcon(diff.severity)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-lg">{diff.section}</h4>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                                  diff.type === 'modified' ? 'bg-yellow-200 text-yellow-800' :
                                  diff.type === 'new' ? 'bg-blue-200 text-blue-800' :
                                  'bg-red-200 text-red-800'
                                }`}>
                                  {diff.type.toUpperCase()}
                                </span>
                                <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                                  diff.severity === 'high' ? 'bg-red-200 text-red-800' :
                                  diff.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                                  'bg-blue-200 text-blue-800'
                                }`}>
                                  {diff.severity.toUpperCase()} PRIORITY
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Side-by-side comparison */}
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          {/* SOP 1 */}
                          <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-bold text-gray-600">
                                {comparisonResult.sop1Details.id} (v{comparisonResult.sop1Details.version})
                              </p>
                              {diff.page1 && (
                                <span className="text-xs text-gray-500">Page {diff.page1}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-800">
                              {diff.sop1Text || <span className="italic text-gray-500">Section not present</span>}
                            </p>
                          </div>

                          {/* Arrow */}
                          <div className="hidden md:flex items-center justify-center">
                            <ArrowRight className="w-8 h-8 text-gray-400" />
                          </div>

                          {/* SOP 2 */}
                          <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-bold text-purple-600">
                                {comparisonResult.sop2Details.id} (v{comparisonResult.sop2Details.version})
                              </p>
                              {diff.page2 && (
                                <span className="text-xs text-purple-500">Page {diff.page2}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-800 font-medium">
                              {diff.sop2Text || <span className="italic text-gray-500">Section removed</span>}
                            </p>
                          </div>
                        </div>

                        {/* Impact */}
                        <div className="bg-white bg-opacity-50 rounded-lg p-3">
                          <p className="text-xs font-bold text-gray-700 mb-1">Impact:</p>
                          <p className="text-sm text-gray-800">{diff.impact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Recommended Actions</h3>
                  <div className="space-y-3">
                    {comparisonResult.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-800">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GxP Compliance Modal */}
      {showGxPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">GxP Compliance Dashboard</h2>
                    <p className="text-green-100">Good Practice Regulatory Compliance</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGxPModal(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <AlertCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* System Validation Status */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    System Validation Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Data Integrity</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">VALIDATED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Audit Trail</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">ACTIVE</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">User Authentication</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">COMPLIANT</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Electronic Signatures</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">READY</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Change Control</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">IMPLEMENTED</span>
                    </div>
                  </div>
                </div>

                {/* 21 CFR Part 11 Compliance */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    21 CFR Part 11 Compliance
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Electronic records are accurate, reliable, and equivalent to paper records</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Audit trails capture all user actions with timestamps</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">System controls prevent unauthorized access</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Data integrity maintained throughout lifecycle</span>
                    </div>
                    <a 
                      href="https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View FDA Guidance
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Compliance Documentation */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    Compliance Documentation
                  </h3>
                  <div className="space-y-2">
                    <button className="w-full text-left p-2 hover:bg-white rounded-lg transition-colors flex items-center justify-between">
                      <span className="text-sm text-gray-700">System Validation Protocol (SVP)</span>
                      <Download className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="w-full text-left p-2 hover:bg-white rounded-lg transition-colors flex items-center justify-between">
                      <span className="text-sm text-gray-700">User Requirements Specification (URS)</span>
                      <Download className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="w-full text-left p-2 hover:bg-white rounded-lg transition-colors flex items-center justify-between">
                      <span className="text-sm text-gray-700">Risk Assessment Report</span>
                      <Download className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="w-full text-left p-2 hover:bg-white rounded-lg transition-colors flex items-center justify-between">
                      <span className="text-sm text-gray-700">Audit Trail Specification</span>
                      <Download className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="w-full text-left p-2 hover:bg-white rounded-lg transition-colors flex items-center justify-between">
                      <span className="text-sm text-gray-700">Change Control Procedures</span>
                      <Download className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Audit Trail */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-600" />
                    Recent Audit Trail ({auditTrail.length} entries)
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {auditTrail.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No audit entries yet. Perform searches, chats, or comparisons to see audit trail.</p>
                    ) : (
                      auditTrail.slice(0, 10).map((entry) => (
                        <div key={entry.id} className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-blue-600">{entry.action}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">User: {entry.user}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {entry.action === 'DOCUMENT_SEARCH' && `Query: "${entry.details.query}"`}
                            {entry.action === 'SEARCH_COMPLETED' && `Found ${entry.details.sourcesFound} sources (${entry.details.confidence}% confidence)`}
                            {entry.action === 'CHAT_QUERY' && `Message in conversation ${entry.details.conversationId}`}
                            {entry.action === 'CHAT_RESPONSE' && `Response with ${entry.details.sourcesUsed} sources`}
                            {entry.action === 'SOP_COMPARISON_STARTED' && `Comparing ${entry.details.sop1.title} vs ${entry.details.sop2.title}`}
                            {entry.action === 'SOP_COMPARISON_COMPLETED' && `Found ${entry.details.differencesFound} differences, ${entry.details.criticalChanges} critical`}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  {auditTrail.length > 10 && (
                    <button className="w-full mt-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors">
                      View All {auditTrail.length} Entries
                    </button>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  System validated for GMP, GLP, GCP compliance
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    Export Audit Trail
                  </button>
                  <button 
                    onClick={() => setShowGxPModal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}