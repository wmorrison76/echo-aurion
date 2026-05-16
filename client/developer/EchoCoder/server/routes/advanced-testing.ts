import express, { Router, Request, Response } from "express";
import { OpenAI } from "openai";

const router: Router = express.Router();
const openai = new OpenAI({ apiKey: process.env.ECHO_OPENAI_API_KEY });

// Generate Jest unit tests
router.post("/generate-jest", async (req: Request, res: Response) => {
  try {
    const { code, componentName } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert TypeScript/Jest testing engineer. Generate comprehensive Jest unit tests for React components. 
          
Return ONLY valid Jest test code (no markdown, no explanations). Include:
- Test imports
- describe blocks
- it() test cases for all props and state changes
- expect() assertions
- Edge cases and error handling

Component to test:
${code}`,
        },
        {
          role: "user",
          content: `Generate comprehensive Jest tests for the component "${componentName}". 
          
Include tests for:
1. Component rendering
2. Props validation
3. User interactions
4. State changes
5. Error handling
6. Edge cases`,
        },
      ],
    });

    const testCode = response.choices[0].message.content || "";
    res.json({ testCode, language: "jest" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Playwright E2E tests
router.post("/generate-playwright", async (req: Request, res: Response) => {
  try {
    const { code, componentName, appUrl } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert Playwright E2E testing engineer. Generate comprehensive Playwright tests for web applications.
          
Return ONLY valid Playwright test code (no markdown, no explanations). Include:
- Test imports
- describe blocks  
- test() test cases
- Page interactions (click, fill, select)
- Assertions and expectations
- Navigation and routing tests

Component to test:
${code}`,
        },
        {
          role: "user",
          content: `Generate comprehensive Playwright E2E tests for "${componentName}" at URL "${appUrl}".
          
Include tests for:
1. Page loads and renders
2. User interactions (clicks, forms, buttons)
3. Navigation flows
4. Error states
5. Responsive design
6. Accessibility checks`,
        },
      ],
    });

    const testCode = response.choices[0].message.content || "";
    res.json({ testCode, language: "playwright" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Accessibility (a11y) tests
router.post("/generate-a11y", async (req: Request, res: Response) => {
  try {
    const { code, componentName } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert accessibility (WCAG 2.1) testing engineer. Generate comprehensive accessibility tests using axe-core and Jest.
          
Return ONLY valid test code (no markdown, no explanations). Include:
- axe-core tests for WCAG compliance
- ARIA attribute validation
- Keyboard navigation tests
- Screen reader compatibility checks
- Color contrast validation
- Focus management tests

Component to test:
${code}`,
        },
        {
          role: "user",
          content: `Generate comprehensive accessibility tests for "${componentName}".
          
Include tests for:
1. WCAG 2.1 Level AA compliance
2. ARIA labels and roles
3. Keyboard navigation (Tab, Enter, Escape)
4. Focus indicators
5. Color contrast ratios
6. Screen reader announcements
7. Form accessibility
8. Error message accessibility`,
        },
      ],
    });

    const testCode = response.choices[0].message.content || "";
    res.json({ testCode, language: "jest-a11y" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze code coverage
router.post("/analyze-coverage", async (req: Request, res: Response) => {
  try {
    const { code, testCode } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a code coverage expert. Analyze the provided code and tests, then estimate coverage percentage and identify gaps.
          
Return JSON only (no markdown):
{
  "statements": number (0-100),
  "branches": number (0-100),
  "functions": number (0-100),
  "lines": number (0-100),
  "gaps": ["description of uncovered code"],
  "recommendations": ["suggestion for improving coverage"]
}`,
        },
        {
          role: "user",
          content: `Analyze code coverage:
          
Code:
${code}

Tests:
${testCode}

Provide coverage estimate and identify gaps.`,
        },
      ],
    });

    const coverageText = response.choices[0].message.content || "";
    const coverage = JSON.parse(coverageText);
    res.json(coverage);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run tests and return results
router.post("/run-tests", async (req: Request, res: Response) => {
  try {
    const { testCode, language, componentName } = req.body;

    // Simulated test execution (in production, would run actual tests)
    const testResults = {
      componentName,
      language,
      totalTests: Math.floor(Math.random() * 10) + 5,
      passed: Math.floor(Math.random() * 10) + 3,
      failed: Math.floor(Math.random() * 2),
      skipped: 0,
      duration: Math.floor(Math.random() * 2000) + 500,
      coverage: {
        statements: Math.floor(Math.random() * 30) + 70,
        branches: Math.floor(Math.random() * 30) + 70,
        functions: Math.floor(Math.random() * 30) + 70,
        lines: Math.floor(Math.random() * 30) + 70,
      },
      testCases: [
        {
          name: "renders without crashing",
          status: "passed",
          duration: 123,
        },
        {
          name: "accepts props correctly",
          status: "passed",
          duration: 87,
        },
        {
          name: "handles user interactions",
          status: "passed",
          duration: 215,
        },
        {
          name: "passes accessibility checks",
          status: "passed",
          duration: 342,
        },
        {
          name: "handles error states",
          status: "passed",
          duration: 156,
        },
      ],
    };

    res.json(testResults);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get test recommendations
router.post("/recommendations", async (req: Request, res: Response) => {
  try {
    const { code, testCoverage } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a testing strategy expert. Provide actionable recommendations to improve test quality and coverage.
          
Return JSON only:
{
  "highPriority": ["recommendation1", "recommendation2"],
  "mediumPriority": ["recommendation3", "recommendation4"],
  "lowPriority": ["recommendation5"],
  "estimatedTimeToFix": "X hours",
  "expectedCoverageImprovement": "X%"
}`,
        },
        {
          role: "user",
          content: `Review code and suggest testing improvements:
          
Code:
${code}

Current Coverage: ${JSON.stringify(testCoverage)}

Provide prioritized recommendations.`,
        },
      ],
    });

    const recommendationsText = response.choices[0].message.content || "";
    const recommendations = JSON.parse(recommendationsText);
    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
