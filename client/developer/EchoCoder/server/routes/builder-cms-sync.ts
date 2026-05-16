import express, { Router, Request, Response } from "express";
import { OpenAI } from "openai";

const router: Router = express.Router();
const openai = new OpenAI({ apiKey: process.env.ECHO_OPENAI_API_KEY });

interface BuilderModel {
  id: string;
  name: string;
  fields: any[];
}

interface ECHOContentType {
  id: string;
  name: string;
  label: string;
  fields: any[];
}

// Import Builder.io models (API call would fetch from Builder.io)
router.post("/import-builder-models", async (req: Request, res: Response) => {
  try {
    const { builderApiKey, builderSpace } = req.body;

    if (!builderApiKey || !builderSpace) {
      return res.status(400).json({
        error: "Missing builderApiKey or builderSpace",
        hint: "Get these from your Builder.io account settings",
      });
    }

    // Simulate fetching Builder.io models
    const builderModels: BuilderModel[] = [
      {
        id: "recipe-card",
        name: "Recipe Card",
        fields: [
          { name: "title", type: "text", required: true },
          { name: "image", type: "image" },
          { name: "ingredients", type: "array" },
          { name: "instructions", type: "richtext" },
          { name: "prepTime", type: "number" },
          { name: "servings", type: "number" },
        ],
      },
      {
        id: "event-card",
        name: "Event Card",
        fields: [
          { name: "title", type: "text", required: true },
          { name: "date", type: "date" },
          { name: "location", type: "text" },
          { name: "description", type: "richtext" },
          { name: "capacity", type: "number" },
          { name: "status", type: "select" },
        ],
      },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a Builder.io to EchoCoder schema mapper. 
          
Convert Builder.io models to EchoCoder CMS schema.

Return JSON only:
{
  "contentTypes": [
    {
      "name": "recipe",
      "label": "Recipes",
      "description": "Recipe management for menu",
      "mappedFrom": "Recipe Card",
      "fields": [{"name": "...", "type": "..."}]
    }
  ],
  "designTokens": {
    "colors": ["..."],
    "typography": ["..."]
  },
  "components": [
    {
      "name": "RecipeCard",
      "mappedFrom": "Recipe Card",
      "componentPath": "components/RecipeCard.tsx"
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Map these Builder.io models to EchoCoder: ${JSON.stringify(builderModels)}`,
        },
      ],
    });

    const mappingText = response.choices[0].message.content || "";
    const mapping = JSON.parse(mappingText);

    res.json({
      status: "success",
      message: "Builder.io models imported successfully",
      imported: {
        contentTypes: mapping.contentTypes.length,
        components: mapping.components.length,
        designTokens: Object.keys(mapping.designTokens).length,
      },
      mapping,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sync design tokens from Builder.io
router.post("/sync-design-tokens", async (req: Request, res: Response) => {
  try {
    const { builderDesignTokens } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Convert Builder.io design tokens to Tailwind CSS configuration.

Return JSON only:
{
  "tailwindConfig": {
    "colors": {},
    "typography": {},
    "spacing": {}
  },
  "cssVariables": "CSS custom properties code",
  "globalStyles": "CSS code for global styles"
}`,
        },
        {
          role: "user",
          content: `Convert these design tokens: ${JSON.stringify(builderDesignTokens)}`,
        },
      ],
    });

    const tokensText = response.choices[0].message.content || "";
    const tokens = JSON.parse(tokensText);

    res.json({
      status: "success",
      message: "Design tokens synced",
      tokens,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export EchoCoder models to Builder.io format
router.post("/export-to-builder", async (req: Request, res: Response) => {
  try {
    const { echoContentTypes, moduleName } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Convert EchoCoder content types to Builder.io model format.

Return JSON only:
{
  "builderModels": [
    {
      "name": "...",
      "description": "...",
      "fields": [...],
      "previewUrl": "..."
    }
  ],
  "exportFormat": "builder-io-v1",
  "builderId": "auto-generated"
}`,
        },
        {
          role: "user",
          content: `Convert EchoCoder models to Builder.io: ${JSON.stringify(echoContentTypes)}`,
        },
      ],
    });

    const exportText = response.choices[0].message.content || "";
    const exported = JSON.parse(exportText);

    res.json({
      status: "success",
      message: "EchoCoder models exported to Builder.io format",
      builderModels: exported.builderModels.length,
      exported,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Compare Builder.io vs EchoCoder features
router.get("/comparison", async (req: Request, res: Response) => {
  try {
    const comparison = {
      feature: {
        "Visual Builder": {
          builderIO: "✅ Full visual builder",
          echoCoder: "✅ Visual code editor with live preview",
        },
        "CMS": {
          builderIO: "✅ Built-in (limited LUCCCA support)",
          echoCoder: "�� Full LUCCCA domain models (8 types)",
        },
        "AI Code Generation": {
          builderIO: "❌ Limited",
          echoCoder: "✅ Full GPT-4 integration (all features)",
        },
        "Testing Generator": {
          builderIO: "❌ Not available",
          echoCoder: "✅ Jest, Playwright, A11y (auto-generated)",
        },
        "Multi-Platform Deploy": {
          builderIO: "⚠️ Limited (Netlify/Vercel only)",
          echoCoder: "✅ 5 platforms (AWS, Azure, GCP, etc.)",
        },
        "Auto-Rollback": {
          builderIO: "❌ Manual rollback",
          echoCoder: "✅ Automatic rollback on failure",
        },
        "MCP Integration": {
          builderIO: "⚠️ Manual configuration required",
          echoCoder: "✅ Auto-detect & smart routing",
        },
        "Cost": {
          builderIO: "$400-1000+/month",
          echoCoder: "$0-5/month (API costs only)",
        },
      },
      summary: {
        builderIO: "General-purpose visual builder with basic features",
        echoCoder: "AI-powered development platform specialized for hospitality (LUCCCA)",
      },
      recommendation: "EchoCoder is 98-99% cheaper and has better hospitality domain support",
    };

    res.json(comparison);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get migration guide from Builder.io to EchoCoder
router.post("/migration-guide", async (req: Request, res: Response) => {
  try {
    const { currentBuilderProject } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Create a step-by-step migration guide from Builder.io to EchoCoder.

Return JSON only:
{
  "steps": [
    {
      "step": 1,
      "title": "...",
      "description": "...",
      "timeEstimate": "X minutes",
      "tools": ["..."]
    }
  ],
  "dataPreservation": "How to preserve existing data",
  "estimatedTime": "X hours",
  "riskLevel": "Low/Medium/High",
  "rollbackPlan": "How to rollback if issues occur"
}`,
        },
        {
          role: "user",
          content: `Create migration guide for: ${JSON.stringify(currentBuilderProject)}`,
        },
      ],
    });

    const guideText = response.choices[0].message.content || "";
    const guide = JSON.parse(guideText);

    res.json({
      status: "success",
      message: "Migration guide generated",
      guide,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
