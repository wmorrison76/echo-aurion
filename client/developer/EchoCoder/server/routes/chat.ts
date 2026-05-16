import express from "express";
import axios from "axios";
import { getSentryService } from "../services/sentryService";

const router = express.Router();

const OPENAI_API_KEY = process.env.ECHO_OPENAI_API_KEY;
const SENTRY_DSN = process.env.SENTRY_DSN;
const sentryService = getSentryService();

interface ChatContext {
  currentFile?: string;
  selectedText?: string;
  recentErrors?: Array<{ file: string; error: string; stack: string }>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const sessions: Map<string, { messages: Message[]; context: ChatContext }> =
  new Map();

router.post("/message", async (req, res) => {
  try {
    const { sessionId, message, context } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const session = sessions.get(sessionId) || {
      messages: [],
      context: context || {},
    };

    session.messages.push({
      role: "user",
      content: message,
    });

    const systemPrompt = `You are an expert AI coding assistant with deep knowledge of TypeScript, React, and modern web development.
${context?.currentFile ? `Current file: ${context.currentFile}` : ""}
${context?.selectedText ? `Selected code:\n\`\`\`\n${context.selectedText}\n\`\`\`` : ""}
${
  context?.recentErrors && context.recentErrors.length > 0
    ? `Recent errors:\n${context.recentErrors.map((e) => `- ${e.file}: ${e.error}`).join("\n")}`
    : ""
}

Provide clear, actionable advice. When discussing code, provide specific examples.`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          ...session.messages,
        ],
        temperature: 0.7,
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const assistantMessage =
      response.data.choices?.[0]?.message?.content || "No response";

    session.messages.push({
      role: "assistant",
      content: assistantMessage,
    });

    sessions.set(sessionId, session);

    res.json({
      response: assistantMessage,
      sessionId,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Failed to process chat message",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/analyze-code", async (req, res) => {
  try {
    const { code, language = "typescript" } = req.body;

    const prompt = `Analyze the following ${language} code and provide:
1. Code quality assessment
2. Potential issues or bugs
3. Performance concerns
4. Security vulnerabilities
5. Suggestions for improvement

Code:
\`\`\`${language}
${code}
\`\`\`

Format response with clear sections and line numbers for issues.`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an expert code reviewer. Provide detailed analysis with specific line numbers and actionable suggestions.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const analysis = response.data.choices?.[0]?.message?.content || "";

    const issues = extractIssues(analysis, code);

    res.json({
      analysis,
      issues,
    });
  } catch (error) {
    console.error("Code analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze code",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/sentry-context", async (req, res) => {
  try {
    const { sessionId, projectId } = req.query;

    if (!SENTRY_DSN) {
      return res.json({
        errors: [],
        insights: [
          "Sentry not configured. Set SENTRY_DSN environment variable.",
        ],
      });
    }

    const errors = await sentryService.getRecentErrors(10);
    const insights = await sentryService.generateInsights(errors);

    res.json({
      errors,
      insights,
    });
  } catch (error) {
    console.error("Sentry context error:", error);
    res.status(500).json({
      error: "Failed to retrieve Sentry context",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/suggest-fixes", async (req, res) => {
  try {
    const { errorMessage, stack } = req.body;

    const prompt = `Given the following error and stack trace, provide 3 specific fixes:

Error: ${errorMessage}
${stack ? `Stack:\n${stack}` : ""}

For each fix provide:
1. The specific code change
2. Why it fixes the issue
3. Confidence level (high/medium/low)

Format as a JSON array with objects containing: fix (string), explanation (string), confidence (string)`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an expert debugger. Provide practical, tested solutions for common programming errors.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const content = response.data.choices?.[0]?.message?.content || "";

    let suggestions = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      suggestions = [
        {
          fix: content,
          explanation: "Suggested fix from AI",
          confidence: "medium",
        },
      ];
    }

    res.json({
      suggestions: suggestions.slice(0, 3),
    });
  } catch (error) {
    console.error("Fix suggestion error:", error);
    res.status(500).json({
      error: "Failed to suggest fixes",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

function extractIssues(
  analysis: string,
  code: string,
): Array<{ line: number; issue: string; severity: string }> {
  const issues: Array<{ line: number; issue: string; severity: string }> = [];
  const lines = code.split("\n");

  const lineMatches = analysis.match(/line (\d+)/gi) || [];
  const severityMatches = analysis.match(/(critical|high|medium|low)/gi) || [];

  for (let i = 0; i < Math.min(lineMatches.length, 5); i++) {
    const lineNum = parseInt(lineMatches[i].match(/\d+/)?.[0] || "0");
    const severity = severityMatches[i] || "medium";

    if (lineNum > 0 && lineNum <= lines.length) {
      issues.push({
        line: lineNum,
        issue: `Issue detected: ${lines[lineNum - 1].trim().substring(0, 50)}...`,
        severity,
      });
    }
  }

  return issues;
}

export default router;
