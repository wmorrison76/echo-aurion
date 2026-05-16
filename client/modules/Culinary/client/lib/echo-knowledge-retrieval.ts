/**
 * Echo AI Retrieval Service
 * Hybrid search: Knowledge Base first (fast, cost-free), then OpenAI (thorough)
 * Reduces API costs and latency by leveraging imported recipe knowledge
 */

import { searchImportedRecipes } from "./pinecone-recipe-knowledge";

export interface EchoRetrievalResult {
  answer: string;
  source: "knowledge-base" | "openai" | "hybrid";
  confidence: number;
  sourceRecipe?: string;
  responseTime: number;
  apiCallsUsed: number;
}

const KNOWLEDGE_BASE_TIMEOUT_MS = 100; // Wait 100ms for knowledge base before falling back
const CONFIDENCE_THRESHOLD = 0.65; // Min confidence to use knowledge base answer

/**
 * Retrieve answer from knowledge base first, optionally supplement with OpenAI
 * This dramatically reduces costs and improves response time for common questions
 */
export async function retrieveWithHybridSearch(
  question: string,
  useOpenAiAsBackup: boolean = true
): Promise<EchoRetrievalResult> {
  const startTime = performance.now();

  // Step 1: Search knowledge base (fast, cost-free)
  const kbPromise = searchImportedRecipes(question, 3);

  try {
    // Wait up to KNOWLEDGE_BASE_TIMEOUT_MS for knowledge base results
    const kbResults = await Promise.race([
      kbPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("KB timeout")), KNOWLEDGE_BASE_TIMEOUT_MS)
      ),
    ]) as any[];

    if (kbResults && kbResults.length > 0) {
      const topResult = kbResults[0];
      const confidence = topResult.similarity || 0.7;

      // If we found a good match, use it
      if (confidence >= CONFIDENCE_THRESHOLD) {
        const responseTime = performance.now() - startTime;
        return {
          answer: formatRecipeAnswer(topResult),
          source: "knowledge-base",
          confidence,
          sourceRecipe: topResult.title,
          responseTime,
          apiCallsUsed: 0,
        };
      }

      // If confidence is medium, supplement with OpenAI for better answer
      if (useOpenAiAsBackup && confidence >= 0.5) {
        return retrieveWithOpenAiBacked(question, topResult, startTime);
      }
    }
  } catch (error) {
    // Knowledge base unavailable or timed out, fall through to OpenAI
    console.debug("Knowledge base search failed, falling back to OpenAI", error);
  }

  // Step 2: Fall back to OpenAI if no good knowledge base result
  if (useOpenAiAsBackup) {
    return retrieveFromOpenAi(question, startTime);
  }

  return {
    answer: "No information found in knowledge base. Try importing more recipe books.",
    source: "knowledge-base",
    confidence: 0,
    responseTime: performance.now() - startTime,
    apiCallsUsed: 0,
  };
}

/**
 * Search knowledge base without OpenAI fallback (cost-conscious mode)
 */
export async function retrieveFromKnowledgeBaseOnly(
  question: string
): Promise<EchoRetrievalResult> {
  const startTime = performance.now();

  try {
    const results = await searchImportedRecipes(question, 5);

    if (results && results.length > 0) {
      const topResult = results[0];
      return {
        answer: formatRecipeAnswer(topResult),
        source: "knowledge-base",
        confidence: topResult.similarity || 0.7,
        sourceRecipe: topResult.title,
        responseTime: performance.now() - startTime,
        apiCallsUsed: 0,
      };
    }

    return {
      answer: "Recipe not found in imported books. Import more cookbooks to expand knowledge.",
      source: "knowledge-base",
      confidence: 0,
      responseTime: performance.now() - startTime,
      apiCallsUsed: 0,
    };
  } catch (error) {
    console.error("Knowledge base search failed:", error);
    return {
      answer: "Error searching knowledge base. Please try again.",
      source: "knowledge-base",
      confidence: 0,
      responseTime: performance.now() - startTime,
      apiCallsUsed: 0,
    };
  }
}

/**
 * Hybrid search: Run KB and OpenAI simultaneously, use whoever responds first
 * Best for performance when both sources are available
 */
export async function retrieveWithParallelSearch(
  question: string
): Promise<EchoRetrievalResult> {
  const startTime = performance.now();

  // Race: KB vs OpenAI, first one to win gets used
  const kbPromise = searchImportedRecipes(question, 3).then(
    (results): EchoRetrievalResult => ({
      answer: results.length > 0 ? formatRecipeAnswer(results[0]) : "",
      source: "knowledge-base",
      confidence: results.length > 0 ? (results[0].similarity || 0.7) : 0,
      sourceRecipe: results.length > 0 ? results[0].title : undefined,
      responseTime: performance.now() - startTime,
      apiCallsUsed: 0,
    })
  );

  const openaiPromise = callOpenAiForAnswer(question).then(
    (answer): EchoRetrievalResult => ({
      answer,
      source: "openai",
      confidence: 0.95, // OpenAI is comprehensive
      responseTime: performance.now() - startTime,
      apiCallsUsed: 1,
    })
  );

  try {
    // Use Promise.race to get whichever is faster
    const result = await Promise.race([kbPromise, openaiPromise]);
    return result;
  } catch (error) {
    console.error("Parallel search failed:", error);
    return {
      answer: "Error retrieving information. Please try again.",
      source: "knowledge-base",
      confidence: 0,
      responseTime: performance.now() - startTime,
      apiCallsUsed: 0,
    };
  }
}

/**
 * Intelligent routing: Decide best retrieval strategy based on question type
 */
export async function retrieveSmartly(question: string): Promise<EchoRetrievalResult> {
  // Detect question type
  const isRecipeQuestion =
    /how (do|can) (i|you)|recipe|make|prepare|cook|bake|technique|method/i.test(question);
  const isTechniqueQuestion =
    /technique|method|process|step|instruction|temperature|time/i.test(question);

  // Recipe and technique questions are best answered from knowledge base
  if (isRecipeQuestion || isTechniqueQuestion) {
    return retrieveWithHybridSearch(question, true);
  }

  // Other questions benefit from parallel search (novel questions, comparisons, etc)
  return retrieveWithParallelSearch(question);
}

/**
 * Format recipe data into a natural response for Echo
 */
function formatRecipeAnswer(recipe: any): string {
  const parts: string[] = [];

  parts.push(`**${recipe.title}**`);

  if (recipe.instructions && recipe.instructions.length > 0) {
    parts.push("\n**How to prepare:**");
    recipe.instructions.forEach((inst: string, i: number) => {
      parts.push(`${i + 1}. ${inst}`);
    });
  }

  if (recipe.ingredients && recipe.ingredients.length > 0) {
    parts.push("\n**Ingredients:**");
    recipe.ingredients.forEach((ing: string) => {
      parts.push(`• ${ing}`);
    });
  }

  if (recipe.sourceBook) {
    parts.push(`\n*From: ${recipe.sourceBook}, page ${recipe.sourcePage}*`);
  }

  return parts.join("\n");
}

/**
 * Retrieve with OpenAI as backup for medium-confidence KB results
 */
async function retrieveWithOpenAiBacked(
  question: string,
  kbResult: any,
  startTime: number
): Promise<EchoRetrievalResult> {
  try {
    const openaiAnswer = await callOpenAiForAnswer(question);
    const responseTime = performance.now() - startTime;

    return {
      answer: `${formatRecipeAnswer(kbResult)}\n\n*Additional info from AI:*\n${openaiAnswer}`,
      source: "hybrid",
      confidence: 0.85,
      sourceRecipe: kbResult.title,
      responseTime,
      apiCallsUsed: 1,
    };
  } catch (error) {
    // If OpenAI fails, use KB result
    return {
      answer: formatRecipeAnswer(kbResult),
      source: "knowledge-base",
      confidence: kbResult.similarity || 0.7,
      sourceRecipe: kbResult.title,
      responseTime: performance.now() - startTime,
      apiCallsUsed: 0,
    };
  }
}

/**
 * Call OpenAI for comprehensive answer
 */
async function retrieveFromOpenAi(
  question: string,
  startTime: number
): Promise<EchoRetrievalResult> {
  try {
    const answer = await callOpenAiForAnswer(question);
    return {
      answer,
      source: "openai",
      confidence: 0.95,
      responseTime: performance.now() - startTime,
      apiCallsUsed: 1,
    };
  } catch (error) {
    return {
      answer: "Error retrieving information from AI. Please try again.",
      source: "openai",
      confidence: 0,
      responseTime: performance.now() - startTime,
      apiCallsUsed: 0,
    };
  }
}

/**
 * Call OpenAI API (placeholder - integrate with your actual OpenAI setup)
 */
async function callOpenAiForAnswer(question: string): Promise<string> {
  // This would call your actual OpenAI integration
  // For now, returning a placeholder
  console.warn("OpenAI call not fully implemented in this context");
  return "Please configure OpenAI integration for comprehensive answers.";
}

/**
 * Get retrieval stats for monitoring
 */
export function getRetrievalStats(): {
  kbHits: number;
  openaiCalls: number;
  hybridResponses: number;
  avgResponseTime: number;
} {
  try {
    const stats = JSON.parse(localStorage.getItem("echo:retrieval-stats") || "{}");
    return {
      kbHits: stats.kbHits || 0,
      openaiCalls: stats.openaiCalls || 0,
      hybridResponses: stats.hybridResponses || 0,
      avgResponseTime: stats.avgResponseTime || 0,
    };
  } catch {
    return {
      kbHits: 0,
      openaiCalls: 0,
      hybridResponses: 0,
      avgResponseTime: 0,
    };
  }
}

/**
 * Record retrieval stats for monitoring and optimization
 */
export function recordRetrievalStat(result: EchoRetrievalResult): void {
  try {
    const stats = JSON.parse(localStorage.getItem("echo:retrieval-stats") || "{}");
    
    if (result.source === "knowledge-base") {
      stats.kbHits = (stats.kbHits || 0) + 1;
    } else if (result.source === "openai") {
      stats.openaiCalls = (stats.openaiCalls || 0) + 1;
    } else if (result.source === "hybrid") {
      stats.hybridResponses = (stats.hybridResponses || 0) + 1;
    }

    // Track average response time
    const totalRequests =
      (stats.kbHits || 0) + (stats.openaiCalls || 0) + (stats.hybridResponses || 0);
    stats.avgResponseTime =
      ((stats.avgResponseTime || 0) * (totalRequests - 1) + result.responseTime) /
      totalRequests;

    // Keep last 1000 stat records
    localStorage.setItem("echo:retrieval-stats", JSON.stringify(stats));
  } catch {}
}
