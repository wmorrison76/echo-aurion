import express from "express";
import { OpenAI } from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.ECHO_OPENAI_API_KEY,
});

// LUCCCA core modules for compatibility checking
const LUCCCA_MODULES = [
  "Culinary",
  "Pastry",
  "Schedule",
  "Inventory",
  "CRM",
  "ChefNet",
  "Support",
  "Whiteboard",
  "Video",
  "Canvas",
  "StickyNotes",
  "EchoCoder",
  "Aurum",
];

// Pre-scan: Check LUCCCA module compatibility
router.post("/prescan", async (req, res) => {
  try {
    const { code, moduleName } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a LUCCCA hospitality framework expert. Analyze React/TypeScript code for compatibility with LUCCCA's hospitality system. Evaluate compatibility with these core modules: ${LUCCCA_MODULES.join(", ")}.

Return a JSON response with:
{
  "compatibilityScore": 0-100,
  "integratedModules": ["Module1", "Module2"],
  "compatibilityIssues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`,
        },
        {
          role: "user",
          content: `Analyze this module code for LUCCCA compatibility:\n\nModule: ${moduleName}\n\nCode:\n${code.substring(0, 2000)}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    res.json({
      type: "prescan",
      timestamp: Date.now(),
      ...parsed,
    });
  } catch (error) {
    console.error("Prescan error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Prescan analysis failed",
    });
  }
});

// Security sweep: Detect vulnerabilities
router.post("/security", async (req, res) => {
  try {
    const { code, moduleName } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a security expert for React/TypeScript applications. Analyze code for vulnerabilities, data exposure risks, and GDPR/guest privacy compliance issues relevant to hospitality systems.

Return a JSON response with:
{
  "securityScore": 0-100,
  "securityFindings": [
    {"level": "critical|warning|info", "issue": "description"}
  ],
  "gdprCompliance": "compliant|needs-work|at-risk",
  "recommendations": ["rec1", "rec2"]
}`,
        },
        {
          role: "user",
          content: `Perform a security audit of this hospitality module:\n\nModule: ${moduleName}\n\nCode:\n${code.substring(0, 2000)}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    res.json({
      type: "security",
      timestamp: Date.now(),
      ...parsed,
    });
  } catch (error) {
    console.error("Security sweep error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Security analysis failed",
    });
  }
});

// Generate intent brief: Auto-documentation
router.post("/intent", async (req, res) => {
  try {
    const { code, moduleName } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a technical writer for hospitality management systems. Generate a brief, clear explanation of what a module does in the context of LUCCCA event management.

Return a JSON response with:
{
  "intentBrief": "Clear 2-3 sentence description of what the module does",
  "purpose": "Main use case",
  "keyFeatures": ["feature1", "feature2"],
  "dataTypes": ["type1", "type2"],
  "documentation": "1-2 paragraph markdown documentation"
}`,
        },
        {
          role: "user",
          content: `Generate an intent brief for this module:\n\nName: ${moduleName}\n\nCode:\n${code.substring(0, 2000)}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    res.json({
      type: "intent",
      timestamp: Date.now(),
      ...parsed,
    });
  } catch (error) {
    console.error("Intent brief error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Intent generation failed",
    });
  }
});

// Dry run: Simulate with test data
router.post("/dryrun", async (req, res) => {
  try {
    const { code, moduleName } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are testing a React component for a hospitality management system. Simulate running this component with typical event data (guests, rooms, dining courses, bookings, etc). Report success/failure and any issues.

Return a JSON response with:
{
  "dryRunSuccess": true|false,
  "testScenario": "Description of test scenario",
  "dryRunOutput": "Simulated output or error",
  "performanceScore": 0-100,
  "performanceMetrics": {
    "complexity": "Low|Medium|High",
    "bundleImpact": "size in KB",
    "estimatedLoadTime": "time in ms"
  },
  "issues": ["issue1", "issue2"]
}`,
        },
        {
          role: "user",
          content: `Simulate running this module with test data (sample guest list: John Doe, Jane Smith, 50 total guests; test scenario: dinner service for 3-course tasting menu, 2 seatings):\n\nModule: ${moduleName}\n\nCode:\n${code.substring(0, 2000)}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    res.json({
      type: "dryrun",
      timestamp: Date.now(),
      ...parsed,
    });
  } catch (error) {
    console.error("Dry run error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Dry run simulation failed",
    });
  }
});

// Deploy: Prepare for Netlify deployment
router.post("/deploy", async (req, res) => {
  try {
    const { code, moduleName } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a deployment engineer. Check if a React component is production-ready for Netlify deployment. Verify build compatibility, dependencies, and deployment requirements.

Return a JSON response with:
{
  "deployStatus": "ready|needs-fixes|error",
  "deploymentChecklist": {
    "buildCompatibility": true|false,
    "dependencies": true|false,
    "environmentVars": ["VAR1", "VAR2"],
    "productionReady": true|false
  },
  "preDeploySteps": ["step1", "step2"],
  "warnings": ["warning1"],
  "estimatedDeployTime": "time estimate"
}`,
        },
        {
          role: "user",
          content: `Check if this module is ready for production Netlify deployment:\n\nModule: ${moduleName}\n\nCode:\n${code.substring(0, 2000)}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    res.json({
      type: "deploy",
      timestamp: Date.now(),
      deployStatus: "Ready",
      deployUrl: `https://luccca-${moduleName.toLowerCase()}.netlify.app`,
      ...parsed,
    });
  } catch (error) {
    console.error("Deploy error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Deployment check failed",
    });
  }
});

export default router;
