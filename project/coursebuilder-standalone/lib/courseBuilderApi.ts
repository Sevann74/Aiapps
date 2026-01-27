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

    const MAX_TEXT_LENGTH = 40000; // ~15 pages per API call - safe for timeout
    let processText = text;

    // For fact extraction, we use the first portion of the document
    // Facts from the beginning are usually the most important (definitions, scope, etc.)
    if (text.length > MAX_TEXT_LENGTH) {
      console.warn(`Document text is ${text.length} characters. Using first ${MAX_TEXT_LENGTH} characters for fact extraction.`);
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

// Split text into chunks at natural boundaries (paragraphs, sections)
function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxChunkSize) {
      chunks.push(remaining);
      break;
    }
    
    // Find a good break point (paragraph or section break)
    let breakPoint = maxChunkSize;
    
    // Look for section breaks first (e.g., "5.1", "Section", double newlines)
    const sectionPattern = /\n\s*\n|\n\d+\.\d*\s|\nSection\s/gi;
    let lastGoodBreak = -1;
    let match;
    
    // Reset regex and search within the chunk
    const searchText = remaining.substring(0, maxChunkSize);
    const regex = new RegExp(sectionPattern);
    while ((match = regex.exec(searchText)) !== null) {
      if (match.index > maxChunkSize * 0.5) { // Only use breaks in the second half
        lastGoodBreak = match.index;
      }
    }
    
    if (lastGoodBreak > 0) {
      breakPoint = lastGoodBreak;
    } else {
      // Fall back to last period or newline
      const lastPeriod = searchText.lastIndexOf('. ');
      const lastNewline = searchText.lastIndexOf('\n');
      breakPoint = Math.max(lastPeriod, lastNewline, maxChunkSize * 0.8);
    }
    
    chunks.push(remaining.substring(0, breakPoint));
    remaining = remaining.substring(breakPoint).trim();
  }
  
  return chunks;
}

export async function generateModulesFromDocument(
  text: string,
  facts: Fact[],
  onProgress?: (message: string) => void
): Promise<Module[]> {
  try {
    const CHUNK_SIZE = 40000; // ~15 pages per chunk - safe for API timeout
    const MAX_TOTAL_SIZE = 200000; // ~80 pages max total
    
    let processText = text;
    if (text.length > MAX_TOTAL_SIZE) {
      console.warn(`Document text is ${text.length} characters. Limiting to ${MAX_TOTAL_SIZE} characters.`);
      processText = text.substring(0, MAX_TOTAL_SIZE);
    }
    
    // If document is small enough, process in one go
    if (processText.length <= CHUNK_SIZE) {
      onProgress?.('Processing document...');
      const result = await callEdgeFunction<{ modules: Module[] }>('generate-modules', {
        text: processText,
        facts: facts.slice(0, 15)
      });
      
      if (!result.modules || result.modules.length === 0) {
        throw new Error('No modules were generated. The API response was empty or invalid.');
      }
      
      return result.modules;
    }
    
    // For large documents, process in chunks
    const chunks = splitTextIntoChunks(processText, CHUNK_SIZE);
    console.log(`Processing large document in ${chunks.length} chunks...`);
    onProgress?.(`Processing large document in ${chunks.length} parts...`);
    
    const allModules: Module[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkNum = i + 1;
      
      console.log(`Processing chunk ${chunkNum}/${chunks.length} (${chunk.length} characters)...`);
      onProgress?.(`Processing part ${chunkNum} of ${chunks.length}...`);
      
      try {
        const result = await callEdgeFunction<{ modules: Module[] }>('generate-modules', {
          text: chunk,
          facts: facts.slice(0, 10),
          chunkInfo: { current: chunkNum, total: chunks.length }
        });
        
        if (result.modules && result.modules.length > 0) {
          // Adjust module IDs to be unique across chunks
          const adjustedModules = result.modules.map((module, idx) => ({
            ...module,
            id: `section_${allModules.length + idx + 1}`
          }));
          allModules.push(...adjustedModules);
        }
      } catch (chunkError) {
        console.error(`Error processing chunk ${chunkNum}:`, chunkError);
        // Continue with other chunks even if one fails
        onProgress?.(`Warning: Part ${chunkNum} had issues, continuing...`);
      }
      
      // Small delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (allModules.length === 0) {
      throw new Error('No modules were generated from any part of the document.');
    }
    
    console.log(`Successfully generated ${allModules.length} modules from ${chunks.length} chunks`);
    onProgress?.(`Generated ${allModules.length} sections from document`);
    
    return allModules;
  } catch (error) {
    console.error('Error generating modules:', error);
    throw new Error(`Failed to generate modules: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export type { Fact, Question, Module };
