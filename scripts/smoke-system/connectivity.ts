/**
 * Connectivity matrix and cross-module scenario definitions.
 * As difficulty increases, tests run more modules together (invoice → food on plate,
 * BEO → event layout → production → schedule, EchoAI^3 enhanced flows).
 */

import type { DifficultyLevel } from "./config.ts";

export interface ConnectivityEdge {
  from: string;
  to: string;
  flow: string;
  description: string;
}

export interface ConnectivityScenario {
  id: string;
  name: string;
  modules: string[];
  flow: string;
  minDifficulty: DifficultyLevel;
  description: string;
  script?: string;
  testPattern?: string;
}

export const OUTLET_EDGES: ConnectivityEdge[] = [
  { from: "PurchasingReceiving", to: "Culinary", flow: "invoice-to-plate", description: "Invoice pricing → recipe/plate cost" },
  { from: "Culinary", to: "EchoAurum", flow: "recipe-cost-to-pnl", description: "Recipe cost updated → P&L" },
  { from: "PurchasingReceiving", to: "EchoAurum", flow: "invoice-received", description: "Invoice received → financial event" },
  { from: "Culinary", to: "POS", flow: "menu-to-pos", description: "Menu design → POS/server sync" },
  { from: "Culinary", to: "Culinary", flow: "cook-notes-to-plate", description: "Cook notes → food on plate (production)" },
  { from: "Inventory", to: "Culinary", flow: "receipt-to-cost", description: "Inventory receipt → cost updates" },
];

export const BANQUET_EDGES: ConnectivityEdge[] = [
  { from: "EchoEventStudio", to: "BEOManagement", flow: "event-to-beo", description: "Event space layout → BEO creation" },
  { from: "EchoEventStudio", to: "Culinary", flow: "beo-menu-items", description: "BEO menu items → culinary/recipes" },
  { from: "MaestroBQT", to: "BEOManagement", flow: "beo-reo", description: "BEO/REO creation and propagation" },
  { from: "MaestroBQT", to: "Schedule", flow: "beo-to-schedule", description: "BEO timeline → labor schedule" },
  { from: "EchoEventStudio", to: "Culinary", flow: "echoai-recipes", description: "EchoAI generate recipes if none exist" },
  { from: "PurchasingReceiving", to: "MaestroBQT", flow: "order-to-production", description: "Planning & order → production needs from menu" },
  { from: "MaestroBQT", to: "Schedule", flow: "production-schedule", description: "Production needs → schedule interactions" },
  { from: "EchoAurum", to: "MaestroBQT", flow: "invoice-to-bqt", description: "Prospect & invoice → banquet food on plate" },
];

export const CONNECTIVITY_EDGES: ConnectivityEdge[] = [...OUTLET_EDGES, ...BANQUET_EDGES];

export const CONNECTIVITY_SCENARIOS: ConnectivityScenario[] = [
  {
    id: "outlet-invoice-plate",
    name: "Outlet: Invoice → Food on Plate",
    modules: ["PurchasingReceiving", "Culinary", "EchoAurum"],
    flow: "invoice → plate cost → P&L",
    minDifficulty: 2,
    description: "Invoice receipt, recipe/plate cost update, financial event.",
    script: "scripts/smoke-invoice-to-pos-comprehensive.ts",
  },
  {
    id: "outlet-menu-pos",
    name: "Outlet: Menu Design → POS / Server",
    modules: ["Culinary", "POS"],
    flow: "menu design → POS connection",
    minDifficulty: 2,
    description: "Menu design to POS/server and cook notes to food on plate.",
    script: "scripts/smoke-invoice-to-pos.ts",
  },
  {
    id: "beo-traceability",
    name: "BEO Traceability: Prospect → Production → Plate",
    modules: ["CRM", "EchoEventStudio", "BEOManagement", "Culinary", "MaestroBQT", "Schedule"],
    flow: "prospect/order → BEO → menu items → production → schedule",
    minDifficulty: 3,
    description: "Full BEO# traceability from prospect/order through production to food on plate.",
    testPattern: "BEO Traceability",
  },
  {
    id: "banquet-event-beo",
    name: "Banquet: Event Layout → BEO Creation",
    modules: ["EchoEventStudio", "BEOManagement", "MaestroBQT"],
    flow: "event space layout → BEO creation",
    minDifficulty: 3,
    description: "Prospect & invoice to food on plate; event space layout; BEO creation.",
    testPattern: "Full-Automatic E2E",
  },
  {
    id: "banquet-echoai-recipes",
    name: "Banquet: EchoAI Recipes & Planning",
    modules: ["EchoEventStudio", "Culinary", "MaestroBQT"],
    flow: "EchoAI recipes (if none exist) → planning & order",
    minDifficulty: 3,
    description: "EchoAI generating recipes if none exist; planning and order.",
    script: "scripts/smoke-banquet-echoai-recipes.ts",
  },
  {
    id: "banquet-production-schedule",
    name: "Banquet: Production Needs → Schedule",
    modules: ["MaestroBQT", "Schedule", "PurchasingReceiving"],
    flow: "production needs from menu → schedule",
    minDifficulty: 4,
    description: "Production needs based on menu; schedule interactions.",
    testPattern: "Full-Automatic E2E",
  },
  {
    id: "staff-gap",
    name: "Staff Gap Resilience (understaffed, no-show)",
    modules: ["Schedule", "StaffShortageForecaster", "AIScheduleGenerator"],
    flow: "shortage forecast → job share → schedule with gaps",
    minDifficulty: 3,
    description: "System fills gaps caused by understaffed, sick, or no-call/no-show staff.",
    testPattern: "Staff Gap Resilience",
  },
  {
    id: "spine-chain",
    name: "Spine Chain (multi-module pipeline)",
    modules: ["server"],
    flow: "spine chain pipeline",
    minDifficulty: 3,
    description: "Full spine chain across server routes.",
    script: "scripts/smoke-spine-chain.ts",
  },
  {
    id: "autonomous-menu-beo",
    name: "Fully Autonomous: Menu/BEO/REO → EchoAI^3",
    modules: ["Culinary", "EchoEventStudio", "MaestroBQT", "Schedule", "EchoAurum"],
    flow: "menu or BEO/REO created → autonomous flow (UI/UX enhanced)",
    minDifficulty: 5,
    description: "Once menu or BEO/REO is created, full autonomous system with EchoAI^3 enhancing UI/UX.",
    testPattern: "Full-Automatic E2E",
  },
  {
    id: "full-automatic-e2e",
    name: "Full-Automatic E2E: Layout → BEO → Order → Schedule → Production",
    modules: ["EchoEventStudio", "BEOManagement", "PurchasingReceiving", "Schedule", "MaestroBQT"],
    flow: "layout → BEO → order → scheduling → production (no manual intervention)",
    minDifficulty: 4,
    description: "Full-automatic flow where layout creation triggers entire chain through to production.",
    testPattern: "Full-Automatic E2E",
  },
  {
    id: "audit-events",
    name: "Audit Events + EchoAI^3 Learning",
    modules: ["AuditService", "EchoAI3AuditReader"],
    flow: "audit events → query API → learning aggregation → pattern detection → recommendations",
    minDifficulty: 3,
    description: "EchoAI^3 auditing and learning from each interaction through audit event consumption.",
    testPattern: "Audit Events",
  },
];

export function getScenariosForDifficulty(d: DifficultyLevel): ConnectivityScenario[] {
  return CONNECTIVITY_SCENARIOS.filter((s) => s.minDifficulty <= d);
}

export function getConnectivityMatrixMarkdown(): string {
  const lines: string[] = [
    "## Connectivity Matrix",
    "",
    "### Outlet Flows",
    "| From | To | Flow |",
    "|------|-----|------|",
    ...OUTLET_EDGES.map((e) => `| ${e.from} | ${e.to} | ${e.flow} |`),
    "",
    "### Banquet Flows",
    "| From | To | Flow |",
    "|------|-----|------|",
    ...BANQUET_EDGES.map((e) => `| ${e.from} | ${e.to} | ${e.flow} |`),
    "",
    "EchoAI^3 enhances UI/UX; it does not replace it.",
  ];
  return lines.join("\n");
}
