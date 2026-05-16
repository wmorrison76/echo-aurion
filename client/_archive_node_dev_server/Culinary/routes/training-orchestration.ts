/**
 * Training Orchestration API
 * Central endpoint for starting, monitoring, and controlling all training activities
 */
import { Router, Request, Response } from "express";
import {
  trainingOrchestrator,
  type TrainingMode,
  type TrainingSource,
} from "../lib/training-orchestrator";
import { ingestionController } from "../lib/knowledge-ingestion-service";
import { webRecipeCrawler, type CrawledRecipe } from "../lib/web-recipe-crawler";
import { uploadedTermsStore } from "../lib/uploaded-terms-store";
import { masterCulinaryDictionary } from "../lib/master-culinary-dictionary";
import { recipePersistenceService } from "../lib/recipe-persistence-service";

const router = Router();

// Helper to wrap async route handlers and catch errors
const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: (err?: unknown) => void) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

/**
 * POST /api/training/session/initialize
 * Create a new training session
 */
router.post(
  "/session/initialize",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { mode = "sequential" } = req.body as { mode?: TrainingMode };
      const session = trainingOrchestrator.initializeSession(mode);

      return res.json({
        success: true,
        session,
        message: `Training session initialized in ${mode} mode`,
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to initialize training session",
      });
    }
  }),
);

/**
 * GET /api/training/session/status
 * Get current training session status
 */
router.get(
  "/session/status",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const session = trainingOrchestrator.getSession();
      if (!session) {
        return res.json({
          success: true,
          session: null,
          message: "No active training session",
        });
      }

      return res.json({
        success: true,
        session,
        summary: trainingOrchestrator.getSummary(),
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to get training session status",
      });
    }
  }),
);

/**
 * POST /api/training/start
 * Start training with specified sources and mode
 */
router.post(
  "/start",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      if (trainingOrchestrator.isSessionActive()) {
        return res.status(409).json({
          success: false,
          error:
            "Training is already in progress. Please wait for it to complete.",
        });
      }

      const {
        mode = "sequential",
        sources = [
          "master-dictionary",
          "pinecone-migration",
          "pdf-library",
          "web-crawler",
        ],
      } = req.body as {
        mode?: TrainingMode;
        sources?: TrainingSource[];
      };

      const session = trainingOrchestrator.initializeSession(mode);

      const handlers: Record<TrainingSource, () => Promise<void>> = {
        "master-dictionary": async () => {
          try {
            console.log("[Training] Starting Master Dictionary ingestion...");
            trainingOrchestrator.startSource("master-dictionary");
            trainingOrchestrator.updateSourceProgress("master-dictionary", {
              message: "Loading Master Dictionary terms...",
              progress: 10,
            });

            const result = await ingestionController.ingestMasterDictionary();
            trainingOrchestrator.completeSource(
              "master-dictionary",
              result.totalIngested,
              result.totalFailed,
            );
          } catch (error) {
            console.error("[Training] Master Dictionary error:", error);
            trainingOrchestrator.failSource(
              "master-dictionary",
              error instanceof Error ? error.message : String(error),
            );
          }
        },

        "pinecone-migration": async () => {
          try {
            console.log("[Training] Starting Pinecone migration...");
            trainingOrchestrator.startSource("pinecone-migration");
            trainingOrchestrator.updateSourceProgress("pinecone-migration", {
              message: "Connecting to Pinecone and extracting data...",
              progress: 10,
            });

            const result = await ingestionController.ingestFromPinecone();
            trainingOrchestrator.completeSource(
              "pinecone-migration",
              result.totalIngested,
              result.totalFailed,
            );
          } catch (error) {
            console.error("[Training] Pinecone migration error:", error);
            trainingOrchestrator.failSource(
              "pinecone-migration",
              error instanceof Error ? error.message : String(error),
            );
          }
        },

        "pdf-library": async () => {
          try {
            console.log("[Training] Starting PDF library ingestion...");
            trainingOrchestrator.startSource("pdf-library");
            await uploadedTermsStore.initialize();

            const uploadedTerms = uploadedTermsStore.getAllTerms();
            if (uploadedTerms.length === 0) {
              trainingOrchestrator.updateSourceProgress("pdf-library", {
                message: "No PDFs available for processing",
                progress: 0,
              });
              trainingOrchestrator.completeSource("pdf-library", 0, 0);
              return;
            }

            trainingOrchestrator.updateSourceProgress("pdf-library", {
              message: `Processing ${uploadedTerms.length} uploaded terms from PDFs...`,
              progress: 10,
              totalItems: uploadedTerms.length,
            });

            let successCount = 0;
            let failCount = 0;

            for (const term of uploadedTerms) {
              try {
                const termKey = term.term
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^\w-]/g, "");
                masterCulinaryDictionary.addTerm(termKey, term);
                successCount++;

                if (successCount % 100 === 0) {
                  const progress = Math.min(
                    90,
                    10 + (successCount / uploadedTerms.length) * 80,
                  );
                  trainingOrchestrator.updateSourceProgress("pdf-library", {
                    message: `Processed ${successCount}/${uploadedTerms.length} terms...`,
                    progress: Math.round(progress),
                  });
                }
              } catch (error) {
                console.warn(`[Training] Failed to add term ${term.term}:`, error);
                failCount++;
              }
            }

            trainingOrchestrator.completeSource(
              "pdf-library",
              successCount,
              failCount,
            );
            console.log(
              `[Training] PDF library ingestion completed: ${successCount} success, ${failCount} failed`,
            );
          } catch (error) {
            console.error("[Training] PDF library error:", error);
            trainingOrchestrator.failSource(
              "pdf-library",
              error instanceof Error ? error.message : String(error),
            );
          }
        },

        "web-crawler": async () => {
          try {
            console.log("[Training] Starting web crawler...");
            trainingOrchestrator.startSource("web-crawler");
            trainingOrchestrator.updateSourceProgress("web-crawler", {
              message: "Initializing web recipe crawler...",
              progress: 5,
            });

            const crawlResult = await webRecipeCrawler.crawlRecipes({
              query: "recipe",
              limit: 5000,
            });

            const recipesFound = crawlResult.length;
            trainingOrchestrator.updateSourceProgress("web-crawler", {
              message: `Found ${recipesFound} recipes, extracting knowledge...`,
              progress: 50,
              totalItems: recipesFound,
            });

            trainingOrchestrator.completeSource("web-crawler", recipesFound, 0);
            console.log(
              `[Training] Web crawler completed: ${recipesFound} recipes found`,
            );
          } catch (error) {
            console.error("[Training] Web crawler error:", error);
            trainingOrchestrator.failSource(
              "web-crawler",
              error instanceof Error ? error.message : String(error),
            );
          }
        },

        "recipe-imports": async () => {
          try {
            console.log("[Training] Handling recipe imports...");
            trainingOrchestrator.startSource("recipe-imports");
            trainingOrchestrator.updateSourceProgress("recipe-imports", {
              message: "Preparing recipe import source...",
              progress: 10,
            });

            const body = req.body as {
              recipes?: unknown[];
              recipeCount?: number;
            };

            const recipes = Array.isArray(body.recipes) ? body.recipes : [];
            const requestedCount = body.recipeCount ?? recipes.length;

            let storedCount = 0;
            let failedCount = 0;
            let recipesToStore = recipes;

            if (recipesToStore.length === 0 && requestedCount > 0) {
              trainingOrchestrator.updateSourceProgress("recipe-imports", {
                message: `Crawling ${requestedCount} recipes for import...`,
                progress: 40,
                totalItems: requestedCount,
              });
              recipesToStore = await webRecipeCrawler.crawlRecipes({
                query: "recipe",
                limit: requestedCount,
              });
            }

            if (recipesToStore.length > 0) {
              trainingOrchestrator.updateSourceProgress("recipe-imports", {
                message:
                  recipes.length > 0
                    ? `Storing ${recipesToStore.length} provided recipes...`
                    : `Storing ${recipesToStore.length} crawled recipes...`,
                progress: 70,
                totalItems: recipesToStore.length,
              });

              const stored = await recipePersistenceService.storeRecipeBatch(
                recipesToStore as CrawledRecipe[],
              );
              storedCount = stored.length;
              failedCount = recipesToStore.length - stored.length;
            }

            trainingOrchestrator.completeSource(
              "recipe-imports",
              storedCount,
              failedCount,
            );
            console.log(
              `[Training] Recipe imports completed: ${storedCount} stored, ${failedCount} failed`,
            );
          } catch (error) {
            console.error("[Training] Recipe imports error:", error);
            trainingOrchestrator.failSource(
              "recipe-imports",
              error instanceof Error ? error.message : String(error),
            );
          }
        },
      };

      const trainingSources = sources.filter((source) => source in handlers);

      if (mode === "sequential") {
        trainingOrchestrator
          .runSequential(trainingSources, handlers)
          .then(() => {
            console.log("[Training] Sequential training completed");
          })
          .catch((error) => {
            console.error("[Training] Sequential training failed:", error);
          });
      } else {
        trainingOrchestrator
          .runParallel(trainingSources, handlers)
          .then(() => {
            console.log("[Training] Parallel training completed");
          })
          .catch((error) => {
            console.error("[Training] Parallel training failed:", error);
          });
      }

      return res.json({
        success: true,
        session,
        message: `Training started in ${mode} mode with ${trainingSources.length} sources`,
        trainingSources,
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to start training",
      });
    }
  }),
);

/**
 * POST /api/training/ingest-recipe
 * Ingest recipes into the knowledge base
 */
router.post("/ingest-recipe", async (req: Request, res: Response) => {
  try {
    const { recipes, recipeCount = 0 } = req.body as {
      recipes?: unknown[];
      recipeCount?: number;
    };

    const session = trainingOrchestrator.getSession();
    const recipeBatch = Array.isArray(recipes) ? recipes : [];

    if (session) {
      trainingOrchestrator.startSource("recipe-imports");
      trainingOrchestrator.updateSourceProgress("recipe-imports", {
        status: "running",
        message:
          recipeBatch.length > 0
            ? `Ingesting ${recipeBatch.length} provided recipes...`
            : `Crawling ${recipeCount} recipes for ingestion...`,
        progress: 25,
        totalItems: recipeBatch.length || recipeCount,
      });
    }

    let recipesToStore = recipeBatch;
    if (recipesToStore.length === 0 && recipeCount > 0) {
      recipesToStore = await webRecipeCrawler.crawlRecipes({
        query: "recipe",
        limit: recipeCount,
      });
    }

    const stored =
      recipesToStore.length > 0
        ? await recipePersistenceService.storeRecipeBatch(
            recipesToStore as CrawledRecipe[],
          )
        : [];

    const storedCount = stored.length;
    const failedCount = recipesToStore.length - storedCount;

    if (session) {
      trainingOrchestrator.completeSource(
        "recipe-imports",
        storedCount,
        failedCount,
      );
    }

    return res.json({
      success: true,
      message:
        recipesToStore.length > 0
          ? `Ingested ${storedCount} recipes`
          : "No recipes were provided for ingestion",
      recipesAdded: storedCount,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to ingest recipes",
    });
  }
});

/**
 * POST /api/training/ingest-pdf
 * Ingest PDFs into the knowledge base
 */
router.post("/ingest-pdf", async (req: Request, res: Response) => {
  try {
    const { pdfCount = 0, documentCount = 0 } = req.body as {
      pdfCount?: number;
      documentCount?: number;
    };

    const session = trainingOrchestrator.getSession();
    await uploadedTermsStore.initialize();

    const uploadedTerms = uploadedTermsStore.getAllTerms();

    if (session) {
      trainingOrchestrator.startSource("pdf-library");
      trainingOrchestrator.updateSourceProgress("pdf-library", {
        status: "running",
        message:
          uploadedTerms.length > 0
            ? `Processing ${uploadedTerms.length} uploaded term(s) from PDFs...`
            : `Processing ${pdfCount} PDF(s)...`,
        progress: 25,
        totalItems: uploadedTerms.length || documentCount,
      });
    }

    let importedCount = 0;
    let failedCount = 0;

    for (const term of uploadedTerms) {
      try {
        const termKey = term.term
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]/g, "");
        masterCulinaryDictionary.addTerm(termKey, term);
        importedCount++;
      } catch {
        failedCount++;
      }
    }

    if (session) {
      trainingOrchestrator.completeSource(
        "pdf-library",
        importedCount || documentCount,
        failedCount,
      );
    }

    return res.json({
      success: true,
      message:
        uploadedTerms.length > 0
          ? `Processed ${uploadedTerms.length} uploaded PDF term(s)`
          : `Processed ${pdfCount} PDF(s), extracted ${documentCount} documents`,
      importedTerms: importedCount || documentCount,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to ingest PDFs",
    });
  }
});

/**
 * GET /api/training/summary
 * Get training summary and statistics
 */
router.get("/summary", (req: Request, res: Response) => {
  try {
    const summary = trainingOrchestrator.getSummary();
    if (!summary) {
      return res.json({
        success: true,
        summary: null,
        message: "No training session to summarize",
      });
    }

    return res.json({
      success: true,
      summary,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to get training summary",
    });
  }
});

export default router;
