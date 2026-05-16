import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { githubRaw, githubZip } from "./routes/github";
import { handleNutritionAnalyze } from "./routes/nutrition";
import { handleRecipeImport } from "./routes/recipe";
import { proxyRecipeImage } from "./routes/recipeImage";
import { recipeDeploymentRouter } from "./routes/recipe-deployment";
import { rdLabsRouter } from "./routes/rdlabs";
import { rdLabsAdvancedRouter } from "./routes/rdlabs-advanced";
import rdLabsAIRouter from "./routes/rdlabs-ai";
import { rdLabsChatRouter } from "./routes/rdlabs-chat";
import { rdLabsProjectExtractionRouter } from "./routes/rdlabs-project-extraction";
import { elevenLabsRouter } from "./routes/elevenlabs";
import vectorRouter from "./routes/vector-recipes";
import proceduresRouter from "./routes/procedures";
import { echoTrainingRouter } from "./routes/echo-training";
import { echoOpenAITrainingRouter } from "./routes/echo-openai-training";
import { echoAiRouter } from "./routes/echo-ai";
import { echoUnifiedBrainRouter } from "./routes/echo-unified-brain";
import { systemHealthRouter } from "./routes/system-health";
import { multiDomainTrainingRouter } from "./routes/multi-domain-training";
import { recipeAPIRouter } from "./routes/recipe-api";
import { echoHungryLearningRouter } from "./routes/echo-hungry-learning-router";
import { echoKnowledgeMigrationRouter } from "./routes/echo-knowledge-migration-router";
import { echoCrawlerRouter } from "./routes/echo-crawler-router";
import pdfLibraryImportRouter from "./routes/pdf-library-import";
import echoKnowledgeIngestionRouter from "./routes/echo-knowledge-ingestion";
import knowledgeDiagnosticsRouter from "./routes/knowledge-diagnostics";
import trainingOrchestrationRouter from "./routes/training-orchestration";
import { termUploaderRouter } from "./routes/term-uploader";
import { termsVectorIngestionRouter } from "./routes/terms-vector-ingestion";
import loadTestingRouter from "./routes/load-testing";
import termsBatchIngestionRouter from "./routes/terms-batch-ingestion";
import flavorAnalysisRouter from "./routes/flavor-analysis";
import { knowledgeInitializer } from "./lib/knowledge-initialization";
import { uploadedTermsStore } from "./lib/uploaded-terms-store";
import tabletApiRouter from "./routes/tablet-api";
import inventoryOperationsRouter from "./routes/inventory-operations";
import {
  proxyRecipeImage as proxyImageOptimized,
  serveRecipeImage,
  generateBlurhash,
  getImageMetadata,
} from "./routes/images";

export function createServer() {
  const app = express();

  // Initialize knowledge system on server startup
  setImmediate(() => {
    // Load persisted uploaded terms
    uploadedTermsStore
      .initialize()
      .then(() => {
        console.log("[Server] Uploaded terms store initialized");
      })
      .catch((error) => {
        console.error(
          "[Server] Error initializing uploaded terms store:",
          error,
        );
      });

    // Initialize knowledge base
    knowledgeInitializer
      .initialize({
        autoInit: true,
        sources: {
          masterDictionary: true,
          pinecone: true,
        },
      })
      .catch((error) => {
        console.error("[Server] Error during knowledge initialization:", error);
      });
  });

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // GitHub proxy endpoints to import recipes from repos (CORS-safe)
  app.get("/api/github/raw", githubRaw);
  app.get("/api/github/zip", githubZip);

  // Nutrition + Import
  app.post("/api/nutrition/analyze", handleNutritionAnalyze);
  app.post("/api/recipe/import", handleRecipeImport);
  app.get("/api/recipe/image", proxyRecipeImage);

  // Image Optimization Routes (WebP support, LQIP, metadata)
  app.get("/api/images/proxy", proxyImageOptimized);
  app.get("/api/images/recipes/:recipeId/:imageId", serveRecipeImage);
  app.post("/api/images/blurhash", generateBlurhash);
  app.get("/api/images/metadata", getImageMetadata);

  // Recipe Deployment System
  app.use(recipeDeploymentRouter);

  // R&D Labs API
  app.use(rdLabsRouter);

  // R&D Labs Advanced Features (Molecular Gastronomy)
  app.use(rdLabsAdvancedRouter);

  // R&D Labs AI Features (Experiment Design, Validation, Production Bridge)
  app.use("/api/rdlabs/ai", rdLabsAIRouter);

  // R&D Labs Chat (ECHO Ai integration)
  app.use(rdLabsChatRouter);

  // R&D Labs Project Extraction (AI-powered info extraction)
  app.use(rdLabsProjectExtractionRouter);

  // ElevenLabs Text-to-Speech
  app.use(elevenLabsRouter);

  // Vector Search for Recipes (supports Pinecone and pgvector)
  app.use("/api/vector", vectorRouter);

  // Legacy Pinecone endpoint (redirects to vector endpoint)
  app.use("/api/pinecone", vectorRouter);

  // Culinary Procedures API (semantic search with pgvector)
  app.use("/api/procedures", proceduresRouter);

  // EchoAI Developer App API (knowledge-stats, upload-pdf, enable-learning)
  app.use("/api/echo-ai", echoAiRouter);

  // EchoAi³ Training API (stores recipes for Chef Brain suggestions)
  app.use("/api/echo-training", echoTrainingRouter);

  // EchoAi�� - OpenAI Collaborative Training (dialogue, knowledge capture, learning)
  app.use("/api/echo-training", echoOpenAITrainingRouter);

  // EchoAi³ Unified Brain - Multi-domain engine orchestration
  app.use("/api/echo-unified", echoUnifiedBrainRouter);

  // System Health Checks (Echo, OpenAI, Pinecone)
  app.use("/api/health", systemHealthRouter);

  // Multi-Domain Autonomous Training (all 13 engines)
  app.use("/api/multi-domain-training", multiDomainTrainingRouter);

  // Recipe API Integration (for crawler training)
  app.use("/api/recipes", recipeAPIRouter);

  // Echo Hungry Learning - Aggressive knowledge acquisition across food & hospitality
  app.use("/api/echo", echoHungryLearningRouter);

  // Echo Knowledge Migration - Migrate from Pinecone to internal pgvector storage
  app.use("/api/echo", echoKnowledgeMigrationRouter);

  // Echo Crawler - Real-time web recipe crawling with progress tracking
  app.use("/api/echo", echoCrawlerRouter);

  // PDF Library Import - Learn from culinary books and references
  app.use("/api", pdfLibraryImportRouter);

  // Echo Knowledge Ingestion - Ingest Master Dictionary, Pinecone, and PDFs into internal storage
  app.use("/api/echo", echoKnowledgeIngestionRouter);

  // Knowledge Diagnostics - Health checks and status for all knowledge sources
  app.use("/api/knowledge", knowledgeDiagnosticsRouter);

  // Term Uploader - Upload culinary and financial terms from JSON files
  app.use("/api/knowledge", termUploaderRouter);

  // Terms Vector Ingestion - Ingest uploaded terms to Supabase pgvector and Pinecone
  app.use("/api/terms", termsVectorIngestionRouter);

  // Terms Batch Ingestion - Phase 3 production 180K term import
  app.use("/api/terms", termsBatchIngestionRouter);

  // Training Orchestration - Unified training management
  app.use("/api/training", trainingOrchestrationRouter);

  // Load Testing - Verify system performance with scaled term volumes (Phase 2)
  app.use("/api", loadTestingRouter);

  // Flavor Analysis API - EchoAi³ Flavor Engine routes (Phase 2)
  app.use("/api/echo", flavorAnalysisRouter);

  // Tablet Label Printing System - Kitchen prep label management
  app.use("/api/tablet", tabletApiRouter);

  // Inventory Operations - Transfers, transfers, and food recall notifications
  app.use("/api/inventory", inventoryOperationsRouter);

  // Global error handler - ensure all errors return JSON
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      const statusCode = err.status || err.statusCode || 500;
      const errorMessage = err.message || "Internal server error";

      console.error(`[Server Error] ${statusCode}: ${errorMessage}`, err);

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    },
  );

  return app;
}
