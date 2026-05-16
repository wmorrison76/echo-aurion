import { Router, Request, Response } from "express";
import {
  EchoUnifiedBrain,
  UnifiedRequest,
  UnifiedResponse,
} from "../../client/echo/engines/EchoUnifiedBrain";
const router =
  Router(); /** * POST /api/echo-unified/query * Main endpoint for querying the Unified Brain across all domains */
router.post("/query", async (req: Request, res: Response) => {
  try {
    const request = req.body as UnifiedRequest;
    if (!request.type || !request.payload) {
      return res.status(400).json({
        error: "Request must include 'type' and 'payload'",
        supportedTypes: [
          "flavor_balance",
          "thermal_profile",
          "pastry_texture",
          "pastry_defects",
          "pastry_shelf_life",
          "beverage_profile",
          "cocktail_analysis",
          "wine_pairing",
          "recipe_cost",
          "pnl_analysis",
          "inventory_reorder",
          "labor_plan",
          "forecast",
          "guest_profile",
          "hospitality_load",
          "banquet_timing",
        ],
      });
    }
    const response = await EchoUnifiedBrain.handle(request);
    return res.json(response);
  } catch (error: any) {
    console.error("[EchoUnifiedBrain] Error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
      type: req.body?.type,
    });
  }
}); /** * POST /api/echo-unified/batch * Process multiple queries in batch */
router.post("/batch", async (req: Request, res: Response) => {
  try {
    const requests = req.body.requests as UnifiedRequest[];
    if (!Array.isArray(requests)) {
      return res
        .status(400)
        .json({ error: "Request body must contain 'requests' array" });
    }
    const responses: UnifiedResponse[] = [];
    const errors: any[] = [];
    for (const request of requests) {
      try {
        const response = await EchoUnifiedBrain.handle(request);
        responses.push(response);
      } catch (error: any) {
        errors.push({ type: request.type, error: error.message });
      }
    }
    return res.json({
      processed: responses.length,
      failed: errors.length,
      responses,
      errors,
    });
  } catch (error: any) {
    console.error("[EchoUnifiedBrain] Batch error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Internal server error" });
  }
}); /** * GET /api/echo-unified/capabilities * List all available query types and their requirements */
router.get("/capabilities", (req: Request, res: Response) => {
  const capabilities = {
    culinary: {
      queries: [
        {
          type: "flavor_balance",
          description: "Calculate flavor balance of a dish",
          requiredFields: ["ingredients", "profiles"],
        },
        {
          type: "thermal_profile",
          description: "Assess thermal safety and browning",
          requiredFields: ["phases"],
        },
      ],
    },
    pastry: {
      queries: [
        {
          type: "pastry_texture",
          description: "Predict pastry texture from formula",
          requiredFields: ["formula"],
        },
        {
          type: "pastry_defects",
          description: "Diagnose pastry defects",
          requiredFields: ["observations", "formula"],
        },
        {
          type: "pastry_shelf_life",
          description: "Estimate shelf life",
          requiredFields: ["formula"],
        },
      ],
    },
    beverages: {
      queries: [
        {
          type: "beverage_profile",
          description: "Analyze beverage flavor profile",
          requiredFields: ["components"],
        },
        {
          type: "cocktail_analysis",
          description: "Analyze and categorize cocktail",
          requiredFields: ["components"],
        },
      ],
    },
    wine: {
      queries: [
        {
          type: "wine_pairing",
          description: "Assess wine-food pairing",
          requiredFields: ["wine", "dish"],
        },
      ],
    },
    operations: {
      queries: [
        {
          type: "hospitality_load",
          description: "Assess service load and staffing",
          requiredFields: ["pattern"],
        },
        {
          type: "banquet_timing",
          description: "Calculate course timing",
          requiredFields: ["plan", "targetMinutes"],
        },
      ],
    },
    finance: {
      queries: [
        {
          type: "recipe_cost",
          description: "Calculate recipe cost",
          requiredFields: ["lines", "portions"],
        },
        {
          type: "pnl_analysis",
          description: "Analyze profit & loss",
          requiredFields: ["pnl"],
        },
      ],
    },
    inventory: {
      queries: [
        {
          type: "inventory_reorder",
          description: "Recommend reorders",
          requiredFields: ["items"],
        },
      ],
    },
    labor: {
      queries: [
        {
          type: "labor_plan",
          description: "Assess labor plan",
          requiredFields: ["plan"],
        },
      ],
    },
    crm: {
      queries: [
        {
          type: "guest_profile",
          description: "Summarize guest profile",
          requiredFields: ["visits"],
        },
      ],
    },
    forecasting: {
      queries: [
        {
          type: "forecast",
          description: "Forecast future demand",
          requiredFields: ["history", "horizonDays"],
        },
      ],
    },
  };
  return res.json(capabilities);
}); /** * POST /api/echo-unified/health * Health check endpoint */
router.post("/health", (req: Request, res: Response) => {
  return res.json({
    status: "healthy",
    engines: [
      "CulinaryScienceEngine",
      "PastryScienceEngine",
      "BeverageFlavorEngine",
      "MixologyEngine",
      "SommelierEngine",
      "HospitalityOpsEngine",
      "BanquetOpsEngine",
      "FinanceEngine",
      "InventoryEngine",
      "LaborEngine",
      "CRMEngine",
      "ForecastEngine",
    ],
    timestamp: new Date().toISOString(),
  });
});
export const echoUnifiedBrainRouter = router;
