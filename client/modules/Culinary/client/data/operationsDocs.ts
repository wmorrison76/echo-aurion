export type OperationsDocRisk = "low" | "medium" | "high";

export type OperationsDocHistoryEntry = {
  date: string;
  author: string;
  note: string;
};

export type OperationsDocMetricSummary = {
  completionRate: number;
  adoption: number;
  coverage: number;
};

export type OperationsDoc = {
  id: string;
  title: string;
  docType: string;
  category: string;
  summary: string;
  owner: string;
  frequencyLabel: string;
  cadenceDays: number;
  auditWindowDays?: number;
  lastUpdatedISO: string;
  tags: string[];
  linkedSystems: string[];
  playbookFocus: string[];
  attachments: number;
  watchers: number;
  riskLevel: OperationsDocRisk;
  metrics: OperationsDocMetricSummary;
  history: OperationsDocHistoryEntry[];
};

export const operationsDocs: OperationsDoc[] = [
  {
    id: "server-notes-briefings",
    title: "Server Notes Briefings",
    docType: "Server Notes",
    category: "Service",
    summary:
      "Daily service briefing packet with menu highlights, allergy flags, beverage pairings, and service choreography.",
    owner: "Hospitality Ops",
    frequencyLabel: "Daily Service",
    cadenceDays: 1,
    auditWindowDays: 2,
    lastUpdatedISO: "2024-07-18",
    tags: ["Front of House", "Menu Rollout", "Training"],
    linkedSystems: ["Recipe Search", "Server Notes Workspace", "EchoAI Briefing"],
    playbookFocus: [
      "Highlight menu changes and 86s",
      "Call out allergy and dietary accommodations",
      "Map beverage talking points to courses",
    ],
    attachments: 6,
    watchers: 18,
    riskLevel: "medium",
    metrics: {
      completionRate: 0.88,
      adoption: 0.92,
      coverage: 0.95,
    },
    history: [
      {
        date: "2024-07-18",
        author: "Alison Soto",
        note: "Updated with summer tasting menu and new Amaro pairing notes.",
      },
      {
        date: "2024-07-12",
        author: "Ruben Blake",
        note: "Added workflow summary for EchoAI to surface nightly hotspots.",
      },
      {
        date: "2024-07-05",
        author: "Dina Patel",
        note: "Refreshed server-facing allergen cross-training checklist.",
      },
    ],
  },
  {
    id: "line-check-program",
    title: "Line Check Program",
    docType: "Line Checks",
    category: "Operations",
    summary:
      "Structured opening, service, and closing line check documentation with station accountability and corrective actions.",
    owner: "Culinary Ops",
    frequencyLabel: "Pre-Service & Shift Close",
    cadenceDays: 1,
    auditWindowDays: 1,
    lastUpdatedISO: "2024-07-16",
    tags: ["Prep", "QA", "Kitchen Stations"],
    linkedSystems: ["Dish Assembly", "Kitchen Stations", "EchoAI Workflow"],
    playbookFocus: [
      "Shift-specific sanitation and temperature logs",
      "Station ownership assignments with backups",
      "Escalation path for unresolved checks",
    ],
    attachments: 9,
    watchers: 14,
    riskLevel: "high",
    metrics: {
      completionRate: 0.74,
      adoption: 0.87,
      coverage: 0.81,
    },
    history: [
      {
        date: "2024-07-16",
        author: "Marcus Lin",
        note: "Embedded new fryer calibration SOP and automated temp capture.",
      },
      {
        date: "2024-07-09",
        author: "Casey Lloyd",
        note: "Rebuilt corrective action matrix for garde manger station.",
      },
      {
        date: "2024-07-02",
        author: "Marcus Lin",
        note: "Linked thermal sensors feed for sauté and grill line.",
      },
    ],
  },
  {
    id: "haccp-audit-tracker",
    title: "HACCP Audit Tracker",
    docType: "HACCP Audit",
    category: "Compliance",
    summary:
      "Internal HACCP audit log with corrective action tracking, verification signatures, and calibration reminders.",
    owner: "Food Safety",
    frequencyLabel: "Weekly Walkthrough",
    cadenceDays: 7,
    auditWindowDays: 3,
    lastUpdatedISO: "2024-07-15",
    tags: ["Food Safety", "Audit", "Compliance"],
    linkedSystems: ["HACCP Compliance Workspace", "Cold Chain Monitoring"],
    playbookFocus: [
      "Hazard analysis review per critical control point",
      "Verification of CCP monitoring logs",
      "Corrective action validation with sign-off",
    ],
    attachments: 5,
    watchers: 11,
    riskLevel: "high",
    metrics: {
      completionRate: 0.82,
      adoption: 0.89,
      coverage: 0.9,
    },
    history: [
      {
        date: "2024-07-15",
        author: "Ian Schultz",
        note: "Logged corrective action for sous vide chill variance and retested probes.",
      },
      {
        date: "2024-07-08",
        author: "Ian Schultz",
        note: "Added alert for CCP verification reminders into Slack safety channel.",
      },
      {
        date: "2024-07-01",
        author: "Rocio Vega",
        note: "Uploaded calibration certificates for blast chiller and combi oven.",
      },
    ],
  },
  {
    id: "health-inspection-dossier",
    title: "Health Inspection Dossier",
    docType: "Health Inspection",
    category: "Compliance",
    summary:
      "Centralized repository of external inspection reports, remediation plans, and supporting photographic evidence.",
    owner: "Food Safety",
    frequencyLabel: "Per Inspection",
    cadenceDays: 45,
    auditWindowDays: 10,
    lastUpdatedISO: "2024-06-28",
    tags: ["Regulatory", "Remediation", "Documentation"],
    linkedSystems: ["Inspection Uploads", "EchoAI Compliance Insights"],
    playbookFocus: [
      "Upload scanned inspection forms within 24 hours",
      "Document remediation tasks with owner and target date",
      "Sync insights to adjust line checks and SOPs",
    ],
    attachments: 12,
    watchers: 9,
    riskLevel: "medium",
    metrics: {
      completionRate: 0.71,
      adoption: 0.78,
      coverage: 0.84,
    },
    history: [
      {
        date: "2024-06-28",
        author: "Rocio Vega",
        note: "Uploaded June municipal inspection with corrected sanitizer ppm log.",
      },
      {
        date: "2024-05-16",
        author: "Ian Schultz",
        note: "Closed out outstanding floor drain cleaning action plan.",
      },
      {
        date: "2024-04-03",
        author: "Rocio Vega",
        note: "Digitized historical inspection scans dating back to 2022 for trends.",
      },
    ],
  },
  {
    id: "pos-terminal-routing",
    title: "POS Terminal Routing",
    docType: "POS Routing",
    category: "Systems",
    summary:
      "Routing matrix covering chits, expo, and prep printers by menu item with backup behaviors and escalation.",
    owner: "Systems Engineering",
    frequencyLabel: "Menu Release",
    cadenceDays: 14,
    auditWindowDays: 4,
    lastUpdatedISO: "2024-07-14",
    tags: ["POS", "Routing", "Menu"],
    linkedSystems: ["Dish Assembly", "POS Sandbox", "Recipe Input"],
    playbookFocus: [
      "Synchronize printer routing with menu engineering updates",
      "Document routing fallbacks for offline printers",
      "Surface toast summary for EchoAI to spot bottlenecks",
    ],
    attachments: 4,
    watchers: 16,
    riskLevel: "medium",
    metrics: {
      completionRate: 0.9,
      adoption: 0.94,
      coverage: 0.88,
    },
    history: [
      {
        date: "2024-07-14",
        author: "Gretchen Lee",
        note: "Updated pastry station routing for weekend brunch pilot.",
      },
      {
        date: "2024-07-03",
        author: "Gretchen Lee",
        note: "Added bar printer redundancy and expo display mapping.",
      },
      {
        date: "2024-06-22",
        author: "Miles Carter",
        note: "Mapped limited-time cocktail menu to lounge terminal bank.",
      },
    ],
  },
  {
    id: "cook-notes-library",
    title: "Cook Notes Library",
    docType: "Cook Notes",
    category: "Operations",
    summary:
      "Living reference of prep, plating, and recovery notes by station with video embeds and component sourcing.",
    owner: "Culinary Ops",
    frequencyLabel: "Weekly Refresh",
    cadenceDays: 7,
    lastUpdatedISO: "2024-07-13",
    tags: ["Station Training", "Menu", "Video"],
    linkedSystems: ["Dish Assembly", "Prep Sheets", "Gallery"],
    playbookFocus: [
      "Embed quick plating clips per course",
      "Track prep day-by-day for seasonal menu",
      "Log recovery plans for guest issues",
    ],
    attachments: 15,
    watchers: 21,
    riskLevel: "low",
    metrics: {
      completionRate: 0.86,
      adoption: 0.9,
      coverage: 0.93,
    },
    history: [
      {
        date: "2024-07-13",
        author: "Marcus Lin",
        note: "Uploaded high-fire plancha video for wagyu skewers.",
      },
      {
        date: "2024-07-04",
        author: "Alison Soto",
        note: "Attached sourcing notes for heirloom tomato supplier swap.",
      },
      {
        date: "2024-06-26",
        author: "Ruben Blake",
        note: "Added recovery script for delayed tasting progression.",
      },
    ],
  },
  {
    id: "production-sheets-master",
    title: "Production Sheets Master",
    docType: "Production Sheets",
    category: "Operations",
    summary:
      "Culinary production planning sheets with yield math, task sequencing, and cross-team dependencies.",
    owner: "Production Kitchen",
    frequencyLabel: "Daily & Banquet",
    cadenceDays: 1,
    lastUpdatedISO: "2024-07-17",
    tags: ["Yield", "Scheduling", "Banquets"],
    linkedSystems: ["Production Planner", "Inventory", "Dish Assembly"],
    playbookFocus: [
      "Tie prep pull sheets to purchasing forecasts",
      "Track workstation assignments with backups",
      "Expose dependencies for pastry and savoury crossover",
    ],
    attachments: 8,
    watchers: 19,
    riskLevel: "medium",
    metrics: {
      completionRate: 0.91,
      adoption: 0.96,
      coverage: 0.9,
    },
    history: [
      {
        date: "2024-07-17",
        author: "Leah Kim",
        note: "Integrated banquets auto-scaling for 200-cover weekend.",
      },
      {
        date: "2024-07-10",
        author: "Leah Kim",
        note: "Aligned portioning with updated plating spec from EchoAI insights.",
      },
      {
        date: "2024-07-01",
        author: "Marcus Lin",
        note: "Connected production waste capture workflow.",
      },
    ],
  },
  {
    id: "prep-sheet-stacks",
    title: "Prep Sheet Stacks",
    docType: "Prep Sheets",
    category: "Operations",
    summary:
      "Consolidated prep sheets by station with auto-sorted mise en place, allergen flags, and make-ahead signals.",
    owner: "Production Kitchen",
    frequencyLabel: "Daily & Event",
    cadenceDays: 1,
    auditWindowDays: 1,
    lastUpdatedISO: "2024-07-15",
    tags: ["Mise en place", "Workstream", "Allergens"],
    linkedSystems: ["Prep Sheets UI", "Allergen Matrix", "Dish Assembly"],
    playbookFocus: [
      "Pre-sort prep lists by thaw/cook/finish windows",
      "Flag allergen handling checkpoints",
      "Sync with order guide creator to consolidate ingredients",
    ],
    attachments: 7,
    watchers: 17,
    riskLevel: "medium",
    metrics: {
      completionRate: 0.84,
      adoption: 0.9,
      coverage: 0.88,
    },
    history: [
      {
        date: "2024-07-15",
        author: "Leah Kim",
        note: "Linked weekend events to auto-generate pastry support list.",
      },
      {
        date: "2024-07-05",
        author: "Leah Kim",
        note: "Added allergen escalation prompts tied to matrix updates.",
      },
      {
        date: "2024-06-27",
        author: "Marcus Lin",
        note: "Rolled out shift-level prep handoff checklist.",
      },
    ],
  },
  {
    id: "allergen-matrix",
    title: "Allergen Matrix",
    docType: "Allergen Matrix",
    category: "Safety",
    summary:
      "Cross-restaurant allergen reference with recipe lineage, POS modifiers, and service callouts for guest safety.",
    owner: "Food Safety",
    frequencyLabel: "Menu Change",
    cadenceDays: 3,
    auditWindowDays: 1,
    lastUpdatedISO: "2024-07-18",
    tags: ["Allergens", "Guest Safety", "Training"],
    linkedSystems: ["Recipe Input", "Server Notes", "POS Sandbox"],
    playbookFocus: [
      "Reconcile allergens for every new component",
      "Push updates to POS modifiers within 12 hours",
      "Distribute digest to front and back of house",
    ],
    attachments: 10,
    watchers: 24,
    riskLevel: "high",
    metrics: {
      completionRate: 0.95,
      adoption: 0.98,
      coverage: 0.97,
    },
    history: [
      {
        date: "2024-07-18",
        author: "Rocio Vega",
        note: "Refreshed nut handling protocols for pastry team training.",
      },
      {
        date: "2024-07-11",
        author: "Rocio Vega",
        note: "Synced shellfish callouts with tasting menu progression.",
      },
      {
        date: "2024-07-03",
        author: "Ian Schultz",
        note: "Flagged sesame exposure for new buns supplier and pushed to POS.",
      },
    ],
  },
  {
    id: "daily-order-guide",
    title: "Daily Order Guide",
    docType: "Order Guide",
    category: "Purchasing",
    summary:
      "Dynamic order guide consolidating active menu items, ingredient sourcing, par levels, and supplier performance.",
    owner: "Purchasing",
    frequencyLabel: "Daily",
    cadenceDays: 1,
    lastUpdatedISO: "2024-07-17",
    tags: ["Purchasing", "Suppliers", "Inventory"],
    linkedSystems: ["Purchasing & Receiving", "Inventory", "Predictive Procurement"],
    playbookFocus: [
      "Aggregate ingredient demand across active menus",
      "Highlight supplier reliability and substitutions",
      "Feed EchoAI to forecast shortages and bottlenecks",
    ],
    attachments: 11,
    watchers: 15,
    riskLevel: "medium",
    metrics: {
      completionRate: 0.89,
      adoption: 0.93,
      coverage: 0.92,
    },
    history: [
      {
        date: "2024-07-17",
        author: "Nadia Cruz",
        note: "Merged new patio menu demand into consolidated order summary.",
      },
      {
        date: "2024-07-09",
        author: "Nadia Cruz",
        note: "Updated supplier performance dashboard driven by invoice triage panel.",
      },
      {
        date: "2024-07-01",
        author: "Omar Singh",
        note: "Added automation hook to predictive procurement scenario planning.",
      },
    ],
  },
];
