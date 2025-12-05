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
        prompt = `Create a professional e-learning course from this SOP/document. You MUST include ALL content while applying instructional design principles.

CRITICAL CONTENT RULES - MANDATORY:
1. Include 100% of the document content - NOTHING can be skipped or omitted
2. Every section, procedure, requirement, and detail MUST appear in the course
3. Use the EXACT facts, figures, numbers, and requirements from the document
4. Include ALL steps in procedures - do not combine or skip steps
5. Include ALL safety warnings, notes, and important callouts

INSTRUCTIONAL DESIGN RULES:
1. Transform dense text into learner-friendly formats (bullet points, numbered steps)
2. Add clear learning objectives at the start of each module
3. Use callout boxes for important/critical information
4. Add brief summaries at the end of each module
5. Break long sections into digestible content blocks
6. Use clear headings that help learners navigate
7. Format procedures as numbered step-by-step instructions
8. Highlight key terms and critical requirements

FORMATTING GUIDELINES:
- Convert paragraphs into bullet points where appropriate for readability
- Keep the meaning and ALL details intact while improving clarity
- Use "•" for bullet points and "1. 2. 3." for sequential steps
- Add "Important:", "Note:", or "Warning:" prefixes for callouts
- Create logical flow from introduction → content → summary

DOCUMENT TEXT:
${text}

Create modules covering 100% of the document. Respond with ONLY valid JSON:

{
  "modules": [
    {
      "id": "module_1",
      "title": "Clear module title based on document section",
      "duration": "5-10 mins",
      "content": [
        {
          "type": "objectives",
          "heading": "Learning Objectives",
          "body": "After completing this module, you will be able to:\\n• [Specific learning outcome]\\n• [Specific learning outcome]\\n• [Specific learning outcome]"
        },
        {
          "type": "text",
          "heading": "Introduction/Overview",
          "body": "Brief introduction to this section's purpose and scope."
        },
        {
          "type": "text",
          "heading": "Section heading from document",
          "body": "Content formatted for learning - use bullet points for lists:\\n• Point 1 with full detail\\n• Point 2 with full detail\\n• Point 3 with full detail"
        },
        {
          "type": "procedure",
          "heading": "Procedure: [Name]",
          "body": "Follow these steps:\\n1. First step with complete instructions\\n2. Second step with complete instructions\\n3. Third step with complete instructions"
        },
        {
          "type": "callout-warning",
          "heading": "⚠️ Important",
          "body": "Critical safety or compliance information that learners must remember."
        },
        {
          "type": "callout-info",
          "heading": "💡 Key Point",
          "body": "Important concept or requirement to highlight."
        },
        {
          "type": "summary",
          "heading": "Module Summary",
          "body": "Key takeaways from this module:\\n• Main point 1\\n• Main point 2\\n• Main point 3"
        }
      ],
      "relatedFacts": ["fact_1"]
    }
  ]
}

REMEMBER: Include ALL document content. Transform for learning but never remove information. Create as many modules and content sections as needed.`;
        maxTokens = 8192;
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