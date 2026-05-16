import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();
const OPENAI_API_KEY = process.env.ECHO_OPENAI_API_KEY;

async function generateUnitTests(
  code: string,
  requirements: string,
  framework: "jest" | "vitest" = "vitest",
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const systemPrompt = `You are an expert test engineer. Generate comprehensive unit tests using ${framework}.
Include: happy path tests, edge cases, error handling, type safety, mocking where needed.
Use describe/test syntax. Aim for 80%+ code coverage.`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate unit tests:\n\nRequirements: ${requirements}\n\nCode:\n${code.slice(0, 3000)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 3500,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Unit test generation error:", error);
    throw new Error("Failed to generate unit tests");
  }
}

async function generateE2ETests(
  requirements: string,
  userFlows: string[],
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const systemPrompt = `You are an expert E2E test engineer. Generate Playwright test scenarios.
Create tests for user workflows with proper waits, selectors, and assertions.
Include: positive flows, error handling, edge cases, accessibility checks.`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate E2E tests for:\n\nRequirements: ${requirements}\n\nUser Flows:\n${userFlows.join("\n")}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("E2E test generation error:", error);
    throw new Error("Failed to generate E2E tests");
  }
}

async function generateAccessibilityTests(uiMarkup: string): Promise<any> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const systemPrompt = `You are a11y expert. Generate accessibility tests using axe-core for Jest.
Test WCAG 2.1 AA compliance: keyboard nav, screen readers, color contrast, labels, ARIA.

Return JSON: { "tests": "test code", "issues": ["issue1", "issue2"] }`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate a11y tests for:\n\n${uiMarkup.slice(0, 2000)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2500,
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
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { tests: responseText };
  } catch (error) {
    console.error("Accessibility test generation error:", error);
    throw new Error("Failed to generate accessibility tests");
  }
}

async function analyzeTestCoverage(code: string, tests: string): Promise<any> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const systemPrompt = `Analyze test coverage. Return JSON with:
{ "estimatedCoverage": 0-100, "uncoveredPaths": ["path1", "path2"], "recommendations": ["rec1"] }`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze coverage:\n\nCode:\n${code.slice(0, 2000)}\n\nTests:\n${tests.slice(0, 2000)}`,
          },
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

    const responseText = response.data.choices[0].message.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { estimatedCoverage: 50 };
  } catch (error) {
    console.error("Coverage analysis error:", error);
    throw new Error("Failed to analyze coverage");
  }
}

router.post("/generate-unit-tests", async (req: Request, res: Response) => {
  try {
    const { code, requirements, framework = "vitest" } = req.body;
    const tests = await generateUnitTests(code, requirements, framework);
    res.json({ tests, framework });
  } catch (error) {
    console.error("Unit tests generation error:", error);
    res.status(500).json({ error: "Failed to generate unit tests" });
  }
});

router.post("/generate-e2e-tests", async (req: Request, res: Response) => {
  try {
    const { requirements, userFlows } = req.body;
    const tests = await generateE2ETests(requirements, userFlows);
    res.json({ tests, framework: "playwright" });
  } catch (error) {
    console.error("E2E tests generation error:", error);
    res.status(500).json({ error: "Failed to generate E2E tests" });
  }
});

router.post(
  "/generate-accessibility-tests",
  async (req: Request, res: Response) => {
    try {
      const { uiMarkup } = req.body;
      const result = await generateAccessibilityTests(uiMarkup);
      res.json(result);
    } catch (error) {
      console.error("Accessibility tests generation error:", error);
      res.status(500).json({ error: "Failed to generate accessibility tests" });
    }
  },
);

router.post("/analyze-coverage", async (req: Request, res: Response) => {
  try {
    const { code, tests } = req.body;
    const analysis = await analyzeTestCoverage(code, tests);
    res.json(analysis);
  } catch (error) {
    console.error("Coverage analysis error:", error);
    res.status(500).json({ error: "Failed to analyze coverage" });
  }
});

export default router;
