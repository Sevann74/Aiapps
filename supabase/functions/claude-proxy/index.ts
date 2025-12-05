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
        prompt = `You are a fact extraction system. Extract key facts from this document with ABSOLUTE PRECISION.

CRITICAL RULES - ZERO TOLERANCE FOR DEVIATION:
1. Extract ONLY facts that are EXPLICITLY and LITERALLY stated in the document
2. Include the EXACT quote from the document for each fact - WORD FOR WORD, CHARACTER FOR CHARACTER
3. Include the section/paragraph where the fact appears EXACTLY as written
4. NEVER paraphrase, interpret, summarize, or rephrase - copy EXACT text only
5. NEVER add context, general knowledge, or external information
6. NEVER make assumptions, inferences, or logical leaps
7. If something is not explicitly stated, DO NOT include it
8. Use ONLY text that appears verbatim in the source document

DOCUMENT TEXT:
${text}

Extract 8-12 facts and respond with ONLY valid JSON in this EXACT format:

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

DO NOT include any text before or after the JSON. Your response must start with { and end with }`;
        break;

      case 'generate-questions':
        const questionnableFacts = facts?.filter((f: any) =>
          f.importance === 'critical' || f.importance === 'important'
        ).slice(0, questionCount || 5);

        prompt = `You are creating a compliance quiz. Generate questions EXCLUSIVELY from these verified facts with ZERO HALLUCINATION.

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

IMPORTANT: Questions should be DIRECT without "According to Section" prefixes.
EXAMPLE - GOOD: "What is the minimum handwashing time?"
EXAMPLE - BAD: "According to Section 4, what is the minimum handwashing time?"

{
  "questions": [
    {
      "id": "q1",
      "basedOnFactId": "fact_1",
      "question": "Direct question about the content without section prefix",
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
        prompt = `Convert this SOP document into an e-learning course. Your task is to PRESERVE ALL CONTENT while adding minimal instructional structure.

ABSOLUTE REQUIREMENT - READ CAREFULLY:
You must include EVERY SINGLE piece of content from the document. This is compliance training - missing content is a legal liability. Count the sections in the document and ensure your output has the same number of sections.

CONVERSION RULES:
1. Each major section (1.0, 2.0, 3.0, etc.) becomes a MODULE
2. Each subsection (1.1, 1.2, 2.1, etc.) becomes a CONTENT BLOCK within that module
3. Copy ALL text from each section - do not summarize or paraphrase
4. Keep ALL numbered steps exactly as written
5. Keep ALL bullet points exactly as written
6. Keep ALL warnings, notes, and important information
7. Add ONLY: learning objectives at module start, brief summary at module end

WHAT TO ADD (minimal):
- Learning objectives based on the section content
- A 2-3 sentence summary at the end of each module

WHAT NOT TO DO:
- Do NOT summarize paragraphs
- Do NOT combine steps
- Do NOT skip any content
- Do NOT paraphrase - use original wording
- Do NOT reduce the number of bullet points

DOCUMENT TO CONVERT:
${text}

OUTPUT FORMAT - Respond with ONLY valid JSON:
{
  "modules": [
    {
      "id": "module_1",
      "title": "Section title from document",
      "duration": "5-10 mins",
      "content": [
        {"type": "objectives", "heading": "Learning Objectives", "body": "After this module you will understand:\\n• Objective 1\\n• Objective 2"},
        {"type": "text", "heading": "Subsection Title", "body": "FULL content from this subsection - copy everything"},
        {"type": "text", "heading": "Next Subsection", "body": "FULL content from next subsection"},
        {"type": "procedure", "heading": "Procedure Name", "body": "1. Step one exactly as written\\n2. Step two exactly as written\\n3. All remaining steps"},
        {"type": "callout-warning", "heading": "Warning/Note Title", "body": "Full warning or note text"},
        {"type": "summary", "heading": "Summary", "body": "Brief 2-3 sentence summary"}
      ],
      "relatedFacts": []
    }
  ]
}

VERIFICATION: Before responding, count the major sections in the document. Your response MUST have that many modules. If the document has 8 sections, output 8 modules.`;
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