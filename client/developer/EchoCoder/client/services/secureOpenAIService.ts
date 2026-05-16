/**
 * SECURITY: This service wraps all OpenAI API calls through server endpoints
 * The actual API key is stored server-side and NEVER exposed to the client
 * This prevents key compromise and allows request rate limiting/logging
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface CompletionRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface AnalysisRequest {
  code: string;
  language?: string;
  analysisType?: string;
}

interface GenerationRequest {
  prompt: string;
  context?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Call OpenAI chat completions API through secure server endpoint
 */
export async function chatCompletion(req: ChatRequest): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/openai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Chat completion failed");
    }

    const data = await response.json();
    return data.data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Chat completion error:", error);
    throw error;
  }
}

/**
 * Get text completion from OpenAI through secure server endpoint
 */
export async function textCompletion(req: CompletionRequest): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/openai/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Completion failed");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Text completion error:", error);
    throw error;
  }
}

/**
 * Analyze code for issues through OpenAI
 */
export async function analyzeCode(req: AnalysisRequest): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/openai/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Code analysis failed");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Code analysis error:", error);
    throw error;
  }
}

/**
 * Generate code through OpenAI
 */
export async function generateCode(req: GenerationRequest): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/openai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Code generation failed");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Code generation error:", error);
    throw error;
  }
}

/**
 * Stream text generation from OpenAI (for real-time response display)
 */
export async function* generateCodeStream(
  req: GenerationRequest
): AsyncGenerator<string, void, unknown> {
  try {
    const response = await fetch(`${API_BASE}/openai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...req, stream: true }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Code generation failed");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Response body not available");

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // Process SSE or streaming JSON responses
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                yield data.content;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error("Code generation streaming error:", error);
    throw error;
  }
}

export default {
  chatCompletion,
  textCompletion,
  analyzeCode,
  generateCode,
  generateCodeStream,
};
