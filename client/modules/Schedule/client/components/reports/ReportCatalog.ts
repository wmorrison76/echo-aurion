export type ReportTier = 1 | 2 | 3 | 4 | 5;
export type ReportStatus = "ready" | "partial" | "planned";
export type ReportDestination =
  | "schedule"
  | "reports"
  | "forecast"
  | "analytics"
  | "finance"
  | "legal"
  | "ratings"
  | "timeoff";

export interface ScheduleReportItem {
  id: string;
  title: string;
  tier: ReportTier;
  topic: string;
  description: string;
  status: ReportStatus;
  destination: ReportDestination;
  keywords: string[];
  notes: string;
  sourceNeeds?: string[];
}

export const REPORT_TIER_LABELS: Record<ReportTier, string> = {
  1: "Tier 1 · Operational",
  2: "Tier 2 · Financial",
  3: "Tier 3 · Predictive",
  4: "Tier 4 · Executive Intelligence",
  5: "Tier 5 · LUCCCA Exclusive",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  ready: "Ready",
  partial: "Partial",
  planned: "Planned",
};

export const REPORT_DESTINATION_LABELS: Record<ReportDestination, string> = {
  schedule: "Schedule",
  reports: "Reports Hub",
  forecast: "Forecast",
  analytics: "Analytics",
  finance: "Finance",
  legal: "Legal & Compliance",
  ratings: "Ratings",
  timeoff: "Time Off",
};

export const REPORTS: ScheduleReportItem[] = [
  {
    id: "schedule-coverage",
    title: "Schedule Coverage",
    tier: 1,
    topic: "coverage",
    description: "Coverage gaps, filled shifts, and where the week is under or over staffed.",
    status: "partial",
    destination: "schedule",
    keywords: ["coverage", "staffing", "filled shifts", "understaffed"],
    notes: "Open the schedule grid and compare planned shifts against the weekly schedule.",
  },
  {
    id: "open-shifts",
    title: "Open Shifts",
    tier: 1,
    topic: "coverage",
    description: "Shows unassigned shifts that still need a worker or approval.",
    status: "planned",
    destination: "schedule",
    keywords: ["open shifts", "unassigned", "unfilled"],
    notes: "This is tracked in the build queue and should open from the schedule board once implemented.",
    sourceNeeds: ["Open-shift records or a shift assignment table", "A real queue for unassigned shifts"],
  },
  {
    id: "approvals",
    title: "Approvals",
    tier: 1,
    topic: "workflow",
    description: "Manager approvals, publish state, and employee acknowledgements.",
    status: "partial",
    destination: "legal",
    keywords: ["approvals", "publish", "acknowledgement", "acknowledgements"],
    notes: "The publish workflow already exists; this hub should route into that review path.",
  },
  {
    id: "exceptions",
    title: "Exceptions",
    tier: 1,
    topic: "compliance",
    description: "Missed punches, rest violations, and other schedule exceptions.",
    status: "partial",
    destination: "legal",
    keywords: ["exceptions", "missed punch", "violations", "compliance"],
    notes: "Compliance analysis is already available and should be used as the first exception source.",
  },
  {
    id: "overtime-risk",
    title: "Overtime Risk",
    tier: 1,
    topic: "labor",
    description: "Flags employees and days that are likely to exceed overtime limits.",
    status: "partial",
    destination: "analytics",
    keywords: ["overtime", "overtime risk", "approaching overtime", "ot"],
    notes: "This is the best match for commands like 'run me an approaching overtime report'.",
  },
  {
    id: "pto-status",
    title: "PTO Status",
    tier: 1,
    topic: "time off",
    description: "Paid time off balances, requests, and blackout overlaps.",
    status: "partial",
    destination: "timeoff",
    keywords: ["pto", "time off", "vacation", "leave"],
    notes: "The Time Off panel is the current source of truth for PTO-related scheduling.",
  },
  {
    id: "labor-vs-budget",
    title: "Labor vs Budget",
    tier: 2,
    topic: "finance",
    description: "Compares labor spend to the approved labor budget.",
    status: "partial",
    destination: "finance",
    keywords: ["budget", "labor budget", "labor vs budget"],
    notes: "Finance / GL costing already shows labor cost and variance calculations.",
  },
  {
    id: "labor-vs-forecast",
    title: "Labor vs Forecast",
    tier: 2,
    topic: "finance",
    description: "Compares actual labor to forecasted staffing demand.",
    status: "partial",
    destination: "forecast",
    keywords: ["forecast", "labor forecast", "labor vs forecast"],
    notes: "The forecast view should be the primary destination for this report.",
  },
  {
    id: "labor-vs-revenue",
    title: "Labor vs Revenue",
    tier: 2,
    topic: "finance",
    description: "Tracks labor cost against revenue for the same period.",
    status: "partial",
    destination: "finance",
    keywords: ["revenue", "labor vs revenue", "sales"],
    notes: "The P&L-lite and drilldown views are the current closest data sources.",
  },
  {
    id: "labor-vs-contribution",
    title: "Labor vs Contribution",
    tier: 2,
    topic: "finance",
    description: "Measures labor spend versus contribution margin and profit.",
    status: "planned",
    destination: "finance",
    keywords: ["contribution", "margin", "labor vs contribution"],
    notes: "This needs a dedicated calculation layer and should stay in the queue.",
    sourceNeeds: ["Contribution margin data", "Net sales and food-cost source data", "Department-level costing rules"],
  },
  {
    id: "shift-demand-forecast",
    title: "Shift Demand Forecast",
    tier: 3,
    topic: "predictive",
    description: "Forecasted labor demand by day and interval.",
    status: "partial",
    destination: "forecast",
    keywords: ["shift demand", "demand forecast", "forecast"],
    notes: "The forecast route already exists and can be the first predictive destination.",
  },
  {
    id: "staffing-curve-projection",
    title: "Staffing Curve Projection",
    tier: 3,
    topic: "predictive",
    description: "Projects the weekly staffing curve against expected demand.",
    status: "planned",
    destination: "forecast",
    keywords: ["staffing curve", "curve projection", "projection"],
    notes: "Planned once the forecast page is expanded beyond the current sparkline.",
    sourceNeeds: ["Historical demand intervals", "Forecast demand feed", "Coverage targets by hour"],
  },
  {
    id: "event-staffing-projection",
    title: "Event Staffing Projection",
    tier: 3,
    topic: "predictive",
    description: "Predicts staffing needs for events, banquets, and special services.",
    status: "planned",
    destination: "reports",
    keywords: ["event staffing", "events", "banquet", "projection"],
    notes: "This needs event-aware inputs before it can run automatically.",
    sourceNeeds: ["Event or BEO feed", "Guest count and service type", "Labor standards per event type"],
  },
  {
    id: "prep-workload-projection",
    title: "Prep Workload Projection",
    tier: 3,
    topic: "predictive",
    description: "Predicts prep labor needs from recipe and production workload.",
    status: "planned",
    destination: "reports",
    keywords: ["prep workload", "prep", "workload projection"],
    notes: "This belongs in the predictive queue and will need production data.",
    sourceNeeds: ["Recipe counts", "Production work orders", "Commissary or prep queue data"],
  },
  {
    id: "manager-scheduling-performance",
    title: "Manager Scheduling Performance",
    tier: 4,
    topic: "executive",
    description: "Measures how well managers build, publish, and balance schedules.",
    status: "partial",
    destination: "analytics",
    keywords: ["manager performance", "scheduling performance", "manager scheduling"],
    notes: "Analytics and publish history can already support the first pass.",
  },
  {
    id: "reliability-scoring",
    title: "Reliability Scoring",
    tier: 4,
    topic: "executive",
    description: "Computes employee reliability based on attendance and compliance.",
    status: "planned",
    destination: "ratings",
    keywords: ["reliability", "scoring", "reliability scoring"],
    notes: "This should evolve from the staff ratings and attendance modules.",
    sourceNeeds: ["Punch/attendance history", "Late and no-show exceptions", "Manager review outcomes"],
  },
  {
    id: "compliance-violation-heatmap",
    title: "Compliance Violation Heatmap",
    tier: 4,
    topic: "executive",
    description: "Heatmap of violations by day, employee, and rule family.",
    status: "partial",
    destination: "legal",
    keywords: ["heatmap", "violation heatmap", "compliance violation"],
    notes: "The compliance engine already surfaces the underlying violations.",
  },
  {
    id: "schedule-publication-timeliness",
    title: "Schedule Publication Timeliness",
    tier: 4,
    topic: "executive",
    description: "Tracks how quickly schedules are published and acknowledged.",
    status: "partial",
    destination: "legal",
    keywords: ["publication timeliness", "publish timeliness", "acknowledgement"],
    notes: "The publish workflow already exposes the needed status data.",
  },
  {
    id: "recipe-driven-staffing",
    title: "Recipe-Driven Staffing",
    tier: 5,
    topic: "luccca",
    description: "Builds staffing demand from recipe and menu production rules.",
    status: "planned",
    destination: "reports",
    keywords: ["recipe driven", "recipe staffing", "luccca"],
    notes: "Exclusive LUCCCA logic that needs a separate rules engine.",
    sourceNeeds: ["Recipe graph", "Yield and batch standards", "Menu production inputs"],
  },
  {
    id: "beo-staffing-auto-projection",
    title: "BEO Staffing Auto-Projection",
    tier: 5,
    topic: "luccca",
    description: "Projects staffing from banquet event orders and service rules.",
    status: "planned",
    destination: "reports",
    keywords: ["beo", "banquet event order", "auto projection"],
    notes: "This needs BEO intake and event-aware forecasting.",
    sourceNeeds: ["BEO intake", "Guest counts and service style", "Banquet staffing rules"],
  },
  {
    id: "commissary-labor-allocation",
    title: "Commissary Labor Allocation",
    tier: 5,
    topic: "luccca",
    description: "Allocates labor across commissary and production workstreams.",
    status: "planned",
    destination: "reports",
    keywords: ["commissary", "labor allocation", "allocation"],
    notes: "This is a category-defining report that needs dedicated labor allocation logic.",
    sourceNeeds: ["Commissary work orders", "Labor buckets by production line", "Cost allocation rules"],
  },
  {
    id: "station-workload-ai-prediction",
    title: "Station Workload AI Prediction",
    tier: 5,
    topic: "luccca",
    description: "Predicts workstation load using AI-assisted scheduling signals.",
    status: "planned",
    destination: "reports",
    keywords: ["station workload", "ai prediction", "prediction"],
    notes: "This should be added after the predictive and executive tiers are in place.",
    sourceNeeds: ["Station-level work tickets", "Historical throughput by station", "AI model inputs and labels"],
  },
  {
    id: "payroll-register",
    title: "Payroll Register",
    tier: 2,
    topic: "existing",
    description: "Existing CSV export for payroll hours by employee.",
    status: "partial",
    destination: "reports",
    keywords: ["payroll register", "payroll", "csv"],
    notes: "Available through the weekly reports download flow.",
  },
  {
    id: "tip-runs",
    title: "Tip Runs",
    tier: 2,
    topic: "existing",
    description: "Existing CSV export for tip run line items.",
    status: "partial",
    destination: "reports",
    keywords: ["tip run", "tips", "tip runs"],
    notes: "Available through the weekly reports download flow.",
  },
  {
    id: "pnl-lite",
    title: "P&L Lite",
    tier: 2,
    topic: "existing",
    description: "Existing weekly P&L-lite CSV export.",
    status: "partial",
    destination: "reports",
    keywords: ["pnl", "p&l", "pnl lite"],
    notes: "Available through the weekly reports download flow.",
  },
];

export function findReportMatch(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  const exact = REPORTS.find((report) =>
    normalized === report.title.toLowerCase() || normalized === report.id,
  );
  if (exact) return exact;

  return (
    REPORTS.find((report) =>
      [report.title, report.topic, report.description, ...report.keywords]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    ) || null
  );
}

export function reportMatchesQuery(report: ScheduleReportItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [report.title, report.topic, report.description, ...report.keywords]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}
