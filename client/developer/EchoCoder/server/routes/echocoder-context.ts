import type { RequestHandler } from "express";
import { updateChangeRequest } from "../services/changeControl";

type ContextFile = { path: string; content: string; truncated?: boolean };

// OpenAI client initialization - only create if openai package is available
let client: any = null;
try {
  const { OpenAI } = require("openai");
  client = new OpenAI({
    apiKey: process.env.ECHO_OPENAI_API_KEY,
  });
} catch (error) {
  console.warn("OpenAI package not available, EchoCoder context planning disabled");
}

function buildContextPrompt(prompt: string, files: ContextFile[]) {
  const contextBlocks = files.map((file) => {
    const header = `FILE: ${file.path}${file.truncated ? " (truncated)" : ""}`;
    return `${header}\n${file.content}`;
  });

  return `You are EchoCoder Planner. Produce a concise plan and propose patches.\n\nReturn strict JSON:\n{\n  \"summary\": \"...\",\n  \"plan\": \"...\",\n  \"patches\": [\n    { \"path\": \"relative/path.ts\", \"content\": \"full file contents\", \"rationale\": \"...\" }\n  ]\n}\n\nUser Prompt:\n${prompt}\n\nContext Files:\n${contextBlocks.join("\n\n---\n\n")}`;
}

export const handleContextPlan: RequestHandler = async (req, res) => {
  try {
    if (!req.user && !process.env.ALLOW_UNAUTHENTICATED_AI) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { prompt, files, changeRequestId } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt required" });
    }
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "Context files required" });
    }

    const contextPrompt = buildContextPrompt(prompt, files as ContextFile[]);
    const completion = await client.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: contextPrompt }],
      temperature: 0.4,
      max_tokens: 4096,
    });

    const content = completion.choices?.[0]?.message?.content || "";
    let payload: any = null;
    try {
      payload = JSON.parse(content);
    } catch {
      payload = {
        summary: "Model response was not JSON. See raw output.",
        plan: content,
        patches: [],
      };
    }

    if (changeRequestId) {
      await updateChangeRequest(process.cwd(), String(changeRequestId), (reqState) => ({
        ...reqState,
        contextBundle: {
          prompt,
          files: files.map((file: ContextFile) => ({
            path: file.path,
            truncated: !!file.truncated,
          })),
        },
        aiPlan: {
          summary: payload.summary,
          plan: payload.plan,
          patches: Array.isArray(payload.patches)
            ? payload.patches.map((patch: any) => ({
                path: String(patch.path || ""),
                rationale: typeof patch.rationale === "string" ? patch.rationale : undefined,
              }))
            : [],
          generatedAt: new Date().toISOString(),
        },
      }));
    }

    res.json({ success: true, data: payload });
  } catch (error: any) {
    console.error("Context planning error:", error);
    res.status(500).json({
      error: "Context planning failed",
      message:
        process.env.NODE_ENV === "development"
          ? error?.message
          : "Internal server error",
    });
  }
};
