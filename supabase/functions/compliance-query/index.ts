import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ComplianceQueryRequest {
  operation: 'search' | 'chat' | 'compare-sops' | 'summarize-sop-changes';
  query?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  documents?: Array<{ id: string; title: string; content: string; metadata?: any }>;
  sop1?: { id: string; title: string; content: string; version?: string };
  sop2?: { id: string; title: string; content: string; version?: string };
  changes?: Array<{
    sectionId: string;
    sectionTitle: string;
    changeType: 'added' | 'removed' | 'modified';
    oldContent: string;
    newContent: string;
  }>;
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
    const { operation, query, conversationHistory, documents, sop1, sop2, changes } = requestData;

    let prompt = "";
    let maxTokens = 4096;
    let temperature = 0.3;

    switch (operation) {
      case 'search':
        // Build context from available documents
        const documentContext = documents?.map(doc => 
          `Document: ${doc.title} (ID: ${doc.id})\n${doc.content.substring(0, 3000)}`
        ).join('\n\n---\n\n') || '';

        prompt = `You are a compliance document search assistant. Answer the user's question based ONLY on the provided documents.

CRITICAL RULES:
1. Only use information explicitly stated in the provided documents
2. Cite specific document IDs, sections, and page numbers when available
3. If information is not in the documents, clearly state that
4. Provide confidence level (0-100) based on how directly the documents answer the question
5. Include exact quotes from documents to support your answer
6. Suggest related documents if relevant

AVAILABLE DOCUMENTS:
${documentContext}

USER QUESTION:
${query}

Respond in this JSON format:
{
  "answer": "Clear, concise answer based on the documents",
  "confidence": 95,
  "sources": [
    {
      "document": "Document ID",
      "section": "Section name or number",
      "page": 12,
      "exactQuote": "Exact text from document",
      "relevance": 100
    }
  ],
  "relatedDocuments": ["DOC-ID-1", "DOC-ID-2"],
  "suggestedQuestions": [
    "Related question 1?",
    "Related question 2?"
  ]
}`;
        break;

      case 'chat':
        // Build conversation context
        const conversationContext = conversationHistory?.map(msg => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n\n') || '';

        const chatDocContext = documents?.map(doc => 
          `Document: ${doc.title} (ID: ${doc.id})\n${doc.content.substring(0, 2000)}`
        ).join('\n\n---\n\n') || '';

        prompt = `You are a helpful compliance assistant with access to company documents. Provide accurate, helpful responses based on the available documents and conversation history.

CRITICAL RULES:
1. Use ONLY information from the provided documents
2. Maintain conversation context from previous messages
3. Be conversational but precise
4. Cite sources with document IDs and sections
5. If you don't know something, say so clearly
6. Provide confidence scores for your answers
7. Suggest follow-up questions to help the user

AVAILABLE DOCUMENTS:
${chatDocContext}

CONVERSATION HISTORY:
${conversationContext}

NEW USER MESSAGE:
${query}

Respond in this JSON format:
{
  "answer": "Conversational response with specific information",
  "confidence": 90,
  "sources": [
    {
      "document": "Document ID",
      "section": "Section name",
      "page": 10,
      "exactQuote": "Relevant quote",
      "relevance": 95
    }
  ],
  "relatedDocuments": ["DOC-ID-1"],
  "suggestedQuestions": [
    "Follow-up question 1?",
    "Follow-up question 2?"
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

      case 'summarize-sop-changes':
        if (!sop1 || !sop2) {
          throw new Error("Both SOP references are required");
        }
        if (!changes || !Array.isArray(changes) || changes.length === 0) {
          throw new Error("changes[] is required");
        }

        prompt = `You are an expert SOP change analyst. You will receive a list of section-level changes that were detected deterministically. Your job is to:

1. SUMMARIZE each change in 1-2 clear sentences describing exactly what changed
2. CLASSIFY the significance: "substantive" (affects compliance/safety/process/obligations) or "editorial" (formatting/wording/grammar only)
3. CATEGORIZE the change type: "obligation" | "timing" | "threshold" | "role" | "records" | "procedure" | "definition" | "other"
4. PROVIDE exact evidence quotes from the old/new content (max 50 chars each)
5. ASSIGN confidence 70-100 (never below 70 if content is provided; use 70 if ambiguous, 90+ if clear)

CRITICAL RULES:
- Do NOT invent changes. Use ONLY the provided oldContent/newContent.
- Do NOT provide impact assessments, recommendations, risk language, or actions.
- Return STRICT JSON only. No markdown, no explanation, no preamble.
- If oldContent or newContent is empty, note that in the summary (e.g., "New section added" or "Section removed").
- Focus on WHAT changed, not WHY or what to do about it.

SOP 1 (Previous Version):
Title: ${sop1.title}
Version: ${sop1.version || 'Unknown'}

SOP 2 (New Version):
Title: ${sop2.title}
Version: ${sop2.version || 'Unknown'}

CHANGES TO SUMMARIZE:
${JSON.stringify(changes, null, 2)}

EXAMPLE OUTPUT FORMAT:
{
  "summaries": [
    {
      "sectionId": "3.2",
      "sectionTitle": "3.2 Temperature Control",
      "changeType": "modified",
      "summary": "Temperature storage range changed from 2-8°C to 2-6°C.",
      "significance": "substantive",
      "category": "threshold",
      "confidence": 95,
      "evidenceOld": "Store at 2-8°C",
      "evidenceNew": "Store at 2-6°C"
    },
    {
      "sectionId": "5.1",
      "sectionTitle": "5.1 Documentation",
      "changeType": "modified",
      "summary": "Minor wording change from 'shall document' to 'must document'.",
      "significance": "editorial",
      "category": "records",
      "confidence": 85,
      "evidenceOld": "shall document",
      "evidenceNew": "must document"
    }
  ]
}

Now analyze the provided changes and return JSON only:`;
        maxTokens = 8192;
        temperature = 0.1;
        break;

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
