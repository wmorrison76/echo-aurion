import express, { Request, Response } from "express";
import { z } from "zod";
import { basicAuthMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = express.Router();
router.use(basicAuthMiddleware);

interface RecipeStandard {
  id: string;
  name: string;
  prepTime: number;
  servingSize: string;
  qualityScore: number;
  lastUpdated: string;
  compliance: number;
}

interface QualityCheckItem {
  id: string;
  item: string;
  category: string;
  status: "pass" | "fail" | "review";
  timestamp: string;
  inspector: string;
  notes: string;
}

interface ComplianceArea {
  area: string;
  score: number;
  maxScore: number;
  percentage: number;
}

interface AuditRequest {
  recipes: RecipeStandard[];
  checks: QualityCheckItem[];
  compliance: ComplianceArea[];
}

interface AuditResponse {
  overallScore: number;
  status: "excellent" | "good" | "satisfactory" | "poor";
  summary: {
    recipesAudited: number;
    checksPerformed: number;
    issuesFound: number;
    complianceRate: number;
  };
  recommendations: string[];
  criticalIssues: string[];
  actionItems: { item: string; dueDate: string; owner: string }[];
}

// Validation schemas
const AuditRequestSchema = z.object({
  recipes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    prepTime: z.number(),
    servingSize: z.string(),
    qualityScore: z.number(),
    lastUpdated: z.string(),
    compliance: z.number(),
  })),
  checks: z.array(z.object({
    id: z.string(),
    item: z.string(),
    category: z.string(),
    status: z.enum(["pass", "fail", "review"]),
    timestamp: z.string(),
    inspector: z.string(),
    notes: z.string(),
  })),
  compliance: z.array(z.object({
    area: z.string(),
    score: z.number(),
    maxScore: z.number(),
    percentage: z.number(),
  })),
});

// POST /api/quality-assurance/audit
router.post("/audit", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = AuditRequestSchema.parse(req.body);
    const { recipes, checks, compliance } = validated;

    const avgRecipeScore = recipes.reduce((sum, r) => sum + r.qualityScore, 0) / recipes.length;
    const failedChecks = checks.filter((c) => c.status === "fail");
    const avgCompliance = compliance.reduce((sum, c) => sum + c.percentage, 0) / compliance.length;

    const overallScore = Math.round((avgRecipeScore + avgCompliance) / 2);
    const status: "excellent" | "good" | "satisfactory" | "poor" =
      overallScore >= 95 ? "excellent" : overallScore >= 85 ? "good" : overallScore >= 75 ? "satisfactory" : "poor";

    const recommendations = [
      avgRecipeScore < 90 ? "Review underperforming recipes and conduct staff retraining" : null,
      failedChecks.length > 0 ? "Implement corrective actions for failed quality checks" : null,
      avgCompliance < 90 ? "Conduct compliance audit and update procedures" : null,
      recipes.filter((r) => r.compliance < 95).length > 2 ? "Schedule individual recipe audits for non-compliant items" : null,
    ].filter(Boolean) as string[];

    const criticalIssues = failedChecks
      .filter((c) => c.notes.toLowerCase().includes("critical") || c.notes.toLowerCase().includes("safety"))
      .map((c) => `${c.item}: ${c.notes}`);

    const actionItems = [
      ...(failedChecks.length > 0 ? [{ item: "Address failed quality checks", dueDate: "2 days", owner: "Chef Manager" }] : []),
      ...(avgRecipeScore < 90 ? [{ item: "Conduct recipe training sessions", dueDate: "1 week", owner: "Executive Chef" }] : []),
      ...(avgCompliance < 90 ? [{ item: "Review compliance procedures", dueDate: "3 days", owner: "Quality Manager" }] : []),
    ];

    const response: AuditResponse = {
      overallScore,
      status,
      summary: {
        recipesAudited: recipes.length,
        checksPerformed: checks.length,
        issuesFound: failedChecks.length,
        complianceRate: Math.round(avgCompliance),
      },
      recommendations,
      criticalIssues,
      actionItems,
    };

    logger.info("[Quality Assurance] Audit completed", {
      orgId,
      overallScore,
      status,
      recipesAudited: recipes.length,
      issuesFound: failedChecks.length,
    });

    res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[Quality Assurance] Audit error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// GET /api/quality-assurance/compliance
router.get("/compliance", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const mockCompliance = {
      overall: 94,
      foodSafety: 98,
      recipeConsistency: 92,
      allergenManagement: 96,
      staffCompliance: 88,
      healthCodeCompliance: 97,
      lastAudit: new Date().toISOString(),
    };

    res.json({
      success: true,
      ...mockCompliance,
    });
  } catch (error) {
    logger.error("[Quality Assurance] Compliance error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

const QualityCheckSchema = z.object({
  item: z.string().min(1),
  category: z.string().min(1),
  status: z.enum(["pass", "fail", "review"]),
  notes: z.string().optional(),
  inspector: z.string().min(1),
});

// POST /api/quality-assurance/check
router.post("/check", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = QualityCheckSchema.parse(req.body);
    const { item, category, status, notes, inspector } = validated;

    const newCheck = {
      id: `check_${Date.now()}`,
      item,
      category,
      status,
      timestamp: new Date().toISOString(),
      inspector,
      notes,
      recorded: true,
    };

    logger.info("[Quality Assurance] Quality check recorded", {
      orgId,
      item,
      category,
      status,
      inspector,
    });

    res.json({
      success: true,
      check: newCheck,
      nextCheck: "Salad dressing consistency",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[Quality Assurance] Check error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;
