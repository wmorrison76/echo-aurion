import "dotenv/config";
import express from "express";
import type { NextFunction, Request, RequestHandler, Response, Router } from "express";
import compression from "compression";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createHTTPServer } from "http";
import type { Server as SocketIOServer } from "socket.io";
import { initializeWebSocket } from "./websocket";
import { initializeCalendarWebSocket } from "./routes/websocket-calendar";
import { initializeBroadcaster } from "./services/calendar-websocket-broadcaster";
import {
  initializeSentry,
  sentryErrorHandler,
  captureException,
} from "./sentry-init";
import { conditionalTenantValidation } from "./middleware/tenantValidation";
import { requestContext } from "./lib/context";
import { rateLimitingMiddleware } from "./middleware/rateLimiting";
import { sanitizeMiddleware } from "./middleware/validation";
import { requestContextMiddleware } from "./lib/logger";
import { globalErrorHandler, generateRequestId } from "./lib/errorHandler";
import employeeRouter from "./routes/employees";
import bulkUploadRouter from "./routes/bulk-upload";
import shiftsRouter from "./routes/shifts";
import hrSyncRouter from "./routes/hr-sync";
import timeTrackingRouter from "./routes/time-tracking";
import predictionsRouter from "./routes/predictions";
import authRouter from "./routes/auth";
import resonanceRouter from "./routes/resonance";
import signalsRouter from "./routes/signals";
import echoResonanceHealthRouter from "./routes/echo-resonance-health";
import {
  startSignalDecayScheduler,
  stopSignalDecayScheduler,
} from "./lib/signal-decay-scheduler";
import {
  jwtAuthMiddleware,
  optionalJwtAuthMiddleware,
} from "./middleware/auth-jwt";
import { requireAdminToken } from "./middleware/adminAuth";
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
import {
  handleEchoCoderAccess,
  handleEchoCoderAnalyze,
  handleEchoCoderFix,
  handleEchoCoderGenerate,
  handleEchoCoderGenerateCMS,
  handleEchoCoderUpgrade,
  handleListChangeRequests,
  handleRunChangeChecks,
  handleApproveChangeRequest,
  handleApplyChangeRequest,
} from "../client/developer/EchoCoder/server/routes/echocoder";
import {
  handleCodebaseFile,
  handleCodebaseIndex,
} from "../client/developer/EchoCoder/server/routes/echocoder-codebase";
import { handleContextPlan } from "../client/developer/EchoCoder/server/routes/echocoder-context";
import {
  handlePatchPreview,
  handlePatchStage,
} from "../client/developer/EchoCoder/server/routes/echocoder-patch";
import vaultRouter from "../client/developer/EchoCoder/server/routes/vault";
import zaroMonitorRouter from "../client/developer/EchoCoder/server/routes/zaro-monitor";
import { scheduleRestoreDrill } from "../client/developer/EchoCoder/server/services/vaultService";
import { runZaroMonitor } from "../client/developer/EchoCoder/server/services/zaroMonitor";
import importRouter from "./routes/import";
import uploadCulinaryRouter from "./routes/upload-culinary";
import { rdLabsChatRouter } from "../client/modules/Culinary/server/routes/rdlabs-chat";
import { uploadScheduleRouter } from "./routes/upload-schedule";
import { uploadMaestroRouter } from "./routes/upload-maestro";
import uploadPurchasingRouter from "./routes/upload-purchasing";
import { purchasingDataRouter } from "./routes/purchasing-data";
// import maestroProductionRouter from "./routes/maestro-production"; // Requires @vercel/postgres
import maestroMetricsRouter from "./routes/maestro-metrics";
import dataImportRouter from "./routes/data-import";
import scheduleRouter from "./routes/schedule";
import payrollRouter from "./routes/payroll";
import payrollReconciliationRouter from "./routes/payroll-reconciliation";
import shiftSwapMarketplaceRouter from "./routes/shift-swap-marketplace";
import laborComplianceRouter from "./routes/labor-compliance";
import payrollIntegrationRouter from "./routes/payroll-integration";
import enhancedForecastingRouter from "./routes/enhanced-forecasting";
import errorLogsRouter from "./routes/error-logs";
import healthRouter from "./routes/health";
import debugRouter from "./routes/debug";
import chatRouter from "./routes/chat";
import messagingRouter from "./routes/messaging";
import echoChatRouter from "./routes/echo-chat";
import { handleEchoAi3Chat } from "./routes/echo-ai3-chat";
import vectorRecipesRouter from "./routes/vector-recipes";
import termsRouter from "./routes/terms";
import knowledgeRouter from "./routes/knowledge";
import metricsRouter from "./routes/metrics";
import { createForecastRouter } from "./routes/echo-ai3-forecast";
import { generateDailyDigest, getDigestForAlerts } from "./routes/echo-ai3-daily-digest";
import generateNotesHandler from "./routes/presentation-notes";
import analyzeFeasibilityHandler from "./routes/menu-feasibility";
import recognizeHandwritingHandler from "./routes/handwriting-recognition";
import summarizeSessionHandler from "./routes/session-summarize";
import forecastFinancialHandler from "./routes/financial-forecast";
import traceProofRouter from "./routes/trace-proof";
import traceLedgerRouter from "./routes/trace-ledger";
import agentSupervisorRouter from "./routes/agent-supervisor";
import optimizeLayoutHandler from "./routes/layout-optimize";
import generateWinePairingsHandler from "./routes/wine-pairings";
import generateDemandForecastHandler from "./routes/demand-forecast";
import generateMultiPropertyAnalyticsHandler from "./routes/multi-property-analytics";
import generateJobSharingAnalyticsHandler from "./routes/job-sharing-advanced";
import generatePTOManagementHandler from "./routes/pto-management-advanced";
import generateCustomAnalyticsHandler from "./routes/custom-analytics-engine";
import generateMobileEnhancementsHandler from "./routes/mobile-enhancements";
import revenueOpsRouter from "./routes/revenue-ops";
import costManagementRouter from "./routes/cost-management";
import qualityAssuranceRouter from "./routes/quality-assurance";
import supplyChainRouter from "./routes/supply-chain";
import voiceCommandsRouter from "./routes/voice-commands";
import voiceTranscribeRouter from "./routes/voice-transcribe";
// D3: PurchasingReceiving's receiving workflow routes (delivery schedules,
// shipments, HACCP, item check-in, discrepancies, summaries, po-lookup,
// auto-A/P-invoice on commit). Lives in the module dir; mounted here so
// the main server is the single ingress for all /api/receiving traffic.
import purchasingReceivingRouter from "../client/modules/PurchasingReceiving/server/routes/receiving";
import unifiedCanvasRouter from "./routes/unified-canvas";
// import aiCookingAssistantRouter from "./routes/ai-cooking-assistant"; // TEMPORARILY DISABLED - import errors
import autoSchedulingRouter from "./routes/auto-scheduling";
import staffOptimizationRouter from "./routes/staff-optimization";
import guestExperienceRouter from "./routes/guest-experience";
import predictiveMaintenanceRouter from "./routes/predictive-maintenance";
import templateMarketplaceRouter from "./routes/template-marketplace";
import supplierNetworkRouter from "./routes/supplier-network";
import jobSharingRouter from "./routes/job-sharing";
// import jobSharingPlatformRouter from "./routes/job-sharing-platform"; // TEMPORARILY DISABLED - import errors
import skillAssignmentsRouter from "./routes/skill-assignments";
import ptoManagementRouter from "./routes/pto-management";
import dataCollectiveRouter from "./routes/data-collective";
import customAnalyticsRouter from "./routes/custom-analytics";
import crmRouter from "./routes/crm";
import eventStudioConnectorRouter from "./routes/event-studio-connector";
import scheduleForecasting from "./routes/schedule-forecasting";
import staffNeedsRouter from "./routes/staff-needs";
import { beoIntegrationsRouter } from "./routes/beo-integrations";
import healthCheckRouter from "./routes/health-check";
import syncHealthRouter from "./routes/sync-health";
import capacityOrchestrationRouter from "./routes/capacity-orchestration";
import offlineSyncRouter from "./routes/offline-sync";
import posBridgeRouter from "./routes/pos-bridge";
import lucccaCoreRouter from "./routes/luccca-core";
import dashboardAnalyticsRouter from "./routes/dashboard-analytics";
import dashboardFinancialRouter from "./routes/dashboard-financial";
import financialDataQueryRouter from "./routes/financial-data-query";
import { PnLCalculatorRealtime } from "./services/pnl-calculator-realtime";
import { PayrollEchoAurumPoster } from "./services/payroll-echoaurum-poster";
import echoFinancialRouter from "./routes/echo-financial";
import { aurumIntegrationsRouter } from "./routes/aurumIntegrations";
import { aurumAuthRouter } from "./routes/aurum-auth";
import aurumConsoleRouter from "./routes/aurum-console";
import { aurumApprovalsRouter } from "./routes/aurumApprovals";
import aurumEnterpriseRouter from "./routes/aurum-enterprise";
import scheduleRealtimeRouter from "./routes/schedule-realtime";
import weatherRouter from "./routes/weather";
import dashboardKpiRouter from "./routes/dashboard-kpi";
import dashboardOpsRouter from "./routes/dashboard-ops";
import { translateRouter } from "./routes/translate";
import avatarTasksRouter from "./routes/avatar-tasks";
import phase7AnalyticsRouter from "./routes/phase-7-analytics";
import phase8SupplyChainRouter from "./routes/phase-8-supply-chain";
import phase9HRPayrollRouter from "./routes/phase-9-hr-payroll";
import phase10GuestExperienceRouter from "./routes/phase-10-guest-experience";
import avatarUploadRouter from "./routes/avatar-upload";
import avatarVoiceRouter from "./routes/avatar-voice";
import integrationsRouter from "./routes/integrations";
import inventoryRouter from "./routes/inventory";
import inventoryEchoAIIntelligenceRouter from "./routes/inventory-echoai-intelligence";
import ediMonitoringRouter from "./routes/edi-monitoring";
import { inventoryReceiptRouter } from "./routes/inventory-receipt";
import { inventoryTransferRouter } from "./routes/inventory-transfer";
import { inventoryWasteRouter } from "./routes/inventory-waste";
import volumeDetectionRouter from "./routes/volume-detection";
import beverageIntelligenceRouter from "./routes/beverage-intelligence";
import { conflictsRouter } from "./routes/conflicts";
import { governanceRouter } from "./routes/governance";
import { spaceLocksRouter } from "./routes/space-locks";
import eventsRouter from "./routes/events";
import calendarRouter from "./routes/calendar";
import calendarRBACRouter from "./routes/calendar-rbac";
import calendarAnalyticsRouter from "./routes/calendar-analytics";
import calendarAIRouter from "./routes/calendar-ai";
import calendarIntegrationsRouter from "./routes/calendar-integrations";
import calendarWebhookReceiverRouter from "./routes/calendar-webhook-receiver";
import mandatoryEventsRouter from "./routes/mandatory-events";
import mandatoryEventsDashboardRouter from "./routes/mandatory-events-dashboard";
// import emailEventWebhookRouter from "./routes/email-event-webhook"; // Requires openai
import conflictDetectionRouter from "./routes/conflict-detection";
import echoeventsCrmRouter from "./routes/echoevents-crm";
import departmentRelationshipsRouter from "./routes/department-relationships";
import personalWorkloadRouter from "./routes/personal-workload";
// import workflowManagementRouter from "./routes/workflow-management"; // Requires @vercel/postgres
// import outletsBeOReoRouter from "./routes/outlets-beo-reo"; // Requires @vercel/postgres
// import maestroProductionRouter from "./routes/maestro-production"; // Requires @vercel/postgres
// import recipeAIPurchasingRouter from "./routes/recipe-ai-purchasing"; // Requires @vercel/postgres
import helpRouter from "./routes/api/help";
import echoAi3BmbProxyRouter from "./routes/echo-ai3-bmb-proxy";
import banquetMenusRouter from "./routes/banquet-menus";
import {
  evaluateSLAHandler,
  rescheduleSimulatorHandler,
  cascadingImpactHandler,
  weeklyDigestHandler,
  calendarHealthHandler,
} from "./routes/calendar-engines";
import aliceRouter from "./routes/alice";
import { getAuditEntries } from "./lib/audit-log";
import telemetryRouter from "./routes/telemetry";
import excelTemplatesRouter from "./routes/excel-templates";

import userPreferencesRouter from "./routes/user-preferences";
import moduleHealthRouter from "./routes/module-health";
import integrationCommandCenterRouter from "./routes/integration-command-center";
import prospectsRouter from "./routes/prospects";
import onboardingProvisionRouter from "./routes/onboarding-provision";
import forecastPlanRouter from "./routes/forecast-plan";
import forecastCalendarRouter from "./routes/forecast-calendar";
import forecastReservationsRouter from "./routes/forecast-reservations";
import forecastAggregatedRouter from "./routes/forecast-aggregated";
import forecastOutletRouter from "./routes/forecast-outlet";
import forecastComparisonRouter from "./routes/forecast-comparison";
import forecastRefinementRouter from "./routes/forecast-refinement";
import forecastLockInRouter from "./routes/forecast-lock-in";
import forecastHubRouter from "./routes/forecast-hub";
import hotelPmsIntegrationsRouter from "./routes/integrations/hotel-pms";
import posIntegrationsRouter from "./routes/integrations/pos";
import spineChainRouter from "./routes/spine-chain";
import inventoryImplicationsRouter from "./routes/inventory-implications";
import calendarProspectsRouter from "./routes/calendar-prospects";
import roomsRouter from "./routes/rooms";
import maestroChangelogRouter from "./routes/maestro-changelog";
import maestroProductionRouter from "./routes/maestro-production";
import maestroInventoryRouter from "./routes/maestro-inventory";
import maestroLaborRouter from "./routes/maestro-labor";
import maestroEventsRouter from "./routes/maestro-events";
import maestroOutletsRouter from "./routes/maestro-outlets";
import { initializeValidation } from "./lib/module-validator";
import maestroBanquetsRouter from "./routes/maestro-banquets";
// import pastryBanquetsRouter from "./routes/pastry-banquets"; // TEMPORARILY DISABLED - import errors
import maestroBQTApiRouter from "./routes/maestro-bqt-api";
import supplierCatalogSyncRouter from "./services/supplier-catalog-sync";
import gtinLookupRouter from "./services/gtin-lookup";
import performanceTrackingAIRouter from "./routes/performance-tracking-ai";
import postEventEvaluationsRouter from "./routes/post-event-evaluations";
import highVolumeSchedulingRouter from "./routes/high-volume-scheduling";
import employeeDevelopmentRouter from "./routes/employee-development";
import { handleTrace } from "./routes/trace";
import { recipeDraftRouter } from "./routes/recipe-draft";
import { echoAi3RecipeChainRouter } from "./routes/echo-ai3-recipe-chain";
import { purchasingConsolidateRouter } from "./routes/purchasing-consolidate";
import { productionSheetsRouter } from "./routes/production-sheets";
import { startProductionSheetScheduler } from "./services/production-sheet-service";
import { echolayoutDesignsRouter } from "./routes/echolayout-designs";
import { echolayoutKitchenRouter } from "./routes/echolayout-kitchen";
import { modulesRouter } from "./routes/modules";
import { requireModuleEnabled } from "./lib/module-gate";
import { calendarFanoutRouter } from "./routes/calendar-fanout";
import { startCalendarFanoutSubscription } from "./services/calendar-fanout-service";
import { laborForecastRouter } from "./routes/labor-forecast";
import { safetyRouter } from "./routes/safety";
import { integrationsReconciliationRouter } from "./routes/integrations-reconciliation";
import { analyticsWhyChangedRouter } from "./routes/analytics-why-changed";
import { financeGLMappingRouter } from "./routes/finance-gl-mapping";
import { nutritionAllergenRouter } from "./routes/nutrition-allergen";
import {
  getRecipes,
  getRecipeCost,
  getCostTrends,
  getMetrics,
  getCostHealth,
  saveScenario,
  getScenarios,
  applyScenario,
} from "./routes/plate-costing";

function getAllowedCorsOrigins(): string[] {
  return (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isLocalOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export async function createServer() {
  const app = express();
  const allowedCorsOrigins = getAllowedCorsOrigins();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

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

  // Staff Needs Pipeline: run periodically so ONM stays current (e.g. daily). Disable with STAFF_NEEDS_PIPELINE_INTERVAL_HOURS=0.
  const staffNeedsIntervalHours = Number(
    process.env.STAFF_NEEDS_PIPELINE_INTERVAL_HOURS || "0",
  );
  if (staffNeedsIntervalHours > 0) {
    const runStaffNeedsPipeline = () => {
      import("./jobs/staffNeedsPipelineJob.js")
        .then(({ executeStaffNeedsPipelineJob }) =>
          executeStaffNeedsPipelineJob({
            tenantId: "default",
            periodDays: 7,
            writeToDisk: true,
            pushToAurum: true,
          }),
        )
        .catch((err) =>
          console.error("[StaffNeedsPipeline] Scheduled run failed:", err),
        );
    };
    setInterval(
      runStaffNeedsPipeline,
      staffNeedsIntervalHours * 60 * 60 * 1000,
    );
    runStaffNeedsPipeline(); // run once on startup after a short delay so server is ready
    setTimeout(runStaffNeedsPipeline, 60 * 1000);
  }

  // Initialize Sentry for error tracking
  try {
    initializeSentry(app);
  } catch (err) {
    console.error("[SENTRY] Failed to initialize:", err);
  }

  // Create HTTP server for WebSocket support
  let httpServer: ReturnType<typeof createHTTPServer> | undefined;
  if (typeof createHTTPServer === "function") {
    httpServer = createHTTPServer(app);
    // Initialize WebSocket server
    try {
      initializeWebSocket(httpServer);
      console.log(
        "[WEBSOCKET] Server initialized for real-time work-order updates",
      );
    } catch (err) {
      console.error("[WEBSOCKET] Failed to initialize:", err);
      captureException(err as Error, { context: "WebSocket initialization" });
    }

    // Initialize Calendar WebSocket server
    try {
      const calendarIO = initializeCalendarWebSocket(httpServer);
      console.log(
        "[CALENDAR-WEBSOCKET] Server initialized for real-time calendar updates",
      );

      // Initialize broadcaster with the Calendar WebSocket instance
      initializeBroadcaster(calendarIO);
      console.log(
        "[CALENDAR-BROADCASTER] Broadcaster initialized for real-time conflict notifications",
      );
    } catch (err) {
      console.error("[CALENDAR-WEBSOCKET] Failed to initialize:", err);
      captureException(err as Error, {
        context: "Calendar WebSocket initialization",
      });
    }
  }

  // Initialize module validation at startup
  try {
    initializeValidation();
  } catch (err) {
    console.error("[MODULE-VALIDATOR] Failed to initialize:", err);
  }

  // Initialize real-time P&L calculator (financial mini-panels)
  try {
    PnLCalculatorRealtime.initialize();
  } catch (err) {
    console.error("[PNL] Failed to initialize:", err);
    captureException(err as Error, {
      context: "PnLCalculatorRealtime.initialize",
    });
  }

  // Initialize EchoAurum payroll posting bridge (payroll → journal accruals)
  try {
    PayrollEchoAurumPoster.initialize();
  } catch (err) {
    console.error("[ECHOAURUM] Failed to initialize payroll poster:", err);
    captureException(err as Error, {
      context: "PayrollEchoAurumPoster.initialize",
    });
  }

  // Set request timeout for large uploads (30 minutes = 1800 seconds)
  app.use((req, res, next) => {
    req.setTimeout(30 * 60 * 1000);
    res.setTimeout(30 * 60 * 1000);
    next();
  });

  // EchoAi^3 diagnostic status remains public; all intelligence routes require auth later
  app.get("/api/echo-ai3/status", (req, res) => res.json({ ok: true, message: "EchoAi^3 Chat Service Active" }));

  // BMB Echo proxy (mocked responses for the demo; swap for real Railway forwarding when contract is supplied)
  app.use("/api/echo-ai3", echoAi3BmbProxyRouter);

  // Echo AI^3 ⇄ Culinary chain: build recipe → compose plated dish → publish POS cost.
  // Mounted before the auth middleware block so it accepts unauthenticated calls
  // from the orchestrator during demos; production deployments should add
  // jwtAuthMiddleware once the AI^3 service-to-service tokens are issued.
  app.use("/api/echo-ai3/recipe-chain", echoAi3RecipeChainRouter);

  // BMB items + drafts (MongoDB-backed library + autosave)
  app.use("/api/banquet-menus", banquetMenusRouter);

  // Echo Resonance — Phase 1 backend (TICKET_004 routes)
  // The resonance router exposes reading/trajectory/intervention endpoints;
  // the signals router exposes the read-side signal-graph queries. Both apply
  // requireAuth at the router level. Tenet 7/8 expired-row filtering happens
  // SQL-side in signal-query, so forbidden signals never reach these surfaces.
  // Health endpoint mounted FIRST so its more-specific path matches before
  // the catch-all resonance router.
  app.use("/api/echo-resonance/health", echoResonanceHealthRouter);
  app.use("/api/echo-resonance/signals", signalsRouter);
  app.use("/api/echo-resonance", resonanceRouter);

  // Echo Resonance — start the signal-decay scheduler. Tenet 7/8 storage
  // enforcement: physically deletes expired rows on cadence (default hourly).
  // Idempotent and disable-able via ECHO_DECAY_DISABLED in dev/CI.
  startSignalDecayScheduler();
  // Stop on graceful shutdown so the timer doesn't keep the process alive.
  // (DB pool shutdown is owned by server/database/connection.ts; we just
  // stop the timer here.)
  process.once("SIGTERM", () => stopSignalDecayScheduler());
  process.once("SIGINT", () => stopSignalDecayScheduler());

  // Middleware - PHASE 0: ENTERPRISE FOUNDATION
  // Order is critical: CORS → body parsing → request context → auth → tenant validation → business logic → error handling

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedCorsOrigins.includes(origin) || isLocalOrigin(origin)) {
          callback(null, true);
          return;
        }

        if (process.env.NODE_ENV !== "production" && !allowedCorsOrigins.length) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(compression());

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  // Standard body parsing (express.json automatically skips multipart/form-data)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Response middleware to ensure proper JSON responses
  app.use((req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to ensure proper headers
    res.json = ((body: unknown) => {
      // Ensure Content-Type is always set for JSON responses
      if (!res.getHeader("Content-Type")) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      // Call original json method
      return originalJson(body);
    }) as typeof res.json;

    next();
  });

  // Request ID generation middleware
  app.use((req: Request & { id?: string }, _res: Response, next: NextFunction) => {
    req.id = generateRequestId();
    next();
  });

  // Request context middleware (attach logger to req)
  app.use(requestContextMiddleware);

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(
        `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
      );
    });
    next();
  });

  // ---------------------------------------------------------------------------
  // Public health endpoints (must be registered BEFORE any auth-protected /api mounts)
  // ---------------------------------------------------------------------------

  // Public endpoints (no auth required)
  // Authentication endpoints (public - signup, login, OAuth)
  app.use("/api", authRouter);
  app.use("/api", onboardingProvisionRouter);
  app.use("/api", forecastPlanRouter);
  app.use("/api", spineChainRouter);
  app.use("/api", inventoryImplicationsRouter);

  // Weather endpoints - public service
  app.use("/api", weatherRouter);

  // Dashboard KPI and ops (toolbar + dashboard widgets)
  app.use("/api/v1/kpi", dashboardKpiRouter);
  app.use("/api/dashboard", dashboardOpsRouter);

  // Plate Costing Dashboard endpoints
  app.get("/api/plate-costing/recipes", getRecipes);
  app.get("/api/plate-costing/recipes/:id/cost", getRecipeCost);
  app.get("/api/plate-costing/trends/:recipeId", getCostTrends);
  app.get("/api/plate-costing/metrics", getMetrics);
  app.get("/api/plate-costing/health", getCostHealth);
  app.post("/api/plate-costing/scenarios", saveScenario);
  app.get("/api/plate-costing/scenarios", getScenarios);
  app.post("/api/plate-costing/recipes/:id/apply-scenario", applyScenario);

  // Telemetry endpoints - semi-public (batched from client)
  app.use("/api/telemetry", telemetryRouter);

  // Employee Management API
  app.use("/api/employees", employeeRouter);
  app.use("/api/bulk", bulkUploadRouter);

  // HR System Sync API
  app.use("/api/hr-sync", hrSyncRouter);

  // TTS endpoints - public service (text-to-speech)
  app.get("/api/tts/voices", async (req: Request, res: Response, next: NextFunction) => {
    const { listVoices } = await import("./routes/tts");
    return listVoices(req, res, next);
  });
  app.post("/api/tts/speak", async (req: Request, res: Response, next: NextFunction) => {
    const { speak } = await import("./routes/tts");
    return speak(req, res, next);
  });

  // PHASE 1: JWT Authentication Middleware (replaces Phase 0 basicAuthMiddleware)
  // Validates JWT tokens and extracts user context (id, org_id, email)
  // Optional - doesn't fail if token missing, but validates if present
  app.use(optionalJwtAuthMiddleware);

  // EchoAi^3 intelligence routes now live behind authenticated shell access
  app.post("/api/echo-ai3/chat", jwtAuthMiddleware, handleEchoAi3Chat);
  app.use("/api/echo-ai3/forecast", jwtAuthMiddleware, createForecastRouter());
  app.get("/api/echo-ai3/digest", jwtAuthMiddleware, generateDailyDigest);
  app.get("/api/echo-ai3/digest/alerts", jwtAuthMiddleware, getDigestForAlerts);

  // User preferences (theme, appearance, backgrounds - synced across devices)
  // Must be before tenant validation since these are user-specific, not org-specific
  app.use("/api", userPreferencesRouter);

  // Enterprise calendar system (multi-outlet, conflicts, permissions, audit)
  // REGISTERED BEFORE global tenant validation to use its own auth middleware
  app.use("/api/calendar", calendarRouter);

  // Calendar analytics, AI, RBAC, integrations, webhooks, and prospects
  app.use("/api/calendar/analytics", calendarAnalyticsRouter);
  app.use("/api/calendar/ai", calendarAIRouter);
  app.use("/api/calendar/permissions", calendarRBACRouter);
  app.use("/api/calendar/integrations", calendarIntegrationsRouter);
  app.use("/api/calendar/webhooks", calendarWebhookReceiverRouter);
  app.use(
    "/api/calendar/prospects",
    jwtAuthMiddleware,
    calendarProspectsRouter,
  );

  // Mandatory events system (Build A+B: Email parsing + Acknowledgments)
  app.use("/api/mandatory-events", mandatoryEventsRouter);
  app.use("/api/mandatory-events-dashboard", mandatoryEventsDashboardRouter);
  // app.use("/api/email-webhook", emailEventWebhookRouter); // Requires openai

  // Cross-department coordination (Build C+D: Conflict detection + Department relationships)
  app.use("/api/conflict-detection", conflictDetectionRouter);
  app.use("/api/echoevents/crm", echoeventsCrmRouter);
  app.use("/api/departments", departmentRelationshipsRouter);

  // Reports (forecast + analytics summaries)
  try {
    const reportsRouter = await import("./routes/reports");
    app.use("/api/reports", jwtAuthMiddleware, reportsRouter.default);
    console.log("[REPORTS] Router registered");
  } catch (err) {
    console.warn("[REPORTS] Failed to load:", (err as Error).message);
  }

  // Checkbook dashboard (real-time sales vs COGS)
  try {
    const checkbookRouter = await import("./routes/checkbook");
    app.use("/api/checkbook", jwtAuthMiddleware, checkbookRouter.default);
    console.log("[CHECKBOOK] Router registered");
  } catch (err) {
    console.warn("[CHECKBOOK] Failed to load:", (err as Error).message);
  }

  // Resort forecast (21-day outlet + meal period)
  try {
    const resortForecastRouter = await import("./routes/resort-forecast");
    app.use("/api/resort/forecast", jwtAuthMiddleware, resortForecastRouter.default);
    console.log("[RESORT-FORECAST] Router registered");
  } catch (err) {
    console.warn("[RESORT-FORECAST] Failed to load:", (err as Error).message);
  }

  // Forecast expansion: calendar, reservations, aggregated, outlet, comparison, refinement, lock-in, integrations
  try {
    app.use("/api/forecast/calendar", jwtAuthMiddleware, forecastCalendarRouter);
    app.use("/api/forecast/reservations", jwtAuthMiddleware, forecastReservationsRouter);
    app.use("/api/forecast/aggregated", jwtAuthMiddleware, forecastAggregatedRouter);
    app.use("/api/forecast/outlet", jwtAuthMiddleware, forecastOutletRouter);
    app.use("/api/forecast/comparison", jwtAuthMiddleware, forecastComparisonRouter);
    app.use("/api/forecast/refine", jwtAuthMiddleware, forecastRefinementRouter);
    app.use("/api/forecast/lock-in", jwtAuthMiddleware, forecastLockInRouter);
    app.use("/api/forecast/hub", jwtAuthMiddleware, forecastHubRouter);
    app.use("/api/integrations/hotel-pms", jwtAuthMiddleware, hotelPmsIntegrationsRouter);
    app.use("/api/integrations/pos", jwtAuthMiddleware, posIntegrationsRouter);
    console.log("[FORECAST-EXPANSION] All forecast and integration routes registered");
  } catch (err) {
    console.warn("[FORECAST-EXPANSION] Failed to load:", (err as Error).message);
  }

  // Personal workload management (Build E: Personal Workload Dashboard)
  app.use("/api/workload", personalWorkloadRouter);

  // Workflow orchestration (Build F: Event Workflow Orchestration)
  // app.use("/api/workflows", workflowManagementRouter); // Requires @vercel/postgres

  // Outlets, BEO/REO classification, and departments (Build E+F Foundation)
  // app.use("/api", outletsBeOReoRouter); // Requires @vercel/postgres

  // Maestro BEO Production Tasks (Phase 2: Maestro BQT Integration)
  // app.use("/api", maestroProductionRouter); // Requires @vercel/postgres

  // Recipe AI Analysis & Purchasing Bridge (Phase 3: AI + Purchasing Integration)
  // app.use("/api", recipeAIPurchasingRouter); // Requires @vercel/postgres

  // Labor Hours Sync & Schedule Module Integration (Phase 4: Labor Sync)
  try {
    const laborSyncRouter = await import("./routes/labor-sync");
    app.use("/api/labor-sync", laborSyncRouter.default);
  } catch (err) {
    console.warn("[LABOR-SYNC] Failed to load:", (err as Error).message);
  }

  // Advanced Labor Management, Analytics, & Real-Time Collaboration (Phase 5)
  try {
    const phase5Router = await import("./routes/phase5-advanced-labor");
    app.use("/api/phase5", phase5Router.default);
  } catch (err) {
    console.warn("[PHASE5] Failed to load:", (err as Error).message);
  }

  // Machine Learning, Automated Scheduling, Notifications, & Mobile Time Tracking (Phase 6)
  try {
    const phase6Router = await import("./routes/phase6-ml-automation");
    app.use("/api/phase6", phase6Router.default);
  } catch (err) {
    console.warn("[PHASE6] Failed to load:", (err as Error).message);
  }

  // BEO Print Pack + Event Groups (best-in-class; mount before generic BEO so paths match)
  try {
    const beoPrintAndGroupsRouter = (await import("./routes/beo-print-and-groups")).default;
    app.use("/api/beo", jwtAuthMiddleware, beoPrintAndGroupsRouter);
    console.log("[BEO] Print pack and event groups routes registered");
  } catch (err) {
    console.warn("[BEO] Print-and-groups failed to load:", (err as Error).message);
  }

  // Calendar Intelligence & BEO Management System (Phase 7A)
  try {
    const { router: beoRouter } = await import("./routes/beo-management");
    app.use("/api/beo", beoRouter);
  } catch (err) {
    console.warn("[BEO-MANAGEMENT] Failed to load:", (err as Error).message);
  }

  // EchoEventStudio / EchoLayout BEO PDF export (template-driven path will be expanded)
  // Mounted at: POST /api/beo/export
  try {
    const { beoExport } = await import(
      "../client/modules/EchoEventStudio/server/routes/beo-export"
    );
    app.use("/api/beo-export", jwtAuthMiddleware, beoExport);
    console.log("[BEO-EXPORT] Router registered");
  } catch (err) {
    console.warn("[BEO-EXPORT] Failed to load:", (err as Error).message);
  }

  // BEO Detail Service (Maestro Dashboard detail view)
  try {
    const { router: beoDetailRouter } = await import("./routes/beo-detail");
    app.use("/api/beo", jwtAuthMiddleware, beoDetailRouter);
    console.log("[BEO-DETAIL] Router registered for dashboard detail view");
  } catch (err) {
    console.warn("[BEO-DETAIL] Failed to load:", (err as Error).message);
  }

  // BEO AI Orders Service (AI order editing, approval, feedback)
  try {
    const { router: beoAIOrdersRouter } = await import("./routes/beo-ai-orders");
    app.use("/api/beo", jwtAuthMiddleware, beoAIOrdersRouter);
    console.log("[BEO-AI-ORDERS] Router registered for AI order management");
  } catch (err) {
    console.warn("[BEO-AI-ORDERS] Failed to load:", (err as Error).message);
  }

  // BEO Recipes & Inventory Service (recipe linking, inventory enrichment)
  try {
    const { router: beoRecipesInventoryRouter } = await import(
      "./routes/beo-recipes-inventory"
    );
    app.use("/api/beo", jwtAuthMiddleware, beoRecipesInventoryRouter);
    console.log(
      "[BEO-RECIPES-INVENTORY] Router registered for recipe and inventory management",
    );
  } catch (err) {
    console.warn("[BEO-RECIPES-INVENTORY] Failed to load:", (err as Error).message);
  }


  // BEO Execution Service (day-of event execution, real-time updates)
  try {
    const beoExecutionRouter = await import("./routes/beo-execution");
    app.use("/api/beo-execution", jwtAuthMiddleware, beoExecutionRouter.default);
    console.log("[BEO-EXECUTION] Router registered for event execution");
  } catch (err) {
    console.warn("[BEO-EXECUTION] Failed to load:", (err as Error).message);
  }

  // BEO E-Sign webhook (contract lifecycle integration point)
  try {
    const beoEsignWebhookRouter = await import("./routes/beo-esign-webhook");
    app.use("/api/beo/esign-webhook", beoEsignWebhookRouter.default);
    console.log("[BEO-ESIGN] Webhook registered");
  } catch (err) {
    console.warn("[BEO-ESIGN] Failed to load:", (err as Error).message);
  }

  // Reports (semantic layer + report builder)
  try {
    const reportsSemanticRouter = await import("./routes/reports-semantic");
    app.use("/api/reports", jwtAuthMiddleware, reportsSemanticRouter.default);
    console.log("[REPORTS] Semantic reports router registered");
  } catch (err) {
    console.warn("[REPORTS] Failed to load:", (err as Error).message);
  }

  // ML Forecasting Accuracy Service
  try {
    const mlForecastingAccuracyRouter = await import("./routes/ml-forecasting-accuracy");
    app.use("/api/ml-forecasting", jwtAuthMiddleware, mlForecastingAccuracyRouter.default);
    console.log("[ML-FORECASTING] Router registered for accuracy tracking");
  } catch (err) {
    console.warn("[ML-FORECASTING] Failed to load:", (err as Error).message);
  }

  // POS Integration Service
  try {
    const posIntegrationRouter = await import("./routes/pos-integration");
    app.use("/api/pos", jwtAuthMiddleware, posIntegrationRouter.default);
    console.log("[POS-INTEGRATION] Router registered");
  } catch (err) {
    console.warn("[POS-INTEGRATION] Failed to load:", (err as Error).message);
  }

  // Operations Core Engine (Purchasing → Inventory → Culinary → Production)
  try {
    const operationsCoreRouter = await import("./routes/operations-core");
    app.use("/api/operations", jwtAuthMiddleware, operationsCoreRouter.default);
    console.log("[OPERATIONS-CORE] Router registered for unified operations management");
  } catch (err) {
    console.warn("[OPERATIONS-CORE] Failed to load:", (err as Error).message);
  }

  // AI Forecasting Engine (Demand prediction, order scheduling, stock alerts)
  try {
    const aiForecastingRouter = await import("./routes/ai-forecasting");
    app.use("/api/forecasting", jwtAuthMiddleware, aiForecastingRouter.default);
    console.log("[AI-FORECASTING] Router registered for predictive inventory management");
  } catch (err) {
    console.warn("[AI-FORECASTING] Failed to load:", (err as Error).message);
  }

  // POS Integration V2 (Real-time sales, inventory decrement, cost tracking)
  try {
    const posIntegrationV2Router = await import("./routes/pos-integration-v2");
    app.use("/api/pos/v2", jwtAuthMiddleware, posIntegrationV2Router.default);
    console.log("[POS-INTEGRATION-V2] Router registered for real-time POS data");
  } catch (err) {
    console.warn("[POS-INTEGRATION-V2] Failed to load:", (err as Error).message);
  }

  // Event Lifecycle Engine (Prospect → BEO → Production → Payment)
  try {
    const eventLifecycleRouter = await import("./routes/event-lifecycle");
    app.use("/api/events/lifecycle", jwtAuthMiddleware, eventLifecycleRouter.default);
    console.log("[EVENT-LIFECYCLE] Router registered for complete event management");
  } catch (err) {
    console.warn("[EVENT-LIFECYCLE] Failed to load:", (err as Error).message);
  }

  // WebSocket Stats endpoints
  try {
    const websocketStatsRouter = await import("./routes/websocket-stats");
    app.use("/api/websocket", websocketStatsRouter.default);
    console.log("[WEBSOCKET-STATS] Router registered");
  } catch (err) {
    console.warn("[WEBSOCKET-STATS] Failed to load:", (err as Error).message);
  }

  // Menu Versioning Service
  try {
    const menuVersioningRouter = await import("./routes/menu-versioning");
    app.use("/api/menu-versioning", jwtAuthMiddleware, menuVersioningRouter.default);
    console.log("[MENU-VERSIONING] Router registered");
  } catch (err) {
    console.warn("[MENU-VERSIONING] Failed to load:", (err as Error).message);
  }

  // Kitchen Library Service
  try {
    const kitchenLibraryRouter = await import("./routes/kitchen-library");
    app.use("/api/kitchen-library", jwtAuthMiddleware, kitchenLibraryRouter.default);
    console.log("[KITCHEN-LIBRARY] Router registered");
  } catch (err) {
    console.warn("[KITCHEN-LIBRARY] Failed to load:", (err as Error).message);
  }

  // Recipe Search Optimizer Service
  try {
    const recipeSearchRouter = await import("./routes/recipe-search");
    app.use("/api/recipe-search", jwtAuthMiddleware, recipeSearchRouter.default);
    console.log("[RECIPE-SEARCH] Router registered");
  } catch (err) {
    console.warn("[RECIPE-SEARCH] Failed to load:", (err as Error).message);
  }

  // Barcode/GTIN Integration Service
  try {
    const barcodeGTINRouter = await import("./routes/barcode-gtin");
    app.use("/api/barcode", jwtAuthMiddleware, barcodeGTINRouter.default);
    console.log("[BARCODE-GTIN] Router registered");
  } catch (err) {
    console.warn("[BARCODE-GTIN] Failed to load:", (err as Error).message);
  }

  try {
    const { router: visibilityRouter } =
      await import("./routes/calendar-visibility");
    app.use("/api/visibility", visibilityRouter);
  } catch (err) {
    console.warn(
      "[CALENDAR-VISIBILITY] Failed to load:",
      (err as Error).message,
    );
  }

  // Prospects management (EchoEventStudio sales pipeline + forecasting)
  try {
    app.use("/api/prospects", jwtAuthMiddleware, prospectsRouter);
    console.log("[PROSPECTS] Router registered for sales pipeline management");
  } catch (err) {
    console.warn("[PROSPECTS] Failed to load:", (err as Error).message);
  }

  // Rooms management (venue space allocation and availability)
  try {
    app.use("/api/rooms", jwtAuthMiddleware, roomsRouter);
    console.log("[ROOMS] Router registered for venue management");
  } catch (err) {
    console.warn("[ROOMS] Failed to load:", (err as Error).message);
  }

  // Development: default org so unauthenticated / no-header requests don't get MISSING_ORG_ID
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const headers = req.headers as Record<string, string | string[] | undefined>;
    if (process.env.NODE_ENV === "development" && !headers["x-org-id"]) {
      headers["x-org-id"] = "default";
    }
    next();
  });

  // PHASE 0: Tenant validation middleware
  // Enforces org_id isolation on ALL requests
  // Works with both JWT (req.user.org_id) and X-Org-ID header
  // Calendar routes are registered BEFORE this to bypass global validation
  app.use(conditionalTenantValidation);

  // Set request-scoped context for RLS and logging
  app.use((req: Request & { org?: { id?: string }; user?: { id?: string }; id?: string }, _res: Response, next: NextFunction) => {
    requestContext.run(
      {
        orgId: req.org?.id,
        userId: req.user?.id,
        requestId: req.id,
      },
      next,
    );
  });

  // PHASE 0: Rate limiting middleware
  // Per-org rate limiting (standard: 1000 req/min, enterprise: 5000 req/min)
  app.use(rateLimitingMiddleware);

  // PHASE 0: Request sanitization middleware
  // Sanitizes common text fields, prevents XSS and injection attacks
  app.use(sanitizeMiddleware);

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
  // Trace API route
  app.post("/api/trace", handleTrace);

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/simulate", handleSimulate);
  app.get("/api/builder/content", async (req: Request, res: Response) => {
    const { handleBuilderContent } = await import("./routes/builder");
    return handleBuilderContent(req, res, () => undefined);
  });
  app.get("/api/secrets/registry", async (req: Request, res: Response) => {
    const { handleSecretsRegistry } = await import("./routes/secrets");
    return handleSecretsRegistry(req, res, () => undefined);
  });
  app.post("/api/secrets/preview", async (req: Request, res: Response) => {
    const { handleSecretsPreview } = await import("./routes/secrets");
    return handleSecretsPreview(req, res, () => undefined);
  });
  app.post("/api/secrets/set", async (req: Request, res: Response) => {
    const { handleSecretsSet } = await import("./routes/secrets");
    return handleSecretsSet(req, res, () => undefined);
  });
  app.post("/api/write-file", handleWriteFile);
  app.get("/api/search", async (req: Request, res: Response, next: NextFunction) => {
    const { handleSearch } = await import("./routes/search");
    return handleSearch(req, res, next);
  });
  app.post("/api/upload", async (req: Request, res: Response, next: NextFunction) => {
    const { handleUpload } = await import("./routes/upload");
    return handleUpload(req, res, next);
  });
  app.post("/api/plan", handlePlan);
  app.get("/api/automation/tasks", async (req: Request, res: Response, next: NextFunction) => {
    const { handleAutomationList } = await import("./routes/automation");
    return handleAutomationList(req, res, next);
  });
  app.post("/api/automation/run", async (req: Request, res: Response, next: NextFunction) => {
    const { handleAutomationRun } = await import("./routes/automation");
    return handleAutomationRun(req, res, next);
  });
  app.post("/api/echo", async (req: Request, res: Response, next: NextFunction) => {
    const { handleEcho } = await import("./routes/echo");
    return handleEcho(req, res, next);
  });

  // Echo AI financial integration
  app.use("/api/echo", echoFinancialRouter);

  app.post("/api/images/generate", handleImageGenerate);
  app.post("/api/images/save", handleImageSave);
  app.post("/api/images/delete", handleImageDelete);
  app.post("/api/move-file", handleMoveFile);
  app.post("/api/apply", requireAdminToken, handleApply);
  app.post("/api/rollback", requireAdminToken, handleRollback);

  // EchoAi^3 Actions
  const echoAI3ActionsRouter = await import("./routes/echo-ai3-actions");
  app.use("/api/echo-ai3/actions", echoAI3ActionsRouter.default);
  console.log("[ECHOAI3] Actions router registered");

  // Fast-path recipe draft
  app.use("/api/recipes", recipeDraftRouter);
  // Labor forecast + overtime sentinel
  app.use("/api/labor-forecast", laborForecastRouter);
  // Safety: Safe Mode, kill switch
  app.use("/api/safety", safetyRouter);

  // Integrations reconciliation reports
  app.use("/api/integrations/reconciliation", integrationsReconciliationRouter);
  // Analytics: why-changed delta explainer
  app.use("/api/analytics", analyticsWhyChangedRouter);
  // Finance: GL mapping viewer
  app.use("/api/finance", financeGLMappingRouter);
  // Nutrition: allergen chain
  app.use("/api/nutrition", nutritionAllergenRouter);

  // Module Integration Bridge
  const moduleIntegrationRouter = await import("./routes/module-integration");
  app.use("/api/module-integration", moduleIntegrationRouter.default);
  console.log("[MODULE-INTEGRATION] Module integration router registered");

  // Forensic Audit API (admin-only for enterprise compliance)
  try {
    const forensicAuditRouter = await import("./routes/forensic-audit");
    app.use("/api/forensic-audit", requireAdminToken, forensicAuditRouter.default);
    console.log("[FORENSIC-AUDIT] Router registered");
  } catch (err) {
    console.warn("[FORENSIC-AUDIT] Failed to load:", (err as Error).message);
  }

  // Vector (recipes) endpoints
  app.use("/api/vector", vectorRecipesRouter);
  app.use("/api", termsRouter);

  // ZARO guardian endpoints
  app.use("/api/zaro", zaroRouter);
  app.use("/api/zaro/monitor", zaroMonitorRouter);

  // Vault backup endpoints
  app.use("/api/vault", vaultRouter);

  // EchoCoder AI endpoints
  app.post("/api/echocoder/generate", handleEchoCoderGenerate);
  app.post("/api/echocoder/fix", handleEchoCoderFix);
  app.get("/api/echocoder/analyze/:moduleName", handleEchoCoderAnalyze);
  app.post("/api/echocoder/access", handleEchoCoderAccess);
  app.post("/api/echocoder/upgrade", handleEchoCoderUpgrade);
  app.get("/api/echocoder/change-requests", handleListChangeRequests);
  app.post("/api/echocoder/change-requests/:id/checks", handleRunChangeChecks);
  app.post(
    "/api/echocoder/change-requests/:id/approve",
    handleApproveChangeRequest,
  );
  app.post("/api/echocoder/change-requests/:id/apply", handleApplyChangeRequest);
  app.get("/api/echocoder/codebase/index", handleCodebaseIndex);
  app.get("/api/echocoder/codebase/file", handleCodebaseFile);
  app.post("/api/echocoder/context/plan", handleContextPlan);
  app.post("/api/echocoder/patch/preview", handlePatchPreview);
  app.post("/api/echocoder/patch/stage", handlePatchStage);
  app.post("/api/echocoder/generate-cms", handleEchoCoderGenerateCMS);

  // File import endpoints
  app.use("/api/import", importRouter);

  // Culinary file upload
  app.use("/api", uploadCulinaryRouter);

  // R&D Labs chat endpoint
  app.use("/api", rdLabsChatRouter);

  // D8: Module Settings — admin list/toggle for the "any module off,
  // competitor APIs in" architectural promise. See server/lib/module-gate.ts.
  app.use("/api/modules", modulesRouter);

  // Schedule file upload (gated via module-gate: schedule)
  app.use("/api/upload-schedule", requireModuleEnabled("schedule"), uploadScheduleRouter);

  // Schedule data fetching (gated)
  app.use("/api/schedule", requireModuleEnabled("schedule"), scheduleRouter);

  // Real-time schedule data with Supabase integration (gated)
  app.use("/api/schedule-realtime", requireModuleEnabled("schedule"), scheduleRealtimeRouter);

  // Payroll endpoints
  app.use("/api/payroll", payrollRouter);

  // Payroll reconciliation endpoints
  app.use("/api/v1/payroll", payrollReconciliationRouter);

  // Shift Swapping Marketplace
  app.use("/api/shift-swap", shiftSwapMarketplaceRouter);
  console.log("[SHIFT-SWAP] Marketplace router registered");

  // Labor Compliance
  app.use("/api/compliance", laborComplianceRouter);
  console.log("[COMPLIANCE] Compliance router registered");

  // Payroll Integration (Gusto, ADP, 7shifts)
  app.use("/api/payroll-integration", payrollIntegrationRouter);
  console.log("[PAYROLL-INTEGRATION] Payroll integration router registered");

  // Enhanced Forecasting
  app.use("/api/forecasting", enhancedForecastingRouter);
  console.log("[FORECASTING] Enhanced forecasting router registered");

  // Maestro file upload
  app.use("/api/upload-maestro", uploadMaestroRouter);
  app.use("/api/upload-purchasing", uploadPurchasingRouter);

  // Purchasing data endpoints
  app.use("/api/purchasing", purchasingDataRouter);

  // A4: multi-BEO consolidated purchasing — aggregates demand across every
  // BEO in a lookahead window and emits one PO per supplier instead of one
  // PO per BEO. Mounted on the same /api/purchasing prefix; the router's
  // own paths (/consolidate, /consolidate/preview, /consolidate/recent)
  // disambiguate from the generic CRUD above.
  app.use("/api/purchasing", purchasingConsolidateRouter);

  // A5: Production sheets — generated ~24h before each event by the
  // scheduler that boots in startProductionSheetScheduler() below.
  app.use("/api/production-sheets", productionSheetsRouter);

  // A6: EchoLayout — auto-design from BEO + human approval flow.
  // Registered after the existing Python /api/echolayout (room scanner /
  // templates); these new endpoints live under the same prefix because
  // they're part of the same module.
  app.use("/api/echolayout", requireModuleEnabled("echolayout"), echolayoutDesignsRouter);
  // D5: kitchen-design tab — equipment library + algorithm + persistence (gated: echolayout)
  app.use("/api/echolayout", requireModuleEnabled("echolayout"), echolayoutKitchenRouter);

  // A7: Calendar fan-out — every prospect-to-plate transition flows
  // through this single subscriber, kept in sync via the unified bus.
  app.use("/api/calendar-fanout", calendarFanoutRouter);

  // Supplier Catalog Sync API endpoints
  app.use("/api/supplier-catalog-sync", jwtAuthMiddleware, supplierCatalogSyncRouter);
  console.log("[SUPPLIER-CATALOG-SYNC] Router registered");

  // GTIN Lookup API endpoints
  app.use("/api/gtin-lookup", jwtAuthMiddleware, gtinLookupRouter);
  console.log("[GTIN-LOOKUP] Router registered");

  // Maestro production endpoints (15 wired endpoints for BEO, work orders, purchase orders)
  // app.use("/api/production", maestroProductionRouter); // Requires @vercel/postgres

  // Maestro dashboard metrics endpoints
  app.use("/api/maestro", maestroMetricsRouter);

  // Maestro unified operations system (Changelog, Production, Inventory, Labor, Events)
  // These endpoints form the operational nerve center for banquet management
  app.use("/api/maestro/events", jwtAuthMiddleware, maestroEventsRouter);
  console.log("[MAESTRO] Events router registered");

  app.use("/api/maestro/changelog", jwtAuthMiddleware, maestroChangelogRouter);
  console.log("[MAESTRO] Changelog router registered");

  app.use(
    "/api/maestro/production",
    jwtAuthMiddleware,
    maestroProductionRouter,
  );
  console.log("[MAESTRO] Production router registered");

  app.use("/api/maestro/inventory", jwtAuthMiddleware, maestroInventoryRouter);
  console.log("[MAESTRO] Inventory router registered");

  app.use("/api/maestro/labor", jwtAuthMiddleware, maestroLaborRouter);
  console.log("[MAESTRO] Labor router registered");

  app.use("/api/outlets", jwtAuthMiddleware, maestroOutletsRouter);
  console.log("[MAESTRO] Outlets router registered");

  // Maestro BQT API endpoints (spaces, tasks, changes, shortages, financials, conflicts)
  // Must be registered before /api/events to avoid conflicts
  app.use("/api", maestroBQTApiRouter);
  console.log("[MAESTRO-BQT-API] Router registered");

  // Maestro Banquets API (BEO analyze, scale recipes, prep lists, orders)
  app.use("/api/banquets", jwtAuthMiddleware, maestroBanquetsRouter);
  console.log("[MAESTRO-BANQUETS] Router registered");

  // EchoEventStudio connector for event syncing
  app.use("/api/events", eventStudioConnectorRouter);

  // Schedule 14-day forecasting and auto-scheduling (gated: schedule)
  app.use("/api/schedule-forecasting", requireModuleEnabled("schedule"), scheduleForecasting);

  // System health checks
  app.use("/api/health-check", healthCheckRouter);

  // Module health and validation
  app.use("/api/module-health", moduleHealthRouter);

  // Integration Command Center (enterprise: connections, config, desktop agents; JWT required)
  app.use("/api/integration-command-center", jwtAuthMiddleware, integrationCommandCenterRouter);

  // Sync Health (Moat 1: event bus + single pane reliability)
  app.use("/api/sync-health", jwtAuthMiddleware, syncHealthRouter);

  // Capacity orchestration (Moat 8: reservation + capacity, not just CRM)
  app.use("/api/capacity", jwtAuthMiddleware, capacityOrchestrationRouter);

  // Offline sync (Moat 4: offline-first mobile with sync guarantees)
  app.use("/api/offline-sync", jwtAuthMiddleware, offlineSyncRouter);

  // POS Bridge (Moat 5: unified POS abstraction)
  app.use("/api/pos-bridge", jwtAuthMiddleware, posBridgeRouter);

  // LUCCCA Core (Moat 10: white-label / headless for chains)
  app.use("/api/luccca-core", jwtAuthMiddleware, lucccaCoreRouter);

  // Phase 7.4: Trace Proof API (investor-proof causality reconstruction)
  app.use("/api", traceProofRouter);

  // TraceLedger query endpoints
  app.use("/api", traceLedgerRouter);

  // Phase 8A: Shadow agent supervisor
  app.use("/api", agentSupervisorRouter);

  // Knowledge base endpoints
  app.use("/api/knowledge", knowledgeRouter);
  app.use("/api/metrics", metricsRouter);

  // Data import endpoints (Toast, Square, ZoomShift, MySQL support)
  app.use("/api/data-import", dataImportRouter);

  // Error logging
  app.use("/api", errorLogsRouter);

  // Health check
  app.use("/api", healthRouter);

  // PHASE 1: Employee management endpoints
  app.use("/api/v1/employees", employeeRouter);

  // PHASE 1: Shifts management endpoints
  app.use("/api/v1/shifts", shiftsRouter);

  // PHASE 1: Time tracking endpoints (clock in/out)
  app.use("/api/v1/time-tracking", timeTrackingRouter);

  // PHASE 1: Predictions endpoints (overtime, accuracy, staffing)
  app.use("/api/v1/predictions", predictionsRouter);

  // Integration endpoints (Outlook, Teams, Gmail)
  app.use("/api", integrationsRouter);

  // Translation endpoints
  app.use("/api/translate", translateRouter);

  // Debug endpoints
  app.use("/api", debugRouter);

  // Network chat endpoints
  app.use("/api", chatRouter);

  // Team messaging endpoints
  app.use("/api/messaging", messagingRouter);

  // EchoChat - Full enterprise chat
  app.use("/api/echo-chat", echoChatRouter);

  // EchoStratus - Director/Executive Financial Brain
  const echostratusRouter = await import("./routes/echostratus");
  app.use("/api/stratus", echostratusRouter.default);

  // ML Risk Assessment endpoints
  const mlRiskAssessmentRouter = await import("./routes/ml-risk-assessment");
  app.use("/api/ml-risk-assessment", mlRiskAssessmentRouter.default);

  // Risk Playbook endpoints
  const riskPlaybookRouter = await import("./routes/risk-playbook");
  app.use("/api/risk-playbook", riskPlaybookRouter.default);

  // Security Audit endpoints (admin token required for enterprise compliance)
  try {
    const securityAuditRouter = await import("./routes/security-audit");
    app.use("/api/security-audit", requireAdminToken, jwtAuthMiddleware, securityAuditRouter.default);
    console.log("[SECURITY-AUDIT] Router registered");
  } catch (err) {
    console.warn("[SECURITY-AUDIT] Failed to load:", (err as Error).message);
  }

  // Recipe Search Analytics endpoints (integrated into recipe-search routes)

  // Initialize EchoStratus services
  // Initialize EchoStratus Services
  try {
    const { eventBridgeService } = await import("./services/echostratus/event-bridge.js");
    const { websocketBroadcaster } = await import("./services/echostratus/websocket-broadcaster.js");
    const { aurumIntegrationService } = await import("./services/echostratus/aurum-integration.js");

    // Initialize event bridge
    await eventBridgeService.initialize();
    console.log("[ECHOSTRATUS] Event bridge initialized");

    // Initialize WebSocket broadcaster
    websocketBroadcaster.initialize(httpServer);
    console.log("[ECHOSTRATUS] WebSocket broadcaster initialized");

    // Initialize Aurum integration (non-blocking for server startup)
    aurumIntegrationService.initialize().catch(err => {
      console.error("[ECHOSTRATUS] Aurum integration background initialization failed:", err);
    });
    console.log("[ECHOSTRATUS] Aurum integration starting in background");
  } catch (error) {
    console.error("[ECHOSTRATUS] Service initialization failed:", error);
  }

  // Initialize Twin Materialization Service (process events)
  try {
    await import("./services/echostratus/twin-materialization-service.js");
    await import("./services/echostratus/event-ingestion-service.js");

    // Subscribe to ingested events for twin materialization
    // This will be called after events are ingested
    console.log("[ECHOSTRATUS] Twin materialization service ready");
  } catch (error) {
    console.error("[ECHOSTRATUS] Twin materialization initialization failed:", error);
  }

  // Presentation notes generation
  app.post("/api/presentation/notes", generateNotesHandler);

  // Menu feasibility analysis
  app.post("/api/menu/feasibility", analyzeFeasibilityHandler);

  // Handwriting recognition
  app.post("/api/handwriting/recognize", recognizeHandwritingHandler);

  // Session summarization
  app.post("/api/session/summarize", summarizeSessionHandler);

  // Financial forecasting
  app.post("/api/forecast/financial", forecastFinancialHandler);

  // Layout optimization
  app.post("/api/layout/optimize", optimizeLayoutHandler);

  // Wine pairings
  app.post("/api/wine/pairings", generateWinePairingsHandler);

  // Demand forecasting
  app.post("/api/forecast/demand", generateDemandForecastHandler);

  // PHASE 3: Multi-Property Analytics
  app.post(
    "/api/analytics/multi-property",
    generateMultiPropertyAnalyticsHandler,
  );

  // PHASE 3: Advanced Job Sharing & Skill Assignments
  app.post("/api/job-sharing/advanced", generateJobSharingAnalyticsHandler);

  // PHASE 3: Advanced PTO Management
  app.post("/api/pto/advanced", generatePTOManagementHandler);

  // PHASE 3: Custom Analytics Engine
  app.post("/api/analytics/custom", generateCustomAnalyticsHandler);

  // PHASE 3: Mobile App Enhancements
  app.post("/api/mobile/enhancements", generateMobileEnhancementsHandler);

  // Revenue operations
  app.use("/api/revenue-ops", revenueOpsRouter);

  // Cost management
  app.use("/api/cost-management", costManagementRouter);

  // Inventory management - LUCCCA Framework
  // Core transaction endpoints
  app.use("/api", inventoryReceiptRouter);
  app.use("/api", inventoryTransferRouter);
  app.use("/api", inventoryWasteRouter);
  // Supplementary query endpoints
  app.use("/api/inventory", inventoryRouter);

  // Inventory EchoAI Intelligence
  app.use("/api/inventory-echoai", inventoryEchoAIIntelligenceRouter);
  app.use("/api/edi-monitoring", ediMonitoringRouter);
  console.log("[INVENTORY-ECHOAI] Intelligence router registered");

  // Pastry Banquets API endpoints
  try {
    const mod = (await import("./routes/pastry-banquets")) as {
      default?: Router | RequestHandler;
      pastryBanquetsRouter?: Router | RequestHandler;
      router?: Router | RequestHandler;
    };
    const router = mod?.default || mod?.pastryBanquetsRouter || mod?.router;
    if (router) {
      app.use("/api/pastry", jwtAuthMiddleware, router);
      console.log("[PASTRY-BANQUETS] Router registered");
    } else {
      console.warn("[PASTRY-BANQUETS] Router module loaded but no router export found");
    }
  } catch (err) {
    console.warn("[PASTRY-BANQUETS] Failed to load:", (err as Error).message);
  }

  // Performance Tracking AI API endpoints
  app.use("/api/performance", jwtAuthMiddleware, performanceTrackingAIRouter);
  console.log("[PERFORMANCE-TRACKING-AI] Router registered");

  // Post-Event Evaluations API endpoints
  app.use("/api/performance", jwtAuthMiddleware, postEventEvaluationsRouter);
  console.log("[POST-EVENT-EVALUATIONS] Router registered");

  // High-Volume Scheduling API endpoints (gated: schedule)
  app.use("/api/scheduling", jwtAuthMiddleware, requireModuleEnabled("schedule"), highVolumeSchedulingRouter);
  console.log("[HIGH-VOLUME-SCHEDULING] Router registered");

  // Employee Development API endpoints
  app.use("/api/development", jwtAuthMiddleware, employeeDevelopmentRouter);
  console.log("[EMPLOYEE-DEVELOPMENT] Router registered");

  // Enhanced Notification Service
  try {
    const { enhancedNotificationService } = await import("./services/enhanced-notification-service");
    const io = (globalThis as typeof globalThis & { io?: SocketIOServer }).io;
    if (io) {
      enhancedNotificationService.initialize(io);
      console.log("[ENHANCED-NOTIFICATION] Service initialized");
    }
  } catch (err) {
    console.warn("[ENHANCED-NOTIFICATION] Failed to initialize:", (err as Error).message);
  }

  // Native Collaboration Service
  try {
    const { nativeCollaborationService } = await import("./services/native-collaboration-service");
    const io = (globalThis as typeof globalThis & { io?: SocketIOServer }).io;
    if (io) {
      nativeCollaborationService.initialize(io);
      console.log("[NATIVE-COLLABORATION] Service initialized");
    }
  } catch (err) {
    console.warn("[NATIVE-COLLABORATION] Failed to initialize:", (err as Error).message);
  }

  // Integration Framework API
  try {
    const integrationsRouter = await import("./routes/integrations");
    app.use("/api/integrations", jwtAuthMiddleware, integrationsRouter.default);
    console.log("[INTEGRATIONS] Router registered for Teams/Slack/webhooks");
  } catch (err) {
    console.warn("[INTEGRATIONS] Failed to load:", (err as Error).message);
  }

  // Menu Versioning API
  try {
    const menuVersioningRouter = await import("./routes/menu-versioning");
    app.use("/api/menu-versioning", jwtAuthMiddleware, menuVersioningRouter.default);
    console.log("[MENU-VERSIONING] Router registered for version comparison");
  } catch (err) {
    console.warn("[MENU-VERSIONING] Failed to load:", (err as Error).message);
  }

  // Client Import API
  try {
    const clientImportRouter = await import("./routes/client-import");
    // Client Import endpoints use requireAuth internally (JWT or Phase-0 X-Org-ID)
    app.use("/api/client-import", clientImportRouter.default);
    console.log("[CLIENT-IMPORT] Router registered for CSV/Excel import");
  } catch (err) {
    console.warn("[CLIENT-IMPORT] Failed to load:", (err as Error).message);
  }

  // Enhanced Guardian AI API
  try {
    const guardianAIRouter = await import("./routes/guardian-ai");
    app.use("/api/guardian", requireAdminToken, jwtAuthMiddleware, guardianAIRouter.default);
    console.log("[GUARDIAN-AI] Router registered for 4-Layer AI Guardian validation");
  } catch (err) {
    console.warn("[GUARDIAN-AI] Failed to load:", (err as Error).message);
  }

  // Industry-Leading Payroll API
  try {
    const payrollRouter = await import("./routes/payroll");
    app.use("/api/payroll", requireAdminToken, jwtAuthMiddleware, payrollRouter.default);
    console.log("[PAYROLL] Router registered for industry-leading payroll processing");
  } catch (err) {
    console.warn("[PAYROLL] Failed to load:", (err as Error).message);
  }

  // Guardian AI Next-Generation (Gold Standard)
  try {
    const guardianNextGenRouter = await import("./routes/guardian-ai-nextgen");
    app.use("/api/guardian/nextgen", requireAdminToken, jwtAuthMiddleware, guardianNextGenRouter.default);
    console.log("[GUARDIAN-NEXTGEN] Router registered for gold standard AI Guardian system");
  } catch (err) {
    console.warn("[GUARDIAN-NEXTGEN] Failed to load:", (err as Error).message);
  }

  // Volume Detection API (AI-powered bottle volume scanning)
  app.use("/api/volume", volumeDetectionRouter);

  // Beverage Intelligence API (Wine & Mixology AI Services)
  app.use("/api/beverage", beverageIntelligenceRouter);

  // Quality assurance
  app.use("/api/quality-assurance", qualityAssuranceRouter);

  // Supply chain
  app.use("/api/supply-chain", supplyChainRouter);

  // Voice commands
  app.use("/api/voice-commands", voiceCommandsRouter);
  // D2: thin Whisper-only transcription endpoint for voice-driven inventory
  app.use("/api/voice", voiceTranscribeRouter);
  // D3: PurchasingReceiving workflow routes (delivery, shipments, HACCP,
  // item check-in, discrepancies, summaries, po-lookup, auto-A/P-invoice).
  app.use("/api/receiving", purchasingReceivingRouter);

  // PHASE 4: Avatar Task Execution Engine (Week 3-4)
  app.use("/api/avatar", avatarTasksRouter);

  // Avatar upload and profile picture management
  app.use("/api/avatar", avatarUploadRouter);

  // Avatar voice (transcription, TTS, emotion detection)
  app.use("/api/voice", avatarVoiceRouter);

  // Excel template download/upload for ecosystem control
  app.use("/api/excel-templates", excelTemplatesRouter);

  // Unified canvas
  app.use("/api/unified-canvas", unifiedCanvasRouter);

  // AI Cooking Assistant
  // app.use("/api/ai-cooking-assistant", aiCookingAssistantRouter); // TEMPORARILY DISABLED

  // Auto Scheduling (gated: schedule)
  app.use("/api/auto-scheduling", requireModuleEnabled("schedule"), autoSchedulingRouter);

  // Staff Optimization
  app.use("/api/staffing", staffOptimizationRouter);

  // BEO Lifecycle integrations (staff push, requisition, prep list) — register before staff-needs so /push is handled
  app.use("/api", beoIntegrationsRouter);

  // Staff Needs Pipeline — operational mapping for decision makers and Schedule (GET operational-mapping, POST run-pipeline)
  app.use("/api/staff-needs", staffNeedsRouter);

  // Guest Experience (General Module)
  app.use("/api/guest-experience", guestExperienceRouter);

  // Supply Chain (General Module - takes precedence over Phase 8)
  // Note: Phase 8 route registered later as fallback
  app.use("/api/supply-chain", supplyChainRouter);

  // Voice Commands (General Module)
  app.use("/api/voice-commands", voiceCommandsRouter);

  // Unified Canvas (General Module)
  app.use("/api/unified-canvas", unifiedCanvasRouter);

  // Predictive Maintenance (General Module)
  app.use("/api/predictive-maintenance", predictiveMaintenanceRouter);

  // Template Marketplace
  app.use("/api/template-marketplace", templateMarketplaceRouter);

  // Supplier Network
  app.use("/api/supplier-network", supplierNetworkRouter);

  // Data Collective & Benchmarking
  app.use("/api/data-collective", dataCollectiveRouter);

  // Custom Analytics
  app.use("/api/analytics/custom", customAnalyticsRouter);

  // CRM
  app.use("/api/crm", crmRouter);

  // Phase 3: Job Sharing & Skill-Based Assignments
  app.use("/api/job-sharing", jobSharingRouter);
  // app.use("/api/job-sharing", jobSharingPlatformRouter); // TEMPORARILY DISABLED

  // Phase 3: Skill-Based Assignment Analytics
  app.use("/api/skill-assignments", skillAssignmentsRouter);

  // Phase 3: PTO Management & Approval Workflow
  app.use("/api/pto", ptoManagementRouter);

  // Dashboard Analytics (aggregates all 12 modules)
  app.use("/api/dashboard-analytics", dashboardAnalyticsRouter);

  // Dashboard Financial (real-time P&L, health grading, RBAC)
  app.use("/api/dashboard/financial", dashboardFinancialRouter);

  // Echo AI Financial Integration
  app.use("/api/echo", echoFinancialRouter);

  // EchoAurum Authentication (personas, session management)
  app.use("/api", aurumAuthRouter);

  // EchoAurum Console (overview + notifications)
  app.use("/api", aurumConsoleRouter);

  // EchoAurum Enterprise workflows (AP, Purchasing, Variance Insights)
  app.use("/api", aurumEnterpriseRouter);

  // EchoAurum Approval Workflows (gated: aurum)
  app.use("/api/aurum/approvals", requireModuleEnabled("aurum"), aurumApprovalsRouter);

  // EchoAurum Integrations (Inventory, Scheduling, Revenue, Bank Feed, Custom Reports)
  // (gated: aurum) — when off, customer's QuickBooks/Xero adapter takes over.
  app.use("/api/aurum", requireModuleEnabled("aurum"), aurumIntegrationsRouter);

  // Financial Data Query (flexible metric selection for custom widgets and Echo AI)
  app.use("/api/financial-data-query", financialDataQueryRouter);

  // PHASE 7: Advanced Analytics & Executive Dashboards
  app.use("/api/analytics", phase7AnalyticsRouter);

  // PHASE 8: Supply Chain Management
  app.use("/api/supply-chain", phase8SupplyChainRouter);

  // PHASE 9: HR/Payroll Integration
  app.use("/api/hr", phase9HRPayrollRouter);

  // PHASE 10: Guest Experience Management
  app.use("/api/guest-experience", guestExperienceRouter);
  app.use("/api/phase-10-guest-experience", phase10GuestExperienceRouter);

  // Space Governance & Conflict Management (BUILD 12-20)
  app.use("/api/conflicts", conflictsRouter);
  app.use("/api/governance", governanceRouter);
  app.use("/api/space-locks", spaceLocksRouter);

  // Event Management (BUILD 22-24)
  app.use("/api", eventsRouter);

  // Echo Help System (Skill Tracking & Telemetry)
  app.use("/api/help", helpRouter);

  // Calendar Engine APIs (BUILDS 43-47)
  app.post("/api/calendar/sla-evaluate", evaluateSLAHandler);
  app.post("/api/calendar/simulate-reschedule", rescheduleSimulatorHandler);
  app.post("/api/calendar/cascading-impact", cascadingImpactHandler);
  app.post("/api/calendar/weekly-digest", weeklyDigestHandler);
  app.get("/api/calendar/health", calendarHealthHandler);

  // ALICE Facilities Management Integration (BUILD 10 Enhancement)
  app.use("/api/alice", aliceRouter);

  // Audit Log API (BUILD 20)
  app.get("/api/audit", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(String(req.query.limit ?? "200"), 10);
      const entries = getAuditEntries(limit);
      res.json(entries);
    } catch {
      res.status(500).json({ error: "Failed to fetch audit log" });
    }
  });


  // Serve import archives
  app.use(
    "/archives",
    express.static(path.join(process.cwd(), "client", "imports-archive")),
  );

  // TAR helpers
  app.post("/api/tar/remote", async (req: Request, res: Response, next: NextFunction) => {
    const { handleTarRemote } = await import("./routes/tar");
    return handleTarRemote(req, res, next);
  });

  // Logs
  app.post("/api/logs/append", async (req: Request, res: Response, next: NextFunction) => {
    const { handleLogAppend } = await import("./routes/logs");
    return handleLogAppend(req, res, next);
  });
  app.get("/api/logs/search", async (req: Request, res: Response, next: NextFunction) => {
    const { handleLogSearch } = await import("./routes/logs");
    return handleLogSearch(req, res, next);
  });

  // Seed packaging
  app.post("/api/seed/package", async (req: Request, res: Response, next: NextFunction) => {
    const { handleSeedPackage } = await import("./routes/seed-package");
    return handleSeedPackage(req, res, next);
  });

  // Guard endpoints
  app.get("/api/guard/status", async (req: Request, res: Response, next: NextFunction) => {
    const { handleGuardStatus } = await import("./routes/guard");
    return handleGuardStatus(req, res, next);
  });
  app.post("/api/guard/event", async (req: Request, res: Response, next: NextFunction) => {
    const { handleGuardEvent } = await import("./routes/guard");
    return handleGuardEvent(req, res, next);
  });
  app.get("/api/guard/ip", async (req: Request, res: Response, next: NextFunction) => {
    const { handleGuardIp } = await import("./routes/guard");
    return handleGuardIp(req, res, next);
  });

  // SPA Fallback: In non-production, proxy to the Vite dev server.
  // In production, serve from dist.
  if (process.env.NODE_ENV !== "production") {
    const viteOrigin = "http://127.0.0.1:8081";

    app.use(async (req: Request, res: Response) => {
      try {
        const viteUrl = `${viteOrigin}${req.originalUrl}`;
        const response = await fetch(viteUrl);

        // If Vite returns a response, forward it (including non-2xx).
        response.headers.forEach((value, key) => {
          if (key !== "content-length") {
            res.setHeader(key, value);
          }
        });

        res.status(response.status);
        const buf = Buffer.from(await response.arrayBuffer());
        return res.send(buf);
      } catch (err) {
        // Avoid Express default 404 "Cannot GET /" which is confusing.
        const message = err instanceof Error ? err.message : "Unknown error";
        return res.status(502).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dev server starting…</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; }
      code { background: #f4f4f5; padding: 2px 6px; border-radius: 6px; }
      .box { border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px; max-width: 720px; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>Frontend not reachable yet</h1>
      <p>The backend is up, but the Vite frontend dev server isn't reachable at <code>${viteOrigin}</code>.</p>
      <p><strong>Error:</strong> <code>${message.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</code></p>
      <p>Once Vite starts successfully, refresh this page.</p>
    </div>
  </body>
</html>`);
      }
    });
  } else {
    // Production: Serve the built SPA from dist/spa.
    // IMPORTANT: Never fall back to /client/index.tsx here, since there's no Vite compiler in production.
    const distSpaPath = path.join(import.meta.dirname, "../spa");
    const indexPath = path.join(distSpaPath, "index.html");

    if (fs.existsSync(indexPath)) {
      // Serve static assets (assets/, chunks/, manifest, etc.)
      app.use(
        express.static(distSpaPath, {
          index: false,
        }),
      );

      // React Router fallback (only for non-API routes)
      app.get(/.*/, (req: Request, res: Response) => {
        if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
          return res.status(404).json({ error: "API endpoint not found" });
        }

        return res.sendFile(indexPath);
      });
    } else {
      // If the SPA build is missing, return a clear error page instead of a broken dev entrypoint.
      app.get(/.*/, (req: Request, res: Response) => {
        if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
          return res.status(404).json({ error: "API endpoint not found" });
        }

        return res.status(500).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Build missing</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; }
      .box { border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px; max-width: 860px; }
      code { background: #f4f4f5; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>Frontend build not found</h1>
      <p>The server is running in <strong>production</strong> mode, but the built SPA files are missing.</p>
      <p>Expected to find: <code>${indexPath.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</code></p>
      <p>This usually means the deployment did not run the client build step or did not ship <code>dist/spa</code> artifacts.</p>
    </div>
  </body>
</html>`);
      });
    }
  }

  // PHASE 0: Global error handler
  // Must be registered LAST, after all routes
  app.use(globalErrorHandler);

  // Add Sentry error handler (must be last middleware)
  try {
    sentryErrorHandler(app);
  } catch (err) {
    console.error("[SENTRY] Failed to add error handler:", err);
  }

  // A5: Start the 24h production-sheet scheduler. Idempotent if called
  // twice; respects PRODUCTION_SHEET_SCHEDULER=off for tests/CI.
  try {
    startProductionSheetScheduler();
  } catch (err) {
    console.error("[ProductionSheet] Failed to start scheduler:", err);
  }

  // A7: Start the calendar fan-out bus subscription. Every lifecycle
  // transition now writes to calendar_events through this single point.
  try {
    startCalendarFanoutSubscription();
  } catch (err) {
    console.error("[CalendarFanout] Failed to start subscription:", err);
  }

  // Return both: app for adding routes in node-build, server for listening (httpServer has WebSockets)
  return { app, server: httpServer || app };
}
