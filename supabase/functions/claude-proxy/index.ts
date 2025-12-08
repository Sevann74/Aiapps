import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnthropicRequest {
  operation: 'extract-facts' | 'generate-questions' | 'generate-modules';
  text: string;
  facts?: any[];
  questionCount?: number;
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

    const requestData: AnthropicRequest = await req.json();
    const { operation, text, facts, questionCount } = requestData;

    let prompt = "";
    let maxTokens = 3000;

    switch (operation) {
      case 'extract-facts':
        prompt = `You are a fact extraction system for COMPLIANCE TRAINING. Extract facts that learners MUST KNOW to do their job safely and correctly.

CRITICAL RULES - ZERO TOLERANCE FOR DEVIATION:
1. Extract ONLY facts that are EXPLICITLY and LITERALLY stated in the document
2. Include the EXACT quote from the document for each fact - WORD FOR WORD, CHARACTER FOR CHARACTER
3. Include the section/paragraph where the fact appears EXACTLY as written
4. NEVER paraphrase, interpret, summarize, or rephrase - copy EXACT text only
5. NEVER add context, general knowledge, or external information
6. NEVER make assumptions, inferences, or logical leaps
7. If something is not explicitly stated, DO NOT include it
8. Use ONLY text that appears verbatim in the source document

PRIORITIZE THESE FACT TYPES (in order of importance):
1. SAFETY REQUIREMENTS - Warnings, hazards, protective measures, what could cause harm
2. REQUIRED ACTIONS - Steps that MUST be performed, mandatory procedures
3. COMPLIANCE REQUIREMENTS - Regulatory mandates, legal obligations, audit requirements
4. CRITICAL THRESHOLDS - Time limits, temperature ranges, dosages, quantities, deadlines
5. RESPONSIBILITIES - Who must do what, accountability, approval authorities
6. PROHIBITED ACTIONS - What must NOT be done, restrictions, contraindications

DO NOT EXTRACT (these make poor quiz questions):
- Document metadata (SOP number, version, effective date, author, revision history)
- General introductions or purpose statements
- Definitions of common terms
- Organizational background information
- References to other documents
- Page numbers, headers, footers

DOCUMENT TEXT:
${text}

Extract 8-12 facts focusing on ACTIONABLE KNOWLEDGE and respond with ONLY valid JSON in this EXACT format:

{
  "facts": [
    {
      "id": "fact_1",
      "exactQuote": "exact text from document word-for-word - no changes",
      "section": "Section number or heading exactly as it appears in document",
      "category": "procedure|safety|requirement|responsibility",
      "importance": "critical|important|supplementary"
    }
  ]
}

IMPORTANCE RATINGS:
- "critical" = Safety-related, could cause harm if not followed, regulatory requirement
- "important" = Key procedure step, required action, significant responsibility
- "supplementary" = Supporting information, context (avoid extracting these)

DO NOT include any text before or after the JSON. Your response must start with { and end with }`;
        break;

      case 'generate-questions':
        const questionnableFacts = facts?.filter((f: any) =>
          f.importance === 'critical' || f.importance === 'important'
        ).slice(0, questionCount || 5);

        prompt = `You are creating a COMPLIANCE TRAINING quiz. Generate questions that test ACTIONABLE KNOWLEDGE - what learners need to KNOW and DO to perform their job safely and correctly.

QUESTION QUALITY REQUIREMENTS:
1. Questions must test PRACTICAL KNOWLEDGE that affects job performance
2. Focus on: "What should you do?", "How should you do it?", "What is required?", "What is prohibited?"
3. Questions should help learners REMEMBER important procedures and safety requirements
4. A learner who answers correctly should be SAFER and MORE COMPLIANT at their job

FORBIDDEN QUESTION TOPICS (NEVER ask about these):
- Document metadata: SOP number, version number, effective date, revision date
- Author names, approvers, document owners
- When the document was created or last updated
- Document title or full name of the procedure
- Page numbers or section numbers as the answer
- "What is the purpose of this SOP?" or similar meta-questions

GOOD QUESTION EXAMPLES:
- "What PPE is required when handling [chemical]?"
- "How long must samples be stored before disposal?"
- "What is the maximum temperature for [process]?"
- "Who must approve [action] before it can proceed?"
- "What should you do if [situation] occurs?"
- "How often must [equipment] be calibrated?"

BAD QUESTION EXAMPLES (DO NOT GENERATE):
- "What is the SOP number for this procedure?"
- "When was this document last revised?"
- "What is the title of Section 3?"
- "Who authored this procedure?"

CRITICAL RULES - ABSOLUTE COMPLIANCE REQUIRED:
1. Each question must be based on ONE of the provided facts ONLY
2. Use the exact quote as your SOLE source of truth - nothing else
3. The correct answer must be DIRECTLY and LITERALLY extractable from the quote
4. Wrong answers should be plausible but clearly incorrect based ONLY on the quote
5. Include the fact ID in your response for verification tracking
6. DO NOT add "According to Section" or similar prefixes - write questions DIRECTLY
7. Keep questions concise and direct - ask about the content, not the source
8. NEVER infer, assume, or add information not in the exact quote
9. The explanation must quote the source EXACTLY as written

VERIFIED FACTS:
${JSON.stringify(questionnableFacts, null, 2)}

Generate EXACTLY ${questionnableFacts?.length || 5} questions in this JSON format:

{
  "questions": [
    {
      "id": "q1",
      "basedOnFactId": "fact_1",
      "question": "Direct question about actionable knowledge (what to do, how to do it, what is required)",
      "sourceReference": "Section number from the fact",
      "exactQuote": "The exact quote this question is based on",
      "options": [
        "Correct answer extracted WORD-FOR-WORD from the quote",
        "Plausible distractor",
        "Plausible distractor",
        "Plausible distractor"
      ],
      "correctAnswer": 0,
      "explanation": "The source states: '[Exact quote that proves the answer]'"
    }
  ]
}

DO NOT include any text before or after the JSON.`;
        maxTokens = 3000;
        break;

      case 'generate-modules':
        prompt = `Convert this document into an e-learning course. PRESERVE ALL CONTENT from the original document.

ABSOLUTE REQUIREMENT:
Include EVERY piece of content - this is compliance training where missing content is a legal liability.

IGNORE/FILTER OUT:
- Repeated page headers and footers (company name, document number, page numbers, version info that appears on every page)
- Do NOT include "Page X of Y" text
- Do NOT repeat document metadata that appears on multiple pages

CONTENT TYPE RULES:
1. Use "text" type for ALL regular content including:
   - Paragraphs and descriptions
   - Section-numbered content (like 5.1, 5.1.1, 5.1.2) - these are section references, NOT procedures
   - Bullet point lists
   - Definition lists (Term: Definition format) - ALWAYS use text type for these
   - Glossaries and terminology sections

2. Use "procedure" type ONLY for actual step-by-step instructions that:
   - Start with simple numbers (1., 2., 3.) not section numbers (5.1, 5.1.1)
   - Describe sequential actions to perform
   - Are actual "how to do something" steps

3. Use "callout-important" ONLY for actual warnings, safety alerts, or critical deadlines

4. Use "table" type ONLY for multi-column tabular data with:
   - Multiple data rows (not just definitions)
   - Clear column structure with headers
   - Data that needs to be compared across columns
   - Examples: audit schedules, comparison matrices, data grids
   - Format with pipe separators: "Header1 | Header2\\nData1 | Data2"
   
   EXAMPLES OF TABLES TO DETECT:
   - "Original Submission (Rejected)    Clone Submission (Approved)
      Nucenta                            Nucynta
      Invocana                           Invokana"
      OUTPUT: "Original Submission (Rejected) | Clone Submission (Approved)\\nNucenta | Nucynta\\nInvocana | Invokana"
   
   - "Audit ID    Department    Status
      AUD-01      Manufacturing Scheduled
      AUD-02      QC Lab        Completed"
      OUTPUT: "Audit ID | Department | Status\\nAUD-01 | Manufacturing | Scheduled\\nAUD-02 | QC Lab | Completed"

CRITICAL: DEFINITION LISTS ARE NOT TABLES - NEVER USE TABLE TYPE FOR DEFINITIONS
- If content is: "Term: Definition" repeated multiple times = ALWAYS use "text" type, NEVER "table"
- Example: "Deviation: Any departure from procedures\\nPlanned Deviation: A pre-approved departure" = "text" type
- Example: "Root Cause Analysis (RCA): A structured approach..." = "text" type
- Even if definitions have labels like "Responsibility:", "Step:", "Action:" = still "text" type, NOT table
- Only use "table" when there are MULTIPLE COLUMNS of DATA to compare side-by-side with clear headers and data rows
- A single column of labeled definitions is TEXT, not a table

IMPORTANT DISTINCTIONS:
- "Deviation: definition text\\nPlanned Deviation: definition text\\nCorrective Action: definition text" = definition list, use "text" type
- "Responsibility: text\\nStep: text\\nAction: text" = labeled definitions, use "text" type NOT table
- "Root Cause Analysis (RCA): definition\\nImpact Assessment: definition" = glossary terms, use "text" type NOT table
- "5.1.1 Case Intake and Triage" = section heading, use "text" type
- "1. Review the document 2. Verify the data 3. Submit" = procedure steps, use "procedure" type
- "Audit ID | Department | Status\\nAUD-01 | Manufacturing | Scheduled" = actual multi-column table, use "table" type with pipes

CONTENT RULES:
- Include ALL text exactly as written
- Keep ALL numbered items exactly as written
- Keep ALL bullet points exactly as written
- DO NOT skip, summarize, or paraphrase any content
- DO NOT add AI-generated objectives or summaries
- CRITICAL FORMATTING: For definition lists, separate each definition with \\n\\n (double newline)
- Example: "Term1: definition\\n\\nTerm2: definition\\n\\nTerm3: definition"
- PRESERVE FORMATTING: Use double newlines between separate items, definitions, or paragraphs
- For definition lists: separate each term with blank lines for readability

BULLET POINT FORMATTING - CRITICAL:
- ALWAYS put each bullet point on its own line with \\n before each bullet
- NEVER output bullets inline like "• Item 1 • Item 2 • Item 3"
- CORRECT: "Intro text:\\n• Item 1\\n• Item 2\\n• Item 3"
- WRONG: "Intro text: • Item 1 • Item 2 • Item 3"
- Each bullet MUST be on a separate line using \\n

DOCUMENT TO CONVERT:
${text}

OUTPUT FORMAT - Respond with ONLY valid JSON:
{
  "modules": [
    {
      "id": "section_1",
      "title": "Section Title from Document",
      "content": [
        {"type": "text", "heading": "3.1 Core Terminology", "body": "Deviation: Any departure from procedures.\\n\\nPlanned Deviation: A pre-approved departure.\\n\\nCorrective Action: Actions taken to eliminate the cause."},
        {"type": "text", "heading": "Description", "body": "Regular content with bullets:\\n• Point 1\\n• Point 2"},
        {"type": "procedure", "heading": "How to Process a Case", "body": "1. Open the system\\n2. Enter the data\\n3. Click submit"},
        {"type": "table", "heading": "Clone Examples", "body": "Original Submission (Rejected) | Clone Submission (Approved)\\nNucenta | Nucynta\\nInvocana | Invokana"},
        {"type": "table", "heading": "Audit Schedule", "body": "Audit ID | Department | Status\\nAUD-01 | Manufacturing | Scheduled\\nAUD-02 | QC Lab | Completed"},
        {"type": "callout-important", "heading": "⚠️ Warning", "body": "Only for actual warnings from the document"}
      ],
      "relatedFacts": []
    }
  ]
}

Create sections matching the document structure.`;
        maxTokens = 32000;
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

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
        temperature: 0.3,
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

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Error in claude-proxy:", error);

    return new Response(
      JSON.stringify({
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