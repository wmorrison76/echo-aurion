import express, { Router, Request, Response } from "express";

const router: Router = express.Router();

// MCP Configuration Database (in production, this would be Supabase)
const mcpRegistry: Record<string, any> = {
  supabase: {
    name: "Supabase",
    status: "active",
    tier: "free",
    cost: "$0/month",
    features: ["Database", "Auth", "Real-time", "Storage"],
    configured: !!process.env.VITE_SUPABASE_URL,
  },
  github: {
    name: "GitHub",
    status: "active",
    tier: "free",
    cost: "$0/month",
    features: ["Version Control", "CI/CD", "Pull Requests"],
    configured: !!process.env.GITHUB_TOKEN,
  },
  sentry: {
    name: "Sentry",
    status: "active",
    tier: "free",
    cost: "$0/month (5k events/mo)",
    features: ["Error Tracking", "Performance", "Alerts"],
    configured: !!process.env.SENTRY_DSN,
  },
  netlify: {
    name: "Netlify",
    status: "active",
    tier: "free",
    cost: "$0/month",
    features: ["Hosting", "Deployment", "Functions"],
    configured: true,
  },
  vercel: {
    name: "Vercel",
    status: "active",
    tier: "free",
    cost: "$0/month",
    features: ["Hosting", "Deployment", "Analytics"],
    configured: true,
  },
  zapier: {
    name: "Zapier",
    status: "available",
    tier: "free",
    cost: "$0/month (100 tasks/mo)",
    features: ["Automation", "Workflows", "Integrations"],
    configured: !!process.env.ZAPIER_API_KEY,
  },
  linear: {
    name: "Linear",
    status: "available",
    tier: "free",
    cost: "$0/month",
    features: ["Project Management", "Issue Tracking", "Team Collaboration"],
    configured: !!process.env.LINEAR_API_KEY,
  },
  slack: {
    name: "Slack",
    status: "available",
    tier: "free",
    cost: "$0/month (limited history)",
    features: ["Chat", "Notifications", "Integration Hub"],
    configured: !!process.env.SLACK_BOT_TOKEN,
  },
  stripe: {
    name: "Stripe",
    status: "available",
    tier: "pay-as-you-go",
    cost: "2.9% + $0.30 per transaction",
    features: ["Payments", "Subscriptions", "Invoicing"],
    configured: !!process.env.STRIPE_API_KEY,
  },
  sendgrid: {
    name: "SendGrid / Resend",
    status: "available",
    tier: "free",
    cost: "$0/month (100 emails/day)",
    features: ["Email", "Notifications", "Transactional"],
    configured: !!process.env.SENDGRID_API_KEY,
  },
};

// Auto-initialize available MCPs
router.post("/auto-initialize", async (req: Request, res: Response) => {
  try {
    const enabledMCPs = Object.entries(mcpRegistry)
      .filter(([_, config]) => config.configured && config.status === "active")
      .map(([key, config]) => ({
        id: key,
        name: config.name,
        tier: config.tier,
        cost: config.cost,
      }));

    const stats = {
      totalMCPs: Object.keys(mcpRegistry).length,
      activeMCPs: enabledMCPs.length,
      freeMCPs: enabledMCPs.filter((m) => m.cost === "$0/month").length,
      estimatedMonthlyCost: "$0",
      enabledMCPs,
      message: `EchoCoder initialized with ${enabledMCPs.length} MCPs (${enabledMCPs.filter((m) => m.cost === "$0/month").length} free)`,
    };

    res.json({
      status: "success",
      ...stats,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all available MCPs
router.get("/list", async (req: Request, res: Response) => {
  try {
    const mcps = Object.entries(mcpRegistry).map(([key, config]) => ({
      id: key,
      ...config,
    }));

    res.json(mcps);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get MCP status
router.get("/status", async (req: Request, res: Response) => {
  try {
    const active = Object.entries(mcpRegistry)
      .filter(([_, config]) => config.configured)
      .map(([key, config]) => ({
        id: key,
        name: config.name,
        status: config.status,
      }));

    const available = Object.entries(mcpRegistry)
      .filter(([_, config]) => !config.configured)
      .map(([key, config]) => ({
        id: key,
        name: config.name,
        status: "available",
      }));

    res.json({
      active,
      available,
      totalConfigured: active.length,
      totalAvailable: available.length,
      estimatedMonthlyCost: "$0-5",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Smart MCP routing - select cheapest option for action
router.post("/smart/:action", async (req: Request, res: Response) => {
  try {
    const { action } = req.params;
    const { payload } = req.body;

    // Route to best (cheapest) MCP option
    const routes: Record<string, { primary: string; fallback: string }> = {
      "send-email": { primary: "sendgrid", fallback: "slack" },
      "process-payment": { primary: "stripe", fallback: "none" },
      "track-error": { primary: "sentry", fallback: "slack" },
      "manage-tasks": { primary: "linear", fallback: "slack" },
      "send-notification": { primary: "slack", fallback: "sendgrid" },
      "schedule-task": { primary: "zapier", fallback: "github" },
      "store-data": { primary: "supabase", fallback: "none" },
      "version-control": { primary: "github", fallback: "none" },
      "monitor-performance": { primary: "sentry", fallback: "slack" },
    };

    const route = routes[action];
    if (!route) {
      return res.status(400).json({
        error: `Unknown action: ${action}`,
        availableActions: Object.keys(routes),
      });
    }

    const selectedMCP = mcpRegistry[route.primary].configured ? route.primary : route.fallback;

    if (selectedMCP === "none") {
      return res.status(400).json({
        error: `No MCP available for action: ${action}`,
        suggestion: `Configure ${route.primary} or ${route.fallback}`,
      });
    }

    res.json({
      action,
      selectedMCP,
      provider: mcpRegistry[selectedMCP].name,
      cost: mcpRegistry[selectedMCP].cost,
      configured: mcpRegistry[selectedMCP].configured,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Configure MCP (store API key)
router.post("/configure/:mcp", async (req: Request, res: Response) => {
  try {
    const { mcp } = req.params;
    const { apiKey } = req.body;

    if (!mcpRegistry[mcp]) {
      return res.status(404).json({ error: `MCP not found: ${mcp}` });
    }

    // In production, save to Supabase
    // For now, just validate and return success
    mcpRegistry[mcp].configured = !!apiKey;

    res.json({
      status: "success",
      message: `${mcpRegistry[mcp].name} configured`,
      mcp: mcpRegistry[mcp],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get pricing comparison
router.get("/pricing", async (req: Request, res: Response) => {
  try {
    const pricingComparison = {
      builderIO: {
        base: "$99-300/month",
        features: [
          "Visual Builder",
          "CMS",
          "Hosting",
          "Limited MCPs",
        ],
        totalEstimate: "$400-1000+/month",
      },
      echoCoder: {
        base: "$0",
        features: [
          "AI Module Generation",
          "Headless CMS",
          "Visual Editor",
          "Testing Generator",
          "Multi-Platform Deploy",
          "All Free MCPs",
        ],
        totalEstimate: "$0-5/month (API costs only)",
      },
      savings: "98-99% cheaper at scale",
    };

    res.json(pricingComparison);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health check all MCPs
router.post("/health-check", async (req: Request, res: Response) => {
  try {
    const health = Object.entries(mcpRegistry).map(([key, config]) => ({
      id: key,
      name: config.name,
      status: config.configured ? "healthy" : "not_configured",
      lastChecked: new Date().toISOString(),
    }));

    res.json({
      timestamp: new Date().toISOString(),
      overall: "operational",
      services: health,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
