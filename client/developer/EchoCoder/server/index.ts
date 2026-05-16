import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { handleDemo } from "./routes/demo";
import { handleSimulate } from "./routes/simulate";
import { handleWriteFile } from "./routes/write-file";
import { handlePlan } from "./routes/plan";
import { handleMoveFile } from "./routes/move-file";
import { handleApply, handleRollback } from "./routes/apply";
import {
  handleImageDelete,
  handleImageGenerate,
  handleImageSave,
} from "./routes/images";
import zaroRouter from "./routes/zaro";
import vaultRouter from "./routes/vault";
import zaroMonitorRouter from "./routes/zaro-monitor";
import importRouter from "./routes/import";
import ecosystemRouter from "./routes/ecosystem";
import {
  handleEchoCoderGenerate,
  handleEchoCoderFix,
  handleEchoCoderAnalyze,
  handleEchoCoderAccess,
  handleEchoCoderUpgrade,
  handleListChangeRequests,
  handleRunChangeChecks,
  handleApproveChangeRequest,
  handleApplyChangeRequest,
} from "./routes/echocoder";
import { handleContextPlan } from "./routes/echocoder-context";
import {
  handleCodebaseIndex,
  handleCodebaseFile,
} from "./routes/echocoder-codebase";
import {
  handlePatchPreview,
  handlePatchStage,
} from "./routes/echocoder-patch";
import * as builderCMS from "./routes/builder-cms";
import chatRouter from "./routes/chat";
import testingRouter from "./routes/testing";
import webhooksRouter from "./routes/webhooks";
import sentryRouter from "./routes/sentry";
import ai3SeedRouter from "./routes/ai3-seed";
import ai3DocumentationRouter from "./routes/ai3-documentation";
import ai3TestingRouter from "./routes/ai3-testing";
import ai3IntegrationsRouter from "./routes/ai3-integrations";
import ai3AdvancedRouter from "./routes/ai3-advanced";
import ai3ScopeRouter from "./routes/ai3-scope";
import ai3CollaborationRouter from "./routes/ai3-collaboration";
import ai3FeedbackRouter from "./routes/ai3-feedback";
import ai3DockerKubernetesRouter from "./routes/ai3-docker-kubernetes";
import ai3CICDPipelineRouter from "./routes/ai3-cicd-pipeline";
import ai3MultiLanguageRouter from "./routes/ai3-multi-language";
import ai3AdvancedExpansionsRouter from "./routes/ai3-advanced-expansions";
import ai3EnterpriseIntegrationRouter from "./routes/ai3-enterprise-integration";
import ai3TeamOrganizationRouter from "./routes/ai3-team-organization";
import automationRouter from "./routes/automation";
import openaiProxyRouter from "./routes/openai-proxy";
import cmsRouter from "./routes/cms";
import advancedTestingRouter from "./routes/advanced-testing";
import deploymentRouter from "./routes/deployment";
import mcpAutoConfigRouter from "./routes/mcp-auto-config";
import builderCMSSyncRouter from "./routes/builder-cms-sync";
import chatSecuredRouter from "./routes/chat-secured";
import snapshotsRouter from "./routes/snapshots";
import phase2TechstackRouter from "./routes/phase2-techstack";
import phase7ExpansionRouter from "./routes/phase7-expansion";
import tier1BatchOpsRouter from "./routes/tier1-batch-operations";
import tier1SeoRouter from "./routes/tier1-seo-generator";
import tier1RelationsRouter from "./routes/tier1-content-relations";
import tier1AnalyticsRouter from "./routes/tier1-analytics";
import tier1AssetsRouter from "./routes/tier1-asset-management";
import tier2WorkspacesRouter from "./routes/tier2-workspaces";
import tier2RolesRouter from "./routes/tier2-roles";
import tier2FlagsRouter from "./routes/tier2-feature-flags";
import tier2WebhooksRouter from "./routes/tier2-webhooks";
import tier2GraphQLRouter from "./routes/tier2-graphql";
import tier3LoggingRouter from "./routes/tier3-logging";
import tier3ComplianceRouter from "./routes/tier3-compliance";
import tier3IPWhitelistRouter from "./routes/tier3-ip-whitelist";
import tier3SSORouter from "./routes/tier3-sso-saml";
import tier32FARouter from "./routes/tier3-2fa";
import tier4ABTestRouter from "./routes/tier4-ab-testing";
import tier4TargetingRouter from "./routes/tier4-targeting";
import tier4ImageOptRouter from "./routes/tier4-image-optimization";
import tier4PredictiveRouter from "./routes/tier4-predictive-analytics";
import adminRouter from "./routes/admin";
import tierTechStackIntegrationRouter from "./routes/tier-techstack-integration";
import figmaToCodeRouter from "./routes/figma-to-code";
import figmaWorkspaceRouter from "./routes/figma-workspace";
import figmaAIAssetLabRouter from "./routes/figma-ai-asset-lab";
import echoAiMasterRouter from "./routes/echo-ai-master";
import echoAiAdvancedRouter from "./routes/echo-ai-advanced";
import echoAiPersonasRouter from "./routes/echo-ai-personas";
import echoAiPdfUploadRouter from "./routes/echo-ai-pdf-upload";
import knowledgeRouter from "./routes/knowledge";
import healthRouter from "./routes/health";
import metricsRouter, { metricsMiddleware } from "./routes/metrics";
import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
} from "./middleware/errorHandler";
import { validateAuthOptional } from "./middleware/validateAuth";
import { loadEnvConfig } from "./lib/envConfig";
import {
  validateStartup,
  printValidationResults,
} from "./lib/startupValidator";
import {
  handleHealthCheck,
  handleLiveness,
  handleReadiness,
} from "./lib/healthCheck";
import { getLogger, requestIdMiddleware } from "./lib/logger";
import { initializeKnowledgeTables } from "./services/neonKnowledgeService";
import { scheduleRestoreDrill } from "./services/vaultService";
import { runZaroMonitor } from "./services/zaroMonitor";

// Rate limiting middleware
import {
  tier1Limiter,
  tier2Limiter,
  tier3Limiter,
  tier4Limiter,
  authLimiter,
  webhookLimiter,
} from "./middleware/rateLimit";

export async function createServer() {
  // PHASE 0: Initialize database tables
  try {
    console.log("🔄 Initializing database...");
    await initializeKnowledgeTables();
    console.log("✅ Database initialized");
  } catch (error) {
    console.warn("⚠️  Database initialization warning:", error);
    // Continue anyway - tables might already exist or connection issues might be temporary
  }

  // PHASE 1.1: Startup validation - ensure all required config exists
  const validationResult = await validateStartup();
  printValidationResults(validationResult);

  if (!validationResult.canStart) {
    const errorMessage = `❌ Server startup blocked by validation errors. Fix the issues above before restarting.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // In development mode, log a note about missing config
  if (validationResult.isDevelopmentMode) {
    const errorChecks = validationResult.checks.filter(
      (c) => c.status === "fail",
    );
    if (errorChecks.length > 0) {
      console.log(
        "\n⚠️  DEVELOPMENT MODE: Starting with missing configuration",
      );
      console.log("    The following features will be limited:");
      errorChecks.forEach((check) => {
        console.log(`    - ${check.name}`);
      });
      console.log(
        "    API calls without proper config will return 503 errors\n",
      );
    }
  }

  // Load and validate environment configuration
  const envConfig = loadEnvConfig();

  const app = express();

  scheduleRestoreDrill();
  const monitorInterval = Number(
    process.env.ECHO_ZARO_MONITOR_INTERVAL_MINUTES || "0",
  );
  if (monitorInterval > 0) {
    setInterval(() => {
      runZaroMonitor().catch((error) =>
        console.error("Scheduled ZARO monitor failed:", error),
      );
    }, monitorInterval * 60 * 1000);
  }

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));

  // Optional authentication middleware (sets req.user if valid token provided)
  app.use(validateAuthOptional);

  // Metrics tracking middleware (for all requests)
  app.use(metricsMiddleware());

  // Health check endpoints (no auth required, no rate limiting)
  app.use("/health", healthRouter);
  app.use("/api/health", healthRouter);
  app.use("/api/metrics", metricsRouter);
  app.use("/metrics", metricsRouter);

  // PHASE 1.2: Add structured health check endpoints
  app.get("/health/live", (req, res) => handleLiveness(req, res));
  app.get("/health/ready", async (req, res) => await handleReadiness(req, res));
  app.get(
    "/api/health/full",
    async (req, res) => await handleHealthCheck(req, res),
  );

  // PHASE 1.3: Add request ID and logging middleware
  app.use(requestIdMiddleware);

  // Request logging for all routes
  app.use((req, res, next) => {
    const logger = getLogger();
    const originalEnd = res.end;

    res.end = function (...args: any[]) {
      const duration = Date.now() - (req as any).startTime;
      logger.logRequest(req, res, res.statusCode, duration);
      return originalEnd.apply(res, args) as any;
    };

    next();
  });

  // Rate limiting - enabled for all tier endpoints
  app.use("/api/tier1", tier1Limiter);
  app.use("/api/tier2", tier2Limiter);
  app.use("/api/tier3", tier3Limiter);
  app.use("/api/tier4", tier4Limiter);
  app.use("/api/webhooks", webhookLimiter);

  // Static uploads served from client/assets/uploads
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "client", "assets", "uploads")),
  );
  app.use(
    "/generated-assets",
    express.static(path.join(process.cwd(), "public", "generated-assets")),
  );

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/simulate", handleSimulate);
  app.get("/api/builder/content", async (req, res) => {
    const { handleBuilderContent } = await import("./routes/builder");
    return handleBuilderContent(req as any, res as any, () => undefined);
  });
  app.get("/api/secrets/registry", async (req, res) => {
    const { handleSecretsRegistry } = await import("./routes/secrets");
    return handleSecretsRegistry(req as any, res as any, () => undefined);
  });
  app.post("/api/secrets/preview", async (req, res) => {
    const { handleSecretsPreview } = await import("./routes/secrets");
    return handleSecretsPreview(req as any, res as any, () => undefined);
  });
  app.post("/api/secrets/set", async (req, res) => {
    const { handleSecretsSet } = await import("./routes/secrets");
    return handleSecretsSet(req as any, res as any, () => undefined);
  });
  app.post("/api/write-file", handleWriteFile);
  app.get("/api/search", async (req, res, next) => {
    const { handleSearch } = await import("./routes/search");
    return handleSearch(req as any, res as any, next as any);
  });
  app.post("/api/upload", async (req, res, next) => {
    const { handleUpload } = await import("./routes/upload");
    return handleUpload(req as any, res as any, next as any);
  });
  app.post("/api/plan", handlePlan);
  app.get("/api/automation/tasks", async (req, res, next) => {
    const { handleAutomationList } = await import("./routes/automation");
    return handleAutomationList(req as any, res as any, next as any);
  });
  app.post("/api/automation/run", async (req, res, next) => {
    const { handleAutomationRun } = await import("./routes/automation");
    return handleAutomationRun(req as any, res as any, next as any);
  });
  app.post("/api/echo", async (req, res, next) => {
    const { handleEcho } = await import("./routes/echo");
    return handleEcho(req as any, res as any, next as any);
  });
  app.post("/api/images/generate", handleImageGenerate);
  app.post("/api/images/save", handleImageSave);
  app.post("/api/images/delete", handleImageDelete);
  // TTS
  app.get("/api/tts/voices", async (_req, res, next) => {
    const { listVoices } = await import("./routes/tts");
    return listVoices(_req as any, res as any, next as any);
  });
  app.post("/api/tts/speak", async (req, res, next) => {
    const { speak } = await import("./routes/tts");
    return speak(req as any, res as any, next as any);
  });
  app.post("/api/move-file", handleMoveFile);
  app.post("/api/apply", handleApply);
  app.post("/api/rollback", handleRollback);

  // ZARO guardian endpoints
  app.use("/api/zaro", zaroRouter);
  app.use("/api/zaro/monitor", zaroMonitorRouter);
  // Vault backup endpoints
  app.use("/api/vault", vaultRouter);

  // ===== SECURITY: OPENAI PROXY =====
  // All OpenAI API calls proxied through server (keys NEVER exposed to client)
  app.use("/api/openai", openaiProxyRouter);

  // ===== PHASE 1: SECURITY =====
  // Secured Chat endpoints (with auth + rate limiting + feature gating)
  app.use("/api/chat-secured", chatSecuredRouter);

  // Snapshots & Restore endpoints (with encryption)
  app.use("/api/snapshots", snapshotsRouter);

  // ===== PHASE 2: A&B TECH STACK SELECTION =====
  // Tech stack recommendations, comparisons, and implementation planning
  app.use("/api/phase2", phase2TechstackRouter);

  // ===== PHASE 7: FUTURE EXPANSION =====
  // Advanced features: testing, CI/CD, multi-language, team collaboration, documentation, security
  app.use("/api/phase7", phase7ExpansionRouter);

  // EchoCoder AI endpoints
  app.post("/api/echocoder/generate", handleEchoCoderGenerate);
  app.post("/api/echocoder/fix", handleEchoCoderFix);
  app.get("/api/echocoder/analyze/:moduleName", handleEchoCoderAnalyze);
  app.post("/api/echocoder/access", handleEchoCoderAccess);
  app.post("/api/echocoder/upgrade", handleEchoCoderUpgrade);
  app.get("/api/echocoder/change-requests", handleListChangeRequests);
  app.post("/api/echocoder/change-requests/:id/checks", handleRunChangeChecks);
  app.post("/api/echocoder/change-requests/:id/approve", handleApproveChangeRequest);
  app.post("/api/echocoder/change-requests/:id/apply", handleApplyChangeRequest);
  app.get("/api/echocoder/codebase/index", handleCodebaseIndex);
  app.get("/api/echocoder/codebase/file", handleCodebaseFile);
  app.post("/api/echocoder/context/plan", handleContextPlan);
  app.post("/api/echocoder/patch/preview", handlePatchPreview);
  app.post("/api/echocoder/patch/stage", handlePatchStage);

  // EchoCoder with Builder.io CMS
  app.post("/api/echocoder/generate-cms", async (req, res, next) => {
    const { handleEchoCoderGenerateCMS } = await import("./routes/echocoder");
    return handleEchoCoderGenerateCMS(req as any, res as any, next as any);
  });

  // Ecosystem integration endpoints
  app.use("/api/ecosystem", ecosystemRouter);

  // Enterprise features
  app.use("/api/chat", chatRouter);
  app.use("/api/testing", testingRouter);
  app.use("/api/webhooks", webhooksRouter);
  app.use("/api/sentry", sentryRouter);
  app.use("/api/ai3", ai3SeedRouter);
  app.use("/api/ai3/docs", ai3DocumentationRouter);
  app.use("/api/ai3/testing", ai3TestingRouter);
  app.use("/api/ai3/integrations", ai3IntegrationsRouter);
  app.use("/api/ai3/advanced", ai3AdvancedRouter);
  app.use("/api/ai3/scope", ai3ScopeRouter);
  app.use("/api/ai3/collab", ai3CollaborationRouter);
  app.use("/api/ai3/feedback", ai3FeedbackRouter);
  app.use("/api/ai3/docker-kubernetes", ai3DockerKubernetesRouter);
  app.use("/api/ai3/cicd", ai3CICDPipelineRouter);
  app.use("/api/ai3/multi-language", ai3MultiLanguageRouter);
  app.use("/api/ai3/expansions", ai3AdvancedExpansionsRouter);
  app.use("/api/ai3/enterprise", ai3EnterpriseIntegrationRouter);
  app.use("/api/ai3/teams", ai3TeamOrganizationRouter);

  // Automation analysis endpoints
  app.use("/api/automation", automationRouter);

  // Headless CMS endpoints
  app.use("/api/cms", cmsRouter);

  // Advanced Testing endpoints
  app.use("/api/testing", advancedTestingRouter);

  // Multi-Platform Deployment endpoints
  app.use("/api/deployment", deploymentRouter);

  // MCP Auto-Configuration endpoints
  app.use("/api/mcp", mcpAutoConfigRouter);

  // Builder.io CMS Sync endpoints
  app.use("/api/builder-cms", builderCMSSyncRouter);

  // Builder.io CMS endpoints
  app.get("/api/builder-cms/validate", builderCMS.validateBuilderKey);
  app.get("/api/builder-cms/models", builderCMS.getContentModels);
  app.get("/api/builder-cms/content/:modelId", builderCMS.getContent);
  app.get(
    "/api/builder-cms/content/:modelId/:contentId",
    builderCMS.getContentById,
  );
  app.get("/api/builder-cms/search", builderCMS.searchContent);
  app.post("/api/builder-cms/content/:modelId", builderCMS.createContent);
  app.patch(
    "/api/builder-cms/content/:modelId/:contentId",
    builderCMS.updateContent,
  );
  app.delete(
    "/api/builder-cms/content/:modelId/:contentId",
    builderCMS.deleteContent,
  );
  app.get(
    "/api/builder-cms/content/:modelId/:contentId/status",
    builderCMS.getPublishingStatus,
  );
  app.post(
    "/api/builder-cms/content/:modelId/:contentId/publish",
    builderCMS.publishContent,
  );
  app.post(
    "/api/builder-cms/content/:modelId/:contentId/unpublish",
    builderCMS.unpublishContent,
  );

  // Knowledge Management endpoints (Neon PostgreSQL)
  app.use("/api/knowledge", knowledgeRouter);

  // ===== TIER 1: ENTERPRISE FEATURES =====
  // Batch Operations
  app.use("/api/tier1/batch", tier1BatchOpsRouter);

  // SEO Metadata Generator
  app.use("/api/tier1/seo", tier1SeoRouter);

  // Content Relations
  app.use("/api/tier1/relations", tier1RelationsRouter);

  // Analytics Dashboard
  app.use("/api/tier1/analytics", tier1AnalyticsRouter);

  // Asset Management
  app.use("/api/tier1/assets", tier1AssetsRouter);

  // ===== TIER 2: TEAM & GOVERNANCE =====
  // Workspaces
  app.use("/api/tier2/workspaces", tier2WorkspacesRouter);

  // Advanced Roles & Permissions
  app.use("/api/tier2/roles", tier2RolesRouter);

  // Feature Flags
  app.use("/api/tier2/flags", tier2FlagsRouter);

  // Custom Webhooks
  app.use("/api/tier2/webhooks", tier2WebhooksRouter);

  // GraphQL API
  app.use("/api/tier2/graphql", tier2GraphQLRouter);

  // ===== TIER 3: SECURITY & COMPLIANCE =====
  // Access Logging
  app.use("/api/tier3/logging", tier3LoggingRouter);

  // Compliance Dashboard
  app.use("/api/tier3/compliance", tier3ComplianceRouter);

  // IP Whitelisting
  app.use("/api/tier3/ip-whitelist", tier3IPWhitelistRouter);

  // SSO/SAML
  app.use("/api/tier3/sso", tier3SSORouter);

  // Two-Factor Authentication
  app.use("/api/tier3/2fa", tier32FARouter);

  // ===== TIER 4: ADVANCED FEATURES =====
  // A/B Testing
  app.use("/api/tier4/ab-testing", tier4ABTestRouter);

  // Audience Targeting
  app.use("/api/tier4/targeting", tier4TargetingRouter);

  // Image Optimization
  app.use("/api/tier4/images", tier4ImageOptRouter);

  // Predictive Analytics
  app.use("/api/tier4/predictive", tier4PredictiveRouter);

  // ===== ADMIN CONSOLE & MANAGEMENT =====
  // Organization, user, tier, and system administration
  app.use("/api/admin", adminRouter);

  // ===== TIER & TECH STACK INTEGRATION =====
  // Connect tech stack recommendations with LUCCCA tier features
  app.use("/api/tier-techstack", tierTechStackIntegrationRouter);

  // ===== FIGMA TO CODE =====
  app.use("/api/figma-to-code", figmaToCodeRouter);
  app.use("/api/figma-workspace", figmaWorkspaceRouter);
  app.use("/api/figma/ai-asset-lab", figmaAIAssetLabRouter);

  // ===== ECHOAI MASTER KNOWLEDGE SYSTEM =====
  // Master AI, voice interface, PDF learning, multi-persona, system health
  app.use("/api/echo-ai", echoAiMasterRouter);

  // ===== ECHOAI ADVANCED FEATURES =====
  // Financial forecasting, teaching mode, voice code editor
  app.use("/api/echo-ai", echoAiAdvancedRouter);

  // ===== ECHOAI MULTI-PERSONA SYSTEM =====
  // Process messages through different AI personas (developer, CPA, chef, etc.)
  app.use("/api/echo-ai", echoAiPersonasRouter);

  // ===== ECHOAI PDF LEARNING =====
  // Upload and process PDF files for knowledge base
  app.use("/api/echo-ai", echoAiPdfUploadRouter);

  // File import endpoints
  app.use("/api/import", importRouter);

  // Serve import archives
  app.use(
    "/archives",
    express.static(path.join(process.cwd(), "client", "imports-archive")),
  );

  // TAR helpers
  app.post("/api/tar/remote", async (req, res, next) => {
    const { handleTarRemote } = await import("./routes/tar");
    return handleTarRemote(req as any, res as any, next as any);
  });

  // Logs
  app.post("/api/logs/append", async (req, res, next) => {
    const { handleLogAppend } = await import("./routes/logs");
    return handleLogAppend(req as any, res as any, next as any);
  });
  app.get("/api/logs/search", async (req, res, next) => {
    const { handleLogSearch } = await import("./routes/logs");
    return handleLogSearch(req as any, res as any, next as any);
  });

  // Seed packaging
  app.post("/api/seed/package", async (req, res, next) => {
    const { handleSeedPackage } = await import("./routes/seed-package");
    return handleSeedPackage(req as any, res as any, next as any);
  });

  // Guard endpoints
  app.get("/api/guard/status", async (_req, res, next) => {
    const { handleGuardStatus } = await import("./routes/guard");
    return handleGuardStatus(_req as any, res as any, next as any);
  });
  app.post("/api/guard/event", async (req, res, next) => {
    const { handleGuardEvent } = await import("./routes/guard");
    return handleGuardEvent(req as any, res as any, next as any);
  });
  app.get("/api/guard/ip", async (req, res, next) => {
    const { handleGuardIp } = await import("./routes/guard");
    return handleGuardIp(req as any, res as any, next as any);
  });

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
