import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();
const OPENAI_API_KEY = process.env.ECHO_OPENAI_API_KEY;

interface Message {
  role: "user" | "assistant";
  content: string;
}

const questionTemplates = {
  concise: [
    "What is the primary goal or problem this module solves?",
    "Who are the main users of this module?",
    "What data does this module need to track or manage?",
    "How will users interact with this module?",
    "Any specific integrations or third-party systems needed?",
  ],
  detailed: [
    "What is the primary goal or problem this module solves?",
    "Who are the main users and what are their pain points?",
    "What are the key features or workflows needed?",
    "What data entities and relationships are involved?",
    "How should users interact with this (UI/UX preferences)?",
    "Are there any performance or scalability requirements?",
    "What integrations or APIs are needed?",
    "Any specific business rules or logic required?",
    "How should errors be handled?",
  ],
  comprehensive: [
    "What is the primary goal and business context?",
    "Who are all the user types and their specific needs?",
    "What are the detailed workflows and user journeys?",
    "What data entities, fields, and relationships are needed?",
    "What validation rules and business logic apply?",
    "How should the UI/UX be structured? (mobile/desktop/both?)",
    "What are the performance and scalability requirements?",
    "What external systems/APIs need integration?",
    "How should notifications and alerts work?",
    "What analytics or reporting is needed?",
    "How should the module handle concurrent users?",
    "What accessibility standards must be met?",
    "What are the security requirements?",
    "How should the module be tested?",
  ],
};

async function generateAIResponse(
  messages: Message[],
  detailLevel: "concise" | "detailed" | "comprehensive",
  isInitial: boolean,
): Promise<{ response: string; readyForGeneration: boolean }> {
  if (!OPENAI_API_KEY) {
    return {
      response:
        "OpenAI API key not configured. Please set ECHO_OPENAI_API_KEY environment variable.",
      readyForGeneration: false,
    };
  }

  const systemPrompt = `You are an expert requirements engineer and AI architect helping developers and designers build better software modules through intelligent interviewing.

Your role is to:
1. Ask specific, targeted questions to gather requirements
2. Build on previous answers to clarify and deepen understanding
3. Identify integration points and dependencies
4. Suggest improvements and best practices
5. Help avoid future rework by catching edge cases early

Detail Level Guidelines:
- 'concise': Ask 5-6 essential questions, focus on core functionality
- 'detailed': Ask 8-10 questions covering features, data, UX, integrations, performance
- 'comprehensive': Ask 14+ questions covering all aspects including security, analytics, accessibility, testing

When you have enough information (usually after 5-7 exchanges), end your response with:
"✅ I have gathered sufficient requirements to generate your module. Ready to create the code and documentation."

Be conversational but professional. Reference previous answers when asking follow-ups.`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
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

    const responseText = response.data.choices[0].message.content;
    const readyForGeneration = responseText.includes("✅");

    return {
      response: responseText,
      readyForGeneration,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate AI response");
  }
}

async function generateModule(
  conversationMessages: Array<{ role: string; content: string }>,
  detailLevel: string,
): Promise<{
  moduleTitle: string;
  moduleDescription: string;
  generatedCode: string;
  requirementsDoc: string;
}> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const systemPrompt = `You are an expert code generator. Based on the requirements gathered through the interview, generate:

1. A React component module with proper TypeScript types
2. A comprehensive requirements document in markdown

Format your response as JSON with keys:
{
  "moduleTitle": "Module Name",
  "moduleDescription": "Brief description",
  "generatedCode": "Full React/TypeScript code",
  "requirementsDoc": "Markdown requirements document with all gathered details, features, data model, workflows"
}

Generate production-ready code with:
- TypeScript interfaces for data models
- React hooks for state management
- Proper error handling
- Accessibility features (ARIA labels, semantic HTML)
- Responsive design with Tailwind CSS
- Comments for complex logic
- ESLint/Prettier compliant formatting`;

  const conversationSummary = conversationMessages
    .map((m) => `${m.role === "user" ? "Developer" : "AI"}: ${m.content}`)
    .join("\n\n");

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Based on this requirements interview, generate the module and documentation:\n\n${conversationSummary}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const responseText = response.data.choices[0].message.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Failed to parse generated module JSON");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Module generation error:", error);
    throw new Error("Failed to generate module");
  }
}

router.post("/seed-interview", async (req: Request, res: Response) => {
  try {
    const { initialProblem, detailLevel, stage, messages, userMessage } =
      req.body;

    if (
      !detailLevel ||
      !["concise", "detailed", "comprehensive"].includes(detailLevel)
    ) {
      return res.status(400).json({ error: "Invalid detail level" });
    }

    let conversationMessages: Message[] = [];

    if (stage === "initial") {
      if (!initialProblem) {
        return res
          .status(400)
          .json({ error: "Initial problem description required" });
      }

      const firstQuestion =
        questionTemplates[detailLevel as keyof typeof questionTemplates][0];

      conversationMessages = [
        {
          role: "user",
          content: `I'm building a new module to solve this problem: ${initialProblem}`,
        },
      ];

      const { response } = await generateAIResponse(
        conversationMessages,
        detailLevel,
        true,
      );

      return res.json({
        initialResponse: response,
      });
    } else if (stage === "interview") {
      if (!messages || !userMessage) {
        return res
          .status(400)
          .json({ error: "Messages and userMessage required" });
      }

      conversationMessages = [
        ...messages.map((m: any) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
        {
          role: "user",
          content: userMessage,
        },
      ];

      const { response, readyForGeneration } = await generateAIResponse(
        conversationMessages,
        detailLevel,
        false,
      );

      return res.json({
        response,
        readyForGeneration,
      });
    }

    res.status(400).json({ error: "Invalid stage" });
  } catch (error) {
    console.error("Seed interview error:", error);
    res.status(500).json({ error: "Failed to process interview" });
  }
});

router.post("/seed-generate", async (req: Request, res: Response) => {
  try {
    const { messages, detailLevel } = req.body;

    if (!messages || !detailLevel) {
      return res
        .status(400)
        .json({ error: "Messages and detailLevel required" });
    }

    const conversationMessages = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    const result = await generateModule(conversationMessages, detailLevel);

    res.json(result);
  } catch (error) {
    console.error("Module generation error:", error);
    res.status(500).json({ error: "Failed to generate module" });
  }
});

export default router;
