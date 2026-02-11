import { supabase } from './supabaseClient';

// Types for Document Q&A persistence
export interface ConversationMetadata {
  contextType: 'general' | 'audit' | 'training' | 'inspection';
  sopLabels: string[];
  notes: string;
}

export interface MessageSource {
  document: string;
  section: string;
  page: number;
  exactQuote: string;
  relevance: number;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  confidence?: number;
  sources?: MessageSource[];
  suggestedQuestions?: string[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  sessionId: string;
  title: string;
  contextType: string;
  sopLabels: string[];
  notes: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface SearchHistoryItem {
  id: string;
  userId: string;
  sessionId: string;
  query: string;
  answer: string;
  confidence: number;
  sources: MessageSource[];
  documentTitles: string[];
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  sessionId: string;
  action: string;
  details: Record<string, any>;
  conversationId?: string;
  createdAt: string;
}

// Helper to get current user/session info
const getUserContext = () => {
  return {
    userId: localStorage.getItem('qa_user_id') || `user_${Date.now()}`,
    sessionId: localStorage.getItem('qa_session_id') || `session_${Date.now()}`
  };
};

// Initialize user context if not exists
export const initUserContext = () => {
  if (!localStorage.getItem('qa_user_id')) {
    localStorage.setItem('qa_user_id', `user_${Date.now()}`);
  }
  if (!localStorage.getItem('qa_session_id')) {
    localStorage.setItem('qa_session_id', `session_${Date.now()}`);
  }
  return getUserContext();
};

// ============ CONVERSATION OPERATIONS ============

export const createConversation = async (
  title: string,
  metadata: ConversationMetadata
): Promise<Conversation | null> => {
  const { userId, sessionId } = getUserContext();
  
  const { data, error } = await supabase
    .from('docqa_conversations')
    .insert({
      user_id: userId,
      session_id: sessionId,
      title,
      context_type: metadata.contextType,
      sop_labels: metadata.sopLabels,
      notes: metadata.notes,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    return null;
  }

  // Log the action
  await logAuditEntry('CREATE_CONVERSATION', { conversationId: data.id, title }, data.id);

  return {
    id: data.id,
    userId: data.user_id,
    sessionId: data.session_id,
    title: data.title,
    contextType: data.context_type,
    sopLabels: data.sop_labels || [],
    notes: data.notes || '',
    messages: [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isActive: data.is_active
  };
};

export const getConversations = async (): Promise<Conversation[]> => {
  const { userId } = getUserContext();

  const { data, error } = await supabase
    .from('docqa_conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }

  // Fetch messages for each conversation
  const conversations: Conversation[] = [];
  for (const conv of data || []) {
    const messages = await getConversationMessages(conv.id);
    conversations.push({
      id: conv.id,
      userId: conv.user_id,
      sessionId: conv.session_id,
      title: conv.title,
      contextType: conv.context_type,
      sopLabels: conv.sop_labels || [],
      notes: conv.notes || '',
      messages,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      isActive: conv.is_active
    });
  }

  return conversations;
};

export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
  const { data, error } = await supabase
    .from('docqa_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    console.error('Error fetching conversation:', error);
    return null;
  }

  const messages = await getConversationMessages(conversationId);

  return {
    id: data.id,
    userId: data.user_id,
    sessionId: data.session_id,
    title: data.title,
    contextType: data.context_type,
    sopLabels: data.sop_labels || [],
    notes: data.notes || '',
    messages,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isActive: data.is_active
  };
};

export const updateConversation = async (
  conversationId: string,
  updates: Partial<{ title: string; contextType: string; sopLabels: string[]; notes: string }>
): Promise<boolean> => {
  const updateData: Record<string, any> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.contextType !== undefined) updateData.context_type = updates.contextType;
  if (updates.sopLabels !== undefined) updateData.sop_labels = updates.sopLabels;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { error } = await supabase
    .from('docqa_conversations')
    .update(updateData)
    .eq('id', conversationId);

  if (error) {
    console.error('Error updating conversation:', error);
    return false;
  }

  await logAuditEntry('UPDATE_CONVERSATION', { conversationId, updates }, conversationId);
  return true;
};

export const deleteConversation = async (conversationId: string): Promise<boolean> => {
  // Soft delete - mark as inactive and set deleted_at
  const { error } = await supabase
    .from('docqa_conversations')
    .update({ 
      is_active: false, 
      deleted_at: new Date().toISOString() 
    })
    .eq('id', conversationId);

  if (error) {
    console.error('Error deleting conversation:', error);
    return false;
  }

  await logAuditEntry('DELETE_CONVERSATION', { conversationId }, conversationId);
  return true;
};

// ============ MESSAGE OPERATIONS ============

export const getConversationMessages = async (conversationId: string): Promise<ConversationMessage[]> => {
  const { data, error } = await supabase
    .from('docqa_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return (data || []).map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    confidence: msg.confidence,
    sources: msg.sources || [],
    suggestedQuestions: msg.suggested_questions || [],
    createdAt: msg.created_at
  }));
};

export const addMessage = async (
  conversationId: string,
  message: {
    role: 'user' | 'assistant';
    content: string;
    confidence?: number;
    sources?: any[];
    suggestedQuestions?: string[];
  }
): Promise<ConversationMessage | null> => {
  const { data, error } = await supabase
    .from('docqa_messages')
    .insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      confidence: message.confidence,
      sources: message.sources || [],
      suggested_questions: message.suggestedQuestions || []
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding message:', error);
    return null;
  }

  // Update conversation updated_at
  await supabase
    .from('docqa_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return {
    id: data.id,
    role: data.role,
    content: data.content,
    confidence: data.confidence,
    sources: data.sources || [],
    suggestedQuestions: data.suggested_questions || [],
    createdAt: data.created_at
  };
};

// ============ SEARCH HISTORY OPERATIONS ============

export const saveSearchHistory = async (
  query: string,
  answer: string,
  confidence: number,
  sources: any[],
  documentTitles: string[]
): Promise<SearchHistoryItem | null> => {
  const { userId, sessionId } = getUserContext();

  const { data, error } = await supabase
    .from('docqa_search_history')
    .insert({
      user_id: userId,
      session_id: sessionId,
      query,
      answer,
      confidence,
      sources,
      document_titles: documentTitles
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving search history:', error);
    return null;
  }

  await logAuditEntry('SEARCH_QUERY', { query, confidence, documentCount: documentTitles.length });

  return {
    id: data.id,
    userId: data.user_id,
    sessionId: data.session_id,
    query: data.query,
    answer: data.answer,
    confidence: data.confidence,
    sources: data.sources || [],
    documentTitles: data.document_titles || [],
    createdAt: data.created_at
  };
};

export const getSearchHistory = async (limit: number = 20): Promise<SearchHistoryItem[]> => {
  const { userId } = getUserContext();

  const { data, error } = await supabase
    .from('docqa_search_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching search history:', error);
    return [];
  }

  return (data || []).map(item => ({
    id: item.id,
    userId: item.user_id,
    sessionId: item.session_id,
    query: item.query,
    answer: item.answer,
    confidence: item.confidence,
    sources: item.sources || [],
    documentTitles: item.document_titles || [],
    createdAt: item.created_at
  }));
};

// ============ AUDIT LOG OPERATIONS ============

export const logAuditEntry = async (
  action: string,
  details: Record<string, any> = {},
  conversationId?: string
): Promise<void> => {
  const { userId, sessionId } = getUserContext();

  const { error } = await supabase
    .from('docqa_audit_log')
    .insert({
      user_id: userId,
      session_id: sessionId,
      action,
      details,
      conversation_id: conversationId
    });

  if (error) {
    console.error('Error logging audit entry:', error);
  }
};

export const getAuditLog = async (limit: number = 50): Promise<AuditLogEntry[]> => {
  const { userId } = getUserContext();

  const { data, error } = await supabase
    .from('docqa_audit_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching audit log:', error);
    return [];
  }

  return (data || []).map(entry => ({
    id: entry.id,
    userId: entry.user_id,
    sessionId: entry.session_id,
    action: entry.action,
    details: entry.details || {},
    conversationId: entry.conversation_id,
    createdAt: entry.created_at
  }));
};

// ============ EXPORT OPERATIONS ============

export const exportConversation = async (conversationId: string): Promise<any> => {
  const conversation = await getConversation(conversationId);
  if (!conversation) return null;

  await logAuditEntry('EXPORT_CONVERSATION', { conversationId }, conversationId);

  return {
    exportedAt: new Date().toISOString(),
    conversation: {
      id: conversation.id,
      title: conversation.title,
      contextType: conversation.contextType,
      sopLabels: conversation.sopLabels,
      notes: conversation.notes,
      createdAt: conversation.createdAt,
      messages: conversation.messages.map(m => ({
        role: m.role,
        content: m.content,
        confidence: m.confidence,
        sources: m.sources,
        timestamp: m.createdAt
      }))
    },
    disclaimer: 'All responses derived only from uploaded source documents. Documents are not retained after conversation deletion.'
  };
};
