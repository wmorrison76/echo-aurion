import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();
const OPENAI_API_KEY = process.env.ECHO_OPENAI_API_KEY;

async function generateDocumentation(
  conversationMessages: Array<{ role: string; content: string }>,
  generatedCode: string,
  moduleTitle: string,
  requirementsDoc: string,
  docType: "readme" | "api" | "deployment" | "erd" | "all",
): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const conversationSummary = conversationMessages
    .map((m) => `${m.role === "user" ? "Developer" : "AI"}: ${m.content}`)
    .join("\n\n");

  const systemPrompt = `You are an expert technical writer. Generate professional documentation based on the module requirements and code.

Format your response as JSON with the requested documentation.`;

  const docPrompts = {
    readme: `Generate a comprehensive README.md with:
1. Project overview and features
2. Installation instructions
3. Quick start guide
4. API/Usage examples
5. Configuration options
6. Troubleshooting
7. Contributing guidelines

Return JSON: { "readme": "markdown content" }`,

    api: `Generate detailed API documentation with:
1. API endpoints list (method, path, parameters)
2. Authentication requirements
3. Request/Response examples for each endpoint
4. Error handling codes
5. Rate limiting info
6. Pagination details
7. Data models/schemas

Return JSON: { "apiDocs": "markdown content" }`,

    deployment: `Generate deployment guide including:
1. Environment setup requirements
2. Database migration steps
3. Environment variables to configure
4. Docker/containerization setup
5. CI/CD pipeline configuration (GitHub Actions/GitLab)
6. Monitoring and logging setup
7. Scaling considerations
8. Backup and recovery procedures
9. Security checklist

Return JSON: { "deploymentGuide": "markdown content" }`,

    erd: `Generate an Entity Relationship Diagram in Mermaid syntax showing:
1. All data entities/tables from the requirements
2. Relationships and cardinality
3. Key attributes for each entity
4. Primary and foreign keys

Return JSON: { "erdDiagram": "mermaid diagram code" }`,

    all: `Generate comprehensive documentation:

Return JSON: {
  "readme": "README.md markdown",
  "apiDocs": "API documentation markdown",
  "deploymentGuide": "Deployment guide markdown",
  "erdDiagram": "Mermaid ERD diagram"
}`,
  };

  const docPrompt =
    docType === "all"
      ? docPrompts.all
      : `${docPrompts[docType]}\n\nModule: ${moduleTitle}\n\nRequirements:\n${requirementsDoc}\n\nCode:\n${generatedCode.slice(0, 2000)}...`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: docPrompt,
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
      throw new Error("Failed to parse documentation JSON");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Documentation generation error:", error);
    throw new Error("Failed to generate documentation");
  }
}

async function generateTestScenarios(
  requirements: string,
  code: string,
  testFramework: "jest" | "vitest" | "mocha" = "vitest",
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const systemPrompt = `You are an expert QA engineer. Generate comprehensive test cases for the given module.
Focus on: unit tests, integration points, edge cases, error handling, accessibility.
Use ${testFramework} syntax.`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate test file for this module:\n\nRequirements:\n${requirements}\n\nCode:\n${code.slice(0, 2000)}`,
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
    console.error("Test generation error:", error);
    throw new Error("Failed to generate tests");
  }
}

async function generateAccessibilityReport(
  code: string,
  uiMarkup: string,
): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const systemPrompt = `You are an accessibility expert (WCAG 2.1 AA compliance). 
Audit the provided UI code and identify accessibility issues and improvements.

Return JSON: {
  "score": 0-100,
  "issues": [{"severity": "critical|warning|info", "element": "...", "issue": "...", "fix": "..."}],
  "summary": "Overall accessibility assessment"
}`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Audit this component for accessibility:\n\n${uiMarkup.slice(0, 2000)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
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
      throw new Error("Failed to parse accessibility report JSON");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Accessibility audit error:", error);
    throw new Error("Failed to generate accessibility report");
  }
}

// Routes
router.post("/generate-readme", async (req: Request, res: Response) => {
  try {
    const { conversations, code, moduleTitle, requirements } = req.body;

    const docs = await generateDocumentation(
      conversations,
      code,
      moduleTitle,
      requirements,
      "readme",
    );

    res.json(docs);
  } catch (error) {
    console.error("README generation error:", error);
    res.status(500).json({ error: "Failed to generate README" });
  }
});

router.post("/generate-api-docs", async (req: Request, res: Response) => {
  try {
    const { conversations, code, moduleTitle, requirements } = req.body;

    const docs = await generateDocumentation(
      conversations,
      code,
      moduleTitle,
      requirements,
      "api",
    );

    res.json(docs);
  } catch (error) {
    console.error("API docs generation error:", error);
    res.status(500).json({ error: "Failed to generate API docs" });
  }
});

router.post(
  "/generate-deployment-guide",
  async (req: Request, res: Response) => {
    try {
      const { conversations, code, moduleTitle, requirements } = req.body;

      const docs = await generateDocumentation(
        conversations,
        code,
        moduleTitle,
        requirements,
        "deployment",
      );

      res.json(docs);
    } catch (error) {
      console.error("Deployment guide generation error:", error);
      res.status(500).json({ error: "Failed to generate deployment guide" });
    }
  },
);

router.post("/generate-erd", async (req: Request, res: Response) => {
  try {
    const { conversations, code, moduleTitle, requirements } = req.body;

    const docs = await generateDocumentation(
      conversations,
      code,
      moduleTitle,
      requirements,
      "erd",
    );

    res.json(docs);
  } catch (error) {
    console.error("ERD generation error:", error);
    res.status(500).json({ error: "Failed to generate ERD" });
  }
});

router.post(
  "/generate-all-documentation",
  async (req: Request, res: Response) => {
    try {
      const { conversations, code, moduleTitle, requirements } = req.body;

      const docs = await generateDocumentation(
        conversations,
        code,
        moduleTitle,
        requirements,
        "all",
      );

      res.json(docs);
    } catch (error) {
      console.error("Complete documentation generation error:", error);
      res.status(500).json({ error: "Failed to generate documentation" });
    }
  },
);

router.post("/generate-tests", async (req: Request, res: Response) => {
  try {
    const { requirements, code, framework = "vitest" } = req.body;

    const tests = await generateTestScenarios(requirements, code, framework);

    res.json({ tests });
  } catch (error) {
    console.error("Test generation error:", error);
    res.status(500).json({ error: "Failed to generate tests" });
  }
});

router.post("/audit-accessibility", async (req: Request, res: Response) => {
  try {
    const { code, uiMarkup } = req.body;

    const report = await generateAccessibilityReport(code, uiMarkup);

    res.json(report);
  } catch (error) {
    console.error("Accessibility audit error:", error);
    res.status(500).json({ error: "Failed to audit accessibility" });
  }
});

export default router;
