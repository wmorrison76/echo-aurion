import express, { Request, Response, Router } from "express";
import { OpenAI } from "openai";

const openaiRouter = Router();

// Initialize OpenAI client with server-side key (NEVER exposed to client)
const client = new OpenAI({
  apiKey: process.env.ECHO_OPENAI_API_KEY,
});

/**
 * SECURITY: All OpenAI calls are proxied through this endpoint
 * The API key is stored server-side and NEVER exposed to the client
 * This prevents key compromise and allows request rate limiting/logging
 */

// POST /api/openai/chat - Secure chat completions endpoint
openaiRouter.post("/chat", async (req: Request, res: Response) => {
  try {
    // Validate authentication (should check session/JWT)
    if (!req.user && !process.env.ALLOW_UNAUTHENTICATED_AI) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { messages, model = "gpt-4", temperature = 0.7, maxTokens = 2048 } =
      req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    // Rate limit check (basic implementation)
    const userKey = req.user?.id || req.ip;
    const rateLimitKey = `openai:${userKey}`;
    // TODO: Implement proper rate limiting with Redis

    const completion = await client.chat.completions.create({
      model,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens,
    });

    res.json({ success: true, data: completion });
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    res.status(500).json({
      error: "AI request failed",
      message:
        process.env.NODE_ENV === "development"
          ? error?.message
          : "Internal server error",
    });
  }
});

// POST /api/openai/complete - Text completion endpoint
openaiRouter.post("/complete", async (req: Request, res: Response) => {
  try {
    if (!req.user && !process.env.ALLOW_UNAUTHENTICATED_AI) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { prompt, model = "gpt-4", temperature = 0.7, maxTokens = 1024 } =
      req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Invalid prompt" });
    }

    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user" as const, content: prompt }],
      temperature,
      max_tokens: maxTokens,
    });

    const text =
      completion.choices[0]?.message?.content || "No response generated";
    res.json({ success: true, data: text });
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    res.status(500).json({
      error: "Completion request failed",
      message:
        process.env.NODE_ENV === "development"
          ? error?.message
          : "Internal server error",
    });
  }
});

// POST /api/openai/analyze - Code analysis endpoint
openaiRouter.post("/analyze", async (req: Request, res: Response) => {
  try {
    if (!req.user && !process.env.ALLOW_UNAUTHENTICATED_AI) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { code, language = "javascript", analysisType = "general" } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Invalid code" });
    }

    const prompt = `Analyze the following ${language} code for ${analysisType} issues:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. Issues found (security, performance, style)
2. Suggestions for improvement
3. Best practices recommendations
4. Risk assessment (low/medium/high)`;

    const completion = await client.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user" as const, content: prompt }],
      temperature: 0.5,
      max_tokens: 2048,
    });

    const analysis =
      completion.choices[0]?.message?.content || "No analysis available";
    res.json({ success: true, data: analysis });
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    res.status(500).json({
      error: "Analysis request failed",
      message:
        process.env.NODE_ENV === "development"
          ? error?.message
          : "Internal server error",
    });
  }
});

// POST /api/openai/generate - Full code generation endpoint (supports streaming)
openaiRouter.post("/generate", async (req: Request, res: Response) => {
  try {
    if (!req.user && !process.env.ALLOW_UNAUTHENTICATED_AI) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      prompt,
      context = "",
      model = "gpt-4",
      temperature = 0.7,
      maxTokens = 4096,
      stream = false,
    } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Invalid prompt" });
    }

    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

    if (stream) {
      // Streaming response via SSE (Server-Sent Events)
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");

      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [{ role: "user" as const, content: fullPrompt }],
          temperature,
          max_tokens: maxTokens,
          stream: true,
        });

        for await (const event of completion) {
          if (event.choices[0]?.delta?.content) {
            res.write(
              `data: ${JSON.stringify({ content: event.choices[0].delta.content })}\n\n`
            );
          }
        }
        res.write("data: [DONE]\n\n");
      } catch (streamError) {
        console.error("Stream error:", streamError);
        res.write(
          `data: ${JSON.stringify({ error: "Stream processing failed" })}\n\n`
        );
      } finally {
        res.end();
      }
    } else {
      // Non-streaming response
      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: "user" as const, content: fullPrompt }],
        temperature,
        max_tokens: maxTokens,
      });

      const generated =
        completion.choices[0]?.message?.content || "No code generated";
      res.json({ success: true, data: generated });
    }
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    if (res.headersSent) {
      res.write(
        `data: ${JSON.stringify({ error: error.message || "Unknown error" })}\n\n`
      );
      res.end();
    } else {
      res.status(500).json({
        error: "Generation request failed",
        message:
          process.env.NODE_ENV === "development"
            ? error?.message
            : "Internal server error",
      });
    }
  }
});

export default openaiRouter;
