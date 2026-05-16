import { Router, Request, Response } from "express";
import type {
  EchoOpenAIDialogue,
  DialogueMessage,
  AnyKnowledge,
  TrainingSession,
} from "../../client/echo/types/knowledge";
import {
  storeKnowledgeVector,
  searchKnowledge,
  identifyKnowledgeGaps,
  storeKnowledgeBatch,
} from "../lib/knowledge-vector-service";
const router = Router();
interface DialogueRequest {
  dialogueId?: string;
  domain: string;
  focusAreas: string[];
  currentMessage?: string;
  topic: string;
}
interface TrainingInitRequest {
  domain: "culinary" | "finance" | "hospitality" | "beverage" | "safety";
  focusAreas: string[];
}
const openaiApiKey =
  process.env
    .OPENAI_API_KEY; /** * POST /api/echo-training/init-dialogue * Initialize a new Echo-OpenAI training dialogue */
async function callOpenAIWithRetry(
  messages: any[],
  maxRetries = 3,
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4-turbo-preview",
            messages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = errorData?.error?.code;
        const errorMessage = errorData?.error?.message;
        if (errorCode === "insufficient_quota") {
          console.error("[OpenAI] API quota exceeded:", errorMessage);
          return {
            error: true,
            code: "insufficient_quota",
            message:
              "OpenAI API quota exceeded. Please check your billing settings.",
            userMessage:
              "Unable to initialize training - API quota exceeded. Please contact support.",
            status: 429,
          };
        }
        if (response.status === 429 && attempt < maxRetries - 1) {
          const delayMs = Math.pow(2, attempt) * 1000;
          console.warn(
            `[OpenAI] Rate limited. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        console.error("[OpenAI] API error:", errorData);
        return {
          error: true,
          code: errorCode || "api_error",
          message: errorMessage || "OpenAI API error",
          userMessage: "Failed to communicate with OpenAI. Please try again.",
          status: response.status,
        };
      }
      const data = await response.json();
      return { error: false, data };
    } catch (error: any) {
      if (attempt === maxRetries - 1) {
        console.error("[OpenAI] Network error:", error.message);
        return {
          error: true,
          code: "network_error",
          message: error.message,
          userMessage: "Network error connecting to OpenAI. Please try again.",
          status: 500,
        };
      }
      const delayMs = Math.pow(2, attempt) * 1000;
      console.warn(
        `[OpenAI] Network error, retrying in ${delayMs}ms:`,
        error.message,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return {
    error: true,
    code: "max_retries_exceeded",
    message: "Max retries exceeded",
    userMessage: "Unable to reach OpenAI after multiple attempts.",
    status: 503,
  };
}
router.post("/init-dialogue", async (req: Request, res: Response) => {
  try {
    const { domain, focusAreas } = req.body as TrainingInitRequest;
    if (!domain || !focusAreas?.length) {
      return res
        .status(400)
        .json({ error: "domain and focusAreas are required" });
    }
    if (!openaiApiKey) {
      return res.status(500).json({
        error: "OpenAI API key not configured",
        details: "Please set OPENAI_API_KEY environment variable",
      });
    }
    const dialogueId = `dialogue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const knowledgeGaps = await identifyKnowledgeGaps(domain, focusAreas);
    const systemPrompt = `You are Echo, a culinary AI assistant. You are having a training dialogue with OpenAI to expand your knowledge in ${domain}. Your focus areas: ${focusAreas.join(",")}
Current knowledge gaps: ${knowledgeGaps.length > 0 ? knowledgeGaps.join(",") : "None identified"} Guidelines:
1. Ask clarifying questions to understand concepts deeply
2. Request explanations for techniques, financial metrics, and hospitality practices
3. When you identify a gap, explicitly ask to learn about it
4. Propose solutions and verify understanding
5. Request concrete examples
6. Focus on actionable knowledge that can be applied immediately Start by introducing the training session and asking the first question about the focus areas.`;
    const result = await callOpenAIWithRetry([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Initialize a training dialogue for ${domain}. Focus areas: ${focusAreas.join(",")}. Start the dialogue.`,
      },
    ]);
    if (result.error) {
      console.error(
        `[EchoTraining] OpenAI error [${result.code}]:`,
        result.message,
      );
      return res.status(result.status).json({
        error: result.userMessage,
        code: result.code,
        message: result.message,
      });
    }
    const data = result.data as any;
    const echoInitialMessage = data.choices?.[0]?.message?.content;
    if (!echoInitialMessage) {
      return res
        .status(500)
        .json({ error: "No response from OpenAI", code: "no_response" });
    }
    const dialogue: EchoOpenAIDialogue = {
      id: dialogueId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      topic: `Training in ${domain}`,
      domain,
      messages: [
        {
          id: `msg-${Date.now()}-1`,
          timestamp: new Date().toISOString(),
          speaker: "echo",
          content: echoInitialMessage,
          messageType: "question",
          knowledgeGaps,
        },
      ],
      status: "active",
      trainedKnowledge: [],
    };
    return res.json({ success: true, dialogue, knowledgeGaps });
  } catch (error: any) {
    console.error("[EchoTraining] Init dialogue failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      code: "initialization_error",
    });
  }
}); /** * POST /api/echo-training/dialogue-turn * Process a turn in the Echo-OpenAI dialogue */
router.post("/dialogue-turn", async (req: Request, res: Response) => {
  try {
    const { dialogueId, currentMessage, domain, focusAreas } = req.body as {
      dialogueId: string;
      currentMessage: string;
      domain: string;
      focusAreas: string[];
    };
    if (!dialogueId || !currentMessage || !domain) {
      return res
        .status(400)
        .json({ error: "dialogueId, currentMessage, and domain are required" });
    }
    if (!openaiApiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }
    const systemPrompt = `You are a training partner helping Echo (culinary AI) expand knowledge in ${domain}. Echo's focus areas: ${focusAreas.join(",")} Your role:
1. Respond to Echo's questions with detailed, practical information
2. When Echo proposes learning, validate it and expand on it
3. Correct misunderstandings gently
4. Offer related knowledge that fills gaps
5. Be specific with examples and metrics
6. Help Echo understand connections between concepts
7. When a topic is well-covered, suggest moving to the next focus area Always be specific and actionable. Format your response clearly.`;
    const result = await callOpenAIWithRetry([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Echo says:"${currentMessage}"` },
    ]);
    if (result.error) {
      console.error(
        `[EchoTraining] OpenAI error [${result.code}]:`,
        result.message,
      );
      return res
        .status(result.status)
        .json({ error: result.userMessage, code: result.code });
    }
    const data = result.data as any;
    const openaiResponse = data.choices?.[0]?.message?.content;
    if (!openaiResponse) {
      return res.status(500).json({ error: "No response from OpenAI" });
    }
    const messageId = `msg-${Date.now()}`;
    const userMessage: DialogueMessage = {
      id: messageId,
      timestamp: new Date().toISOString(),
      speaker: "echo",
      content: currentMessage,
      messageType: "question",
    };
    const openaiMessage: DialogueMessage = {
      id: `${messageId}-reply`,
      timestamp: new Date().toISOString(),
      speaker: "openai",
      content: openaiResponse,
      messageType: "answer",
    };
    return res.json({
      success: true,
      userMessage,
      openaiMessage,
      knowledgeExtracted: extractKnowledgeProposals(openaiResponse),
    });
  } catch (error: any) {
    console.error("[EchoTraining] Dialogue turn failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}); /** * POST /api/echo-training/save-learned-knowledge * Save knowledge learned during dialogue */
router.post("/save-learned-knowledge", async (req: Request, res: Response) => {
  try {
    const { knowledge, dialogueId } = req.body as {
      knowledge: AnyKnowledge[];
      dialogueId: string;
    };
    if (!knowledge || !Array.isArray(knowledge)) {
      return res.status(400).json({ error: "knowledge array is required" });
    }
    const enrichedKnowledge = knowledge.map((k) => ({
      ...k,
      sourceType: "openai" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confidence: 0.85,
    }));
    const results = await storeKnowledgeBatch(enrichedKnowledge);
    return res.json({
      success: true,
      stored: results.success,
      failed: results.failed,
      dialogueId,
      message: `Successfully stored ${results.success} knowledge items from dialogue`,
    });
  } catch (error: any) {
    console.error("[EchoTraining] Save knowledge failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}); /** * POST /api/echo-training/auto-capture-openai-knowledge * Automatically capture and store knowledge from OpenAI responses */
router.post(
  "/auto-capture-openai-knowledge",
  async (req: Request, res: Response) => {
    try {
      const { openaiResponse, context, domain } = req.body as {
        openaiResponse: string;
        context: string;
        domain: string;
      };
      if (!openaiResponse) {
        return res.status(400).json({ error: "openaiResponse is required" });
      }
      if (!openaiApiKey) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }
      const extractionPrompt = `You are a knowledge extraction expert. Extract ALL important knowledge and concepts from the following response. Context: ${context}
Domain: ${domain} Response to analyze:"${openaiResponse}" Extract EVERY significant concept, technique, term, definition, principle, or piece of information from this response. Return a JSON array with all knowledge items. Return at least 2-5 items for a comprehensive response. Format:
[ {"type":"technique|recipe|terminology|principle|ingredient|process|concept|financial|procedure","title":"Clear, concise name","content":"Detailed explanation of this knowledge","tags": ["relevant","keywords","and","categories"],"domain":"${domain}","confidence": 0.85 }
] Return ONLY valid JSON array. No other text.`;
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4-turbo-preview",
            messages: [{ role: "user", content: extractionPrompt }],
            temperature: 0.7,
            max_tokens: 3000,
          }),
        },
      );
      if (!response.ok) {
        const error = await response.text();
        console.error("OpenAI extraction error:", error);
        return res
          .status(500)
          .json({ error: "Failed to extract knowledge", details: error });
      }
      const data = (await response.json()) as any;
      const extractedContent = data.choices?.[0]?.message?.content;
      if (!extractedContent) {
        return res
          .status(500)
          .json({ error: "No extraction response from OpenAI" });
      }
      const extractedKnowledge: AnyKnowledge[] = [];
      try {
        const jsonMatch = extractedContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (!item.title || !item.content) {
                console.warn("Skipping incomplete knowledge item:", item);
                continue;
              }
              const knowledge = {
                id: `knowledge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: item.type || "terminology",
                title: item.title.substring(0, 200),
                description: (item.content || "").substring(0, 1000),
                content: (item.content || "").substring(0, 2000),
                source: "openai-auto-capture",
                sourceType: "openai" as const,
                tags: Array.isArray(item.tags)
                  ? item.tags.slice(0, 10)
                  : [domain],
                domain: domain || "culinary",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                confidence: Math.min(1, Math.max(0, item.confidence || 0.85)),
              };
              extractedKnowledge.push(knowledge as AnyKnowledge);
            }
          }
        }
      } catch (parseError) {
        console.warn(
          "[EchoTraining] Failed to parse extracted knowledge:",
          parseError,
          "Content:",
          extractedContent,
        );
      }
      if (extractedKnowledge.length > 0) {
        console.log(
          `[EchoTraining] Storing ${extractedKnowledge.length} knowledge items to Pinecone`,
        );
        const storeResult = await storeKnowledgeBatch(extractedKnowledge);
        console.log("[EchoTraining] Storage result:", storeResult);
      }
      return res.json({
        success: true,
        extracted: extractedKnowledge.length,
        knowledge: extractedKnowledge,
        message: `Captured and stored ${extractedKnowledge.length} knowledge items`,
      });
    } catch (error: any) {
      console.error("[EchoTraining] Auto-capture failed:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  },
); /** * Helper: Extract knowledge proposals from OpenAI response */
function extractKnowledgeProposals(response: string): string[] {
  const proposals: string[] = [];
  const patterns = [
    /(?:Key learning|Learning point|Important concept):\s*(.+?)(?=\n|$)/gi,
    /(?:You should know|Remember|Important):\s*(.+?)(?=\n|$)/gi,
    /(?:Definition|Definition of .+?):\s*(.+?)(?=\n|$)/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(response)) !== null) {
      proposals.push(match[1].trim());
    }
  }
  return proposals.slice(0, 5);
} /** * POST /api/echo-training/complete-dialogue * Complete a training dialogue and summarize learnings */
router.post("/complete-dialogue", async (req: Request, res: Response) => {
  try {
    const { dialogueId, dialogue } = req.body as {
      dialogueId: string;
      dialogue: EchoOpenAIDialogue;
    };
    if (!dialogueId || !dialogue) {
      return res
        .status(400)
        .json({ error: "dialogueId and dialogue are required" });
    }
    if (!openaiApiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }
    const messageHistory = dialogue.messages
      .map((m) => `${m.speaker.toUpperCase()}: ${m.content}`)
      .join("\n\n");
    const summaryPrompt = `Based on this training dialogue, provide a concise summary of what was learned: Domain: ${dialogue.domain}
Focus Areas: ${dialogue.messages[0]?.knowledgeGaps?.join(",") || "Unknown"} Dialogue:
${messageHistory} Provide:
1. Key learnings (3-5 bullet points)
2. Knowledge areas covered
3. Remaining gaps
4. Recommended next topics`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: summaryPrompt }],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI summary error:", error);
      return res
        .status(500)
        .json({ error: "Failed to generate summary", details: error });
    }
    const data = (await response.json()) as any;
    const summary = data.choices?.[0]?.message?.content;
    return res.json({
      success: true,
      summary,
      message: "Dialogue completed and summarized",
    });
  } catch (error: any) {
    console.error("[EchoTraining] Complete dialogue failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});
export const echoOpenAITrainingRouter = router;
