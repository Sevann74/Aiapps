const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-proxy`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface Fact {
  id: string;
  exactQuote: string;
  section: string;
  category: 'procedure' | 'safety' | 'requirement' | 'responsibility';
  importance: 'critical' | 'important' | 'supplementary';
}

interface Question {
  id: string;
  basedOnFactId: string;
  question: string;
  sourceReference: string;
  exactQuote: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Module {
  id: string;
  title: string;
  duration: string;
  content: Array<{
    type: string;
    heading: string;
    body: string;
  }>;
  relatedFacts: string[];
}

async function callEdgeFunction<T>(operation: string, payload: any): Promise<T> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      operation,
      ...payload
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error.message || 'API request failed');
  }

  let responseText = result.content?.[0]?.text || '';

  if (!responseText) {
    console.error('Empty response from API. Full result:', result);
    throw new Error('Empty response from API. Check that ANTHROPIC_API_KEY is configured in Supabase Edge Functions.');
  }

  responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  if (responseText.length === 0) {
    throw new Error('API returned empty response after parsing. The AI service may be experiencing issues.');
  }

  try {
    const parsed = JSON.parse(responseText);
    console.log(`Successfully parsed ${operation} response:`, parsed);
    return parsed;
  } catch (error) {
    console.error('Failed to parse response:', responseText.substring(0, 500));
    console.error('Parse error:', error);
    console.error('Full API result:', result);

    const errorMessage = `The AI service returned an unexpected response format. This may be due to:
- Document being too long or complex
- API quota exceeded
- Temporary AI service issue

Response preview: ${responseText.substring(0, 200)}...`;

    throw new Error(errorMessage);
  }
}

export async function extractVerifiableFacts(text: string): Promise<Fact[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Document text is empty. Please upload a valid PDF with text content.');
    }

    if (text.trim().length < 100) {
      throw new Error('Document text is too short. Please ensure the PDF contains sufficient text content.');
    }

    const MAX_TEXT_LENGTH = 150000; // ~50 pages
    let processText = text;

    if (text.length > MAX_TEXT_LENGTH) {
      console.warn(`Document text is ${text.length} characters. Truncating to ${MAX_TEXT_LENGTH} (~30 pages) for fact extraction.`);
      processText = text.substring(0, MAX_TEXT_LENGTH);
    }

    console.log(`Extracting facts from ${processText.length} characters of text...`);
    const result = await callEdgeFunction<{ facts: Fact[] }>('extract-facts', { text: processText });

    if (!result.facts || result.facts.length === 0) {
      throw new Error('No facts could be extracted from the document. The document may not contain clear, extractable information.');
    }

    console.log(`Successfully extracted ${result.facts.length} facts`);
    return result.facts;
  } catch (error) {
    console.error('Error extracting facts:', error);
    throw new Error(`Failed to extract facts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateQuestionsFromFacts(
  facts: Fact[],
  sourceText: string,
  questionCount: number = 5
): Promise<{ questions: Question[] }> {
  try {
    if (!facts || facts.length === 0) {
      throw new Error('No facts available to generate questions. Fact extraction may have failed.');
    }

    const questionnableFacts = facts.filter(f =>
      f.importance === 'critical' || f.importance === 'important'
    ).slice(0, questionCount);

    if (questionnableFacts.length === 0) {
      throw new Error('No critical or important facts found. Cannot generate meaningful questions.');
    }

    console.log(`Generating ${questionnableFacts.length} questions from facts...`);
    const result = await callEdgeFunction<{ questions: Question[] }>('generate-questions', {
      text: sourceText,
      facts: questionnableFacts,
      questionCount: questionnableFacts.length
    });

    if (!result.questions || result.questions.length === 0) {
      throw new Error('No questions were generated. Please try again or adjust your document.');
    }

    // Limit to requested question count (edge function may return more)
    const limitedQuestions = result.questions.slice(0, questionCount);

    // Shuffle answer options so correct answer isn't always first
    const shuffledQuestions = limitedQuestions.map(q => {
      const options = [...q.options];
      const correctAnswerText = options[q.correctAnswer];
      
      // Fisher-Yates shuffle
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      
      // Find new position of correct answer
      const newCorrectAnswer = options.indexOf(correctAnswerText);
      
      return {
        ...q,
        options,
        correctAnswer: newCorrectAnswer
      };
    });

    console.log(`Successfully generated ${shuffledQuestions.length} questions with shuffled answers`);
    return { questions: shuffledQuestions };
  } catch (error) {
    console.error('Error generating questions:', error);
    throw new Error(`Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateModulesFromDocument(
  text: string,
  facts: Fact[]
): Promise<Module[]> {
  try {
    const MAX_TEXT_LENGTH = 150000; // ~50 pages
    let processText = text;

    if (text.length > MAX_TEXT_LENGTH) {
      console.warn(`Document text is ${text.length} characters. Truncating to ${MAX_TEXT_LENGTH} (~30 pages) for processing.`);
      processText = text.substring(0, MAX_TEXT_LENGTH);
    }

    const result = await callEdgeFunction<{ modules: Module[] }>('generate-modules', {
      text: processText,
      facts: facts.slice(0, 15)
    });

    if (!result.modules || result.modules.length === 0) {
      throw new Error('No modules were generated. The API response was empty or invalid.');
    }

    return result.modules;
  } catch (error) {
    console.error('Error generating modules:', error);
    throw new Error(`Failed to generate modules: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export type { Fact, Question, Module };
