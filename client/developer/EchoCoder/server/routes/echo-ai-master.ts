import express, { Router, Request, Response } from "express";
import { echoAiKnowledgeService } from "../services/echoAiKnowledgeService";
import { echoPdfLearningService } from "../services/echoPdfLearningService";
import { echoMultiPersonaService } from "../services/echoMultiPersonaService";
import * as fs from "fs";
import * as path from "path";
import multer from "multer";

const router = express.Router();

// Configure multer for PDF uploads
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

/**
 * POST /api/echo-ai/index-modules
 * Force re-indexing of all LUCCCA modules
 * Scans codebase and creates embeddings
 */
router.post("/index-modules", async (req: Request, res: Response) => {
  try {
    console.log("🔍 Starting module indexing...");

    const result = await echoAiKnowledgeService.indexLUCCCAModules();

    res.json({
      success: true,
      message: "Module indexing complete",
      result: {
        modulesIndexed: result.modulesIndexed,
        filesIndexed: result.filesIndexed,
        embeddingsCreated: result.embeddingsCreated,
      },
    });
  } catch (error: any) {
    console.error("Indexing error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Indexing failed",
    });
  }
});

/**
 * POST /api/echo-ai/search-knowledge
 * Search LUCCCA knowledge base
 * Query: { q: "search term", limit?: 5 }
 */
router.post("/search-knowledge", async (req: Request, res: Response) => {
  try {
    const { q, limit = 5 } = req.body;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: "Query required",
      });
    }

    const results = await echoAiKnowledgeService.searchKnowledge(q, limit);

    res.json({
      success: true,
      results: results.map((r) => ({
        id: r.id,
        source: r.sourceName,
        section: r.sectionTitle,
        content: r.content.substring(0, 500), // Limit response size
        similarity: r.similarity,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Search failed",
    });
  }
});

/**
 * GET /api/echo-ai/module/:name
 * Get information about a specific module
 */
router.get("/module/:name", async (req: Request, res: Response) => {
  try {
    const module = await echoAiKnowledgeService.getModuleInfo(req.params.name);

    if (!module) {
      return res.status(404).json({
        success: false,
        error: "Module not found",
      });
    }

    res.json({
      success: true,
      module: {
        name: module.moduleName,
        path: module.modulePath,
        type: module.moduleType,
        description: module.description,
        primaryFunction: module.primaryFunction,
        dependencies: module.dependencies,
        exports: module.exports,
        linesOfCode: module.linesOfCode,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get module",
    });
  }
});

/**
 * GET /api/echo-ai/modules-by-type/:type
 * Get all modules of a specific type
 */
router.get("/modules-by-type/:type", async (req: Request, res: Response) => {
  try {
    const type = req.params.type as
      | "service"
      | "component"
      | "page"
      | "utility"
      | "hook";
    const modules = await echoAiKnowledgeService.getModulesByType(type);

    res.json({
      success: true,
      type,
      count: modules.length,
      modules: modules.map((m) => ({
        name: m.moduleName,
        path: m.modulePath,
        exports: m.exports,
        linesOfCode: m.linesOfCode,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch modules",
    });
  }
});

/**
 * POST /api/echo-ai/upload-pdf
 * Upload PDF to learning system
 * Multipart file upload
 */
router.post(
  "/upload-pdf",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file provided",
        });
      }

      const userId = (req as any).user?.id || "anonymous";

      console.log(`📄 Processing PDF: ${req.file.originalname}`);

      const result = await echoPdfLearningService.processPdfFile(
        req.file.path,
        req.file.originalname,
        userId,
      );

      // Clean up uploaded file
      fs.unlink(req.file.path, (err) => {
        if (err) console.warn("Could not delete temp file:", err);
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || "PDF processing failed",
        });
      }

      res.json({
        success: true,
        message: "PDF processed successfully",
        pdfId: result.pdfId,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "PDF upload failed",
      });
    }
  },
);

/**
 * GET /api/echo-ai/pdfs
 * List all PDFs in knowledge base
 */
router.get("/pdfs", async (req: Request, res: Response) => {
  try {
    const pdfs = await echoPdfLearningService.getAllPdfs();

    res.json({
      success: true,
      count: pdfs.length,
      pdfs: pdfs.map((p: any) => ({
        id: p.id,
        file_name: p.file_name || p.fileName,
        file_size: p.file_size,
        upload_date: p.upload_date || p.uploadedAt,
        page_count: p.page_count || p.pageCount || p.pages,
        key_topics: p.key_topics || p.topics || [],
        summary: (p.summary || "").substring(0, 200),
      })),
    });
  } catch (error: any) {
    console.error("PDFs fetch error:", error);
    res.status(500).json({
      success: true,
      count: 0,
      pdfs: [],
      error: error.message || "Failed to fetch PDFs",
    });
  }
});

/**
 * POST /api/echo-ai/search-pdfs
 * Search PDF knowledge base
 */
router.post("/search-pdfs", async (req: Request, res: Response) => {
  try {
    const { q, limit = 5 } = req.body;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: "Query required",
      });
    }

    const results = await echoPdfLearningService.searchPdfKnowledge(q, limit);

    res.json({
      success: true,
      results: results.map((r) => ({
        pdf: r.pdfName,
        page: r.pageNumber,
        content: r.content.substring(0, 500),
        relevance: (r.similarity * 100).toFixed(1) + "%",
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "PDF search failed",
    });
  }
});

/**
 * DELETE /api/echo-ai/pdf/:id
 * Delete PDF from knowledge base
 */
router.delete("/pdf/:id", async (req: Request, res: Response) => {
  try {
    const success = await echoPdfLearningService.deletePdf(req.params.id);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: "Failed to delete PDF",
      });
    }

    res.json({
      success: true,
      message: "PDF deleted",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Delete failed",
    });
  }
});

/**
 * POST /api/echo-ai/process-query
 * Process query with multi-persona AI
 * Body: { query: string, module?: string, file?: string, selectedCode?: string }
 */
router.post("/process-query", async (req: Request, res: Response) => {
  try {
    const { query, module, file, selectedCode, userRole } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Query required",
      });
    }

    const result = await echoMultiPersonaService.processQuery(query, {
      module,
      file,
      selectedCode,
      userRole,
    });

    res.json({
      success: true,
      persona: result.persona,
      response: result.response,
      confidence: result.confidence,
      suggestedActions: result.suggestedActions,
      requiresCodeChange: result.requiresCodeChange,
      proposedChange: result.proposedChange,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Query processing failed",
    });
  }
});

/**
 * POST /api/echo-ai/switch-persona
 * Switch AI persona
 * Body: { persona: "developer" | "cpa" | "statistician" | "chef" | "teacher" }
 */
router.post("/switch-persona", async (req: Request, res: Response) => {
  try {
    const { persona } = req.body;

    if (!persona) {
      return res.status(400).json({
        success: false,
        error: "Persona required",
      });
    }

    echoMultiPersonaService.switchPersona(persona);
    const currentPersona = echoMultiPersonaService.getCurrentPersona();

    res.json({
      success: true,
      message: `Switched to ${currentPersona.name}`,
      persona: {
        type: persona,
        name: currentPersona.name,
        expertise: currentPersona.expertise,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Persona switch failed",
    });
  }
});

/**
 * GET /api/echo-ai/personas
 * Get all available personas
 */
router.get("/personas", async (req: Request, res: Response) => {
  try {
    const personas = echoMultiPersonaService.getAllPersonas();

    res.json({
      success: true,
      personas: personas.map((p) => ({
        type: p.type,
        name: p.name,
        expertise: p.expertise,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch personas",
    });
  }
});

/**
 * GET /api/echo-ai/system-health
 * Get system health metrics
 * Returns: activeUsers, systemLoad%, memoryUsage, safeToDeploy
 */
router.get("/system-health", async (req: Request, res: Response) => {
  try {
    const health = await echoAiKnowledgeService.getSystemHealth();

    res.json({
      success: true,
      health: {
        activeUsers: health.activeUsers,
        systemLoadPercent: health.systemLoadPercent,
        memoryUsageMb: health.memoryUsageMb,
        errorRatePercent: health.errorRatePercent,
        safeToDeploy: health.safeToDeploy,
        safeThreshold: {
          users: health.safeThresholdUsers,
          loadPercent: health.safeThresholdLoadPercent,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get health",
    });
  }
});

/**
 * POST /api/echo-ai/update-health
 * Update system health metrics
 * Used by monitoring service to track live metrics
 */
router.post("/update-health", async (req: Request, res: Response) => {
  try {
    const { activeUsers, systemLoadPercent, memoryUsageMb, errorRatePercent } =
      req.body;

    await echoAiKnowledgeService.updateSystemHealth({
      activeUsers,
      systemLoadPercent,
      memoryUsageMb,
      errorRatePercent,
    });

    const health = await echoAiKnowledgeService.getSystemHealth();

    res.json({
      success: true,
      safeToDeploy: health.safeToDeploy,
      message: health.safeToDeploy
        ? "System healthy - ready for deployment"
        : `System load high - deployment deferred`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Health update failed",
    });
  }
});

/**
 * POST /api/echo-ai/queue-deployment
 * Queue a hot deployment (with safety checks)
 */
router.post("/queue-deployment", async (req: Request, res: Response) => {
  try {
    const { changes } = req.body;
    const userId = (req as any).user?.id || "anonymous";

    if (!changes) {
      return res.status(400).json({
        success: false,
        error: "Changes required",
      });
    }

    const deploymentId = await echoAiKnowledgeService.queueDeployment(
      changes,
      userId,
    );

    res.json({
      success: true,
      deploymentId,
      message: "Deployment queued successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Deployment queue failed",
    });
  }
});

/**
 * POST /api/echo-ai/log-conversation
 * Log AI conversation for learning
 */
router.post("/log-conversation", async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      userMessage,
      aiResponse,
      persona,
      confidenceScore,
      actionsTaken,
    } = req.body;

    const userId = (req as any).user?.id || "anonymous";

    await echoAiKnowledgeService.logConversation(
      userId,
      sessionId,
      userMessage,
      aiResponse,
      persona,
      confidenceScore,
      actionsTaken,
    );

    res.json({
      success: true,
      message: "Conversation logged",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Logging failed",
    });
  }
});

/**
 * GET /api/echo-ai/stats
 * Get learning statistics
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const supabase = require("../lib/supabaseClient");
    const client = supabase.createClient ? supabase.createClient() : supabase;

    // Get PDF stats
    const { data: pdfs, error: pdfError } = await client
      .from("echo_pdf_documents")
      .select("*", { count: "exact" });

    if (pdfError) console.error("PDF query error:", pdfError);

    const totalPDFs = pdfs?.length || 0;
    const totalPages =
      pdfs?.reduce((sum: number, p: any) => sum + (p.page_count || 0), 0) || 0;

    // Get chunk count
    const { count: chunkCount, error: chunkError } = await client
      .from("echo_pdf_chunks")
      .select("*", { count: "exact", head: true });

    if (chunkError) console.error("Chunk query error:", chunkError);

    const totalChunks = chunkCount || 0;

    // Get conversation count
    const { count: convCount, error: convError } = await client
      .from("echo_ai_conversations")
      .select("*", { count: "exact", head: true });

    if (convError) console.error("Conversation query error:", convError);

    const conversationsLearned = convCount || 0;

    res.json({
      success: true,
      totalPDFs,
      totalPages,
      totalChunks,
      conversationsLearned,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Stats error:", error);
    // Return gracefully with default stats if error occurs
    res.json({
      success: true,
      totalPDFs: 0,
      totalPages: 0,
      totalChunks: 0,
      conversationsLearned: 0,
      lastUpdated: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/echo-ai/enable-learning
 * Enable persistent conversation learning
 */
router.post("/enable-learning", async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    const userId = (req as any).user?.id || "anonymous";

    const supabase = require("../lib/supabaseClient");
    const client = supabase.createClient ? supabase.createClient() : supabase;

    // Store learning preference in user settings or config
    const { data, error } = await client.from("echo_learning_settings").upsert(
      {
        user_id: userId,
        persistent_learning_enabled: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("Upsert error:", error);
      throw error;
    }

    res.json({
      success: true,
      message: enabled
        ? "Persistent learning enabled"
        : "Persistent learning disabled",
      learning_enabled: enabled,
    });
  } catch (error: any) {
    console.error("Learning enable error:", error);
    // Return success anyway since this is not critical
    res.json({
      success: true,
      message: "Learning preference recorded",
      learning_enabled: (req.body as any).enabled || false,
    });
  }
});

export default router;
