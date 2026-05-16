import React from "react";
import { moduleCache } from "./module-cache";
import type { PanelKey } from "./panel-types";
export { PANEL_METADATA, getAllPanels, getPanelMetadata, getDefaultPanelDimensions } from "./panel-metadata";
export type { PanelKey, PanelMetadata } from "./panel-types";

export interface PanelRegistry {
  [key: string]: () => Promise<{ default: React.ComponentType<any> }>;
}

/**
 * Preload a module in the background during idle time
 * Helps reduce loading delay when user opens the panel
 */
export const preloadModule = (panelKey: PanelKey) => {
  if (typeof window === "undefined") return;

  const loader = PANEL_REGISTRY[panelKey];
  if (!loader) return;

  // Use moduleCache for optimized preloading
  moduleCache.preload(panelKey, loader);
};

/**
 * Panel priority levels for restoration
 * Determines when a panel should be loaded during startup
 */
export const PANEL_PRIORITIES: Record<PanelKey, "critical" | "high" | "medium" | "low"> = {
  // Critical: Load immediately for user interaction
  dashboard: "critical",

  // High priority: Core workflows
  culinary: "high",
  schedule: "high",
  inventory: "high",
  maestro: "high",
  ekg: "high",

  // Medium priority: Important but less critical
  pastry: "medium",
  "maestro-dashboard": "medium",
  "maestro-bqt": "medium",
  "forecast-hub": "medium",
  "labor-command-center": "medium",
  "genesis-a": "medium",
  "genesis-b": "medium",
  "genesis-c": "medium",

  // Low priority: Everything else
  "genesis-d": "low",
  "genesis-e": "low",
  "genesis-f": "low",
  "genesis-g": "low",
  "genesis-h": "low",
  chefnet: "low",
  support: "low",
  whiteboard: "low",
  video: "low",
  collaboration: "low",
  studio: "low",
  notes: "low",
  aurum: "low",
  layout: "low",
  events: "low",
  wine: "low",
  stratus: "low",
  demand: "low",
  pricing: "low",
  staffing: "low",
  scheduling: "low",
  revenue: "low",
  costs: "low",
  qa: "low",
  guest: "low",
  supply: "low",
  voice: "low",
  canvas: "low",
  "ai-chef": "low",
  maintenance: "low",
  templates: "low",
  network: "low",
  benchmark: "low",
  zaro: "low",
  "multi-property": "low",
  "job-sharing": "low",
  pto: "low",
  analytics: "low",
  mobile: "low",
  "echo-chat": "low",
  "echo-events": "low",
  "echowaste": "low",
  "global-calendar": "low",
  "change-feed": "low",
  "os-bus-debug": "low",
  "module-status": "low",
  "module-diagnostics": "low",
  "trace-viewer": "low",
  "reconciliation-dashboard": "low",
  "safety-controls": "low",
  "allergen-impact-viewer": "low",
  "why-changed": "low",
  "cognitive-replay": "low",
  "finance-explainability": "low",
  "purchasing-receiving": "low",
  "integration-command-center": "low",
  "mixology-sommelier": "low",
  notifications: "low",
  "notification-center": "low",
  waitlist: "low",
  "waitlist-management": "low",
  "client-import": "low",
  "client-data-import": "low",
  onboarding: "low",
  "onboarding-wizard": "low",
  "beo-execution": "low",
  "beo-workflow": "low",
  "panel-system": "low",
  "panel-verification": "low",
  "ux-optimization": "low",
  "security-compliance": "low",
  security: "low",
  "maestro-banquets": "low",
  banquets: "low",
  engineering: "low",
  "engineering-hvac": "low",
  "recipe-library": "low",
  "optimized-orders": "low",
  "procurement-plan": "low",
  "echo-advisory": "low",
  "group-intelligence": "low",
  "inventory-mini": "low",
  "inventory-health-leaderboard": "low",
  "inventory-rewards": "low",
  genesis_single_queue_ops: "low",
  genesis_auth_permissions: "low",
  genesis_rewards: "low",
  genesis_handshake_inspector: "low",
  genesis_onboarding: "low",
  genesis_internal_fulfillment_queue: "low",
  genesis_c_procurement: "low",
  genesis_d_cost_admin: "low",
  genesis_f_vendor_calendar: "low",
  genesis_demo_walkthrough: "low",
  genesis_echo_why: "low",
  "hr-payroll": "low",
  "group-resume-print": "low",
  "production-sheet": "low",
  "purchasing-plan": "low",
  "labor-plan": "low",
  "maestroBqt.list": "low",
  "maestroBqt.builder": "low",
  "maestroBqt.productionTimeline": "low",
  "maestroBqt.orders": "low",
  "maestroBqt.changeFeed": "low",
  "maestroBqt.changeNotifications": "low",
  "maestroBqt.traceDrawer": "low",
  "echo-canva-cake-order": "low",
  "echo-canva-design-editor": "low",
  "performance-tracking": "low",
  "enhanced-performance": "low",
  "ai-schedule-generator": "low",
  "beo-schedule-integration": "low",
  "high-volume-scheduling": "low",
  "shortage-forecast": "low",
  "job-share-management": "low",
  "outlet-demand-forecast": "low",
  "plate-costing": "medium",
  "ai3-intelligence": "high",
  "echoai3-canvas": "critical",
  "branch-explorer": "high",
  "confidence-panel": "high",
  "zaro-guardian": "critical",
  "ingestion-panel": "high",
  "supplier-catalog": "medium",
  "convention-management": "medium",
  "energy-tracking": "medium",
  "invoice-ocr": "medium",
  "weather-forecast": "high",
  "admin-onboarding": "high",
  "fresh-meal-systems": "medium",
  "activity-timeline": "medium",
  "cafeteria": "medium",
  "fix-menu": "medium",
  "micro-market": "medium",
  "mobile-order": "medium",
  "revenue-intelligence": "medium",
  "yield-alerts": "medium",
  "district-benchmarking": "medium",
  "pos-gl-hub": "medium",
  "live-layout": "medium",
  "vr-walkthrough": "medium",
  "purchasing-hub": "medium",
  "event-brief": "medium",
  "event-cost-tracker": "medium",
  "financial-ops": "high",
  "manager-dashboard": "high",
  "vendor-intel": "high",
  "budget-center": "high",
  "executive-command": "high",
  "admin-command": "high",
  "admin-console": "high",
  "system-updates": "high",
  "desktop-installers": "medium",
  "it-operations": "high",
  "audit-security": "high",
  "feature-flags": "high",
  "tech-support": "medium",
  "purchrec-sprint1": "high",
  "vendor-scorecard": "high",
  "beo-planner": "high",
  "ird-builder": "high",
  "spa-builder": "high",
  "engineering-dash": "high",
  "dept-dashboard": "high",
  "analytics-engine": "high",
  "spa-wellness": "high",
  "spa-services-mgr": "high",
  "spa-pamphlet": "normal",
  "spa-command": "high",
  "pos-adapter": "normal",
  "concierge-liability": "high",
  "spa-schedule-intel": "high",
  "eng-command": "high",
  "hskp-command": "high",
  "concierge-hub": "high",
  "foh-command": "high",
  "foh-concierge-hub": "medium",
  "echo-concierge": "high",
  "daily-standup": "high",
  "people-admin": "high",
  "concierge-mobile-admin": "high",
  "daily-briefing-admin": "high",
  "role-assigner": "high",
  "settings-overhaul": "high",
  "luccca-jarvis-dashboard": "high",
  "lifestyle-dashboard": "high",
  "relay": "high",
  "my-schedule": "high",
  "appearance-settings": "high",
  "guest360-hub": "high",
  "ird-hub": "high",
  "aurium-gm": "high",
  "stratus-forecast": "high",
  "kds-expo": "high",
  "pattern-intelligence": "high",
  "cake-viewer": "medium",
  "eng-work-tickets": "high",
  "integration-control": "high",
  "guest-booking": "high",
  "echo-connect": "high",
  "foh-operations": "high",
  "retail-ops": "high",
  "guest-360": "high",
  "housekeeping": "high",
  "minibar-ird": "high",
  "kitchen-routing": "medium",
  "menu-design-studio": "medium",
  "food-gallery": "low",
  "dish-assembly": "medium",
  "guest-intelligence": "high",
  "gm-flash-report": "high",
  "chef-daily-report": "high",
  "chef-outlet-dashboard": "high",
  "beo-timeline-ui": "high",
  "forecast-21day": "high",
  "enterprise-bi-suite": "high",
  "performance-intelligence": "high",
  "chef-gio-training": "high",
  "chef-carissa-training": "high",
  "vip-admin-desktop": "high",
  "manager-workflow": "high",
  "reports-hub": "high",
  "kitchen-war-room": "high",
  "kitchen-fire-expo": "high",
  "commissary-ordering": "high",
  "qr-scanner": "high",
  "beo-menu-builder": "high",
  "mixology-rd-lab": "high",
  "pos-router": "high",
  "outlet-menus": "high",
  "ops-forecast": "high",
  "group-resume": "high",
  "purchasing-engine": "high",
  "culinary-recipe-builder": "high",
  "inventory-receiving": "high",
  "menu-eng-matrix": "high",
  "chronos": "high",
  "schedule": "high",
  "property-pulse": "high",
  "pace-mtd": "medium",
  "cash-runway-deep": "medium",
  "exception-review-daily": "medium",
  "vendor-pareto": "low",
  "cross-property-benchmark": "low",
  "tip-audit-panel": "low",
};

/**
 * CRITICAL: Queue for limiting concurrent module loads
 * Prevents system overload when multiple modules load simultaneously
 */
class ModulePreloadQueue {
  private queue: Array<{ key: PanelKey; loader: () => Promise<{ default: React.ComponentType<any> }> }> = [];
  private loading = 0;
  private maxConcurrent = 1; // CRITICAL: Load only 1 module at a time during startup

  async enqueue(
    key: PanelKey,
    loader: () => Promise<{ default: React.ComponentType<any> }>,
  ) {
    return new Promise<void>((resolve) => {
      this.queue.push({ key, loader });
      this.process().then(() => resolve()).catch(() => resolve());
    });
  }

  private async process() {
    while (this.queue.length > 0 && this.loading < this.maxConcurrent) {
      this.loading++;
      const item = this.queue.shift();
      if (!item) {
        this.loading--;
        continue;
      }

      try {
        // Use moduleCache to handle actual loading with deduplication
        await moduleCache.load(item.key, item.loader);
      } catch (err) {
        console.debug(`[PreloadQueue] Failed to preload ${item.key}:`, err);
      } finally {
        this.loading--;
        // Continue processing remaining items
        if (this.queue.length > 0) {
          this.process().catch(() => {
            // ignore
          });
        }
      }
    }
  }
}

const preloadQueue = new ModulePreloadQueue();

/**
 * Preload critical modules on app startup
 * Called from App.tsx to reduce panel load times
 * CRITICAL: Uses queue to prevent concurrent load overload
 *
 * Enhanced with frequency-based prioritization:
 * - Last active panel loads first
 * - Panels are then sorted by frequency (most used first)
 * - Falls back to static priority list if no frequency data
 */
export const preloadCriticalModules = () => {
  if (typeof window === "undefined") return;

  // 1. Preload dashboard immediately with single load (lightweight)
  preloadModule("dashboard");

  // 2. Load frequency-based priority list
  let frequencyBasedModules: PanelKey[] = [];
  try {
    import("@/lib/panel-persistence").then(({ getPanelLoadingPriority }) => {
      const priorityList = getPanelLoadingPriority();
      frequencyBasedModules = priorityList.filter((key: string) => isValidPanelKey(key)) as PanelKey[];
    }).catch(() => {});
  } catch (err) {
    // Frequency-based loading unavailable – use static fallback
  }

  // 3. Define static critical modules (fallback if no frequency data)
  const staticCriticalModules: PanelKey[] = [
    "culinary",
    "schedule",
    "inventory",
  ];

  // 4. Combine: frequency-based modules first, then static critical modules
  // Remove duplicates while preserving order
  const prioritizedModules = [
    ...frequencyBasedModules,
    ...staticCriticalModules.filter((m) => !frequencyBasedModules.includes(m)),
  ];

  // Take top N modules for critical preload
  const criticalModules = prioritizedModules.slice(0, 3);

  // Stagger critical modules: start after 500ms, space them out
  criticalModules.forEach((key, index) => {
    setTimeout(() => {
      void preloadQueue.enqueue(key, PANEL_REGISTRY[key]);
    }, 500 + index * 1000); // Space out by 1 second each
  });

  // 5. Queue secondary modules for even later loading
  const secondaryModules = prioritizedModules.slice(3, 8);

  // Start secondary preload after critical modules have time to load (5+ seconds)
  setTimeout(() => {
    secondaryModules.forEach((key, index) => {
      setTimeout(() => {
        void preloadQueue.enqueue(key, PANEL_REGISTRY[key]);
      }, index * 1500); // Space out by 1.5 seconds each
    });
  }, 5000);

  if (frequencyBasedModules.length > 0) {
    console.debug(
      "[PANEL-REGISTRY] Using frequency-based preload priority:",
      criticalModules
    );
  }
};

/**
 * Create a safe loader that wraps module imports with error handling
 * Enables graceful degradation if a module fails to load
 * Includes comprehensive diagnostic logging
 */
/**
 * Create a safe loader that wraps module imports with error handling
 * CRITICAL: Minimized to avoid overhead
 */
export const createSafeModuleLoader = (
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
  moduleName: string,
) => {
  return async () => {
    const startTime = Date.now();
    let lastError: Error | null = null;

    // iter204b · Retry dynamic import up to 2x on transient failures (common when
    // the Vite dev server restarts or browser has a stale module hash).
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const module = await importFn();
        const duration = Date.now() - startTime;

        // Validate module has default export
        if (!module || !module.default) {
          throw new Error(
            `Module ${moduleName} missing default export. Exports: ${module ? Object.keys(module).join(", ") : "null"}`
          );
        }

        if (duration > 5000) {
          console.warn(`[PANEL-REGISTRY] Slow module load: ${moduleName} (${duration}ms)`);
        }

        return module;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const isFetchFailure = /Failed to fetch dynamically|Importing a module script failed|ChunkLoadError/i.test(lastError.message);
        if (isFetchFailure && attempt === 0) {
          // Wait then retry (Vite hash may have rotated)
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        break;
      }
    }

    const duration = Date.now() - startTime;
    const errorObj = lastError || new Error("unknown module load failure");

    console.error(
      `[PANEL-REGISTRY] Failed to load ${moduleName} after ${duration}ms:`,
      errorObj.message,
    );

    void (async () => {
      try {
        const { captureException } = await import("@/lib/sentry-init");
        captureException(errorObj, { source: "panel-registry", moduleName });
      } catch { /* Sentry not available */ }
    })();

    const React = await import("react");
    const ErrorComponent = () =>
      React.createElement(
        "div",
        { className: "p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded space-y-3", "data-testid": `panel-load-error-${moduleName}` },
        React.createElement("h3", { className: "font-semibold text-red-900 dark:text-red-300" }, `Error loading ${moduleName}`),
        React.createElement("p", { className: "text-red-800 dark:text-red-200 text-sm font-mono break-all" }, errorObj.message),
        React.createElement(
          "div",
          { className: "flex gap-2" },
          React.createElement(
            "button",
            {
              "data-testid": `panel-reload-${moduleName}`,
              className: "px-3 py-1.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700",
              onClick: () => {
                try {
                  // Clear SW caches + unregister, then hard reload.
                  if (navigator.serviceWorker) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
                  if ((window as any).caches) (window as any).caches.keys().then((ks: string[]) => ks.forEach(k => (window as any).caches.delete(k)));
                } catch {}
                // location.reload(true) deprecated; use bypass query
                window.location.href = window.location.pathname + "?_hardreload=" + Date.now();
              },
            },
            "Reload panel",
          ),
          React.createElement(
            "button",
            {
              className: "px-3 py-1.5 rounded text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600",
              onClick: () => { try { window.location.reload(); } catch {} },
            },
            "Soft refresh",
          ),
        ),
        React.createElement(
          "p",
          { className: "text-[10px] text-red-600 dark:text-red-400" },
          "Usually caused by a stale module hash after a Vite dev-server restart. Clicking \"Reload panel\" clears caches.",
        ),
      );
    (ErrorComponent as any).__moduleLoadFailed = true;
    return { default: ErrorComponent };
  };
};

/**
 * Central registry for all module panels
 * Uses dynamic imports for code splitting
 */
export const PANEL_REGISTRY: PanelRegistry = {
  // dashboard module deleted (D1) — Chronos is the canonical dashboard.
  // The "dashboard" panelId is no longer registered.
  ekg: () => import("@/modules/EKGSystem"),
  culinary: createSafeModuleLoader(
    () => import("@/modules/Culinary"),
    "culinary"
  ),
  maestro: () => import("@/modules/Maestro"),
  "maestro-bqt": createSafeModuleLoader(
    () => import("@/modules/MaestroBQT"),
    "maestro-bqt"
  ),
  "maestro-dashboard": createSafeModuleLoader(
    () => import("@/modules/MaestroDashboard"),
    "maestro-dashboard"
  ),
  pastry: createSafeModuleLoader(
    () => import("@/modules/Pastry"),
    "pastry"
  ),
  schedule: createSafeModuleLoader(
    () => import("@/schedule-panel"),
    "schedule"
  ),
  "performance-tracking": () =>
    import("@/modules/Schedule/client/components/performance/EnhancedPerformanceDashboard"),
  "enhanced-performance": () =>
    import("@/modules/Schedule/client/components/performance/EnhancedPerformanceDashboard"),
  "ai-schedule-generator": () =>
    import("@/modules/Schedule/client/components/ai-schedule-generator/AIScheduleGeneratorPanel"),
  "beo-schedule-integration": () =>
    import("@/modules/Schedule/client/components/beo-schedule-integration/BEOScheduleIntegration"),
  "high-volume-scheduling": () =>
    import("@/modules/Schedule/client/components/high-volume/HighVolumeSchedulingDashboard"),
  "shortage-forecast": () =>
    import("@/modules/Schedule/client/components/shortage-forecast/ShortageForecastDashboard"),
  "job-share-management": () =>
    import("@/modules/Schedule/client/components/job-share/JobShareManagement"),
  "outlet-demand-forecast": () =>
    import("@/modules/Schedule/client/components/outlet-demand/OutletDemandForecast"),
  "forecast-hub": () => import("@/modules/ForecastHub"),
  "trace-viewer": () => import("@/modules/TraceViewer"),
  "reconciliation-dashboard": () => import("@/modules/ReconciliationDashboard"),
  "labor-command-center": () => import("@/modules/LaborCommandCenter"),
  "safety-controls": () => import("@/modules/SafetyControls"),
  "allergen-impact-viewer": () => import("@/modules/AllergenImpactViewer"),
  "why-changed": () => import("@/modules/WhyChanged"),
  "cognitive-replay": () => import("@/modules/CognitiveReplay"),
  "finance-explainability": () => import("@/modules/FinanceExplainability"),
  inventory: createSafeModuleLoader(
    () => import("@/modules/OrderingInventory"),
    "inventory"
  ),
  "purchasing-receiving": createSafeModuleLoader(
    () => import("@/modules/PurchRec"),
    "purchasing-receiving"
  ),
  "integration-command-center": () => import("@/modules/IntegrationCommandCenter/IntegrationCommandCenter"),
  "genesis-a": () => import("@/modules/Genesis/panels/GenesisAPanel"),
  "genesis-b": () => import("@/modules/Genesis/panels/GenesisBPanel"),
  "genesis-c": () => import("@/modules/Genesis/panels/GenesisC_ProcurementPlanPanel"),
  "genesis-d": () => import("@/modules/Genesis/panels/GenesisDPanel"),
  "genesis-e": () => import("@/modules/Genesis/panels/GenesisEPanel"),
  "genesis-e-outlet": () =>
    import("@/modules/Genesis/panels/GenesisEOutletPanel"),
  "genesis-e-commissary": () =>
    import("@/modules/Genesis/panels/GenesisECommissaryPanel"),
  "genesis-f": () => import("@/modules/Genesis/panels/GenesisFPanel"),
  "genesis-g": () => import("@/modules/Genesis/panels/GenesisGPanel"),
  "genesis-h": () => import("@/modules/Genesis/panels/GenesisHPanel"),
  "mixology-sommelier": createSafeModuleLoader(
    () => import("@/modules/MixologySommelier"),
    "mixology-sommelier"
  ),
  chefnet: createSafeModuleLoader(
    () => import("@/modules/ChefNet"),
    "chefnet"
  ),
  support: () => import("@/modules/Support"),
  whiteboard: createSafeModuleLoader(
    () => import("@/modules/Whiteboard"),
    "whiteboard"
  ),
  video: createSafeModuleLoader(
    () => import("@/modules/VideoConference"),
    "video"
  ),
  collaboration: () => import("@/modules/Collaboration"),
  studio: () => import("@/modules/EchoCanvasStudio"),
  notes: () => import("@/modules/StickyNotes"),
  aurum: createSafeModuleLoader(
    () => import("@/modules/EchoAurum/EchoAurumPanel"),
    "aurum"
  ),
  layout: createSafeModuleLoader(
    () => import("@/modules/EchoLayout"),
    "layout"
  ),
  events: createSafeModuleLoader(
    () => import("@/modules/EchoEventStudio"),
    "events"
  ),
  wine: createSafeModuleLoader(
    () => import("@/modules/WineSommelier"),
    "wine"
  ),
  stratus: createSafeModuleLoader(
    () => import("@/modules/EchoStratus"),
    "stratus"
  ),
  demand: () => import("@/modules/DemandForecasting"),
  pricing: () => import("@/modules/DynamicPricing"),
  staffing: () => import("@/modules/StaffOptimization"),
  scheduling: () => import("@/modules/AutoScheduling"),
  revenue: () => import("@/modules/RevenueOps"),
  costs: () => import("@/modules/CostManagement"),
  qa: () => import("@/modules/QualityAssurance"),
  guest: () => import("@/modules/GuestExperience"),
  supply: () => import("@/modules/SupplyChain"),
  voice: () => import("@/modules/VoiceCommands"),
  canvas: () => import("@/modules/UnifiedCanvas"),
  "ai-chef": () => import("@/modules/AICookingAssistant"),
  maintenance: () => import("@/modules/PredictiveMaintenance"),
  templates: () => import("@/modules/TemplateMarketplace"),
  network: () => import("@/modules/SupplierNetwork"),
  benchmark: () => import("@/modules/DataCollective"),
  zaro: () => import("@/modules/Zaro"),
  "multi-property": () => import("@/modules/MultiProperty"),
  "job-sharing": () => import("@/modules/JobSharing"),
  pto: () => import("@/modules/PTOManagement"),
  analytics: () => import("@/modules/CustomAnalytics"),
  mobile: () => import("@/modules/MobileEnhancements"),
  "echo-chat": createSafeModuleLoader(
    () => import("@/components/messaging").then((m) => ({ default: m.EchoChat })),
    "echo-chat"
  ),
  "echo-events": createSafeModuleLoader(
    // iter201 · Switch to the full EchoEventsPanel (CRM/BEO/Gantt/Menus + now
    // Events Report, Scenario Planner, AI Event Brief, Conventions as tabs)
    () => import("@/modules/EchoEvents/EchoEventsPanel"),
    "echo-events"
  ),
  // iter210 · EchoWaste Phase 1+2 (Capture Hub + Entries + Daily Digest)
  "echowaste": createSafeModuleLoader(
    () => import("@/modules/EchoWaste/EchoWastePanel"),
    "echowaste"
  ),
  // iter224 · ECW Operations — Menu Builder with station→item→component editing + publish
  "ecw-menu-builder": createSafeModuleLoader(
    () => import("@/modules/EchoWaste/MenuBuilderPanel"),
    "ecw-menu-builder"
  ),
  // iter224·phase2 · ECW Procurement Hub — mobile requisitions → PO → receive
  "ecw-procurement": createSafeModuleLoader(
    () => import("@/modules/EchoWaste/ProcurementPanel"),
    "ecw-procurement"
  ),
  "global-calendar": createSafeModuleLoader(
    // iter202a · Switch to the new unified calendar (single feed across ALL depts)
    () => import("@/modules/GlobalCalendar/UnifiedCalendarPanel"),
    "global-calendar"
  ),
  "change-feed": () =>
    import("@/modules/MaestroBQT/components/ChangeFeed").then((m) => ({
      default: m.ChangeFeed,
    })),
  "os-bus-debug": () => import("@/components/debug/OSBusDebugPanel"),
  "module-status": createSafeModuleLoader(
    () => import("@/components/debug/ModuleStatusDashboard").then((m) => ({ default: m.default })),
    "module-status"
  ),
  "module-diagnostics": createSafeModuleLoader(
    () => import("@/components/debug/ModuleStatusDashboard").then((m) => ({ default: m.default })),
    "module-diagnostics"
  ),
  "echo-canva-cake-order": () => import("@/modules/echo-canva-cake-order"),
  "echo-canva-design-editor": () =>
    import("@/modules/echo-canva-design-editor"),
  "hr-payroll": () => import("@/modules/Phase9HRPayroll"),
  "group-resume-print": () =>
    import("@/modules/EchoEventStudio/client/components/GroupResumePrintView"),
  "production-sheet": () =>
    import("@/modules/MaestroBQT/components/ProductionSheetPanel"),
  "purchasing-plan": () =>
    import("@/modules/MaestroBQT/components/PurchasePlanPanel"),
  "labor-plan": () => import("@/modules/MaestroBQT/components/LaborPlanPanel"),
  // MaestroBQT Genesis Integration Panels
  "maestroBqt.list": () => import("@/modules/MaestroBQT"),
  "maestroBqt.builder": () => import("@/modules/MaestroBQT"),
  "maestroBqt.productionTimeline": () =>
    import("@/modules/MaestroBQT/components/MultiBEOProductionTimeline").then((m) => ({
      default: m.MultiBEOProductionTimeline,
    })),
  "maestroBqt.orders": () =>
    import("@/modules/MaestroBQT/components/OrdersPanel").then((m) => ({
      default: m.OrdersPanel,
    })),
  "maestroBqt.changeFeed": () =>
    import("@/modules/MaestroBQT/components/ChangeFeed").then((m) => ({
      default: m.ChangeFeed,
    })),
  "maestroBqt.changeNotifications": () =>
    import("@/modules/MaestroBQT/components/ChangeNotifications").then((m) => ({
      default: m.ChangeNotifications,
    })),
  "maestroBqt.traceDrawer": () =>
    import("@/modules/MaestroBQT/components/TraceDrawer").then((m) => ({
      default: m.TraceDrawer,
    })),
  engineering: () => import("@/modules/Engineering"),
  "engineering-hvac": () => import("@/modules/Engineering"),
  "recipe-library": () =>
    import("@/modules/KitchenLibrary/components/RecipePanel"),
  "optimized-orders": () =>
    import("@/modules/Purchasing/components/OptimizedOrderPanel"),
  "procurement-plan": () =>
    import("@/modules/Purchasing/components/ProcurementPlanPanel"),
  "echo-advisory": () => import("@/modules/Echo/components/EchoAdvisoryPanel"),
  "group-intelligence": () =>
    import("@/modules/MaestroBQT/components/GroupIntelligencePanel"),
  "inventory-mini": () => import("@/modules/Genesis/panels/InventoryMiniPanel"),
  // iter266.10 · Standalone ingredient cost lookup panel under Ordering & Inventory
  "ingredient-cost-lookup": () => import("@/modules/IngredientCostLookup"),
  "inventory-health-leaderboard": () =>
    import("@/modules/Genesis/panels/InventoryHealthLeaderboardPanel"),
  "inventory-rewards": () =>
    import("@/modules/Genesis/panels/InventoryRewardsPanel"),
  genesis_single_queue_ops: () =>
    import("@/modules/Genesis/panels/GenesisSingleQueueOpsPanel"),
  genesis_auth_permissions: () =>
    import("@/modules/Genesis/panels/GenesisAuthAndPermissionsPanel"),
  genesis_rewards: () => import("@/modules/Genesis/panels/GenesisRewardsPanel"),
  genesis_handshake_inspector: () =>
    import("@/modules/Genesis/panels/GenesisHandshakeInspectorPanel"),
  genesis_onboarding: () =>
    import("@/modules/Genesis/panels/GenesisOnboardingPanel"),
  genesis_internal_fulfillment_queue: () =>
    import("@/modules/Genesis/panels/InternalFulfillmentQueuePanel"),
  genesis_c_procurement: () =>
    import("@/modules/Genesis/panels/GenesisC_ProcurementPlanPanel"),
  genesis_d_cost_admin: () =>
    import("@/modules/Genesis/panels/GenesisD_CostAttributionAdminPanel"),
  genesis_f_vendor_calendar: () =>
    import("@/modules/Genesis/panels/GenesisF_VendorDropsCalendarPanel"),
  genesis_demo_walkthrough: () =>
    import("@/modules/Genesis/panels/GenesisDemoWalkthroughPanel"),
  genesis_echo_why: () => import("@/modules/Genesis/panels/EchoWhyPanel"),
  notifications: () => import("@/modules/Notifications"),
  "notification-center": () => import("@/modules/Notifications"),
  waitlist: () => import("@/modules/Waitlist"),
  "waitlist-management": () => import("@/modules/Waitlist"),
  "client-import": () => import("@/modules/ClientImport"),
  "client-data-import": () => import("@/modules/ClientImport"),
  onboarding: () => import("@/modules/Onboarding"),
  "onboarding-wizard": () => import("@/modules/Onboarding"),
  "beo-execution": () => import("@/modules/BEOExecution"),
  "beo-workflow": () => import("@/modules/BEOExecution"),
  "panel-system": () => import("@/modules/PanelSystemEnhancements"),
  "panel-verification": () => import("@/modules/PanelSystemEnhancements"),
  "ux-optimization": () => import("@/modules/UXOptimization"),
  "security-compliance": () => import("@/modules/SecurityCompliance"),
  security: () => import("@/modules/SecurityCompliance"),
  "maestro-banquets": () => import("@/modules/MaestroBanquets"),
  banquets: () => import("@/modules/MaestroBanquets"),
  "plate-costing": () => import("@/modules/PlateCostingDashboard"),
  "ai3-intelligence": () => import("@/modules/EchoAi3Canvas"),
  "echoai3-canvas": () => import("@/modules/EchoAi3Canvas"),
  "branch-explorer": () => import("@/modules/BranchExplorer"),
  "confidence-panel": () => import("@/modules/ConfidencePanel"),
  "zaro-guardian": () => import("@/modules/ZAROGuardian"),
  "ingestion-panel": () => import("@/modules/IngestionPanel"),
  "supplier-catalog": () => import("@/modules/SupplierCatalog"),
  "convention-management": () => import("@/modules/ConventionManagement"),
  "energy-tracking": () => import("@/modules/EnergyTracking"),
  "invoice-ocr": () => import("@/modules/InvoiceOCR"),
  "weather-forecast": () => import("@/modules/WeatherForecast"),
  "admin-onboarding": () => import("@/modules/AdminOnboarding"),
  "echo-events-report": () => import("@/modules/EchoEvents"),
  "waste-sheet": () => import("@/modules/WasteSheet"),
  "menu-engineering": createSafeModuleLoader(() => import("@/modules/MenuEngineering"), "menu-engineering"),
  "pos-menu-analytics": createSafeModuleLoader(() => import("@/modules/POSMenuAnalytics"), "pos-menu-analytics"),
  "pos-connector": () => import("@/modules/POSConnector"),
  "gl-sync": () => import("@/modules/GLSync"),
  "banquet-intelligence": createSafeModuleLoader(
    () => import("@/modules/BanquetIntelligence"),
    "banquet-intelligence"
  ),
  "scenario-planner": createSafeModuleLoader(
    () => import("@/modules/ScenarioPlanner"),
    "scenario-planner"
  ),
  "menu-ingest": createSafeModuleLoader(
    () => import("@/modules/MenuIngest"),
    "menu-ingest"
  ),
  "client-portal": createSafeModuleLoader(
    () => import("@/modules/ClientPortal"),
    "client-portal"
  ),
  "fresh-meal-systems": createSafeModuleLoader(
    () => import("@/modules/FreshMealSystems"),
    "fresh-meal-systems"
  ),
  "activity-timeline": createSafeModuleLoader(
    () => import("@/modules/ActivityTimeline"),
    "activity-timeline"
  ),
  "cafeteria": createSafeModuleLoader(
    () => import("@/modules/Cafeteria"),
    "cafeteria"
  ),
  "fix-menu": createSafeModuleLoader(
    () => import("@/modules/FixMyMenu"),
    "fix-menu"
  ),
  "micro-market": createSafeModuleLoader(
    () => import("@/modules/MicroMarket"),
    "micro-market"
  ),
  "mobile-order": createSafeModuleLoader(
    () => import("@/modules/MobileOrder"),
    "mobile-order"
  ),
  "revenue-intelligence": createSafeModuleLoader(
    () => import("@/modules/RevenueIntelligence"),
    "revenue-intelligence"
  ),
  "yield-alerts": createSafeModuleLoader(
    () => import("@/modules/YieldAlerts"),
    "yield-alerts"
  ),
  "district-benchmarking": createSafeModuleLoader(
    () => import("@/modules/DistrictBenchmarking"),
    "district-benchmarking"
  ),
  "pos-gl-hub": createSafeModuleLoader(
    () => import("@/modules/PosGlHub"),
    "pos-gl-hub"
  ),
  "live-layout": createSafeModuleLoader(
    () => import("@/modules/LiveLayout"),
    "live-layout"
  ),
  "vr-walkthrough": createSafeModuleLoader(
    () => import("@/modules/VrWalkthrough"),
    "vr-walkthrough"
  ),
  "purchasing-hub": createSafeModuleLoader(
    () => import("@/modules/PurchasingHub"),
    "purchasing-hub"
  ),
  "event-brief": createSafeModuleLoader(
    () => import("@/modules/EventBrief"),
    "event-brief"
  ),
  "event-cost-tracker": createSafeModuleLoader(
    () => import("@/modules/EventCostTracker"),
    "event-cost-tracker"
  ),
  "financial-ops": createSafeModuleLoader(
    () => import("@/modules/FinancialOps"),
    "financial-ops"
  ),
  "manager-dashboard": createSafeModuleLoader(
    () => import("@/modules/ManagerDashboard"),
    "manager-dashboard"
  ),
  "vendor-intel": createSafeModuleLoader(
    () => import("@/modules/VendorIntel"),
    "vendor-intel"
  ),
  "budget-center": createSafeModuleLoader(
    () => import("@/modules/BudgetCenter"),
    "budget-center"
  ),
  "executive-command": createSafeModuleLoader(
    () => import("@/modules/ExecutiveCommand"),
    "executive-command"
  ),
  "admin-command": createSafeModuleLoader(
    () => import("@/modules/AdminCommand"),
    "admin-command"
  ),
  // iter263 · New Admin Console + stubs for satellite panels that live in
  // the console's tabs but may later become standalone panels.
  "admin-console": createSafeModuleLoader(
    () => import("@/modules/AdminConsole"),
    "admin-console"
  ),
  "system-updates": createSafeModuleLoader(
    () => import("@/modules/AdminConsole"),
    "system-updates"
  ),
  "desktop-installers": createSafeModuleLoader(
    () => import("@/modules/AdminConsole"),
    "desktop-installers"
  ),
  "it-operations": createSafeModuleLoader(
    () => import("@/modules/AdminConsole"),
    "it-operations"
  ),
  "audit-security": createSafeModuleLoader(
    () => import("@/modules/AdminConsole"),
    "audit-security"
  ),
  "feature-flags": createSafeModuleLoader(
    () => import("@/modules/AdminConsole"),
    "feature-flags"
  ),
  "tech-support": createSafeModuleLoader(
    () => import("@/modules/AdminConsole"),
    "tech-support"
  ),
  // iter263 · PurchRec Sprint 1 — 3-way match + par-driven auto-PO
  "purchrec-sprint1": createSafeModuleLoader(
    () => import("@/modules/PurchRec/Sprint1"),
    "purchrec-sprint1"
  ),
  // iter263.2 · Sprint 2 + BEO Auto-Planner
  "vendor-scorecard": createSafeModuleLoader(
    () => import("@/modules/PurchRec/Sprint2VendorScorecard"),
    "vendor-scorecard"
  ),
  "beo-planner": createSafeModuleLoader(
    () => import("@/modules/BeoPlanner"),
    "beo-planner"
  ),
  // iter263.4 · IRD + Spa Menu Builders (with public guest pages)
  "ird-builder": createSafeModuleLoader(
    () => import("@/modules/IRDBuilder"),
    "ird-builder"
  ),
  "spa-builder": createSafeModuleLoader(
    () => import("@/modules/SpaBuilder"),
    "spa-builder"
  ),
  "engineering-dash": createSafeModuleLoader(
    () => import("@/modules/EngineeringDash"),
    "engineering-dash"
  ),
  "dept-dashboard": createSafeModuleLoader(
    () => import("@/modules/DeptDashboard"),
    "dept-dashboard"
  ),
  "analytics-engine": createSafeModuleLoader(
    () => import("@/modules/AnalyticsEngine"),
    "analytics-engine"
  ),
  "spa-wellness": createSafeModuleLoader(
    () => import("@/modules/SpaWellness"),
    "spa-wellness"
  ),
  "spa-services-mgr": createSafeModuleLoader(
    () => import("@/modules/Spa/SpaServicesManager"),
    "spa-services-mgr"
  ),
  "spa-pamphlet": createSafeModuleLoader(
    () => import("@/modules/Spa/PamphletDesigner"),
    "spa-pamphlet"
  ),
  "spa-command": createSafeModuleLoader(
    () => import("@/modules/Spa/SpaCommandDashboard"),
    "spa-command"
  ),
  "pos-adapter": createSafeModuleLoader(
    () => import("@/modules/Spa/PosAdapterPanel"),
    "pos-adapter"
  ),
  "concierge-liability": createSafeModuleLoader(
    () => import("@/modules/Spa/ConciergeLiabilityPanel"),
    "concierge-liability"
  ),
  "spa-schedule-intel": createSafeModuleLoader(
    () => import("@/modules/Spa/SpaScheduleIntelligencePanel"),
    "spa-schedule-intel"
  ),
  "eng-command": createSafeModuleLoader(
    () => import("@/modules/Engineering/EngineeringCommandDashboard"),
    "eng-command"
  ),
  "hskp-command": createSafeModuleLoader(
    () => import("@/modules/Housekeeping/HousekeepingCommandDashboard"),
    "hskp-command"
  ),
  "concierge-hub": createSafeModuleLoader(
    () => import("@/modules/Concierge/EchoConciergeHubPanel"),
    "concierge-hub"
  ),
  "foh-command": createSafeModuleLoader(
    () => import("@/modules/FOH/FOHCommandDashboard"),
    "foh-command"
  ),
  "guest360-hub": createSafeModuleLoader(
    () => import("@/modules/Guest360/Guest360HubPanel"),
    "guest360-hub"
  ),
  "ird-hub": createSafeModuleLoader(
    () => import("@/modules/IRD/IRDHubPanel"),
    "ird-hub"
  ),
  "aurium-gm": createSafeModuleLoader(
    () => import("@/modules/Intelligence/EchoAuriumGMPanel"),
    "aurium-gm"
  ),
  "stratus-forecast": createSafeModuleLoader(
    () => import("@/modules/Intelligence/EchoStratusForecastPanel"),
    "stratus-forecast"
  ),
  "kds-expo": createSafeModuleLoader(
    () => import("@/modules/KDS/KDSExpoCommandScreen"),
    "kds-expo"
  ),
  "pattern-intelligence": createSafeModuleLoader(
    () => import("@/modules/Intelligence/PatternIntelligencePanel"),
    "pattern-intelligence"
  ),
  "cake-viewer": createSafeModuleLoader(
    () => import("@/modules/CakeViewer/CakeViewerPanel"),
    "cake-viewer"
  ),
  "eng-work-tickets": createSafeModuleLoader(
    () => import("@/modules/EngWorkTickets"),
    "eng-work-tickets"
  ),
  "integration-control": createSafeModuleLoader(
    () => import("@/modules/IntegrationControl"),
    "integration-control"
  ),
  "guest-booking": createSafeModuleLoader(
    () => import("@/modules/GuestBooking"),
    "guest-booking"
  ),
  "echo-concierge": createSafeModuleLoader(
    () => import("@/modules/EchoConcierge"),
    "echo-concierge"
  ),
  "echo-connect": createSafeModuleLoader(
    () => import("@/modules/EchoConnect"),
    "echo-connect"
  ),
  "foh-operations": createSafeModuleLoader(
    () => import("@/modules/FOHOperations"),
    "foh-operations"
  ),
  "retail-ops": createSafeModuleLoader(() => import("@/modules/RetailOps"), "retail-ops"),
  "guest-360": createSafeModuleLoader(() => import("@/modules/Guest360"), "guest-360"),
  "housekeeping": createSafeModuleLoader(() => import("@/modules/Housekeeping"), "housekeeping"),
  "minibar-ird": createSafeModuleLoader(() => import("@/modules/MinibarIRD"), "minibar-ird"),
  "kitchen-routing": createSafeModuleLoader(() => import("@/modules/KitchenRouting"), "kitchen-routing"),
  "menu-design-studio": createSafeModuleLoader(() => import("@/modules/MenuDesignStudio"), "menu-design-studio"),
  "foh-concierge-hub": createSafeModuleLoader(() => import("@/modules/FOHConciergeHub"), "foh-concierge-hub"),
  "daily-standup": createSafeModuleLoader(() => import("@/modules/DailyStandup"), "daily-standup"),
  "people-admin": createSafeModuleLoader(() => import("@/modules/PeopleAdmin"), "people-admin"),
  "concierge-mobile-admin": createSafeModuleLoader(() => import("@/modules/ConciergeMobileAdmin"), "concierge-mobile-admin"),
  "daily-briefing-admin": createSafeModuleLoader(() => import("@/modules/DailyBriefingAdmin"), "daily-briefing-admin"),
  "role-assigner": createSafeModuleLoader(() => import("@/modules/RoleAssigner"), "role-assigner"),
  "settings-overhaul": createSafeModuleLoader(() => import("@/modules/SettingsOverhaul"), "settings-overhaul"),
  "luccca-jarvis-dashboard": createSafeModuleLoader(() => import("@/modules/LucccaDashboard"), "luccca-jarvis-dashboard"),
  "lifestyle-dashboard": createSafeModuleLoader(() => import("@/modules/LifestyleDashboard"), "lifestyle-dashboard"),
  "relay": createSafeModuleLoader(() => import("@/modules/Relay"), "relay"),
  "my-schedule": createSafeModuleLoader(() => import("@/modules/MySchedule"), "my-schedule"),
  "schedule": createSafeModuleLoader(() => import("@/modules/Schedule"), "schedule"),
  "appearance-settings": createSafeModuleLoader(() => import("@/modules/AppearanceSettings"), "appearance-settings"),
  "food-gallery": createSafeModuleLoader(() => import("@/modules/FoodGallery"), "food-gallery"),
  "dish-assembly": createSafeModuleLoader(() => import("@/modules/DishAssembly"), "dish-assembly"),
  "guest-intelligence": createSafeModuleLoader(() => import("@/modules/GuestIntelligence"), "guest-intelligence"),
  "gm-flash-report": createSafeModuleLoader(() => import("@/modules/GMFlashReport"), "gm-flash-report"),
  "chef-daily-report": createSafeModuleLoader(() => import("@/modules/ChefDailyReport"), "chef-daily-report"),
  "chef-outlet-dashboard": createSafeModuleLoader(() => import("@/modules/ChefOutletDashboard"), "chef-outlet-dashboard"),
  "beo-timeline-ui": createSafeModuleLoader(() => import("@/modules/BEOTimelineUI"), "beo-timeline-ui"),
  "forecast-21day": createSafeModuleLoader(() => import("@/modules/OpsForecast"), "forecast-21day"),
  "enterprise-bi-suite": createSafeModuleLoader(() => import("@/modules/EnterpriseBISuite"), "enterprise-bi-suite"),
  "performance-intelligence": createSafeModuleLoader(() => import("@/modules/PerformanceIntelligence"), "performance-intelligence"),
  "chef-gio-training": createSafeModuleLoader(() => import("@/modules/ChefGioTraining"), "chef-gio-training"),
  "chef-carissa-training": createSafeModuleLoader(() => import("@/modules/ChefCarissaTraining"), "chef-carissa-training"),
  "vip-admin-desktop": createSafeModuleLoader(() => import("@/modules/VipAdmin/VipAdminPanel"), "vip-admin-desktop"),
  "manager-workflow": createSafeModuleLoader(() => import("@/modules/ManagerWorkflow"), "manager-workflow"),
  "reports-hub": createSafeModuleLoader(() => import("@/modules/ReportsHub"), "reports-hub"),
  "kitchen-war-room": createSafeModuleLoader(() => import("@/modules/KitchenWarRoom"), "kitchen-war-room"),
  "kitchen-fire-expo": createSafeModuleLoader(() => import("@/modules/KitchenFire"), "kitchen-fire-expo"),
  "commissary-ordering": createSafeModuleLoader(() => import("@/modules/Commissary"), "commissary-ordering"),
  "qr-scanner": createSafeModuleLoader(() => import("@/modules/QrScanner"), "qr-scanner"),
  "beverage-ops": createSafeModuleLoader(() => import("@/modules/BeverageOps"), "beverage-ops"),
  "beo-menu-builder": createSafeModuleLoader(() => import("@/modules/BEOMenuBuilder"), "beo-menu-builder"),
  "mixology-rd-lab": createSafeModuleLoader(() => import("@/modules/MixologyRDLab"), "mixology-rd-lab"),
  "pos-router": createSafeModuleLoader(() => import("@/modules/POSRouter"), "pos-router"),
  "outlet-menus": createSafeModuleLoader(() => import("@/modules/OutletMenus"), "outlet-menus"),
  "ops-forecast": createSafeModuleLoader(() => import("@/modules/OpsForecast"), "ops-forecast"),
  "group-resume": createSafeModuleLoader(() => import("@/modules/GroupResume"), "group-resume"),
  "purchasing-engine": createSafeModuleLoader(() => import("@/modules/Purchasing"), "purchasing-engine"),
  // CulinaryRecipeBuilder deleted (D1) — Culinary's built-in recipe builder is canonical.
  "inventory-receiving": createSafeModuleLoader(() => import("@/modules/InventoryReceiving"), "inventory-receiving"),
  "menu-eng-matrix": createSafeModuleLoader(() => import("@/modules/MenuEngineering"), "menu-eng-matrix"),
  "chronos": createSafeModuleLoader(() => import("@/modules/Chronos"), "chronos"),
  "property-pulse": createSafeModuleLoader(() => import("@/modules/PropertyPulse"), "property-pulse"),
  "pace-mtd": createSafeModuleLoader(() => import("@/modules/D64Stubs/PaceMtd"), "pace-mtd"),
  "cash-runway-deep": createSafeModuleLoader(() => import("@/modules/D64Stubs/CashRunwayDeep"), "cash-runway-deep"),
  "exception-review-daily": createSafeModuleLoader(() => import("@/modules/D64Stubs/ExceptionReviewDaily"), "exception-review-daily"),
  "vendor-pareto": createSafeModuleLoader(() => import("@/modules/D64Stubs/VendorPareto"), "vendor-pareto"),
  "cross-property-benchmark": createSafeModuleLoader(() => import("@/modules/D64Stubs/CrossPropertyBenchmark"), "cross-property-benchmark"),
  "tip-audit-panel": createSafeModuleLoader(() => import("@/modules/D64Stubs/TipAuditPanel"), "tip-audit-panel"),
  // EchoCoder is intentionally hidden/removed from user access
};

/**
 * Check if a panel key is valid
 */
export function isValidPanelKey(key: any): key is PanelKey {
  return key in PANEL_REGISTRY;
}
