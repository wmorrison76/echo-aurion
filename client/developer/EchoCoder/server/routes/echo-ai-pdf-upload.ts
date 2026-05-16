import express, { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import * as fs from "fs";
import { echoPdfLearningService } from "../services/echoPdfLearningService";

const router = express.Router();

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads", "pdfs");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: {
    fileSize: 150 * 1024 * 1024, // 150MB max
  },
});

/**
 * POST /api/echo-ai/upload-pdf
 * Upload a PDF file for the AI to learn from
 * Stores pure knowledge (anonymous, categorized)
 * Original PDF is completely removed after processing
 *
 * Body parameters:
 * - file: PDF file
 * - category: Knowledge category (e.g., 'culinary', 'hospitality', 'financial')
 * - subcategory: Optional subcategory (e.g., 'recipes', 'service_procedures')
 */
router.post(
  "/upload-pdf",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      const userId = (req as any).userId || "anonymous";
      const fileName = req.file.originalname;
      const filePath = req.file.path;
      const category = req.body.category || "general";
      const subcategory = req.body.subcategory;

      // Validate category
      const validCategories = [
        "culinary",
        "hospitality",
        "financial",
        "operations",
        "marketing",
        "hr",
        "training",
        "technology",
        "general",
      ];

      if (!validCategories.includes(category.toLowerCase())) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return res.status(400).json({
          success: false,
          error: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
        });
      }

      // Process PDF with timeout (300 seconds max for large PDFs)
      const result = await Promise.race([
        echoPdfLearningService.processPdfFile(
          filePath,
          fileName,
          userId,
          category.toLowerCase(),
          subcategory,
        ),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("PDF processing timeout - took too long")),
            300000,
          ),
        ),
      ] as const);

      if (!result.success) {
        // Clean up file if processing failed
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return res.status(400).json({
          success: false,
          error: result.error || "Failed to process PDF",
        });
      }

      res.json({
        success: true,
        message: "Knowledge extracted and stored anonymously",
        knowledgeIds: result.knowledgeIds,
        category: category.toLowerCase(),
        subcategory: subcategory || null,
        note: "Original PDF file has been completely removed from system",
      });
    } catch (error: any) {
      console.error("PDF upload error:", error);

      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        error: error.message || "Failed to upload PDF",
      });
    }
  },
);

/**
 * GET /api/echo-ai/knowledge-stats
 * Get statistics about stored knowledge base
 */
router.get("/knowledge-stats", async (_req: Request, res: Response) => {
  try {
    const stats = await echoPdfLearningService.getKnowledgeStats();

    // Always return 200 with stats (even if empty)
    return res.status(200).json({
      success: true,
      stats: {
        totalKnowledge: stats.totalKnowledge || 0,
        byCategory: stats.byCategory || {},
        byType: stats.byType || {},
        averageConfidence:
          Math.round((stats.averageConfidence || 0) * 100) / 100,
        note: "All knowledge is stored anonymously without source documents",
      },
    });
  } catch (error: any) {
    console.error("Error getting knowledge stats:", error);
    // Return default stats on error instead of 500
    return res.status(200).json({
      success: true,
      stats: {
        totalKnowledge: 0,
        byCategory: {},
        byType: {},
        averageConfidence: 0,
        note: "Default stats returned due to database unavailability",
      },
    });
  }
});

/**
 * POST /api/echo-ai/search-knowledge
 * Search the anonymous knowledge base
 * Body: { query, category?, limit? }
 */
router.post("/search-knowledge", async (req: Request, res: Response) => {
  try {
    const { query, category, limit } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Query is required",
      });
    }

    const results = await echoPdfLearningService.searchKnowledgeBase(
      query,
      category,
      limit || 5,
    );

    res.json({
      success: true,
      results,
      message: `Found ${results.length} relevant knowledge items`,
    });
  } catch (error: any) {
    console.error("Knowledge search error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to search knowledge base",
    });
  }
});

/**
 * POST /api/echo-ai/record-decision
 * Record an AI decision for forecasting and evaluation
 * Body: { category, context, forecastedOutcome, confidenceScore, forecastDaysAhead }
 */
router.post("/record-decision", async (req: Request, res: Response) => {
  try {
    const {
      category,
      context,
      forecastedOutcome,
      confidenceScore,
      forecastDaysAhead,
    } = req.body;

    if (!category || !context || !forecastedOutcome) {
      return res.status(400).json({
        success: false,
        error: "category, context, and forecastedOutcome are required",
      });
    }

    const result = await echoPdfLearningService.recordDecision(
      category,
      context,
      forecastedOutcome,
      confidenceScore || 0.5,
      forecastDaysAhead || 10,
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      decisionId: result.decisionId,
      message:
        "Decision recorded for forecasting. Will be evaluated in 8+ days.",
    });
  } catch (error: any) {
    console.error("Decision recording error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to record decision",
    });
  }
});

/**
 * POST /api/echo-ai/evaluate-decisions
 * Evaluate past decisions and readjust forecasts
 */
router.post("/evaluate-decisions", async (_req: Request, res: Response) => {
  try {
    const result = await echoPdfLearningService.evaluatePastDecisions();

    res.json({
      success: true,
      evaluation: {
        decisionsEvaluated: result.evaluated,
        averageAccuracy: Math.round(result.averageAccuracy * 100) / 100,
        adjustmentsApplied: result.adjustmentsApplied,
      },
    });
  } catch (error: any) {
    console.error("Decision evaluation error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to evaluate decisions",
    });
  }
});

export default router;
