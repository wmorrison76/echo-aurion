/**
 * Panel Restoration Phases Configuration
 * Defines how panels are grouped and loaded during app startup
 */

import type { PanelKey } from "./panel-registry";

export interface RestorationPhase {
  phaseNumber: number;
  name: string;
  delayMs: number;
  panelKeys: PanelKey[];
  description: string;
}

/**
 * Define how panels are grouped across restoration phases
 * Phase 0: Immediate (0ms) - Critical panels that must load first
 * Phase 1: Quick (500ms) - High-priority modules that enable core workflows
 * Phase 2: Normal (2000ms) - Medium-priority modules
 * Phase 3: Background (4000ms) - Lower-priority modules
 */
export const RESTORATION_PHASES: RestorationPhase[] = [
  {
    phaseNumber: 0,
    name: "Critical",
    delayMs: 0,
    panelKeys: ["dashboard"],
    description: "Critical panel loaded immediately for user interaction",
  },
  {
    phaseNumber: 1,
    name: "High Priority",
    delayMs: 500,
    panelKeys: [
      "culinary",
      "schedule",
      "inventory",
      "maestro",
      "ekg",
    ],
    description: "High-priority modules that enable core workflows",
  },
  {
    phaseNumber: 2,
    name: "Medium Priority",
    delayMs: 2000,
    panelKeys: [
      "pastry",
      "maestro-dashboard",
      "maestro-bqt",
      "forecast-hub",
      "labor-command-center",
      "genesis-a",
      "genesis-b",
      "genesis-c",
    ],
    description: "Medium-priority modules",
  },
  {
    phaseNumber: 3,
    name: "Lower Priority",
    delayMs: 4000,
    panelKeys: [
      "genesis-d",
      "genesis-e",
      "genesis-f",
      "genesis-g",
      "genesis-h",
      "chefnet",
      "support",
      "whiteboard",
      "video",
      "collaboration",
      "studio",
      "notes",
      "aurum",
      "layout",
      "events",
      "wine",
      "stratus",
      "demand",
      "pricing",
      "staffing",
      "scheduling",
      "revenue",
      "costs",
      "qa",
      "guest",
      "supply",
      "voice",
      "canvas",
      "ai-chef",
      "maintenance",
      "templates",
      "network",
      "benchmark",
      "zaro",
      "multi-property",
      "job-sharing",
      "pto",
      "analytics",
      "mobile",
      "echo-chat",
      "echo-events",
      "global-calendar",
      "change-feed",
      "os-bus-debug",
      "module-status",
      "module-diagnostics",
      "trace-viewer",
      "reconciliation-dashboard",
      "safety-controls",
      "allergen-impact-viewer",
      "why-changed",
      "cognitive-replay",
      "finance-explainability",
      "purchasing-receiving",
      "integration-command-center",
      "mixology_sommelier",
      "notifications",
      "notification-center",
      "waitlist",
      "waitlist-management",
      "client-import",
      "client-data-import",
      "onboarding",
      "onboarding-wizard",
      "beo-execution",
      "beo-workflow",
      "panel-system",
      "panel-verification",
      "ux-optimization",
      "security-compliance",
      "security",
      "maestro-banquets",
      "banquets",
      "engineering",
      "engineering-hvac",
      "recipe-library",
      "optimized-orders",
      "procurement-plan",
      "echo-advisory",
      "group-intelligence",
      "inventory-mini",
      "inventory-health-leaderboard",
      "inventory-rewards",
      "genesis_single_queue_ops",
      "genesis_auth_permissions",
      "genesis_rewards",
      "genesis_handshake_inspector",
      "genesis_onboarding",
      "genesis_internal_fulfillment_queue",
      "genesis_c_procurement",
      "genesis_d_cost_admin",
      "genesis_f_vendor_calendar",
      "genesis_demo_walkthrough",
      "genesis_echo_why",
      "hr-payroll",
      "group-resume-print",
      "production-sheet",
      "purchasing-plan",
      "labor-plan",
      "maestroBqt.list",
      "maestroBqt.builder",
      "maestroBqt.productionTimeline",
      "maestroBqt.orders",
      "maestroBqt.changeFeed",
      "maestroBqt.changeNotifications",
      "maestroBqt.traceDrawer",
      "echo-canva-cake-order",
      "echo-canva-design-editor",
      "performance-tracking",
      "enhanced-performance",
      "ai-schedule-generator",
      "beo-schedule-integration",
      "high-volume-scheduling",
      "shortage-forecast",
      "job-share-management",
      "outlet-demand-forecast",
    ],
    description: "Lower-priority modules loaded in background during idle",
  },
];

/**
 * Panel priority levels for conditional restoration
 */
export interface PanelPriority {
  key: PanelKey;
  priority: "critical" | "high" | "medium" | "low";
  estimatedLoadTimeMs?: number;
}

export const PANEL_PRIORITIES: Record<string, "critical" | "high" | "medium" | "low"> = {
  // Critical
  dashboard: "critical",

  // High priority
  culinary: "high",
  schedule: "high",
  inventory: "high",
  maestro: "high",
  ekg: "high",

  // Medium priority
  pastry: "medium",
  "maestro-dashboard": "medium",
  "maestro-bqt": "medium",
  "forecast-hub": "medium",
  "labor-command-center": "medium",

  // Low priority (everything else defaults to "low")
};

/**
 * Get priority level for a panel
 */
export function getPanelPriority(
  panelKey: string,
): "critical" | "high" | "medium" | "low" {
  return PANEL_PRIORITIES[panelKey] || "low";
}

/**
 * Get which phase a panel belongs to
 */
export function getPanelPhase(panelKey: PanelKey): number {
  for (const phase of RESTORATION_PHASES) {
    if (phase.panelKeys.includes(panelKey)) {
      return phase.phaseNumber;
    }
  }
  // Default to last phase if not explicitly defined
  return RESTORATION_PHASES[RESTORATION_PHASES.length - 1].phaseNumber;
}

/**
 * Get panels for a specific phase
 */
export function getPanelsForPhase(phaseNumber: number): PanelKey[] {
  const phase = RESTORATION_PHASES.find((p) => p.phaseNumber === phaseNumber);
  return phase?.panelKeys || [];
}

/**
 * Get all phases up to and including the specified phase
 */
export function getPhasesUpTo(phaseNumber: number): RestorationPhase[] {
  return RESTORATION_PHASES.filter((p) => p.phaseNumber <= phaseNumber);
}

/**
 * Get delay until a phase starts (in milliseconds)
 */
export function getPhaseDelay(phaseNumber: number): number {
  const phase = RESTORATION_PHASES.find((p) => p.phaseNumber === phaseNumber);
  return phase?.delayMs || 0;
}

/**
 * Calculate when all panels will be loaded
 */
export function getTotalRestorationTimeMs(): number {
  if (RESTORATION_PHASES.length === 0) return 0;
  const lastPhase = RESTORATION_PHASES[RESTORATION_PHASES.length - 1];
  return lastPhase.delayMs;
}
