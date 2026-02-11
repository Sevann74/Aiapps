import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ComplianceQueryRequest {
  operation: 'search' | 'chat' | 'compare-sops' | 'unified-qa' | 'summarize-sop-changes' | 'writing-assist';
  query?: string;
  writingMode?: string;
  writingContext?: Record<string, string>;
  conversationHistory?: Array<{ role: string; content: string }>;
  documents?: Array<{ id: string; title: string; content: string; metadata?: any }>;
  sop1?: { id: string; title: string; content: string; version?: string };
  sop2?: { id: string; title: string; content: string; version?: string };
  changes?: Array<any>;
}

// Helper: call Claude API
async function callClaude(apiKey: string, prompt: string, maxTokens = 4096, temperature = 0.3) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Anthropic API error:", errorText);
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return { parsed: JSON.parse(cleaned), raw: data };
  } catch {
    return { parsed: null, rawText: text, raw: data };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const requestData: ComplianceQueryRequest = await req.json();
    const { operation, query, conversationHistory, documents, sop1, sop2, writingMode, writingContext } = requestData;

    let prompt = "";
    let maxTokens = 4096;
    let temperature = 0.3;

    switch (operation) {
      case 'search':
        // Build context from available documents
        const documentContext = documents?.map(doc => 
          `Document: ${doc.title} (ID: ${doc.id})\n${doc.content}`
        ).join('\n\n---\n\n') || '';

        prompt = `You are a document search assistant. Your ONLY job is to find and extract exactly what is written in the provided documents.

MODE: STRICTLY EXTRACTIVE

ALLOWED:
- Quote or paraphrase ONLY what is explicitly written in the documents
- Provide exact location (document ID, section, page number)
- Answer the question "where is this stated?"
- State if the information is not found in the documents

EXPLICITLY FORBIDDEN - DO NOT DO THESE:
- Interpretation or inference beyond what is written
- Recommendations or suggestions
- Assumptions about meaning
- Opinions or judgments
- Information from outside the documents
- Summarizing across multiple statements

AVAILABLE DOCUMENTS:
${documentContext}

USER QUESTION:
${query}

Respond in this JSON format:
{
  "answer": "Direct statement of what the document says, with exact location. If not found, state clearly.",
  "confidence": 95,
  "sources": [
    {
      "document": "Document ID",
      "section": "Section name or number",
      "page": 12,
      "exactQuote": "Exact text copied from document",
      "relevance": 100
    }
  ],
  "relatedDocuments": ["DOC-ID-1", "DOC-ID-2"],
  "suggestedQuestions": [
    "Where is X described?",
    "What does the document state about Y?"
  ]
}`;
        break;

      case 'chat':
        // Build conversation context
        const conversationContext = conversationHistory?.map(msg => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n\n') || '';

        const chatDocContext = documents?.map(doc => 
          `Document: ${doc.title} (ID: ${doc.id})\n${doc.content}`
        ).join('\n\n---\n\n') || '';

        prompt = `You are a document assistant helping users understand uploaded documents. You may explain and summarize what the documents state, but you must stay within the bounds of the document content.

MODE: DOCUMENT-BOUNDED INTERPRETATION

ALLOWED:
- Summarizing multiple cited statements from the documents
- Explaining the meaning of what is written
- Clarifying scope (roles, training requirements, records, procedures)
- Connecting related statements within the documents
- Answering follow-up questions based on document content
- Citing sources with document IDs, sections, and pages

EXPLICITLY FORBIDDEN - DO NOT DO THESE:
- Recommendations or suggested actions
- Opinions or judgments
- Decisions or "what should we do" guidance
- Information from outside the provided documents
- Interpretation beyond what the document text supports

AVAILABLE DOCUMENTS:
${chatDocContext}

CONVERSATION HISTORY:
${conversationContext}

NEW USER MESSAGE:
${query}

Respond in this JSON format:
{
  "answer": "Helpful explanation of what the document states, with citations",
  "confidence": 90,
  "sources": [
    {
      "document": "Document ID",
      "section": "Section name",
      "page": 10,
      "exactQuote": "Relevant quote from document",
      "relevance": 95
    }
  ],
  "relatedDocuments": ["DOC-ID-1"],
  "suggestedQuestions": [
    "What does the document state about X?",
    "Where is Y described?",
    "How is Z defined in this procedure?"
  ]
}`;
        break;

      case 'compare-sops':
        if (!sop1 || !sop2) {
          throw new Error("Both SOP documents are required for comparison");
        }

        prompt = `You are a compliance document comparison expert. Compare these two SOP versions and identify all differences, changes, and their compliance impact.

CRITICAL RULES:
1. Identify ALL differences between the documents
2. Categorize changes by severity (high, medium, low)
3. Classify change types (modified, new, removed)
4. Assess compliance impact for each change
5. Provide specific section references and page numbers
6. Highlight critical changes that require immediate attention
7. Suggest recommended actions for each significant change

SOP 1 (Baseline):
Title: ${sop1.title}
Version: ${sop1.version || 'Unknown'}
Content:
${sop1.content.substring(0, 15000)}

SOP 2 (Comparison):
Title: ${sop2.title}
Version: ${sop2.version || 'Unknown'}
Content:
${sop2.content.substring(0, 15000)}

Respond in this JSON format:
{
  "summary": {
    "totalSections": 12,
    "identicalSections": 8,
    "modifiedSections": 3,
    "newSections": 1,
    "removedSections": 0
  },
  "differences": [
    {
      "section": "Section name or number",
      "type": "modified|new|removed",
      "severity": "high|medium|low",
      "sop1Text": "Text from SOP 1 or null if new",
      "sop2Text": "Text from SOP 2 or null if removed",
      "impact": "Description of compliance impact",
      "page1": 12,
      "page2": 12
    }
  ],
  "criticalChanges": [
    "Critical change description 1",
    "Critical change description 2"
  ],
  "recommendations": [
    "Recommended action 1",
    "Recommended action 2"
  ]
}`;
        maxTokens = 8192;
        break;

      case 'unified-qa': {
        // --- UNIFIED Q&A: Two-step classifier → router ---

        // Step 0: NEEDS_DOCS check (no API call needed)
        if (!documents || documents.length === 0) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                answer: "No documents are loaded. Upload approved documents to continue.",
                responseType: "NEEDS_DOCS",
                confidence: 0,
                citations: [],
                suggestedQuestions: []
              }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const uniDocContext = documents.map(doc =>
          `Document: ${doc.title} (ID: ${doc.id})\n${doc.content}`
        ).join('\n\n---\n\n');

        const uniConvContext = conversationHistory?.map(msg =>
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n\n') || '';

        // Step A: Lightweight classifier
        const classifierPrompt = `You are a question classifier for a regulated document Q&A system.

Classify the following user question into exactly ONE category:

- EXACT_REFERENCE: User wants to find WHERE something is stated, locate a specific fact, or get a direct quote. Keywords: "where", "find", "what does it say", "is there", "which section", "what is the [specific thing]".
- EXPLANATION: User wants to UNDERSTAND or have something explained, clarified, or connected across sections. This INCLUDES requests to generate assessment questions, quiz items, knowledge checks, or training questions based on document content — these are document-grounded reformatting tasks, NOT compliance judgments. Keywords: "explain", "what are the requirements", "describe", "how does", "which roles", "what training", "assessment questions", "quiz", "knowledge check", "test understanding", "create questions based on".
- SUMMARY: User wants a high-level overview or summary of the document(s). Keywords: "summarize", "overview", "key points", "main topics".
- GAP_ANALYSIS: User wants to identify what is MISSING, incomplete, or lacking in the document(s). Keywords: "gap", "missing", "lack", "without", "no defined", "not addressed", "incomplete", "what requirements lack", "are there sections without".
- COMPARISON: User wants to COMPARE two or more documents, versions, or sections. Keywords: "compare", "difference", "changed", "vs", "between", "conflicting", "version X and Y".
- ACTION_EXTRACTION: User wants to EXTRACT structured items like action items, responsibilities, obligations, or matrices from the document(s). Keywords: "extract", "list all", "action items", "responsibilities", "shall statements", "must statements", "RACI", "matrix", "obligations".
- REFUSAL: ONLY when the user explicitly asks for recommendations, best practices, what they "should" do, whether something is compliant with external regulations, or actions not stated in the documents. Keywords: "should we", "recommend", "what to do", "do we need to", "is this compliant", "best way to", "best practice", "what would you advise".

CRITICAL — DO NOT CLASSIFY AS REFUSAL if the user is asking to:
- Extract, summarize, reformat, or paraphrase document content
- Generate assessment questions, quiz items, or knowledge checks from document content
- Draft training materials or learning objectives from document content
- Rewrite or restructure existing document text
- Identify what the document states about any topic
These are all document-grounded tasks and must be classified as EXPLANATION or ACTION_EXTRACTION.

Conversation context (if any):
${uniConvContext}

User question:
"${query}"

Respond with ONLY this JSON (nothing else):
{"responseType": "EXACT_REFERENCE|EXPLANATION|SUMMARY|GAP_ANALYSIS|COMPARISON|ACTION_EXTRACTION|REFUSAL"}`;

        const classResult = await callClaude(apiKey, classifierPrompt, 100, 0.1);
        let responseType = classResult.parsed?.responseType || 'EXPLANATION';

        // Validate responseType
        const validTypes = ['EXACT_REFERENCE', 'EXPLANATION', 'SUMMARY', 'GAP_ANALYSIS', 'COMPARISON', 'ACTION_EXTRACTION', 'REFUSAL'];
        if (!validTypes.includes(responseType)) {
          responseType = 'EXPLANATION';
        }

        console.log(`Classifier result: ${responseType} for query: "${query}"`);

        // Step B: REFUSAL — no second call needed
        if (responseType === 'REFUSAL') {
          // Extract the topic from the query for context-aware safe rephrases
          const topicMatch = query?.match(/about\s+(.+?)[\?\.]*$/i) || query?.match(/(?:the|this)\s+(.+?)[\?\.]*$/i);
          const topic = topicMatch ? topicMatch[1].trim() : 'this topic';

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                answer: "This question asks for a recommendation, action, or compliance judgment. I can only report what the documents state — I cannot advise what to do. Try rephrasing as: 'What does the document state about [topic]?' or 'Where is [topic] described?'",
                responseType: "REFUSAL",
                confidence: 0,
                citations: [],
                suggestedQuestions: [
                  `What does the document state about ${topic}?`,
                  `Where is ${topic} described in the document?`,
                  `Which sections cover ${topic}?`
                ]
              }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Step B: Route to appropriate answer prompt
        let answerPrompt = '';

        if (responseType === 'EXACT_REFERENCE') {
          answerPrompt = `You are a document search assistant. Your ONLY job is to find and extract exactly what is written in the provided documents.

RULES:
- Quote or paraphrase ONLY what is explicitly written
- Provide exact location: document title/ID, section name/number, page number
- If not found, state clearly: "This information was not found in the provided documents."
- DO NOT interpret, infer, recommend, or add meaning beyond the text
- DO NOT synthesize across sections — report each finding separately
- DO NOT say "this means" or "should"

AVAILABLE DOCUMENTS:
${uniDocContext}

CONVERSATION HISTORY:
${uniConvContext}

USER QUESTION:
${query}

Respond in this exact JSON format:
{
  "answer": "Direct statement of what the document says with exact location",
  "confidence": 95,
  "citations": [
    {"docId": "Document ID", "docTitle": "Document Title", "version": "version", "section": "Section name or number", "page": 1, "quote": "Exact text from document"}
  ],
  "suggestedQuestions": ["Where is X described?", "What does the document state about Y?"]
}

IMPORTANT: suggestedQuestions MUST be answerable using ONLY the provided documents. Never suggest questions that ask for recommendations, opinions, or compliance judgments. Only suggest extractive, explanatory, or reformatting follow-ups. Each suggested question should reference a specific topic from the documents.`;
        } else if (responseType === 'SUMMARY') {
          answerPrompt = `You are a document summary assistant. Provide a high-level overview of what the documents contain.

RULES:
- Summarize ONLY what is written in the documents
- List the key sections covered with brief descriptions
- Include citations for each key point
- DO NOT interpret beyond the text
- DO NOT recommend actions or make compliance judgments
- DO NOT add external knowledge
- End with "Key sections covered:" followed by a list

AVAILABLE DOCUMENTS:
${uniDocContext}

CONVERSATION HISTORY:
${uniConvContext}

USER QUESTION:
${query}

Respond in this exact JSON format:
{
  "answer": "High-level overview of what the documents cover, with key sections listed",
  "confidence": 90,
  "citations": [
    {"docId": "Document ID", "docTitle": "Document Title", "version": "version", "section": "Section name or number", "page": 1, "quote": "Brief relevant excerpt"}
  ],
  "suggestedQuestions": ["What does section X describe?", "Where is Y defined?"]
}

IMPORTANT: suggestedQuestions MUST be answerable using ONLY the provided documents. Never suggest questions that ask for recommendations, opinions, or compliance judgments. Only suggest extractive, explanatory, or reformatting follow-ups. Each suggested question should reference a specific topic from the documents.`;
        } else if (responseType === 'GAP_ANALYSIS') {
          answerPrompt = `You are a document gap analysis assistant for regulated environments. Your job is to identify what is MISSING or INCOMPLETE in the provided documents by comparing their content against standard GxP/regulatory document expectations.

RULES — ANTI-HALLUCINATION:
- You may ONLY report gaps based on what IS and IS NOT present in the document text
- For each gap found, you MUST cite the section where the gap exists or where coverage is expected but absent
- DO NOT invent requirements from external knowledge — only flag gaps relative to what the document itself claims to cover
- If the document's scope/purpose section lists topics, check whether each topic is actually addressed
- If the document references roles, check whether responsibilities are defined for each role
- If the document mentions records, check whether record requirements are specified
- Use language like "Not found in document" or "No section addresses this" — NEVER "should have" or "is required by regulation"
- DO NOT recommend fixes or actions — only report what is present vs. absent
- If no gaps are found, state: "No gaps identified within the scope of the provided documents."

STANDARD DOCUMENT ELEMENTS TO CHECK (only flag if the document's own scope suggests they should be present):
- Purpose/Scope definition
- Roles and responsibilities for each referenced role
- Step-by-step procedures for each claimed process
- Records/documentation requirements for each activity
- Review and approval steps
- Deviation/exception handling
- Training requirements for referenced roles
- References to related documents

AVAILABLE DOCUMENTS:
${uniDocContext}

CONVERSATION HISTORY:
${uniConvContext}

USER QUESTION:
${query}

Respond in this exact JSON format:
{
  "answer": "Structured gap analysis with each gap clearly labeled. Use format: GAP 1: [description] — FOUND/NOT FOUND in [section]. Always start with a brief scope statement of what the document covers.",
  "confidence": 85,
  "citations": [
    {"docId": "Document ID", "docTitle": "Document Title", "version": "version", "section": "Section where gap exists or coverage expected", "page": 1, "quote": "Relevant text showing what IS present (or note: 'No text found')"}
  ],
  "suggestedQuestions": ["Which roles lack defined responsibilities?", "Are there sections without review steps?", "What records are required but not specified?"]
}

IMPORTANT: suggestedQuestions MUST be answerable using ONLY the provided documents. Never suggest questions that ask for recommendations, opinions, or compliance judgments. Only suggest extractive, explanatory, or reformatting follow-ups. Each suggested question should reference a specific topic from the documents.`;
        } else if (responseType === 'COMPARISON') {
          answerPrompt = `You are a document comparison assistant for regulated environments. Your job is to compare content ACROSS the provided documents or sections and report factual differences.

RULES — ANTI-HALLUCINATION:
- Compare ONLY what is explicitly written in each document
- For each difference found, cite the EXACT text from EACH document being compared
- Report differences as: "Document A states [X]. Document B states [Y]." — factual, side-by-side
- If something is present in one document but absent in another, state: "Found in [Doc A], not found in [Doc B]"
- DO NOT judge which version is better, more compliant, or correct
- DO NOT recommend which version to follow
- DO NOT add external regulatory context
- If documents are identical on the queried topic, state: "No differences found on this topic."
- If only one document is provided, compare sections within it as requested
- Organize differences by topic/section for clarity

AVAILABLE DOCUMENTS:
${uniDocContext}

CONVERSATION HISTORY:
${uniConvContext}

USER QUESTION:
${query}

Respond in this exact JSON format:
{
  "answer": "Structured comparison with each difference clearly labeled. Use format: DIFFERENCE 1: [topic] — Doc A: [text]. Doc B: [text]. Start with a summary of documents being compared.",
  "confidence": 90,
  "citations": [
    {"docId": "Document ID", "docTitle": "Document Title", "version": "version", "section": "Section name", "page": 1, "quote": "Exact text from this document"}
  ],
  "suggestedQuestions": ["What other differences exist between these documents?", "Compare the training requirements", "Are there conflicting statements?"]
}

IMPORTANT: suggestedQuestions MUST be answerable using ONLY the provided documents. Never suggest questions that ask for recommendations, opinions, or compliance judgments. Only suggest extractive, explanatory, or reformatting follow-ups. Each suggested question should reference a specific topic from the documents.`;
        } else if (responseType === 'ACTION_EXTRACTION') {
          answerPrompt = `You are a document action item extraction assistant for regulated environments. Your job is to extract structured obligations, responsibilities, and action items from the provided documents.

RULES — ANTI-HALLUCINATION:
- Extract ONLY statements that contain explicit obligations: "shall", "must", "is required to", "is responsible for", "will", "needs to"
- For each extracted item, provide the EXACT quote and location
- Identify the responsible role/party ONLY if explicitly named in the same sentence or paragraph
- If no responsible party is named, state: "Responsible party: Not specified in document"
- DO NOT infer responsibilities from context — only report what is explicitly assigned
- DO NOT add action items that are not in the document
- DO NOT rephrase obligations in stronger or weaker terms than the original
- Organize by: section, then by responsible party (if identified)
- If asked for a RACI matrix, only populate cells where the document EXPLICITLY states the role's involvement. Leave cells empty (mark as "Not specified") where the document is silent.
- Count total items extracted for auditability

AVAILABLE DOCUMENTS:
${uniDocContext}

CONVERSATION HISTORY:
${uniConvContext}

USER QUESTION:
${query}

Respond in this exact JSON format:
{
  "answer": "Structured extraction with numbered items. Format: ITEM 1: [Obligation text] — Role: [named role or 'Not specified'] — Source: [section, page]. End with total count: 'Total items extracted: N'",
  "confidence": 90,
  "citations": [
    {"docId": "Document ID", "docTitle": "Document Title", "version": "version", "section": "Section name", "page": 1, "quote": "Exact obligation statement from document"}
  ],
  "suggestedQuestions": ["Which roles have the most responsibilities?", "Are there obligations without a named owner?", "List all training-related requirements"]
}

IMPORTANT: suggestedQuestions MUST be answerable using ONLY the provided documents. Never suggest questions that ask for recommendations, opinions, or compliance judgments. Only suggest extractive, explanatory, or reformatting follow-ups. Each suggested question should reference a specific topic from the documents.`;
        } else {
          // EXPLANATION (default)
          answerPrompt = `You are a document assistant helping users understand uploaded documents. You may explain and summarize what the documents state, but you must stay within the bounds of the document content.

RULES:
- You may summarize multiple cited statements
- You may explain the meaning of what is written
- You may clarify scope: roles, training requirements, records, procedures
- You may connect related statements within the documents
- Always cite sources with document ID, section, and page
- DO NOT recommend actions or decisions
- DO NOT offer opinions or compliance judgments
- DO NOT use external knowledge beyond the documents
- DO NOT interpret beyond what the document text supports

AVAILABLE DOCUMENTS:
${uniDocContext}

CONVERSATION HISTORY:
${uniConvContext}

USER QUESTION:
${query}

Respond in this exact JSON format:
{
  "answer": "Helpful explanation of what the document states, with citations",
  "confidence": 90,
  "citations": [
    {"docId": "Document ID", "docTitle": "Document Title", "version": "version", "section": "Section name or number", "page": 1, "quote": "Relevant quote from document"}
  ],
  "suggestedQuestions": ["What does the document state about X?", "Where is Y described?", "How is Z defined in this procedure?"]
}

IMPORTANT: suggestedQuestions MUST be answerable using ONLY the provided documents. Never suggest questions that ask for recommendations, opinions, or compliance judgments. Only suggest extractive, explanatory, or reformatting follow-ups. Each suggested question should reference a specific topic from the documents.`;
        }

        const answerResult = await callClaude(apiKey, answerPrompt, 4096, 0.3);

        if (answerResult.parsed) {
          answerResult.parsed.responseType = responseType;
          // Normalize: ensure citations array exists
          if (!answerResult.parsed.citations && answerResult.parsed.sources) {
            answerResult.parsed.citations = answerResult.parsed.sources;
          }
          if (!answerResult.parsed.citations) {
            answerResult.parsed.citations = [];
          }
          return new Response(
            JSON.stringify({ success: true, data: answerResult.parsed, rawResponse: answerResult.raw }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                answer: answerResult.rawText || 'Unable to process the question.',
                responseType,
                confidence: 50,
                citations: [],
                suggestedQuestions: []
              },
              rawResponse: answerResult.raw
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case 'writing-assist': {
        // --- WRITING ASSISTANT: Template-driven, document-anchored drafting ---

        if (!documents || documents.length === 0) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                answer: "No documents are loaded. Upload approved documents to use the Writing Assistant.",
                responseType: "NEEDS_DOCS",
                confidence: 0,
                citations: [],
                suggestedQuestions: []
              }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const wDocContext = documents.map(doc =>
          `Document: ${doc.title} (ID: ${doc.id})\n${doc.content}`
        ).join('\n\n---\n\n');

        const wConvContext = conversationHistory?.map(msg =>
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n\n') || '';

        const wCtx = writingContext || {};

        const WRITING_HEADER = `⚠️ DRAFT — Generated from existing approved documents. Requires review and approval before use.`;

        const WRITING_RULES = `ABSOLUTE RULES — ANTI-HALLUCINATION:
- Use ONLY content from the provided documents
- Any information not found in the documents MUST be marked: [NOT AVAILABLE IN PROVIDED DOCUMENTS]
- DO NOT invent, assume, or infer content beyond what is written
- DO NOT add regulatory requirements from external knowledge
- DO NOT make compliance judgments or recommendations
- Every substantive statement must be traceable to a source document
- Always start output with: "${WRITING_HEADER}"
- Always end with: "Source documents used: [list document titles]"`;

        let writingPrompt = '';

        switch (writingMode) {
          case 'rewrite-section':
            writingPrompt = `You are a document standardization assistant. Your job is to rewrite/reformat an existing document section to match a standard template structure.

${WRITING_RULES}

ADDITIONAL RULES:
- Preserve ALL original meaning — do not add or remove obligations
- Restructure for clarity: use numbered steps, clear headers, role labels
- If the original text is ambiguous, keep it ambiguous — do not resolve ambiguity
- Mark any section that seems incomplete: [INCOMPLETE IN SOURCE]

AVAILABLE DOCUMENTS:
${wDocContext}

CONVERSATION HISTORY:
${wConvContext}

USER REQUEST:
${query}
${wCtx.targetSection ? `Target section: ${wCtx.targetSection}` : ''}
${wCtx.templateStyle ? `Template style: ${wCtx.templateStyle}` : ''}

Respond in this exact JSON format:
{
  "answer": "The rewritten section with clear structure. Start with the draft header.",
  "confidence": 85,
  "citations": [{"docId": "ID", "docTitle": "Title", "version": "", "section": "Section", "page": 1, "quote": "Original text used"}],
  "suggestedQuestions": ["Rewrite another section", "Standardize the roles section"]
}`;
            break;

          case 'summarize-training':
            writingPrompt = `You are a training summary generator. Your job is to create a training-ready summary from SOP content.

${WRITING_RULES}

ADDITIONAL RULES:
- Extract key learning objectives from the document
- List required competencies and roles that need training
- Summarize procedures in simplified, trainee-friendly language
- Include assessment-relevant points (what trainees should know)
- Structure as: Learning Objectives → Key Procedures → Roles & Responsibilities → Assessment Points
- If training requirements are not explicitly stated, mark: [TRAINING REQUIREMENTS NOT SPECIFIED IN DOCUMENT]

AVAILABLE DOCUMENTS:
${wDocContext}

CONVERSATION HISTORY:
${wConvContext}

USER REQUEST:
${query}
${wCtx.targetRoles ? `Target roles: ${wCtx.targetRoles}` : ''}
${wCtx.focusArea ? `Focus area: ${wCtx.focusArea}` : ''}

Respond in this exact JSON format:
{
  "answer": "Structured training summary. Start with the draft header.",
  "confidence": 85,
  "citations": [{"docId": "ID", "docTitle": "Title", "version": "", "section": "Section", "page": 1, "quote": "Source text"}],
  "suggestedQuestions": ["Which roles need retraining?", "What assessment questions could be derived?"]
}`;
            break;

          case 'draft-audit-response':
            writingPrompt = `You are an audit response drafting assistant. Your job is to draft a response to an audit finding or question by mapping it to evidence in the provided documents.

${WRITING_RULES}

ADDITIONAL RULES:
- Structure as: Finding/Question → Relevant SOP Evidence → Response Draft
- Quote exact SOP text as evidence
- If evidence is partial, state: "Partial evidence found — [what's missing]"
- If no evidence exists, state: "No supporting evidence found in provided documents"
- DO NOT claim compliance — only present what the documents state
- Use formal audit response language

AVAILABLE DOCUMENTS:
${wDocContext}

CONVERSATION HISTORY:
${wConvContext}

USER REQUEST:
${query}
${wCtx.finding ? `Audit finding: ${wCtx.finding}` : ''}
${wCtx.auditor ? `Auditor/Authority: ${wCtx.auditor}` : ''}

Respond in this exact JSON format:
{
  "answer": "Structured audit response draft. Start with the draft header.",
  "confidence": 85,
  "citations": [{"docId": "ID", "docTitle": "Title", "version": "", "section": "Section", "page": 1, "quote": "Evidence text"}],
  "suggestedQuestions": ["What other evidence supports this?", "Draft response for another finding"]
}`;
            break;

          case 'change-impact':
            writingPrompt = `You are a change impact assessment generator. Your job is to identify what would be affected if a specific change is made to the documented procedures.

${WRITING_RULES}

ADDITIONAL RULES:
- List ALL sections that reference the topic being changed
- Identify affected roles, training requirements, records, and related procedures
- Structure as: Proposed Change → Affected Sections → Affected Roles → Training Impact → Records Impact → Related Documents
- For each impact, cite the exact section and text
- If impact cannot be determined from documents, state: [IMPACT CANNOT BE DETERMINED FROM PROVIDED DOCUMENTS]
- DO NOT assess whether the change is good or bad

AVAILABLE DOCUMENTS:
${wDocContext}

CONVERSATION HISTORY:
${wConvContext}

USER REQUEST:
${query}
${wCtx.proposedChange ? `Proposed change: ${wCtx.proposedChange}` : ''}
${wCtx.affectedArea ? `Affected area: ${wCtx.affectedArea}` : ''}

Respond in this exact JSON format:
{
  "answer": "Structured change impact assessment. Start with the draft header.",
  "confidence": 80,
  "citations": [{"docId": "ID", "docTitle": "Title", "version": "", "section": "Section", "page": 1, "quote": "Affected text"}],
  "suggestedQuestions": ["What training would need updating?", "Which related SOPs are affected?"]
}`;
            break;

          case 'capa-deviation':
            writingPrompt = `You are a CAPA/Deviation report drafting assistant. Your job is to structure a corrective action or deviation description using the provided SOP content as the baseline.

${WRITING_RULES}

ADDITIONAL RULES:
- Structure as: Deviation Description → Relevant SOP Requirement → Root Cause Category → Proposed Corrective Action Outline → Preventive Action Outline
- For the SOP requirement, quote the EXACT text that was deviated from
- For corrective/preventive actions, provide ONLY a structural outline — do not write specific actions unless they are stated in the document
- Mark any section requiring human input: [REQUIRES HUMAN INPUT]
- DO NOT determine root cause — only suggest categories based on document structure

AVAILABLE DOCUMENTS:
${wDocContext}

CONVERSATION HISTORY:
${wConvContext}

USER REQUEST:
${query}
${wCtx.deviation ? `Deviation description: ${wCtx.deviation}` : ''}
${wCtx.sopSection ? `Relevant SOP section: ${wCtx.sopSection}` : ''}

Respond in this exact JSON format:
{
  "answer": "Structured CAPA/Deviation draft. Start with the draft header.",
  "confidence": 75,
  "citations": [{"docId": "ID", "docTitle": "Title", "version": "", "section": "Section", "page": 1, "quote": "Requirement text"}],
  "suggestedQuestions": ["What other requirements were affected?", "Draft a preventive action plan"]
}`;
            break;

          case 'baseline-draft':
            writingPrompt = `You are a baseline document drafting assistant. Your job is to assemble a FIRST DRAFT of a new document by reusing content from existing approved documents.

${WRITING_RULES}

ADDITIONAL RULES:
- You are NOT creating new content — you are ASSEMBLING from existing approved material
- Reuse relevant sections verbatim or lightly rephrased for context
- Follow standard document structure: Purpose → Scope → Definitions → Roles & Responsibilities → Procedure → Records → References
- For each section, cite which source document the content came from
- Leave clear placeholders for any section not covered by source documents: [PLACEHOLDER — No source content available. Requires manual authoring.]
- Mark reused content with source: [Source: Document Title, Section X]
- DO NOT generate new procedural content, obligations, or requirements
- If the user specifies a document type (SOP, WI, Policy), adapt the structure accordingly

AVAILABLE DOCUMENTS:
${wDocContext}

CONVERSATION HISTORY:
${wConvContext}

USER REQUEST:
${query}
${wCtx.documentType ? `Target document type: ${wCtx.documentType}` : ''}
${wCtx.focusTopic ? `Focus topic: ${wCtx.focusTopic}` : ''}
${wCtx.sourceDocuments ? `Preferred source documents: ${wCtx.sourceDocuments}` : ''}

Respond in this exact JSON format:
{
  "answer": "Complete baseline draft with standard structure. Start with the draft header. Each section should cite its source.",
  "confidence": 75,
  "citations": [{"docId": "ID", "docTitle": "Title", "version": "", "section": "Section", "page": 1, "quote": "Reused text"}],
  "suggestedQuestions": ["Add more detail to the Procedure section", "What gaps exist in this draft?"]
}`;
            break;

          case 'extract-reformat':
            writingPrompt = `You are a content extraction and reformatting assistant. Your job is to pull specific content from documents and reformat it into a new structure (table, checklist, matrix, etc.).

${WRITING_RULES}

ADDITIONAL RULES:
- Extract ONLY content that exists in the documents
- Reformat into the requested structure (table, checklist, flowchart text, matrix)
- Preserve exact meaning — reformatting must not change obligations or scope
- For tables/matrices: leave cells empty (mark [NOT SPECIFIED]) where document is silent
- For checklists: each item must trace to a specific document section
- Include a source column/reference for every extracted item

AVAILABLE DOCUMENTS:
${wDocContext}

CONVERSATION HISTORY:
${wConvContext}

USER REQUEST:
${query}
${wCtx.outputFormat ? `Desired output format: ${wCtx.outputFormat}` : ''}
${wCtx.contentFocus ? `Content to extract: ${wCtx.contentFocus}` : ''}

Respond in this exact JSON format:
{
  "answer": "Reformatted content in the requested structure. Start with the draft header.",
  "confidence": 85,
  "citations": [{"docId": "ID", "docTitle": "Title", "version": "", "section": "Section", "page": 1, "quote": "Extracted text"}],
  "suggestedQuestions": ["Reformat another section", "Convert this to a different format"]
}`;
            break;

          default:
            writingPrompt = `You are a document writing assistant. Help the user with their writing request using ONLY the provided documents as source material.

${WRITING_RULES}

AVAILABLE DOCUMENTS:
${wDocContext}

CONVERSATION HISTORY:
${wConvContext}

USER REQUEST:
${query}

Respond in this exact JSON format:
{
  "answer": "Response based only on document content. Start with the draft header.",
  "confidence": 80,
  "citations": [{"docId": "ID", "docTitle": "Title", "version": "", "section": "Section", "page": 1, "quote": "Source text"}],
  "suggestedQuestions": []
}`;
        }

        console.log(`Writing assist mode: ${writingMode} for query: "${query}"`);

        const writingResult = await callClaude(apiKey, writingPrompt, 6000, 0.3);

        if (writingResult.parsed) {
          writingResult.parsed.responseType = 'WRITING_ASSIST';
          writingResult.parsed.writingMode = writingMode;
          if (!writingResult.parsed.citations) {
            writingResult.parsed.citations = [];
          }
          return new Response(
            JSON.stringify({ success: true, data: writingResult.parsed, rawResponse: writingResult.raw }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                answer: writingResult.rawText || 'Unable to process the writing request.',
                responseType: 'WRITING_ASSIST',
                writingMode,
                confidence: 50,
                citations: [],
                suggestedQuestions: []
              },
              rawResponse: writingResult.raw
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    // Call Claude API
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Anthropic API error:", errorText);
      throw new Error(`Anthropic API error: ${anthropicResponse.status} - ${errorText}`);
    }

    const data = await anthropicResponse.json();
    
    // Extract the text content from Claude's response
    const responseText = data.content?.[0]?.text || '';
    
    // Try to parse JSON from the response
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse Claude response as JSON:", responseText);
      // Return a fallback response
      parsedResponse = {
        answer: responseText,
        confidence: 50,
        sources: [],
        error: "Response parsing failed"
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedResponse,
        rawResponse: data
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Error in compliance-query:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
        details: error.toString()
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
