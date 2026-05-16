import type { RequestHandler } from "express";

interface SessionContent {
  shapes: Array<{ type: string; color: string; x: number; y: number }>;
  texts: Array<{ text: string; x: number; y: number; fontSize: number }>;
  totalElements: number;
}

interface SessionSummarizationRequest {
  sessionTitle: string;
  content: SessionContent;
  duration: number;
  participants?: string[];
}

interface SessionSummary {
  title: string;
  duration: string;
  keyPoints: string[];
  actionItems: string[];
  participants?: string[];
  nextSteps: string;
  sessionNotes: string;
  exportTime: number;
}

async function summarizeSessionWithAI(
  sessionTitle: string,
  content: SessionContent,
  duration: number,
  participants: string[],
  apiKey: string,
  model: string
): Promise<SessionSummary> {
  try {
    // Extract text content from canvas
    const textContent = content.texts
      .map((t) => t.text)
      .filter((t) => t.length > 0)
      .join(" ");

    const durationStr = formatDuration(duration);

    const prompt = `You are a professional meeting analyst. Generate a comprehensive summary of a whiteboard session.

SESSION DETAILS:
Title: ${sessionTitle}
Duration: ${durationStr}
Participants: ${participants.length > 0 ? participants.join(", ") : "Not specified"}
Total Canvas Elements: ${content.totalElements} (shapes + text)

CANVAS CONTENT EXTRACTED:
${textContent || "(Visual content detected but no text extracted)"}

Analyze this session and provide a JSON response with:
{
  "title": "Clear, professional session title",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "actionItems": ["Action 1", "Action 2"],
  "nextSteps": "Summary of what comes next",
  "sessionNotes": "Overall summary of what was discussed"
}

Focus on:
1. Main topics discussed
2. Decisions made
3. Open items or unresolved points
4. Next steps
5. Recommendations`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a professional meeting analyst and summarizer. Provide analysis in JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "{}";

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      title: analysis.title || sessionTitle,
      duration: durationStr,
      keyPoints: analysis.keyPoints || [],
      actionItems: analysis.actionItems || [],
      participants: participants.length > 0 ? participants : undefined,
      nextSteps: analysis.nextSteps || "No next steps specified",
      sessionNotes: analysis.sessionNotes || "Session completed",
      exportTime: Date.now(),
    };
  } catch (error) {
    console.error("Error summarizing session with AI:", error);
    return generateFallbackSummary(
      sessionTitle,
      content,
      duration,
      participants
    );
  }
}

function generateFallbackSummary(
  sessionTitle: string,
  content: SessionContent,
  duration: number,
  participants: string[]
): SessionSummary {
  const textContent = content.texts
    .map((t) => t.text)
    .filter((t) => t.length > 0);
  const durationStr = formatDuration(duration);

  // Extract potential action items (text starting with todo/action keywords)
  const actionItems = textContent
    .filter(
      (t) =>
        t.toLowerCase().includes("todo") ||
        t.toLowerCase().includes("action") ||
        t.toLowerCase().includes("next")
    )
    .slice(0, 3);

  // Extract potential key points (longer text items)
  const keyPoints = textContent
    .filter((t) => t.length > 20)
    .slice(0, 3)
    .map((t) => t.substring(0, 100));

  return {
    title: sessionTitle,
    duration: durationStr,
    keyPoints: keyPoints.length > 0 ? keyPoints : ["Whiteboard planning session completed"],
    actionItems:
      actionItems.length > 0
        ? actionItems
        : ["Review session notes", "Follow up on action items"],
    participants: participants.length > 0 ? participants : undefined,
    nextSteps: "Distribute session summary and track action items",
    sessionNotes: `${sessionTitle} - ${content.totalElements} elements created. ${content.texts.length} text elements captured.`,
    exportTime: Date.now(),
  };
}

function formatDuration(ms: number): string {
  if (ms === 0) return "Unknown";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

const summarizeSessionHandler: RequestHandler = async (req, res) => {
  try {
    const {
      sessionTitle,
      content,
      duration,
      participants = [],
    } = req.body as SessionSummarizationRequest;

    if (!sessionTitle || !content) {
      return res.status(400).json({
        error: "sessionTitle and content are required",
      });
    }

    const apiKey =
      process.env.ECHO_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const model = process.env.ECHO_OPENAI_MODEL || "gpt-3.5-turbo";

    let summary: SessionSummary;

    if (apiKey) {
      summary = await summarizeSessionWithAI(
        sessionTitle,
        content,
        duration,
        participants,
        apiKey,
        model
      );
    } else {
      summary = generateFallbackSummary(
        sessionTitle,
        content,
        duration,
        participants
      );
    }

    res.json(summary);
  } catch (error) {
    console.error("Session summarization error:", error);

    const { sessionTitle, content, duration, participants = [] } = req.body as SessionSummarizationRequest;

    const fallbackSummary = generateFallbackSummary(
      sessionTitle,
      content,
      duration,
      participants
    );

    res.status(200).json({
      ...fallbackSummary,
      fallback: true,
    });
  }
};

export default summarizeSessionHandler;
