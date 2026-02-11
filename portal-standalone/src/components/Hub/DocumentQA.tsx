import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, CheckCircle, AlertCircle, Zap, Shield, Brain, MessageCircle, Send, Trash2, Share2, RefreshCw, ArrowLeft, Database, FileCheck, PenTool } from 'lucide-react';
import SOPUploader from '../SOPUploader';
import { complianceQueryService, type Document, type UnifiedQAResponse, type Citation, type ResponseType } from '../../lib/complianceQueryService';
import { processDocuments } from '../../lib/documentProcessor';
import * as docQAService from '../../lib/docQAService';

interface DocumentQAProps {
  onBack: () => void;
  user: {
    name: string;
    email: string;
    organization?: string;
    role: string;
  };
}

export default function DocumentQA({ onBack, user }: DocumentQAProps) {
  // Conversation State
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Recent Queries (replaces search history)
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  
  // Document Management - start empty, explicit load only
  const [processedDocuments, setProcessedDocuments] = useState<Document[]>([]);
  const [isProcessingDocs, setIsProcessingDocs] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);
  
  // GxP Compliance Modal
  const [showGxPModal, setShowGxPModal] = useState(false);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  
  // Starter question category
  const [starterCategory, setStarterCategory] = useState<string>('general');

  // Hero tab: 'questions' or 'writing'
  const [heroTab, setHeroTab] = useState<'questions' | 'writing'>('questions');
  const [activeWritingMode, setActiveWritingMode] = useState<string | null>(null);

  const WRITING_TOOLS: Array<{ id: string; label: string; icon: string; description: string; placeholder: string }> = [
    { id: 'rewrite-section', label: 'Rewrite / Standardize', icon: '✏️', description: 'Reformat an existing section to match standard template structure', placeholder: 'e.g. Rewrite the Roles & Responsibilities section in standard SOP format' },
    { id: 'summarize-training', label: 'Summarize for Training', icon: '🎓', description: 'Generate a training-ready summary from SOP content', placeholder: 'e.g. Create a training summary for lab technicians from this SOP' },
    { id: 'draft-audit-response', label: 'Draft Audit Response', icon: '📋', description: 'Map an audit finding to SOP evidence and draft a response', placeholder: 'e.g. Draft a response to finding: No evidence of periodic review schedule' },
    { id: 'change-impact', label: 'Change Impact Assessment', icon: '💥', description: 'Identify what would be affected by a proposed change', placeholder: 'e.g. What is the impact of changing the storage temperature from 25°C to 30°C?' },
    { id: 'capa-deviation', label: 'CAPA / Deviation Draft', icon: '⚠️', description: 'Structure a corrective action or deviation report from SOP baseline', placeholder: 'e.g. Draft a deviation report for missed calibration of equipment X' },
    { id: 'baseline-draft', label: 'Baseline Draft (New Document)', icon: '📄', description: 'Assemble a first draft from existing approved documents', placeholder: 'e.g. Create a baseline SOP draft for Equipment Cleaning using the uploaded SOPs' },
    { id: 'extract-reformat', label: 'Extract & Reformat', icon: '📊', description: 'Pull content into a new format: table, checklist, or matrix', placeholder: 'e.g. Extract all testing requirements into a checklist format' }
  ];

  const STARTER_QUESTIONS: Record<string, { label: string; icon: string; questions: string[] }> = {
    general: {
      label: 'General Inquiry',
      icon: '🔍',
      questions: [
        'What is the purpose of this SOP?',
        'Which sections are included in this procedure?',
        'Which roles are referenced?',
        'Where is deviation handling described?',
        'Where are documentation requirements defined?'
      ]
    },
    audit: {
      label: 'Audit Preparation',
      icon: '📋',
      questions: [
        'Where is this requirement stated in the SOP?',
        'What evidence supports this requirement?',
        'Which section defines compliance expectations?',
        'Where is review and approval documented?',
        'What records are required by this procedure?'
      ]
    },
    training: {
      label: 'Training Impact',
      icon: '🎓',
      questions: [
        'What training is required by this SOP?',
        'Which roles require training?',
        'Which sections would require retraining if updated?',
        'Are assessments mentioned or implied?',
        'Where is training responsibility defined?'
      ]
    },
    inspection: {
      label: 'Inspection Support',
      icon: '🔬',
      questions: [
        'Show me the exact section that answers this question',
        'What does the SOP say about testing frequency?',
        'What happens if requirements are not met?',
        'Which SOP version is referenced here?',
        'What related SOPs are mentioned?'
      ]
    },
    gap: {
      label: 'Gap Analysis',
      icon: '🔎',
      questions: [
        'What requirements in this SOP lack a defined responsible role?',
        'Are there any sections without a review or approval step?',
        'Which requirements have no associated records or evidence?',
        'What standard SOP elements are missing from this document?',
        'Are all referenced roles given defined responsibilities?'
      ]
    },
    comparison: {
      label: 'Compare Documents',
      icon: '⚖️',
      questions: [
        'Compare training requirements between the uploaded documents',
        'What changed between the document versions?',
        'Which documents have conflicting storage requirements?',
        'Compare the roles and responsibilities across documents',
        'What differences exist in the testing requirements?'
      ]
    },
    actions: {
      label: 'Action Items',
      icon: '📌',
      questions: [
        'Extract all action items and responsibilities from this SOP',
        'List all shall and must statements with their owners',
        'Generate a responsibility matrix from this document',
        'Which obligations have no named responsible party?',
        'List all training-related requirements and who they apply to'
      ]
    }
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [currentConversation]);

  // Load persisted conversations on mount
  useEffect(() => {
    const loadPersistedConversations = async () => {
      try {
        docQAService.initUserContext();
        const persistedConvs = await docQAService.getConversations();
        if (persistedConvs.length > 0) {
          // Transform to local format
          const localConvs = persistedConvs.map(conv => ({
            id: conv.id,
            title: conv.title || 'Untitled',
            messages: conv.messages.map(m => ({
              id: m.id,
              role: m.role,
              content: m.content,
              confidence: m.confidence,
              sources: m.sources,
              suggestedQuestions: m.suggestedQuestions,
              timestamp: m.createdAt
            })),
            createdAt: conv.createdAt,
            lastActivity: conv.updatedAt,
            metadata: {
              contextType: conv.contextType,
              sopLabels: conv.sopLabels,
              notes: conv.notes
            },
            persistedId: conv.id
          }));
          setConversations(localConvs);
        }
      } catch (error) {
        console.error('Error loading persisted conversations:', error);
      }
    };
    loadPersistedConversations();
  }, []);

  // Add audit trail entry
  const addAuditEntry = (action: string, details: any) => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: user.email,
      action,
      details,
      sessionId: 'sess_' + Math.random().toString(36).substr(2, 9)
    };
    setAuditTrail(prev => [entry, ...prev.slice(0, 49)]);
  };

  // Send a message directly (used by starter question pills)
  const sendMessageDirect = async (msg: string) => {
    if (!msg.trim()) return;
    const docLabels = processedDocuments.map(d => d.title).slice(0, 5);

    if (!currentConversation) {
      try {
        const persistedConv = await docQAService.createConversation('New Conversation', {
          contextType: starterCategory as any,
          sopLabels: docLabels,
          notes: ''
        });
        const newConv = {
          id: persistedConv?.id || Date.now(),
          title: 'New Conversation',
          messages: [],
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          metadata: { contextType: starterCategory, sopLabels: docLabels, notes: '', documentCount: processedDocuments.length },
          persistedId: persistedConv?.id
        };
        setConversations(prev => [newConv, ...prev]);
        setCurrentConversation(newConv);
        await sendMessageToConversation(msg, newConv);
      } catch {
        const newConv = {
          id: Date.now(),
          title: 'New Conversation',
          messages: [],
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          metadata: { contextType: starterCategory, sopLabels: docLabels, notes: '', documentCount: processedDocuments.length }
        };
        setConversations(prev => [newConv, ...prev]);
        setCurrentConversation(newConv);
        await sendMessageToConversation(msg, newConv);
      }
      return;
    }

    await sendMessageToConversation(msg, currentConversation);
  };

  // Send message — uses unified Q&A (auto-classifies question type)
  const sendMessage = async () => {
    if (!message.trim()) return;
    // If a writing mode is active, route through writing-assist
    if (activeWritingMode) {
      await sendWritingMessage(message, activeWritingMode);
      return;
    }
    await sendMessageDirect(message);
  };

  // Send a writing assistant request
  const sendWritingMessage = async (msg: string, mode: string) => {
    if (!msg.trim()) return;
    const docLabels = processedDocuments.map(d => d.title).slice(0, 5);

    // Auto-create conversation if needed
    let conv = currentConversation;
    if (!conv) {
      try {
        const persistedConv = await docQAService.createConversation('Writing: ' + WRITING_TOOLS.find(t => t.id === mode)?.label, {
          contextType: 'writing' as any,
          sopLabels: docLabels,
          notes: `Writing mode: ${mode}`
        });
        conv = {
          id: persistedConv?.id || Date.now(),
          title: 'Writing: ' + (WRITING_TOOLS.find(t => t.id === mode)?.label || 'Draft'),
          messages: [],
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          metadata: { contextType: 'writing', sopLabels: docLabels, notes: `Writing mode: ${mode}`, documentCount: processedDocuments.length },
          persistedId: persistedConv?.id
        };
      } catch {
        conv = {
          id: Date.now(),
          title: 'Writing: ' + (WRITING_TOOLS.find(t => t.id === mode)?.label || 'Draft'),
          messages: [],
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          metadata: { contextType: 'writing', sopLabels: docLabels, notes: `Writing mode: ${mode}`, documentCount: processedDocuments.length }
        };
      }
      setConversations(prev => [conv!, ...prev]);
      setCurrentConversation(conv);
    }

    const userMessage = {
      id: Date.now(),
      role: 'user' as const,
      content: `✍️ [${WRITING_TOOLS.find(t => t.id === mode)?.label}] ${msg}`,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...(conv.messages || []), userMessage];
    const newTitle = conv.messages.length === 0 ? 'Writing: ' + msg.substring(0, 40) : conv.title;
    const updatedConv = { ...conv, messages: updatedMessages, title: newTitle, lastActivity: new Date().toISOString() };

    setCurrentConversation(updatedConv);
    setConversations(prev => prev.map(c => c.id === updatedConv.id ? updatedConv : c));
    setMessage('');
    setActiveWritingMode(null);
    setIsTyping(true);

    if (conv.persistedId) {
      try {
        await docQAService.addMessage(conv.persistedId, { role: 'user', content: userMessage.content });
        if (conv.messages.length === 0) {
          await docQAService.updateConversation(conv.persistedId, { title: newTitle });
        }
      } catch (error) {
        console.error('Error persisting user message:', error);
      }
    }

    try {
      const conversationHistory = updatedMessages.map(m => ({ role: m.role, content: m.content }));

      addAuditEntry('WRITING_ASSIST_REQUEST', {
        message: msg,
        writingMode: mode,
        conversationId: conv.id,
        documentCount: processedDocuments.length
      });

      const response = await complianceQueryService.writingAssist(msg, mode, processedDocuments, conversationHistory);

      addAuditEntry('WRITING_ASSIST_RESPONSE', {
        conversationId: conv.id,
        writingMode: mode,
        responseType: response.responseType,
        confidence: response.confidence,
        citationsCount: response.citations?.length || 0
      });

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant' as const,
        content: response.answer,
        confidence: response.confidence,
        responseType: response.responseType || 'WRITING_ASSIST',
        citations: response.citations || [],
        suggestedQuestions: response.suggestedQuestions || [],
        timestamp: new Date().toISOString()
      };

      if (conv.persistedId) {
        try {
          await docQAService.addMessage(conv.persistedId, {
            role: 'assistant',
            content: response.answer,
            confidence: response.confidence,
            sources: response.citations,
            suggestedQuestions: response.suggestedQuestions
          });
        } catch (error) {
          console.error('Error persisting assistant message:', error);
        }
      }

      const finalMessages = [...updatedMessages, assistantMessage];
      const finalConv = { ...updatedConv, messages: finalMessages };
      setCurrentConversation(finalConv);
      setConversations(prev => prev.map(c => c.id === finalConv.id ? finalConv : c));
    } catch (error) {
      console.error('Writing assist error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error processing your writing request. Please try again.',
        confidence: 0,
        responseType: 'WRITING_ASSIST' as ResponseType,
        citations: [],
        suggestedQuestions: [],
        timestamp: new Date().toISOString()
      };
      const finalMessages = [...updatedMessages, errorMessage];
      const finalConv = { ...updatedConv, messages: finalMessages };
      setCurrentConversation(finalConv);
      setConversations(prev => prev.map(c => c.id === finalConv.id ? finalConv : c));
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessageToConversation = async (msg: string, conv: any) => {
    const userMessage = {
      id: Date.now(),
      role: 'user' as const,
      content: msg,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...(conv.messages || []), userMessage];
    const newTitle = conv.messages.length === 0 ? msg.substring(0, 50) : conv.title;
    const updatedConv = {
      ...conv,
      messages: updatedMessages,
      title: newTitle,
      lastActivity: new Date().toISOString()
    };

    setCurrentConversation(updatedConv);
    setConversations(prev => prev.map(c => c.id === updatedConv.id ? updatedConv : c));
    setMessage('');
    setIsTyping(true);

    // Track as recent query
    setRecentQueries(prev => [
      { id: Date.now(), query: msg, timestamp: new Date().toISOString() },
      ...prev.slice(0, 4)
    ]);

    // Persist user message to Supabase
    if (conv.persistedId) {
      try {
        await docQAService.addMessage(conv.persistedId, { role: 'user', content: msg });
        if (conv.messages.length === 0) {
          await docQAService.updateConversation(conv.persistedId, { title: newTitle });
        }
      } catch (error) {
        console.error('Error persisting user message:', error);
      }
    }

    try {
      const conversationHistory = updatedMessages.map(m => ({ role: m.role, content: m.content }));

      addAuditEntry('UNIFIED_QA_QUERY', {
        message: msg,
        conversationId: conv.id,
        documentCount: processedDocuments.length
      });

      const response = await complianceQueryService.unifiedQA(msg, conversationHistory, processedDocuments);

      addAuditEntry('UNIFIED_QA_RESPONSE', {
        conversationId: conv.id,
        responseType: response.responseType,
        confidence: response.confidence,
        citationsCount: response.citations?.length || 0
      });

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant' as const,
        content: response.answer,
        confidence: response.confidence,
        responseType: response.responseType,
        citations: response.citations || [],
        suggestedQuestions: response.suggestedQuestions || [],
        timestamp: new Date().toISOString()
      };

      // Persist assistant message + search history
      if (conv.persistedId) {
        try {
          await docQAService.addMessage(conv.persistedId, {
            role: 'assistant',
            content: response.answer,
            confidence: response.confidence,
            sources: response.citations,
            suggestedQuestions: response.suggestedQuestions
          });
        } catch (error) {
          console.error('Error persisting assistant message:', error);
        }
      }

      // Persist search history (queries + citations only)
      try {
        await docQAService.saveSearchHistory(
          msg,
          response.answer,
          response.confidence,
          response.citations || [],
          processedDocuments.map(d => d.title)
        );
      } catch (persistError) {
        console.error('Error persisting search history:', persistError);
      }

      const finalMessages = [...updatedMessages, assistantMessage];
      const finalConv = { ...updatedConv, messages: finalMessages };

      setCurrentConversation(finalConv);
      setConversations(prev => prev.map(c => c.id === finalConv.id ? finalConv : c));
    } catch (error) {
      console.error('Unified QA error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again.',
        confidence: 0,
        responseType: 'EXPLANATION' as ResponseType,
        citations: [],
        suggestedQuestions: [],
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, errorMessage];
      const finalConv = { ...updatedConv, messages: finalMessages };

      setCurrentConversation(finalConv);
      setConversations(prev => prev.map(c => c.id === finalConv.id ? finalConv : c));
    } finally {
      setIsTyping(false);
    }
  };

  // Delete conversation
  const deleteConversation = async (convId: string | number) => {
    // Find conversation to get persisted ID
    const conv = conversations.find(c => c.id === convId);
    if (conv?.persistedId) {
      try {
        await docQAService.deleteConversation(conv.persistedId);
      } catch (error) {
        console.error('Error deleting persisted conversation:', error);
      }
    }
    setConversations(conversations.filter(c => c.id !== convId));
    if (currentConversation?.id === convId) {
      setCurrentConversation(null);
    }
    addAuditEntry('DELETE_CONVERSATION', { conversationId: convId });
  };

  // Export as Audit Evidence (Structured HTML/PDF-ready)
  const exportAsAuditEvidence = (conv: any) => {
    const contextLabels: Record<string, string> = {
      'general': 'General Inquiry',
      'audit': 'Audit Preparation',
      'training': 'Training Impact',
      'inspection': 'Inspection Support'
    };
    
    const sopList = conv.metadata?.sopLabels?.join(', ') || processedDocuments.map(d => d.title).join(', ') || 'Not specified';
    const contextType = contextLabels[conv.metadata?.contextType] || 'General Inquiry';
    
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Audit Evidence - ${conv.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    .header { border-bottom: 2px solid #1e40af; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #1e40af; margin: 0 0 10px 0; }
    .meta { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .meta-row { display: flex; margin-bottom: 8px; }
    .meta-label { font-weight: bold; width: 150px; color: #475569; }
    .meta-value { color: #1e293b; }
    .qa-section { margin-bottom: 30px; }
    .question { background: #eff6ff; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
    .question-label { font-size: 12px; color: #3b82f6; font-weight: bold; margin-bottom: 5px; }
    .answer { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; }
    .answer-label { font-size: 12px; color: #64748b; font-weight: bold; margin-bottom: 5px; }
    .source { background: #fefce8; padding: 10px; border-radius: 6px; margin-top: 10px; font-size: 13px; }
    .source-title { font-weight: bold; color: #854d0e; }
    .confidence { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 10px; }
    .confidence-high { background: #dcfce7; color: #166534; }
    .confidence-med { background: #fef9c3; color: #854d0e; }
    .confidence-low { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
    .disclaimer { background: #fef3c7; padding: 12px; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Document Q&A - Audit Evidence</h1>
    <p style="color: #64748b; margin: 0;">Conversation Export for Compliance Records</p>
  </div>
  
  <div class="meta">
    <div class="meta-row"><span class="meta-label">Document(s):</span><span class="meta-value">${sopList}</span></div>
    <div class="meta-row"><span class="meta-label">Context Type:</span><span class="meta-value">${contextType}</span></div>
    <div class="meta-row"><span class="meta-label">Conversation Date:</span><span class="meta-value">${new Date(conv.createdAt).toLocaleString()}</span></div>
    <div class="meta-row"><span class="meta-label">Export Date:</span><span class="meta-value">${new Date().toLocaleString()}</span></div>
    <div class="meta-row"><span class="meta-label">User:</span><span class="meta-value">${user.email}</span></div>
    ${conv.metadata?.notes ? `<div class="meta-row"><span class="meta-label">Notes:</span><span class="meta-value">${conv.metadata.notes}</span></div>` : ''}
  </div>
  
  <h2>Questions & Answers</h2>
`;

    // Add Q&A pairs
    const messages = conv.messages || [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'user') {
        html += `
  <div class="qa-section">
    <div class="question">
      <div class="question-label">QUESTION</div>
      <p style="margin: 0;">${msg.content}</p>
    </div>`;
        
        // Find the corresponding answer
        if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
          const answer = messages[i + 1];
          const confClass = answer.confidence >= 90 ? 'confidence-high' : answer.confidence >= 75 ? 'confidence-med' : 'confidence-low';
          
          html += `
    <div class="answer">
      <div class="answer-label">RESPONSE</div>
      <p style="margin: 0 0 10px 0;">${answer.content}</p>
      ${answer.confidence !== undefined ? `<span class="confidence ${confClass}">${answer.confidence}% Confidence</span>` : ''}`;
          
          // Add sources
          if (answer.sources && answer.sources.length > 0) {
            html += `<div style="margin-top: 15px;"><strong style="font-size: 13px;">Sources:</strong></div>`;
            answer.sources.forEach((src: any) => {
              html += `
      <div class="source">
        <span class="source-title">${src.document}</span> - Section: ${src.section}, Page ${src.page}<br/>
        <em>"${src.exactQuote}"</em>
      </div>`;
            });
          }
          
          html += `
    </div>
  </div>`;
        }
      }
    }

    html += `
  <div class="footer">
    <p><strong>Export generated by:</strong> CapNorth Hub - Document Q&A</p>
    <div class="disclaimer">
      <strong>⚠️ Disclaimer:</strong> All responses in this document are derived only from the uploaded source documents. 
      This export is provided for audit and compliance documentation purposes only.
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-evidence-${conv.id}.html`;
    a.click();
    
    addAuditEntry('EXPORT_AUDIT_EVIDENCE', {
      conversationId: conv.id,
      messageCount: conv.messages?.length || 0
    });
  };

  // Response type label helpers
  const getResponseTypeLabel = (responseType: string) => {
    switch (responseType) {
      case 'EXACT_REFERENCE': return { label: 'Exact reference', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'EXPLANATION': return { label: 'Explanation (document-based)', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'SUMMARY': return { label: 'Summary (document-based)', color: 'bg-teal-100 text-teal-700 border-teal-200' };
      case 'GAP_ANALYSIS': return { label: 'Gap analysis (document-based)', color: 'bg-orange-100 text-orange-700 border-orange-200' };
      case 'COMPARISON': return { label: 'Cross-document comparison', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' };
      case 'ACTION_EXTRACTION': return { label: 'Action item extraction', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'WRITING_ASSIST': return { label: '✍️ Baseline draft (document-based)', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'REFUSAL': return { label: 'Outside scope', color: 'bg-red-100 text-red-700 border-red-200' };
      case 'NEEDS_DOCS': return { label: 'Documents required', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      default: return { label: 'Response', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  // Track which files we've already processed to avoid duplicates
  const processedFileIds = useRef<Set<string>>(new Set());

  // Handle uploaded SOP files
  const handleSOPUpload = async (uploadedFiles: any[]) => {
    if (!uploadedFiles || uploadedFiles.length === 0) {
      console.log('No files to process');
      return;
    }
    
    // Filter to only new files we haven't processed yet
    const newFiles = uploadedFiles.filter(uf => !processedFileIds.current.has(uf.id));
    
    if (newFiles.length === 0) {
      console.log('All files already processed');
      return;
    }
    
    console.log('Processing new files:', newFiles.length, 'of', uploadedFiles.length, 'total');
    setIsProcessingDocs(true);
    
    try {
      const fileObjects = newFiles.map(uf => uf.file).filter(Boolean);
      
      if (fileObjects.length === 0) {
        console.warn('No valid file objects found');
        return;
      }
      
      const processed = await processDocuments(fileObjects);
      console.log('Documents processed:', processed.length);
      
      // Mark these files as processed
      newFiles.forEach(uf => processedFileIds.current.add(uf.id));
      
      if (processed.length > 0) {
        setProcessedDocuments(prev => [...prev, ...processed]);
        addAuditEntry('DOCUMENTS_UPLOADED', { count: processed.length, titles: processed.map(d => d.title) });
      }
    } catch (error) {
      console.error('Error processing SOPs:', error);
    } finally {
      setIsProcessingDocs(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50';
    if (confidence >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 90) return <CheckCircle className="w-5 h-5" />;
    if (confidence >= 75) return <Zap className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Document Q&A</h1>
                <p className="text-sm text-white/70">Ask about your documents</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGxPModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-lg hover:bg-green-500/30 transition-colors"
            >
              <Shield className="w-4 h-4 text-green-300" />
              <span className="text-sm font-medium text-green-200">GxP Compliant</span>
            </button>
            <div className="px-3 py-2 bg-white/10 rounded-lg">
              <span className="text-sm text-white/80">{user.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Document Stats Bar */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border">
            <Database className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">
              {processedDocuments.length} Documents Loaded
            </span>
          </div>
          {processedDocuments.length > 0 && (
            <button
              onClick={() => {
                setProcessedDocuments([]);
                processedFileIds.current.clear();
                setUploaderKey(prev => prev + 1);
                addAuditEntry('CLEAR_ALL_DOCUMENTS', { cleared: true });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {/* UNIFIED Q&A */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <button
              onClick={() => setCurrentConversation(null)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
            >
              <MessageCircle className="w-5 h-5" />
              New Conversation
            </button>

            {/* Conversations */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Conversations</h3>
              {conversations.length === 0 ? (
                <p className="text-sm text-gray-500">No conversations yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        currentConversation?.id === conv.id
                          ? 'bg-indigo-100 border-2 border-indigo-300'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                      onClick={() => setCurrentConversation(conv)}
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{conv.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{conv.messages.length} messages</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={(e) => { e.stopPropagation(); exportAsAuditEvidence(conv); }} className="p-1 text-gray-400 hover:text-green-600" title="Export as Audit Evidence"><FileCheck className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="p-1 text-gray-400 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Queries */}
            {recentQueries.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Queries</h3>
                <div className="space-y-2">
                  {recentQueries.slice(0, 5).map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => setMessage(item.query)}
                      className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <p className="text-sm text-gray-700 truncate">{item.query}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(item.timestamp).toLocaleTimeString()}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Documents in Scope */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Documents in Scope ({processedDocuments.length})</h3>
              <p className="text-xs text-gray-500 mb-2">Approved documents only.</p>
              <p className="text-xs text-amber-600 mb-3">📌 Scoped to this session only.</p>
              <SOPUploader key={uploaderKey} onFilesUploaded={handleSOPUpload} maxFiles={10} />
              {isProcessingDocs && (
                <div className="mt-2 text-sm text-indigo-600 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </div>
              )}
            </div>
          </div>

          {/* Main Q&A Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg flex flex-col h-[700px]">
              {currentConversation ? (
                <>
                  {/* Conversation Header */}
                  <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{currentConversation.title}</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={() => exportAsAuditEvidence(currentConversation)} className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Export as Audit Evidence"><FileCheck className="w-5 h-5" /></button>
                    </div>
                  </div>

                  {/* Messages Timeline */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {processedDocuments.length === 0 && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 font-medium">⚠️ No documents in scope</p>
                        <p className="text-sm text-amber-700 mt-1">Upload approved documents to begin. AI will only reference uploaded sources.</p>
                      </div>
                    )}

                    {currentConversation.messages.map((msg: any) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                          {/* Response type label */}
                          {msg.role === 'assistant' && msg.responseType && (
                            <div className="mt-2" title="Generated only from uploaded documents, with citations.">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getResponseTypeLabel(msg.responseType).color}`}>
                                {getResponseTypeLabel(msg.responseType).label}
                              </span>
                            </div>
                          )}

                          {/* Confidence — hidden for REFUSAL */}
                          {msg.role === 'assistant' && msg.confidence !== undefined && msg.confidence > 0 && msg.responseType !== 'REFUSAL' && (
                            <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium ${getConfidenceColor(msg.confidence)}`}>
                              {getConfidenceIcon(msg.confidence)}
                              {msg.confidence}% Confident
                            </div>
                          )}

                          {/* Citations (structured) */}
                          {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-semibold text-gray-600">Sources:</p>
                              {msg.citations.map((cite: any, idx: number) => (
                                <div key={idx} className="p-2.5 bg-white rounded-lg border text-xs">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                                    <span className="font-medium text-blue-700">{cite.docTitle || cite.docId || cite.document}</span>
                                    {cite.version && <span className="text-gray-400">{cite.version}</span>}
                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">Page {cite.page}</span>
                                  </div>
                                  {cite.section && <p className="text-gray-500 mb-1">Section: {cite.section}</p>}
                                  {(cite.quote || cite.exactQuote) && (
                                    <p className="text-gray-700 italic">"{cite.quote || cite.exactQuote}"</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Legacy sources support */}
                          {msg.role === 'assistant' && !msg.citations?.length && msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-semibold text-gray-600">Sources:</p>
                              {msg.sources.slice(0, 3).map((source: any, idx: number) => (
                                <div key={idx} className="p-2 bg-white rounded-lg border text-xs">
                                  <span className="font-medium text-blue-700">{source.document}</span>
                                  <span className="text-gray-500 ml-2">Page {source.page}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Suggested questions */}
                          {msg.role === 'assistant' && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Suggested questions:</p>
                              <div className="flex flex-wrap gap-2">
                                {msg.suggestedQuestions.slice(0, 3).map((q: string, idx: number) => (
                                  <button key={idx} onClick={() => setMessage(q)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs hover:bg-indigo-200 transition-colors">
                                    {q}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 p-4 rounded-2xl">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="px-6 py-4 border-t">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask where something is stated, or ask for clarification (answers use only uploaded documents)."
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none"
                        disabled={processedDocuments.length === 0}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!message.trim() || isTyping || processedDocuments.length === 0}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col">
                  {/* Hero Header */}
                  <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                      {heroTab === 'questions' ? <MessageCircle className="w-8 h-8 text-purple-500" /> : <PenTool className="w-8 h-8 text-amber-600" />}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {heroTab === 'questions' ? 'Start a Conversation' : 'Writing Assistant'}
                    </h3>
                    <p className="text-sm text-gray-500 text-center max-w-lg mb-5">
                      {heroTab === 'questions'
                        ? 'Ask me anything about your documents. I can help you find information, compare data, and answer complex questions.'
                        : 'Generate document-anchored drafts from your uploaded SOPs. All output is based only on your documents.'}
                    </p>

                    {/* Hero Tab Toggle */}
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
                      <button
                        onClick={() => { setHeroTab('questions'); setActiveWritingMode(null); }}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                          heroTab === 'questions' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                        Ask Questions
                      </button>
                      <button
                        onClick={() => { setHeroTab('writing'); setActiveWritingMode(null); }}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                          heroTab === 'writing' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <PenTool className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                        Writing Assistant
                      </button>
                    </div>

                    {heroTab === 'questions' ? (
                      <>
                        {/* Category Tabs */}
                        <div className="flex flex-wrap justify-center gap-2 mb-5">
                          {Object.entries(STARTER_QUESTIONS).map(([key, cat]) => (
                            <button
                              key={key}
                              onClick={() => setStarterCategory(key)}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                starterCategory === key
                                  ? 'bg-purple-600 text-white shadow-md'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {cat.icon} {cat.label}
                            </button>
                          ))}
                        </div>

                        {/* Starter Question Pills */}
                        <div className="w-full max-w-2xl">
                          <p className="text-xs text-gray-400 text-center mb-3">Suggested questions (click to load):</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {STARTER_QUESTIONS[starterCategory].questions.map((q, idx) => (
                              <button
                                key={idx}
                                onClick={() => setMessage(q)}
                                disabled={processedDocuments.length === 0}
                                className="px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-700 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                          {processedDocuments.length === 0 && (
                            <p className="text-xs text-amber-600 text-center mt-4">Upload documents first to start asking questions.</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Writing Tools Grid */}
                        <div className="w-full max-w-3xl">
                          {!activeWritingMode ? (
                            <>
                              <p className="text-xs text-gray-400 text-center mb-4">Select a writing tool to get started:</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {WRITING_TOOLS.map((tool) => (
                                  <button
                                    key={tool.id}
                                    onClick={() => { setActiveWritingMode(tool.id); setMessage(''); }}
                                    disabled={processedDocuments.length === 0}
                                    className="flex items-start gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl text-left hover:border-amber-400 hover:bg-amber-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                                  >
                                    <span className="text-2xl mt-0.5">{tool.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-800 group-hover:text-amber-800">{tool.label}</p>
                                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{tool.description}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                              {processedDocuments.length === 0 && (
                                <p className="text-xs text-amber-600 text-center mt-4">Upload documents first to use the Writing Assistant.</p>
                              )}
                            </>
                          ) : (
                            <>
                              {/* Active writing mode */}
                              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{WRITING_TOOLS.find(t => t.id === activeWritingMode)?.icon}</span>
                                    <span className="font-semibold text-amber-900">{WRITING_TOOLS.find(t => t.id === activeWritingMode)?.label}</span>
                                  </div>
                                  <button
                                    onClick={() => setActiveWritingMode(null)}
                                    className="text-xs text-amber-700 hover:text-amber-900 px-2 py-1 rounded hover:bg-amber-100 transition-colors"
                                  >
                                    Change tool
                                  </button>
                                </div>
                                <p className="text-xs text-amber-800">{WRITING_TOOLS.find(t => t.id === activeWritingMode)?.description}</p>
                                <div className="mt-3 p-3 bg-white/60 rounded-lg border border-amber-200">
                                  <p className="text-xs text-amber-700 font-medium mb-1">How to use:</p>
                                  <p className="text-xs text-amber-600">Describe what you need in the input below. Be specific about sections, roles, or topics. The output will use only your uploaded documents.</p>
                                </div>
                              </div>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Example prompt:</p>
                                <button
                                  onClick={() => setMessage(WRITING_TOOLS.find(t => t.id === activeWritingMode)?.placeholder?.replace('e.g. ', '') || '')}
                                  className="text-xs text-purple-600 hover:text-purple-800 hover:underline cursor-pointer text-left"
                                >
                                  {WRITING_TOOLS.find(t => t.id === activeWritingMode)?.placeholder}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Input at bottom */}
                  <div className="px-6 py-4 border-t">
                    {activeWritingMode && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium border border-amber-200">
                          <PenTool className="w-3 h-3" />
                          {WRITING_TOOLS.find(t => t.id === activeWritingMode)?.label}
                        </span>
                        <button onClick={() => setActiveWritingMode(null)} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={activeWritingMode
                          ? WRITING_TOOLS.find(t => t.id === activeWritingMode)?.placeholder || 'Describe what you need...'
                          : 'Ask me anything about your documents...'}
                        className={`flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none ${
                          activeWritingMode
                            ? 'border-amber-300 focus:border-amber-500'
                            : 'border-gray-300 focus:border-purple-500'
                        }`}
                        disabled={processedDocuments.length === 0}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!message.trim() || isTyping || processedDocuments.length === 0}
                        className={`px-6 py-3 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 ${
                          activeWritingMode
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                        }`}
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 text-center mt-2">
                      {activeWritingMode
                        ? 'All drafts are generated from uploaded documents only \u2022 Requires review before use'
                        : 'Press Enter to send'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GxP Compliance Modal */}
      {showGxPModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6" />
                <h2 className="text-xl font-bold">GxP Compliance</h2>
              </div>
              <button
                onClick={() => setShowGxPModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">✓ 21 CFR Part 11 Compliant</h3>
                  <p className="text-sm text-green-800">All interactions are logged with timestamps, user identification, and session tracking.</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">✓ Audit Trail</h3>
                  <p className="text-sm text-blue-800">Complete audit trail maintained for all searches, chats, and document operations.</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2">✓ Data Integrity</h3>
                  <p className="text-sm text-purple-800">AI responses include confidence scores and source citations for verification.</p>
                </div>

                {/* Data Retention Policy */}
                <h3 className="font-semibold text-gray-900 mt-6 mb-3">📋 Data Retention Policy</h3>
                
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h3 className="font-semibold text-amber-900 mb-2">📄 Uploaded Documents</h3>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• <strong>Conversation-scoped:</strong> Documents exist only within their session</li>
                    <li>• <strong>Ephemeral:</strong> Not stored permanently - cleared on session end</li>
                    <li>• <strong>No global storage:</strong> Documents are not retained in any library</li>
                    <li>• <strong>No indexing:</strong> Documents are not silently indexed or processed</li>
                  </ul>
                </div>

                <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
                  <h3 className="font-semibold text-sky-900 mb-2">💬 Conversations & Search History</h3>
                  <ul className="text-sm text-sky-800 space-y-1">
                    <li>• <strong>Retained:</strong> Questions, answers, and citations are persisted</li>
                    <li>• <strong>Exportable:</strong> Download as Audit Evidence at any time</li>
                    <li>• <strong>User-controlled:</strong> Delete conversation removes all associated data</li>
                    <li>• <strong>Clear ownership:</strong> Each conversation has explicit scope and metadata</li>
                  </ul>
                </div>

                <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                  <h3 className="font-semibold text-rose-900 mb-2">🤖 AI Training & Memory</h3>
                  <ul className="text-sm text-rose-800 space-y-1">
                    <li>• <strong>No AI training:</strong> Documents and conversations are NOT used to train AI models</li>
                    <li>• <strong>No cross-conversation memory:</strong> AI context is limited to current conversation only</li>
                    <li>• <strong>No cross-client learning:</strong> Data is never shared between organizations</li>
                  </ul>
                </div>
                
                <h3 className="font-semibold text-gray-900 mt-6 mb-3">Recent Audit Entries ({auditTrail.length})</h3>
                {auditTrail.length === 0 ? (
                  <p className="text-sm text-gray-500">No audit entries yet</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {auditTrail.slice(0, 10).map((entry) => (
                      <div key={entry.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{entry.action}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{entry.user} • {entry.sessionId}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
