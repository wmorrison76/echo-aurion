import { PanelKey, PanelMetadata } from "./panel-types";

export const PANEL_METADATA: Record<string, any> = {
  dashboard: {
    key: "dashboard",
    label: "Dashboard",
    description: "Home screen with floating panels",
    icon: "",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  ekg: {
    key: "ekg",
    label: "EKG Monitor",
    description: "System health and module monitoring",
    icon: "",
    defaultWidth: 900,
    defaultHeight: 600,
  },
  culinary: {
    key: "culinary",
    label: "Culinary",
    description: "EchoRecipePro - Recipes, techniques, ingredients",
    icon: "",
    defaultWidth:
      typeof window !== "undefined"
        ? Math.min(window.innerWidth - 100, 950)
        : 950,
    defaultHeight:
      typeof window !== "undefined"
        ? Math.min(window.innerHeight - 140, 650)
        : 650,
  },
  culinary_sidebar: {
    key: "culinary_sidebar",
    label: "Recipe Properties",
    description: "Recipe metadata, allergens, taxonomy sidebar for Culinary",
    icon: "⚙️",
    defaultWidth: 320,
    defaultHeight: 800,
  },
  pastry: {
    key: "pastry",
    label: "Pastry",
    description:
      "Pastry & Baking Management - Full suite with Canvas Studio integration",
    icon: "",
    defaultWidth:
      typeof window !== "undefined"
        ? Math.min(window.innerWidth - 100, 950)
        : 950,
    defaultHeight:
      typeof window !== "undefined"
        ? Math.min(window.innerHeight - 140, 650)
        : 650,
  },
  schedule: {
    key: "schedule",
    label: "Schedule",
    description: "Staff scheduling, shift management & department assignments",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 700,
  },
  inventory: {
    key: "inventory",
    label: "Inventory",
    description: "Food/supply purchasing & tracking",
    icon: "",
    defaultWidth: 900,
    defaultHeight: 600,
  },
  maestro: {
    key: "maestro",
    label: "Maestro BQT",
    description: "Kitchen management & planning",
    icon: "",
    defaultWidth: 900,
    defaultHeight: 600,
  },
  "maestro-bqt": {
    key: "maestro-bqt",
    label: "Maestro BQT Orchestrator",
    description:
      "Unified operational brain - Events, spaces, inventory, labor, financials",
    icon: "",
    defaultWidth: 1400,
    defaultHeight: 800,
  },
  "maestro-dashboard": {
    key: "maestro-dashboard",
    label: "Maestro Dashboard",
    description:
      "Unified operations dashboard - Events, production, inventory, labor, and AI insights",
    icon: "👨‍🍳",
    defaultWidth: 1600,
    defaultHeight: 900,
  },
  maestro_sidebar: {
    key: "maestro_sidebar",
    label: "BQT Monitor",
    description:
      "Maestro production tracking sidebar with active items and metrics",
    icon: "📊",
    defaultWidth: 320,
    defaultHeight: 800,
  },
  mixology_sommelier: {
    key: "mixology-sommelier",
    label: "Mixology & Sommelier",
    description:
      "Bar management, cocktails, and wine pairing with profit optimization",
    icon: "",
    defaultWidth: 1000,
    defaultHeight: 650,
  },
  chefnet: {
    key: "chefnet",
    label: "ChefNet",
    description: "Team collaboration & messaging",
    icon: "",
    defaultWidth: 900,
    defaultHeight: 600,
  },
  support: {
    key: "support",
    label: "Support",
    description: "Help desk & ticket management",
    icon: "",
    defaultWidth: 900,
    defaultHeight: 600,
  },
  whiteboard: {
    key: "whiteboard",
    label: "Whiteboard",
    description: "Collaborative drawing canvas",
    icon: "🎨",
    defaultWidth: 1100,
    defaultHeight: 700,
  },
  video: {
    key: "video",
    label: "Video Conference",
    description: "Video/audio calls, screen sharing",
    icon: "📹",
    defaultWidth: 1100,
    defaultHeight: 700,
  },
  studio: {
    key: "studio",
    label: "Canvas Studio",
    description: "3D image generation & visualization",
    icon: "🖼️",
    defaultWidth: 1100,
    defaultHeight: 800,
  },
  notes: {
    key: "notes",
    label: "Sticky Notes",
    description: "Quick notes & reminders",
    icon: "📝",
    defaultWidth: 400,
    defaultHeight: 300,
  },
  "purchasing-receiving": {
    key: "purchasing-receiving",
    label: "Purchasing & Receiving",
    description: "Order guide, receiving, inventory lots, and ledger",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "integration-command-center": {
    key: "integration-command-center",
    label: "Integration Command Center",
    description: "Admin hub for external systems, outlets, GL codes, invoice routing, and OS integration",
    icon: "🔌",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "genesis-a": {
    key: "genesis-a",
    label: "LUCCCA Genesis (A)",
    description: "Phase A — Property & Scale awareness",
    icon: "✨",
    defaultWidth: 760,
    defaultHeight: 620,
  },
  "genesis-b": {
    key: "genesis-b",
    label: "LUCCCA Genesis (B)",
    description:
      "Commissaries, internal fulfillment rules, APN cost attribution, cadence",
    icon: "⚙️",
    defaultWidth: 860,
    defaultHeight: 720,
  },
  "genesis-c": {
    key: "genesis-c",
    label: "LUCCCA Genesis (C)",
    description: "Phase C — Procurement Planning & Strategic Fulfillment",
    icon: "🛒",
    defaultWidth: 1100,
    defaultHeight: 800,
  },
  "genesis-d": {
    key: "genesis-d",
    label: "LUCCCA Genesis D",
    description: "Cost attribution rules (who pays COGS, who gets credit)",
    icon: "⚖️",
    defaultWidth: 1100,
    defaultHeight: 800,
  },
  "genesis-e-outlet": {
    key: "genesis-e-outlet",
    label: "Genesis E — Outlet Requests",
    description:
      "Order from commissaries with auto accounting + inventory movement.",
    icon: "📥",
    defaultWidth: 1000,
    defaultHeight: 760,
  },
  "genesis-e-commissary": {
    key: "genesis-e-commissary",
    label: "Genesis E — Commissary Queue",
    description:
      "Pick/pack/fulfill internal orders; posts inventory + Aurum automatically.",
    icon: "📦",
    defaultWidth: 1100,
    defaultHeight: 800,
  },
  "genesis-f": {
    key: "genesis-f",
    label: "Genesis F — Procurement Calendar",
    description:
      "Vendor delivery schedule with cutoff deadlines. Groups orders to prevent missed events and maximize consolidation.",
    icon: "📅",
    defaultWidth: 1100,
    defaultHeight: 800,
  },
  "genesis-g": {
    key: "genesis-g",
    label: "Genesis G — Inventory Offsets & Surplus",
    description:
      "Multi-location inventory tracking with automatic procurement offsets and surplus broadcast.",
    icon: "📦",
    defaultWidth: 1000,
    defaultHeight: 760,
  },
  "genesis-h": {
    key: "genesis-h",
    label: "Genesis H — Standing PAR & Lead-Time",
    description:
      "Production lead-times, standing inventory targets (PARs), and early production recommendations.",
    icon: "⏰",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  aurum: {
    key: "aurum",
    label: "EchoAurum",
    description: "Financial forecasting & P&L impact analysis",
    icon: "",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  layout: {
    key: "layout",
    label: "Floor Plan Studio",
    description: "Floor plan optimization & capacity analysis",
    icon: "",
    defaultWidth: 900,
    defaultHeight: 650,
  },
  wine: {
    key: "wine",
    label: "Wine Sommelier",
    description: "AI wine pairings & margin optimization",
    icon: "🍷",
    defaultWidth: 1000,
    defaultHeight: 650,
  },
  stratus: {
    key: "stratus",
    label: "EchoStratus",
    description: "Weather & demand forecasting",
    icon: "",
    defaultWidth: 900,
    defaultHeight: 650,
  },
  staffing: {
    key: "staffing",
    label: "Staff Optimization",
    description: "Analyze optimal staffing levels and cost savings",
    icon: "👥",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  scheduling: {
    key: "scheduling",
    label: "Auto-Scheduling",
    description: "AI-generated staff schedules optimized for costs and quality",
    icon: "📆",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  revenue: {
    key: "revenue",
    label: "Revenue Operations",
    description:
      "Integrated revenue forecasting, cost analysis, and pricing optimization",
    icon: "💹",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  costs: {
    key: "costs",
    label: "Cost Management",
    description: "Track, analyze, and optimize all operational expenses",
    icon: "💰",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  qa: {
    key: "qa",
    label: "Quality Assurance",
    description:
      "Recipe standards, procedures, compliance tracking & audit trails",
    icon: "✓",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  guest: {
    key: "guest",
    label: "Guest Experience",
    description:
      "Reservation management, feedback analysis, preference tracking & loyalty insights",
    icon: "👥",
    defaultWidth: 1100,
    defaultHeight: 700,
  },
  supply: {
    key: "supply",
    label: "Supply Chain",
    description:
      "Supplier management, inventory optimization, waste reduction & procurement analytics",
    icon: "🚚",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  voice: {
    key: "voice",
    label: "Voice Commands",
    description:
      "Voice-to-action control, real-time guidance, and audio instructions",
    icon: "🎤",
    defaultWidth: 1000,
    defaultHeight: 750,
  },
  canvas: {
    key: "canvas",
    label: "Unified Canvas",
    description:
      "Multi-team collaboration, permission layers, and shared context",
    icon: "📐",
    defaultWidth: 1100,
    defaultHeight: 800,
  },
  "ai-chef": {
    key: "ai-chef",
    label: "AI Cooking Assistant",
    description: "Real-time guidance, problem solving, and recipe innovation",
    icon: "🧑‍🍳",
    defaultWidth: 1000,
    defaultHeight: 750,
  },
  maintenance: {
    key: "maintenance",
    label: "Predictive Maintenance",
    description:
      "Equipment health monitoring, staff fatigue tracking, customer churn prediction & proactive alerts",
    icon: "⚙️",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  templates: {
    key: "templates",
    label: "Template Marketplace",
    description:
      "Share, discover, and monetize operational templates - menus, recipes, workflows, schedules, events, and training",
    icon: "📦",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  network: {
    key: "network",
    label: "Network Marketplace",
    description:
      "Bulk buying power with vetted suppliers & talent exchange network for temp staffing",
    icon: "🤝",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  benchmark: {
    key: "benchmark",
    label: "Industry Benchmarking",
    description:
      "Compare performance against industry standards, track trends, and discover competitive insights",
    icon: "📊",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  zaro: {
    key: "zaro",
    label: "ZARO Guardian",
    description:
      "Repository snapshots, integrity checks, and emergency restore - Developer mode only",
    icon: "🔐",
    defaultWidth: 1000,
    defaultHeight: 750,
  },
  "multi-property": {
    key: "multi-property",
    label: "Multi-Property Management",
    description: "Cross-location analytics & consolidated reporting",
    icon: "🏢",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "job-sharing": {
    key: "job-sharing",
    label: "Job Sharing & Skills",
    description: "Advanced job sharing model with skill-based assignments",
    icon: "👥",
    defaultWidth: 1100,
    defaultHeight: 750,
  },
  pto: {
    key: "pto",
    label: "PTO Management",
    description: "Approval workflow & coverage planning",
    icon: "📅",
    defaultWidth: 1100,
    defaultHeight: 750,
  },
  analytics: {
    key: "analytics",
    label: "Custom Analytics",
    description: "Real-time executive dashboard with custom metrics",
    icon: "📈",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  mobile: {
    key: "mobile",
    label: "Mobile Enhancements",
    description: "Offline capabilities & push notifications",
    icon: "📱",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  "echo-chat": {
    key: "echo-chat",
    label: "EchoChat",
    description:
      "Enterprise team chat with video calls, presence detection, and hospitality alerts",
    icon: "💬",
    defaultWidth: 1000,
    defaultHeight: 750,
  },
  "echo-events": {
    key: "echo-events",
    label: "Events Board",
    description:
      "Event planning, 3D layout design, guest management, and analytics",
    icon: "📅",
    defaultWidth: 1400,
    defaultHeight: 900,
  },
  "echowaste": {
    key: "echowaste",
    label: "EchoWaste · Waste Intelligence",
    description:
      "Capture, track, and analyze food waste with AI-powered vision and voice logging",
    icon: "🗑️",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "ecw-menu-builder": {
    key: "ecw-menu-builder",
    label: "ECW · Menu Builder",
    description:
      "Excel-style menu editor · station → item → component · live cost/margin · push to mobile",
    icon: "🍽️",
    defaultWidth: 1300,
    defaultHeight: 850,
  },
  "ecw-procurement": {
    key: "ecw-procurement",
    label: "ECW · Procurement Hub",
    description:
      "Mobile requisitions → PO → receive → audit. Approval chain + vendor pricing + ETA + variance tracking",
    icon: "🚚",
    defaultWidth: 1200,
    defaultHeight: 850,
  },
  "global-calendar": {
    key: "global-calendar",
    label: "Global Calendar",
    description:
      "View events across all outlets with role-based visibility and filtering",
    icon: "📅",
    defaultWidth: 1100,
    defaultHeight: 800,
  },
  "foh-concierge-hub": {
    key: "foh-concierge-hub",
    label: "Local Guide",
    description:
      "Local places, area events, and 7-day in-house schedule for concierge teams",
    icon: "🛎️",
    defaultWidth: 1100,
    defaultHeight: 780,
  },
  "echo-concierge": {
    key: "echo-concierge",
    label: "Concierge Desk · Orchestration",
    description:
      "Guest experience orchestration layer — lookup, experience composer (AI), requests, vendors, revenue",
    icon: "🌟",
    defaultWidth: 1400,
    defaultHeight: 860,
  },
  "daily-standup": {
    key: "daily-standup",
    label: "Daily Standup · Sailing Yacht",
    description:
      "Morning briefing — each department contributes, Front Office confirms, we email it out",
    icon: "⚓",
    defaultWidth: 1400,
    defaultHeight: 880,
  },
  "people-admin": {
    key: "people-admin",
    label: "People & Operations · Admin",
    description:
      "Employee directory · Hours of Operation · Leadership Coverage — all feed the Daily Standup",
    icon: "👥",
    defaultWidth: 1400,
    defaultHeight: 880,
  },
  "concierge-mobile-admin": {
    key: "concierge-mobile-admin",
    label: "Guest Companion · Mobile Links",
    description:
      "Mint magic-link companion tokens for guests, generate QR codes, share via SMS/email, revoke expired links.",
    icon: "📱",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "daily-briefing-admin": {
    key: "daily-briefing-admin",
    label: "Daily Briefing · Mobile Links",
    description:
      "Mint mobile briefing tokens for staff who missed the morning standup. Auto-pushes via email when the daily board is sent.",
    icon: "📣",
    defaultWidth: 1040,
    defaultHeight: 760,
  },
  "role-assigner": {
    key: "role-assigner",
    label: "Role Assigner · Staff Access",
    description:
      "Promote staff between general, salary, manager, and owner. Drives what the /m/staff/:token mobile app renders per user.",
    icon: "🔐",
    defaultWidth: 960,
    defaultHeight: 780,
  },
  "settings-overhaul": {
    key: "settings-overhaul",
    label: "Settings",
    description:
      "Apple-style preferences. Themes, fonts, integrations status, data & privacy controls — applies across every module.",
    icon: "⚙",
    defaultWidth: 1040,
    defaultHeight: 720,
  },
  "luccca-jarvis-dashboard": {
    key: "luccca-jarvis-dashboard",
    label: "Luccca · Executive Dashboard",
    description:
      "JARVIS-level command overview. 8 KPI tiles, AI narrative, top ticket categories, upcoming celebrations. Customisable tiles, share-with-team.",
    icon: "🎯",
    defaultWidth: 1360,
    defaultHeight: 880,
  },
  "lifestyle-dashboard": {
    key: "lifestyle-dashboard",
    label: "Lifestyle Command",
    description:
      "Director of Lifestyle's activation calendar, revenue × engagement, attendance forecast, cross-dept coordination",
    icon: "🌅",
    defaultWidth: 1480,
    defaultHeight: 900,
  },
  "relay": {
    key: "relay",
    label: "Relay · Tickets",
    description:
      "Lean ticket intake for every department. Mirror to Concierge Mission Control when needed.",
    icon: "🎫",
    defaultWidth: 1200,
    defaultHeight: 820,
  },
  "my-schedule": {
    key: "my-schedule",
    label: "My Schedule",
    description:
      "Your personal schedule view. Birthday, anniversary & promotion recognition lands here.",
    icon: "📅",
    defaultWidth: 1120,
    defaultHeight: 820,
  },
  "appearance-settings": {
    key: "appearance-settings",
    label: "Appearance & Settings",
    description:
      "Theme · typography · dashboard · notifications · privacy · integrations",
    icon: "⚙️",
    defaultWidth: 1180,
    defaultHeight: 860,
  },
  "change-feed": {
    key: "change-feed",
    label: "Change Feed",
    description:
      "Real-time event feed with conflict notifications and escalations",
    icon: "⚡",
    defaultWidth: 450,
    defaultHeight: 600,
  },
  "event-scheduler": {
    key: "event-scheduler",
    label: "Event Scheduler",
    description: "Create and validate events through governance pipeline",
    icon: "📅",
    defaultWidth: 480,
    defaultHeight: 700,
  },
  "maintenance-scheduler": {
    key: "maintenance-scheduler",
    label: "Maintenance Scheduler",
    description: "Schedule engineering work while respecting event schedules",
    icon: "🔧",
    defaultWidth: 480,
    defaultHeight: 650,
  },
  "override-center": {
    key: "override-center",
    label: "Override Center",
    description: "EC/Director approval center for space governance conflicts",
    icon: "👔",
    defaultWidth: 520,
    defaultHeight: 700,
  },
  "override-center-gate": {
    key: "override-center-gate",
    label: "Override Center (Secured)",
    description: "Role-gated EC/Director approval center (level 4+)",
    icon: "🔐",
    defaultWidth: 520,
    defaultHeight: 700,
  },
  "audit-timeline": {
    key: "audit-timeline",
    label: "Audit Timeline",
    description: "Forensic timeline for compliance and dispute resolution",
    icon: "📋",
    defaultWidth: 540,
    defaultHeight: 700,
  },
  "event-detail-drawer": {
    key: "event-detail-drawer",
    label: "Event Details",
    description: "View detailed operational intelligence for an event",
    icon: "📅",
    defaultWidth: 520,
    defaultHeight: 700,
  },
  "conflict-dashboard": {
    key: "conflict-dashboard",
    label: "Conflict Dashboard",
    description: "Multi-event conflict view grouped by date and space",
    icon: "⚠️",
    defaultWidth: 540,
    defaultHeight: 700,
  },
  "exec-command-console": {
    key: "exec-command-console",
    label: "Exec Command Console",
    description:
      "Executive KPI cockpit with operational snapshot and drill-down",
    icon: "👔",
    defaultWidth: 720,
    defaultHeight: 800,
  },
  "event-risk-dashboard": {
    key: "event-risk-dashboard",
    label: "Event Risk Dashboard",
    description: "Portfolio view of event health scores and risk metrics",
    icon: "📊",
    defaultWidth: 800,
    defaultHeight: 800,
  },
  "risk-heatmap": {
    key: "risk-heatmap",
    label: "Risk Heatmap",
    description:
      "Spatial visualization of operational risk across spaces and venues",
    icon: "🗺️",
    defaultWidth: 900,
    defaultHeight: 800,
  },
  "echo-canva-cake-order": {
    key: "echo-canva-cake-order",
    label: "Cake Order & Builder",
    description:
      "AI-powered cake design, customization, and order workflow with 3D preview",
    icon: "🎂",
    defaultWidth:
      typeof window !== "undefined"
        ? Math.min(window.innerWidth - 100, 1200)
        : 1200,
    defaultHeight:
      typeof window !== "undefined"
        ? Math.min(window.innerHeight - 140, 800)
        : 800,
  },
  "echo-canva-design-editor": {
    key: "echo-canva-design-editor",
    label: "Design Editor",
    description:
      "Professional image editing with 50+ tools, AI generative capabilities, and real-time collaboration",
    icon: "🎨",
    defaultWidth:
      typeof window !== "undefined"
        ? Math.min(window.innerWidth - 100, 1400)
        : 1400,
    defaultHeight:
      typeof window !== "undefined"
        ? Math.min(window.innerHeight - 140, 900)
        : 900,
  },
  "hr-payroll": {
    key: "hr-payroll",
    label: "HR & Payroll",
    description: "Outlet-level payroll runs, approvals, and HR analytics",
    icon: "👥",
    defaultWidth:
      typeof window !== "undefined"
        ? Math.min(window.innerWidth - 100, 950)
        : 950,
    defaultHeight:
      typeof window !== "undefined"
        ? Math.min(window.innerHeight - 140, 700)
        : 700,
  },
  "group-resume-print": {
    key: "group-resume-print",
    label: "Group Resume Print",
    description: "Print-view of group booking with all events and BEOs",
    icon: "🖨️",
    defaultWidth:
      typeof window !== "undefined"
        ? Math.min(window.innerWidth - 100, 900)
        : 900,
    defaultHeight:
      typeof window !== "undefined"
        ? Math.min(window.innerHeight - 140, 600)
        : 600,
  },
  "production-sheet": {
    key: "production-sheet",
    label: "Production Sheets",
    description: "Station-specific prep lists from banquet orders",
    icon: "📋",
    defaultWidth:
      typeof window !== "undefined"
        ? Math.min(window.innerWidth - 100, 800)
        : 800,
    defaultHeight:
      typeof window !== "undefined"
        ? Math.min(window.innerHeight - 140, 600)
        : 600,
  },
  "purchasing-plan": {
    key: "purchasing-plan",
    label: "Purchase Plan",
    description: "Ingredient requirements and purchase deltas",
    icon: "📦",
    defaultWidth:
      typeof window !== "undefined"
        ? Math.min(window.innerWidth - 100, 900)
        : 900,
    defaultHeight:
      typeof window !== "undefined"
        ? Math.min(window.innerHeight - 140, 650)
        : 650,
  },
  "labor-plan": {
    key: "labor-plan",
    label: "Labor Plan",
    description: "Station-by-station staffing requirements and deltas",
    icon: "👥",
    defaultWidth:
      typeof window !== "undefined"
        ? Math.min(window.innerWidth - 100, 900)
        : 900,
    defaultHeight:
      typeof window !== "undefined"
        ? Math.min(window.innerHeight - 140, 700)
        : 700,
  },
  "recipe-library": {
    key: "recipe-library",
    label: "Recipe Library",
    description: "Master recipes with ingredients and yield factors",
    icon: "👨‍🍳",
    defaultWidth:
      typeof window !== "undefined"
        ? Math.min(window.innerWidth - 100, 1000)
        : 1000,
    defaultHeight:
      typeof window !== "undefined"
        ? Math.min(window.innerHeight - 140, 700)
        : 700,
  },
  "optimized-orders": {
    key: "optimized-orders",
    label: "Optimized Vendor Orders",
    description: "Cost-optimized vendor packs for purchase",
    icon: "📦",
    defaultWidth:
      typeof window !== "undefined"
        ? Math.min(window.innerWidth - 100, 950)
        : 950,
    defaultHeight:
      typeof window !== "undefined"
        ? Math.min(window.innerHeight - 140, 750)
        : 750,
  },
  "procurement-plan": {
    key: "procurement-plan",
    label: "Procurement Plan",
    description:
      "Multi-event vendor orders grouped by delivery day (Genesis C).",
    icon: "🧾",
    defaultWidth:
      typeof window !== "undefined"
        ? Math.min(window.innerWidth - 100, 1100)
        : 1100,
    defaultHeight:
      typeof window !== "undefined"
        ? Math.min(window.innerHeight - 140, 800)
        : 800,
  },
  "echo-advisory": {
    key: "echo-advisory",
    label: "Echo Advisory",
    description: "Operational impact analysis and recommendations",
    icon: "💡",
    defaultWidth:
      typeof window !== "undefined"
        ? Math.min(window.innerWidth - 100, 900)
        : 900,
    defaultHeight:
      typeof window !== "undefined"
        ? Math.min(window.innerHeight - 140, 750)
        : 750,
  },
  "group-intelligence": {
    key: "group-intelligence",
    label: "Group Intelligence",
    description:
      "Consolidated purchasing, labor, and costs across multi-day groups",
    icon: "🏢",
    defaultWidth:
      typeof window !== "undefined"
        ? Math.min(window.innerWidth - 100, 1100)
        : 1100,
    defaultHeight:
      typeof window !== "undefined"
        ? Math.min(window.innerHeight - 140, 800)
        : 800,
  },
  "inventory-mini": {
    key: "inventory-mini",
    label: "Inventory — Mini",
    description:
      "Daily snapshot + health + surplus broadcast + quick adjustments (Genesis G).",
    icon: "📊",
    defaultWidth: 900,
    defaultHeight: 650,
  },
  "inventory-health-leaderboard": {
    key: "inventory-health-leaderboard",
    label: "Inventory Health Leaderboard",
    description:
      "Location rankings by inventory data quality and responsiveness (Genesis G).",
    icon: "🏆",
    defaultWidth: 1100,
    defaultHeight: 800,
  },
  "inventory-rewards": {
    key: "inventory-rewards",
    label: "Inventory Rewards",
    description:
      "Streaks + recognition feed with ChefNet optional integration (U4.9).",
    icon: "🏆",
    defaultWidth: 980,
    defaultHeight: 720,
  },
  genesis_single_queue_ops: {
    key: "genesis_single_queue_ops",
    label: "Genesis E — Single Queue Ops",
    description:
      "Combined procurement orchestrator: merge E/F/G/H logic into unified plan",
    icon: "📥",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  genesis_auth_permissions: {
    key: "genesis_auth_permissions",
    label: "Genesis Auth & Permissions",
    description: "User management, role assignment, and permission matrix",
    icon: "🔐",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  genesis_rewards: {
    key: "genesis_rewards",
    label: "Genesis Rewards",
    description:
      "User & team scoring, achievements, and operational excellence",
    icon: "⭐",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  genesis_handshake_inspector: {
    key: "genesis_handshake_inspector",
    label: "Genesis Handshake Inspector",
    description:
      "Audit log: genesis.* and aurum.* events with idempotency tracing",
    icon: "🔍",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  genesis_onboarding: {
    key: "genesis_onboarding",
    label: "Genesis Onboarding",
    description:
      "Initialize Genesis configuration: outlets, commissaries, vendors, and PAR levels",
    icon: "🚀",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  genesis_internal_fulfillment_queue: {
    key: "genesis_internal_fulfillment_queue",
    label: "Internal Fulfillment Queue",
    description:
      "Manage internal commissary requests and fulfillment operations with role-based gating",
    icon: "📦",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  genesis_c_procurement: {
    key: "genesis_c_procurement",
    label: "Genesis C — Procurement Plan",
    description:
      "Run combined procurement across vendors and consolidate demand into optimized delivery schedules",
    icon: "📋",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  genesis_d_cost_admin: {
    key: "genesis_d_cost_admin",
    label: "Genesis D — Cost Attribution Admin",
    description:
      "Manage cost attribution rules that determine who pays for procurement costs",
    icon: "💰",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  genesis_f_vendor_calendar: {
    key: "genesis_f_vendor_calendar",
    label: "Genesis F — Vendor Drops Calendar",
    description:
      "View vendor delivery schedules, lead times, and consolidation preferences",
    icon: "🚚",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  genesis_demo_walkthrough: {
    key: "genesis_demo_walkthrough",
    label: "Genesis Demo Walkthrough",
    description:
      "Interactive guided tour through the Genesis procurement system with sample data",
    icon: "📚",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  genesis_echo_why: {
    key: "genesis_echo_why",
    label: "Genesis EchoWhy",
    description:
      "Diagnostic panel explaining procurement decisions, demand mapping, and cost attribution",
    icon: "💡",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  engineering: {
    key: "engineering",
    label: "Engineering & HVAC",
    description:
      "Temperature control, HVAC scheduling, and facility management for events",
    icon: "❄️",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "engineering-hvac": {
    key: "engineering-hvac",
    label: "Engineering & HVAC",
    description:
      "Temperature control, HVAC scheduling, and facility management for events",
    icon: "❄️",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  notifications: {
    key: "notifications",
    label: "Notifications",
    description:
      "Multi-channel notification center with smart batching and preferences",
    icon: "🔔",
    defaultWidth: 800,
    defaultHeight: 700,
  },
  "notification-center": {
    key: "notification-center",
    label: "Notification Center",
    description:
      "Multi-channel notification center with smart batching and preferences",
    icon: "🔔",
    defaultWidth: 800,
    defaultHeight: 700,
  },
  "menu-versioning": {
    key: "menu-versioning",
    label: "Menu Versioning",
    description:
      "Track menu changes, rollback versions, and analyze impact on BEOs",
    icon: "📋",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "menu-versions": {
    key: "menu-versions",
    label: "Menu Versions",
    description:
      "Track menu changes, rollback versions, and analyze impact on BEOs",
    icon: "📋",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  waitlist: {
    key: "waitlist",
    label: "Waitlist Management",
    description:
      "Auto-add, prioritize, and convert waitlist entries to bookings",
    icon: "⏰",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "waitlist-management": {
    key: "waitlist-management",
    label: "Waitlist Management",
    description:
      "Auto-add, prioritize, and convert waitlist entries to bookings",
    icon: "⏰",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "client-import": {
    key: "client-import",
    label: "Client Data Import",
    description:
      "Import existing clients from CSV or Excel with validation and mapping",
    icon: "📥",
    defaultWidth: 1000,
    defaultHeight: 800,
  },
  "client-data-import": {
    key: "client-data-import",
    label: "Client Data Import",
    description:
      "Import existing clients from CSV or Excel with validation and mapping",
    icon: "📥",
    defaultWidth: 1000,
    defaultHeight: 800,
  },
  onboarding: {
    key: "onboarding",
    label: "Onboarding",
    description:
      "Quick setup wizard and guided tour for new users",
    icon: "🎯",
    defaultWidth: 900,
    defaultHeight: 700,
  },
  "onboarding-wizard": {
    key: "onboarding-wizard",
    label: "Onboarding Wizard",
    description:
      "Quick setup wizard and guided tour for new users",
    icon: "🎯",
    defaultWidth: 900,
    defaultHeight: 700,
  },
  "beo-execution": {
    key: "beo-execution",
    label: "BEO Execution",
    description:
      "Pre-event checklist, day-of coordination, and post-event analysis",
    icon: "✅",
    defaultWidth: 1200,
    defaultHeight: 900,
  },
  "beo-workflow": {
    key: "beo-workflow",
    label: "BEO Workflow",
    description:
      "Pre-event checklist, day-of coordination, and post-event analysis",
    icon: "✅",
    defaultWidth: 1200,
    defaultHeight: 900,
  },
  "panel-system": {
    key: "panel-system",
    label: "Panel System",
    description:
      "Panel system integration verification and enhancements",
    icon: "🔧",
    defaultWidth: 1000,
    defaultHeight: 800,
  },
  "panel-verification": {
    key: "panel-verification",
    label: "Panel Verification",
    description:
      "Panel system integration verification and enhancements",
    icon: "🔧",
    defaultWidth: 1000,
    defaultHeight: 800,
  },
  "module-status": {
    key: "module-status",
    label: "Module Status Dashboard",
    description:
      "Real-time tracking of all module loading status, errors, and performance",
    icon: "📊",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "module-diagnostics": {
    key: "module-diagnostics",
    label: "Module Diagnostics",
    description:
      "Comprehensive module diagnostics and health monitoring",
    icon: "🔍",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "ux-optimization": {
    key: "ux-optimization",
    label: "UX Optimization",
    description:
      "Minimize clicks, enable batch operations, and configure shortcuts",
    icon: "⚡",
    defaultWidth: 1200,
    defaultHeight: 900,
  },
  "security-compliance": {
    key: "security-compliance",
    label: "Security & Compliance",
    description:
      "Role-based access control, audit trails, and GDPR compliance",
    icon: "🔒",
    defaultWidth: 1200,
    defaultHeight: 900,
  },
  security: {
    key: "security",
    label: "Security",
    description:
      "Role-based access control, audit trails, and GDPR compliance",
    icon: "🔒",
    defaultWidth: 1200,
    defaultHeight: 900,
  },
  "maestro-banquets": {
    key: "maestro-banquets",
    label: "Maestro Banquets",
    description:
      "Banquet operations, menu management, and EchoAI^3 orchestration",
    icon: "🎉",
    defaultWidth: 1400,
    defaultHeight: 1000,
  },
  banquets: {
    key: "banquets",
    label: "Banquets",
    description:
      "Banquet operations, menu management, and EchoAI^3 orchestration",
    icon: "🎉",
    defaultWidth: 1400,
    defaultHeight: 1000,
  },
  "performance-tracking": {
    key: "performance-tracking",
    label: "Performance Tracking",
    description:
      "Enhanced performance tracking with EchoAI^3 insights, skills matrix, and development plans",
    icon: "📊",
    defaultWidth: 1400,
    defaultHeight: 1000,
  },
  "enhanced-performance": {
    key: "enhanced-performance",
    label: "Enhanced Performance",
    description:
      "Comprehensive employee performance analysis powered by EchoAI^3",
    icon: "📈",
    defaultWidth: 1400,
    defaultHeight: 1000,
  },
  "ai-schedule-generator": {
    key: "ai-schedule-generator",
    label: "AI Schedule Generator",
    description:
      "Automatically generate optimal schedules from BEO/REO events using AI",
    icon: "🤖",
    defaultWidth: 1400,
    defaultHeight: 1000,
  },
  "beo-schedule-integration": {
    key: "beo-schedule-integration",
    label: "BEO Schedule Integration",
    description:
      "Seamless integration from BEO creation to automated schedule generation",
    icon: "🔗",
    defaultWidth: 1400,
    defaultHeight: 1000,
  },
  "high-volume-scheduling": {
    key: "high-volume-scheduling",
    label: "High-Volume Scheduling",
    description:
      "Process 100+ BEOs per week with automated conflict detection and shortage forecasting",
    icon: "📊",
    defaultWidth: 1400,
    defaultHeight: 1000,
  },
  "shortage-forecast": {
    key: "shortage-forecast",
    label: "Shortage Forecast",
    description:
      "Forecast staff shortages 4+ weeks ahead and generate job share opportunities",
    icon: "🔮",
    defaultWidth: 1400,
    defaultHeight: 1000,
  },
  "job-share-management": {
    key: "job-share-management",
    label: "Job Share Management",
    description:
      "Manage job share postings, Chef approvals, and employee assignments",
    icon: "💼",
    defaultWidth: 1400,
    defaultHeight: 1000,
  },
  "outlet-demand-forecast": {
    key: "outlet-demand-forecast",
    label: "Outlet Demand Forecast",
    description:
      "Forecast guest counts and peak times for outlets, generate job share opportunities",
    icon: "🏪",
    defaultWidth: 1400,
    defaultHeight: 1000,
  },
  "forecast-hub": {
    key: "forecast-hub",
    label: "ForecastHub",
    description: "Living 21-day forecast with overrides and outlet adjustments",
    icon: "📊",
    defaultWidth: 1400,
    defaultHeight: 900,
  },
  "trace-viewer": {
    key: "trace-viewer",
    label: "TraceViewer",
    description:
      "System-wide proof view: deterministic causality chain reconstruction for investor audit",
    icon: "🔗",
    defaultWidth: 1400,
    defaultHeight: 900,
  },
  "reconciliation-dashboard": {
    key: "reconciliation-dashboard",
    label: "Reconciliation",
    description: "Reconciliation reports, mismatch list, reason codes, trace links",
    icon: "📋",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  "labor-command-center": {
    key: "labor-command-center",
    label: "Labor Command Center",
    description: "Staffing recommendations, overtime sentinel, trace-backed",
    icon: "👥",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  "safety-controls": {
    key: "safety-controls",
    label: "Safety Controls",
    description: "Safe Mode, kill switch; RBAC; trace-backed",
    icon: "🛡️",
    defaultWidth: 500,
    defaultHeight: 500,
  },
  "allergen-impact-viewer": {
    key: "allergen-impact-viewer",
    label: "Allergen Impact",
    description: "Allergen propagation chain, trace links",
    icon: "⚠️",
    defaultWidth: 900,
    defaultHeight: 600,
  },
  "why-changed": {
    key: "why-changed",
    label: "Why Changed",
    description: "Delta explainer, causal breakdown, trace-backed",
    icon: "📉",
    defaultWidth: 800,
    defaultHeight: 600,
  },
  "cognitive-replay": {
    key: "cognitive-replay",
    label: "Cognitive Replay",
    description: "Trace chain replay, narrated explanation, citations",
    icon: "▶️",
    defaultWidth: 900,
    defaultHeight: 600,
  },
  "finance-explainability": {
    key: "finance-explainability",
    label: "Finance Explainability",
    description: "GL mapping, trace-backed deltas, export pack",
    icon: "💰",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  "plate-costing": {
    key: "plate-costing",
    label: "Plate Costing",
    description: "Cost analysis & margin optimization with EchoAI recommendations",
    icon: "📊",
    defaultWidth: 1200,
    defaultHeight: 700,
  },
  "ai3-intelligence": {
    key: "ai3-intelligence",
    label: "EchoAi³",
    description: "Synthetic Operational Intelligence — governed decision infrastructure across all modules",
    icon: "brain",
    defaultWidth: 1400,
    defaultHeight: 850,
  },
  "echoai3-canvas": {
    key: "echoai3-canvas",
    label: "EchoAi³ Canvas",
    description: "Natural language intelligence canvas — ask anything about resort operations",
    icon: "brain",
    defaultWidth: 1400,
    defaultHeight: 850,
  },
  "branch-explorer": {
    key: "branch-explorer",
    label: "Scenario Branch Explorer",
    description: "Multi-step decision tree analysis — chain scenarios to see compounding impacts",
    icon: "git-branch",
    defaultWidth: 1300,
    defaultHeight: 800,
  },
  "confidence-panel": {
    key: "confidence-panel",
    label: "Confidence Visualization",
    description: "Real-time confidence heatmap across all 9 intelligence domains",
    icon: "eye",
    defaultWidth: 1300,
    defaultHeight: 800,
  },
  "zaro-guardian": {
    key: "zaro-guardian",
    label: "ZARO Guardian",
    description: "Military-grade operational safety layer — Red Phoenix alert escalation",
    icon: "shield",
    defaultWidth: 1300,
    defaultHeight: 850,
  },
  "ingestion-panel": {
    key: "ingestion-panel",
    label: "Document Intelligence",
    description: "Upload and process PDFs, spreadsheets, invoices — AI classification and extraction",
    icon: "upload",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "supplier-catalog": {
    key: "supplier-catalog",
    label: "Supplier Catalog",
    description: "Sysco/US Foods catalog sync, price comparison, auto-PO generation",
    icon: "📦",
    defaultWidth: 1200,
    defaultHeight: 700,
  },
  "convention-management": {
    key: "convention-management",
    label: "Convention Management",
    description: "Trade show & convention breakout room and F&B package management",
    icon: "🏛",
    defaultWidth: 1100,
    defaultHeight: 700,
  },
  "energy-tracking": {
    key: "energy-tracking",
    label: "Energy Tracking",
    description: "Per-outlet energy consumption and utility cost tracking",
    icon: "⚡",
    defaultWidth: 1100,
    defaultHeight: 700,
  },
  "invoice-ocr": {
    key: "invoice-ocr",
    label: "Invoice OCR",
    description: "Gemini Vision-powered invoice scanning with auto PO matching",
    icon: "📄",
    defaultWidth: 1200,
    defaultHeight: 750,
  },
  "weather-forecast": {
    key: "weather-forecast",
    label: "Weather & Demand",
    description: "Weather forecast with F&B demand impact analysis and rain tracker",
    icon: "🌤",
    defaultWidth: 1100,
    defaultHeight: 700,
  },
  "admin-onboarding": {
    key: "admin-onboarding",
    label: "Admin & Onboarding",
    description: "Outlet management, user access control, GL code assignment",
    icon: "settings",
    defaultWidth: 1300,
    defaultHeight: 800,
  },
  "echo-events-report": {
    key: "echo-events-report",
    label: "EchoEvents Report",
    description: "Definite & Pending events with BEO numbers, revenue, and actual spend",
    icon: "file-text",
    defaultWidth: 1300,
    defaultHeight: 800,
  },
  "waste-sheet": {
    key: "waste-sheet",
    label: "Waste Sheet",
    description: "Culinary & Pastry waste tracking with EchoAuruim GL integration",
    icon: "trash-2",
    defaultWidth: 1300,
    defaultHeight: 800,
  },
  "menu-engineering": {
    key: "menu-engineering",
    label: "Menu Engineering",
    description: "Menu Engineering Matrix — Stars, Plowhorses, Puzzles, Dogs classification",
    icon: "bar-chart-3",
    defaultWidth: 1300,
    defaultHeight: 800,
  },
  "pos-menu-analytics": {
    key: "pos-menu-analytics",
    label: "Menu Performance Analytics",
    description: "Active POS menu items — yield-based costing, sales velocity, profit alerts, Star/Puzzle/Plowhorse/Dog by outlet",
    icon: "trending-up",
    defaultWidth: 1400,
    defaultHeight: 900,
  },
  "pos-connector": {
    key: "pos-connector",
    label: "POS Connector",
    description: "POS system integration framework — Toast, Aloha, Micros, Square, Clover",
    icon: "plug",
    defaultWidth: 1300,
    defaultHeight: 800,
  },
  "gl-sync": {
    key: "gl-sync",
    label: "GL Sync",
    description: "Accounting GL synchronization with QuickBooks, Sage, Xero",
    icon: "book-open",
    defaultWidth: 1300,
    defaultHeight: 800,
  },
  "banquet-intelligence": {
    key: "banquet-intelligence",
    label: "Banquet Intelligence",
    description: "Unified Knowledge Engine - Staffing, Layout, Risk, Pricing, Purchasing intelligence across 12 domains",
    icon: "brain",
    defaultWidth: 1200,
    defaultHeight: 750,
  },
  "scenario-planner": {
    key: "scenario-planner",
    label: "Scenario Planner",
    description: "What-If event scenario comparison - pricing, staffing, capacity, vendor impact analysis",
    icon: "git-compare",
    defaultWidth: 1300,
    defaultHeight: 800,
  },
  "menu-ingest": {
    key: "menu-ingest",
    label: "Menu Ingestion",
    description: "Seasonal PDF banquet menu upload, AI parsing, and pricing management",
    icon: "file-up",
    defaultWidth: 1200,
    defaultHeight: 750,
  },
  "client-portal": {
    key: "client-portal",
    label: "Client Portal",
    description: "Public-facing event planning estimator and warm lead generation portal",
    icon: "globe",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "fresh-meal-systems": {
    key: "fresh-meal-systems",
    label: "Fresh Meal Systems",
    description: "Manufacturing-grade orchestration for meal kits, subscriptions, grab-and-go, and multi-channel fulfillment",
    icon: "",
    defaultWidth: 1300,
    defaultHeight: 800,
  },
  "activity-timeline": {
    key: "activity-timeline",
    label: "Activity Timeline",
    description: "FSMA 204 audit feed · mock-recall forward+backward trace · unified state-change stream",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 780,
  },
  "cafeteria": {
    key: "cafeteria",
    label: "Cafeteria & Dining",
    description: "Institutional foodservice management: K-12, Higher Ed, Employee, Healthcare, Luxury Resort",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "fix-menu": {
    key: "fix-menu",
    label: "Fix My Menu",
    description: "AI-powered menu margin analysis and optimization suggestions",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 700,
  },
  "micro-market": {
    key: "micro-market",
    label: "Micro-Market & Smart Fridge",
    description: "Unmanned retail, smart fridge inventory, and auto-replenishment",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 700,
  },
  "mobile-order": {
    key: "mobile-order",
    label: "Mobile Preorder & Pickup",
    description: "Mobile ordering with locker pickup, time slots, and pickup verification",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 700,
  },
  "revenue-intelligence": {
    key: "revenue-intelligence",
    label: "Revenue Intelligence",
    description: "Cross-module analytics, margin recovery, yield variance benchmarking, and channel mix optimization",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 750,
  },
  "yield-alerts": {
    key: "yield-alerts",
    label: "Yield Alerts",
    description: "Automated threshold monitoring with configurable rules, severity levels, and alert history",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 700,
  },
  "district-benchmarking": {
    key: "district-benchmarking",
    label: "District Benchmarking",
    description: "Enterprise-wide site comparison with rankings, heat maps, and cross-property metrics",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 750,
  },
  "pos-gl-hub": {
    key: "pos-gl-hub",
    label: "POS & GL Hub",
    description: "Toast POS and QuickBooks Online integration with OAuth, sync, and webhooks",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 700,
  },
  "live-layout": {
    key: "live-layout",
    label: "Live Layout Collaboration",
    description: "Real-time collaborative room design with cursor sharing and live edits",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 700,
  },
  "vr-walkthrough": {
    key: "vr-walkthrough",
    label: "VR / 360 Walkthrough",
    description: "Panoramic room preview and virtual tours with hotspot navigation",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 750,
  },
  "purchasing-hub": {
    key: "purchasing-hub",
    label: "Purchasing & Receiving Hub",
    description: "Vendors, purchase orders, receiving log, Invoice OCR, and GL codes in one unified module",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 750,
  },
  "event-brief": {
    key: "event-brief",
    label: "AI Event Brief Generator",
    description: "Generate full BEO drafts from client inquiries using AI with menu, room, and staffing recommendations",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 750,
  },
  "event-cost-tracker": {
    key: "event-cost-tracker",
    label: "Event Cost Tracker",
    description: "Real-time P&L dashboard showing live cost and margin tracking for all events",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 750,
  },
  "financial-ops": {
    key: "financial-ops",
    label: "Financial Operations",
    description: "30-day simulation, P&L drill-down, invoice vault, purchasing pipeline, EchoAi³ analytics & forecasting",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "manager-dashboard": {
    key: "manager-dashboard",
    label: "My Operations",
    description: "Role-scoped P&L, budget alerts, GL drill-down with invoice popups, AI executive review",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 750,
  },
  "vendor-intel": {
    key: "vendor-intel",
    label: "Vendor Intelligence",
    description: "Side-by-side vendor pricing, rogue spend detection, price increase alerts",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 700,
  },
  "budget-center": {
    key: "budget-center",
    label: "Budget & Forecast",
    description: "Daily flash report, driver-based budget builder, 12-month view, forecast adjustments",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "executive-command": {
    key: "executive-command",
    label: "Executive Command",
    description: "Multi-outlet health dashboard with dials, drill-down, cross-outlet comparison, morning briefing, custom thresholds",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "admin-command": {
    key: "admin-command",
    label: "Admin Center",
    description: "User onboarding, outlet management, commissary config, data import, report export",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  // iter263 · Echo AURION Admin Console — platform-wide operations surface.
  "admin-console": {
    key: "admin-console",
    label: "Admin Console",
    description: "Platform Pulse · Users · System Updates · Installers · IT · Audit · Feature Flags · Tech Support",
    icon: "",
    defaultWidth: 1280,
    defaultHeight: 820,
  },
  "system-updates": {
    key: "system-updates",
    label: "System Updates",
    description: "Release channel, version, Windows-Update-style rollout",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 780,
  },
  "desktop-installers": {
    key: "desktop-installers",
    label: "Desktop Installers",
    description: "macOS / Windows / Linux / iOS / Android / MDM",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 720,
  },
  "it-operations": {
    key: "it-operations",
    label: "IT & Integrations",
    description: "Mongo, LLM key, Twilio, S3, email, payments — live health",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 720,
  },
  "audit-security": {
    key: "audit-security",
    label: "Audit & Security",
    description: "Recent login, role-change, and dangerous-action events",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 720,
  },
  "feature-flags": {
    key: "feature-flags",
    label: "Feature Flags",
    description: "Global + role-scoped feature toggles",
    icon: "",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  "tech-support": {
    key: "tech-support",
    label: "Echo AURION · Tech Support",
    description: "File a ticket with the Echo AURION platform team",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 760,
  },
  // iter263 · PurchRec Sprint 1 — casino-grade controls
  "purchrec-sprint1": {
    key: "purchrec-sprint1",
    label: "PurchRec · Sprint 1",
    description: "3-way match exception worklist + par-driven auto-PO scanner",
    icon: "",
    defaultWidth: 1300,
    defaultHeight: 820,
  },
  // iter263.2 · Vendor Scorecard + BEO Auto-Planner
  "vendor-scorecard": {
    key: "vendor-scorecard",
    label: "Vendor Scorecard",
    description: "Vendor performance grades, contract-rate compliance, rebate pipeline",
    icon: "",
    defaultWidth: 1300,
    defaultHeight: 820,
  },
  "beo-planner": {
    key: "beo-planner",
    label: "BEO Auto-Planner",
    description: "AI-driven prep + staffing + ordering for every BEO with cross-event audit",
    icon: "",
    defaultWidth: 1400,
    defaultHeight: 860,
  },
  "ird-builder": {
    key: "ird-builder",
    label: "IRD Menu Builder",
    description: "Drag-drop menu import · QR ordering · printer routing · amenities",
    icon: "",
    defaultWidth: 1400,
    defaultHeight: 860,
  },
  "spa-builder": {
    key: "spa-builder",
    label: "Spa Menu Builder",
    description: "Service catalog · QR booking · Spa Director / Manager",
    icon: "",
    defaultWidth: 1400,
    defaultHeight: 860,
  },
  "engineering-dash": {
    key: "engineering-dash",
    label: "Engineering Ops",
    description: "Work orders, equipment registry, PM schedules, maintenance alerts",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 750,
  },
  "dept-dashboard": {
    key: "dept-dashboard",
    label: "My Department",
    description: "Customized dashboard for Culinary, Pastry, F&B Director, or Events",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "analytics-engine": {
    key: "analytics-engine",
    label: "Analytics BI",
    description: "Craftable-class hospitality analytics — sales, labor, profit, server performance, trends",
    icon: "",
    defaultWidth: typeof window !== "undefined" ? Math.min(window.innerWidth - 80, 1400) : 1400,
    defaultHeight: typeof window !== "undefined" ? Math.min(window.innerHeight - 100, 850) : 850,
  },
  "spa-wellness": {
    key: "spa-wellness",
    label: "Spa & Wellness",
    description: "Spa reservations, treatment menu, CRM, and appointment management",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "spa-services-mgr": {
    key: "spa-services-mgr",
    label: "Spa Services",
    description: "Spa service catalog — auto-syncs to POS on every create/update/toggle. Public booking QR links here.",
    icon: "",
    defaultWidth: 1280,
    defaultHeight: 800,
  },
  "spa-pamphlet": {
    key: "spa-pamphlet",
    label: "Pamphlet Designer",
    description: "Design spa service pamphlets / brochures. Import PDF/AI/PSD/SVG. Export print-ready PDF with bleed + crop marks.",
    icon: "",
    defaultWidth: 1400,
    defaultHeight: 900,
  },
  "spa-command": {
    key: "spa-command",
    label: "Spa Command Center",
    description: "Hospitality-native spa operating brain. 8 zones: Today, Capacity/Yield, Revenue, Guest Intel, Staff, Retail, Memberships, Reputation.",
    icon: "",
    defaultWidth: 1440,
    defaultHeight: 900,
  },
  "pos-adapter": {
    key: "pos-adapter",
    label: "POS Connector",
    description: "Drains the LUCCCA outbound queue to Micros, Toast, webhook, or mock. Live delivery log + retry logic.",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 780,
  },
  "concierge-liability": {
    key: "concierge-liability",
    label: "Concierge Liability Filter",
    description: "Scans guest-facing notes for PII, medical claims, defamation, harassment, opinion, and binding-guarantee language before save.",
    icon: "",
    defaultWidth: 1280,
    defaultHeight: 820,
  },
  "spa-schedule-intel": {
    key: "spa-schedule-intel",
    label: "Spa Schedule Intelligence",
    description: "Action-oriented scheduling: fill gaps, protect premium slots, prompt upsells, rebalance therapist load.",
    icon: "",
    defaultWidth: 1340,
    defaultHeight: 860,
  },
  "eng-command": {
    key: "eng-command",
    label: "Engineering Command",
    description: "Predictive maintenance + uptime + utility + CapEx intelligence. Work orders, PM schedule, asset risk, technician productivity.",
    icon: "",
    defaultWidth: 1440,
    defaultHeight: 900,
  },
  "hskp-command": {
    key: "hskp-command",
    label: "Housekeeping Command",
    description: "Real-time occupancy readiness. Rooms, attendants, inspections, linen, turnover, guest signals, revenue-at-risk.",
    icon: "",
    defaultWidth: 1440,
    defaultHeight: 900,
  },
  "concierge-hub": {
    key: "concierge-hub",
    label: "Concierge Messages",
    description: "Unified intake & routing to Engineering · Housekeeping · Spa · IRD · FOH · Guest 360 with liability sanitization.",
    icon: "",
    defaultWidth: 1340,
    defaultHeight: 900,
  },
  "foh-command": {
    key: "foh-command",
    label: "FOH Command Dashboard",
    description: "Director / GM / Dining Room Mgr 3-role service command: pacing, sections, beverage, bottlenecks, VIPs.",
    icon: "",
    defaultWidth: 1480,
    defaultHeight: 920,
  },
  "guest360-hub": {
    key: "guest360-hub",
    label: "Guest 360 Hub",
    description: "Deep guest profile: preferences, allergies, loyalty tier, stay history, concierge touchpoints.",
    icon: "",
    defaultWidth: 1280,
    defaultHeight: 860,
  },
  "ird-hub": {
    key: "ird-hub",
    label: "IRD & Minibar",
    description: "In-room dining orders, delivery tracking, minibar restock queue, per-room consumption charges.",
    icon: "",
    defaultWidth: 1380,
    defaultHeight: 900,
  },
  "aurium-gm": {
    key: "aurium-gm",
    label: "EchoAurium GM",
    description: "Executive composite health roll-up across every command center + high-severity alerts.",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 820,
  },
  "stratus-forecast": {
    key: "stratus-forecast",
    label: "EchoStratus Forecast",
    description: "Director 6-week forecast: revenue, covers, labor, CapEx risk, linen demand, walk-in surges.",
    icon: "",
    defaultWidth: 1320,
    defaultHeight: 820,
  },
  "kds-expo": {
    key: "kds-expo",
    label: "KDS · Expo Command",
    description: "Kitchen Control Tower: live ticket grid, station health, all-day production, fire-course orchestration.",
    icon: "",
    defaultWidth: 1560,
    defaultHeight: 940,
  },
  "pattern-intelligence": {
    key: "pattern-intelligence",
    label: "Pattern Intelligence",
    description: "EchoStratus recurring-issue engine: cross-module pattern mining, returning-guest analytics, asset failure clusters, outlet drift + LLM remediation plans.",
    icon: "",
    defaultWidth: 1440,
    defaultHeight: 900,
  },
  "cake-viewer": {
    key: "cake-viewer",
    label: "Cake Viewer · 3D",
    description: "Three.js cake preview with per-tier UV texture wrapping, orbit camera, shareable session links.",
    icon: "",
    defaultWidth: 1280,
    defaultHeight: 820,
  },
  "eng-work-tickets": {
    key: "eng-work-tickets",
    label: "Engineering Ops",
    description: "Work tickets, staff scheduling, guest requests, ALICE-lite operations",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "integration-control": {
    key: "integration-control",
    label: "Integration Hub",
    description: "Configure and manage all 3rd party integrations",
    icon: "",
    defaultWidth: 1100,
    defaultHeight: 750,
  },
  "guest-booking": {
    key: "guest-booking",
    label: "Guest Booking",
    description: "Public-facing spa treatment booking",
    icon: "",
    defaultWidth: 900,
    defaultHeight: 700,
  },
  "echo-concierge": {
    key: "echo-concierge",
    label: "Concierge Desk",
    description: "Guest issue tracking, service recovery, department routing",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "echo-connect": {
    key: "echo-connect",
    label: "Echo Connect",
    description: "Internal messaging — department chat, staff directory",
    icon: "",
    defaultWidth: 1000,
    defaultHeight: 750,
  },
  "foh-operations": {
    key: "foh-operations",
    label: "Front of House",
    description: "Host stand, server sections, tips, guest feedback",
    icon: "",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  "retail-ops": { key: "retail-ops", label: "Retail Operations", description: "Gift shop, sundries — sales, inventory", icon: "", defaultWidth: 1100, defaultHeight: 750 },
  "guest-360": { key: "guest-360", label: "Guest 360", description: "Unified guest profile across all touchpoints", icon: "", defaultWidth: 1100, defaultHeight: 800 },
  "housekeeping": { key: "housekeeping", label: "Housekeeping", description: "Room status board, assignments, inspections", icon: "", defaultWidth: 1200, defaultHeight: 800 },
  "minibar-ird": { key: "minibar-ird", label: "IRD & Minibar", description: "In-room dining, minibar management, guest ordering", icon: "", defaultWidth: 1200, defaultHeight: 800 },
  "kitchen-routing": { key: "kitchen-routing", label: "Kitchen Routing", description: "Station and printer routing configuration per outlet", icon: "", defaultWidth: 1100, defaultHeight: 800 },
  "menu-design-studio": { key: "menu-design-studio", label: "Menu Design Studio", description: "Visual menu builder for all outlets", icon: "", defaultWidth: 1300, defaultHeight: 850 },
  "food-gallery": { key: "food-gallery", label: "Food Gallery", description: "Per-outlet food photography library", icon: "", defaultWidth: 1200, defaultHeight: 800 },
  "dish-assembly": { key: "dish-assembly", label: "Dish Assembly", description: "Component mapping, plating, and station routing", icon: "", defaultWidth: 1200, defaultHeight: 850 },
  "guest-intelligence": { key: "guest-intelligence", label: "Guest Intelligence", description: "Spend tracking, amenity history, allergens, special requests", icon: "", defaultWidth: 1300, defaultHeight: 850 },
  "gm-flash-report": { key: "gm-flash-report", label: "GM Daily Flash", description: "Executive morning briefing — occupancy, ADR, RevPAR, comp set, pace", icon: "", defaultWidth: 1300, defaultHeight: 900 },
  "chef-daily-report": { key: "chef-daily-report", label: "Chef Daily Report", description: "Kitchen ops briefing — covers, prep, 86'd, allergens, BEO, costs", icon: "", defaultWidth: 1300, defaultHeight: 900 },
  "chef-outlet-dashboard": { key: "chef-outlet-dashboard", label: "Chef Outlet Dashboard", description: "Orders, inventory, menu mix, Monte Carlo, labor, dream team — per outlet", icon: "", defaultWidth: 1500, defaultHeight: 900 },
  "beo-timeline-ui": { key: "beo-timeline-ui", label: "BEO Timeline (MaestroBqt)", description: "Month-strip timeline of all BEOs · multi-select cumulative · last-minute color tags · beverage network on-hand", icon: "", defaultWidth: 1600, defaultHeight: 900 },
  "forecast-21day": { key: "forecast-21day", label: "21-Day Forecast", description: "Operations forecast with Excel grid, charts, room states, outlet forecast, group blocks, AI trends", icon: "", defaultWidth: 1600, defaultHeight: 950 },
  "enterprise-bi-suite": { key: "enterprise-bi-suite", label: "Enterprise BI Suite", description: "STR comp set, P&L waterfall, multi-property portfolio, PMS bridge", icon: "", defaultWidth: 1400, defaultHeight: 900 },
  "performance-intelligence": { key: "performance-intelligence", label: "Performance Intelligence", description: "Labor vs BEO timeline, break-even analysis, department efficiency, ROI breakdown", icon: "", defaultWidth: 1400, defaultHeight: 900 },
  "chef-gio-training": { key: "chef-gio-training", label: "Chef Gio Training", description: "AI culinary training module powered by Executive Chef GioGenoa", icon: "", defaultWidth: 1400, defaultHeight: 900 },
  "chef-carissa-training": { key: "chef-carissa-training", label: "Chef Carissa Training", description: "AI pastry training module powered by Executive Pastry Chef Carissa — wedding cakes, plated desserts, bakery, viennoiserie", icon: "", defaultWidth: 1400, defaultHeight: 900 },
  "vip-admin-desktop": { key: "vip-admin-desktop", label: "VIP Atlas · Back Office", description: "Pre-enrichment of VIP profiles (photo, allergens, preferences, anniversaries) — flows live to mobile VIP Tracker", icon: "", defaultWidth: 1400, defaultHeight: 900 },
  "manager-workflow": { key: "manager-workflow", label: "Manager Workflow · Approvals & Chat", description: "PTO approvals, shift-swap sign-off, call-out queue, manager-on-duty WhatsApp-style chat, HR call-out policy. Decisions push back to MyEcho instantly.", icon: "", defaultWidth: 1300, defaultHeight: 900 },
  "reports-hub": { key: "reports-hub", label: "Reports Hub · One Source of Truth", description: "Unified reporting across 12 standard reports — Sales by Profit Center, Tender Mix, Server Sales, Covers/Avg Check, Labor vs Sales, Hourly Heatmap, Top Items, Tax breakdown, Voids/Comps audit, Roster, Terminals, GM Snapshot. Mirrors Agilysys natively.", icon: "", defaultWidth: 1500, defaultHeight: 900 },
  "kitchen-war-room": { key: "kitchen-war-room", label: "Kitchen War Room", description: "Live kitchen operations — ovens, carts, firing sequences, supplier alerts", icon: "", defaultWidth: 1400, defaultHeight: 900 },
  "kitchen-fire-expo": { key: "kitchen-fire-expo", label: "Kitchen Fire · Expo", description: "Expo workflow — fire courses, callouts, bumps, fire-back tracking", icon: "Flame", defaultWidth: 1400, defaultHeight: 900 },
  "commissary-ordering": { key: "commissary-ordering", label: "Commissary Ordering", description: "Browse catalog, build cart, submit orders, track pars-below auto-suggestions", icon: "Package", defaultWidth: 1400, defaultHeight: 900 },
  "qr-scanner": { key: "qr-scanner", label: "QR Scanner", description: "Camera-based scanner — punch, concierge magic-link, asset/PO lookup", icon: "QrCode", defaultWidth: 900, defaultHeight: 700 },
  "beverage-ops": { key: "beverage-ops", label: "Beverage Operations", description: "Bottle scanning, consumption bar, wine cellar, cocktail costing, seasonal programs", icon: "", defaultWidth: 1400, defaultHeight: 900 },
  "beo-menu-builder": { key: "beo-menu-builder", label: "BEO Menu Builder", description: "Dual-panel click-and-add menu builder with pricing, cost breakdown, and banquet menu catalog", icon: "", defaultWidth: 1500, defaultHeight: 950 },
  "mixology-rd-lab": { key: "mixology-rd-lab", label: "Mixology R&D Lab", description: "Flavor profiling, recipe builder, taste search, 55+ cocktail database with chemistry analysis", icon: "", defaultWidth: 1400, defaultHeight: 900 },
  "pos-router": { key: "pos-router", label: "POS Auto-Router", description: "Automatic menu item to POS routing with chit printer assignment, GL accounts, supplier alerts", icon: "", defaultWidth: 1500, defaultHeight: 950 },
  "outlet-menus": { key: "outlet-menus", label: "Outlet Menu Manager", description: "Multi-restaurant menu import, POS routing, dish assembly with production steps", icon: "", defaultWidth: 1400, defaultHeight: 900 },
  "ops-forecast": { key: "ops-forecast", label: "21-Day Ops Forecast", description: "Operations forecast with Excel grid, charts, room states, outlet forecast, group blocks, AI trends", icon: "", defaultWidth: 1600, defaultHeight: 950 },
  "group-resume": { key: "group-resume", label: "Group Resume Builder", description: "AI-powered group event resume creation with VIP tracking, room blocks, F&B, schedule of events", icon: "", defaultWidth: 1400, defaultHeight: 900 },
  "purchasing-engine": { key: "purchasing-engine", label: "Purchasing Requisition Engine", description: "Forecast-driven prep lists, ingredient aggregation, shortage alerts, purchase orders", icon: "", defaultWidth: 1400, defaultHeight: 900 },
  "culinary-recipe-builder": { key: "culinary-recipe-builder", label: "Culinary Recipe Builder", description: "Yield-based recipe costing with fuzzy ingredient search, EP/AP calculations, food cost %", icon: "", defaultWidth: 1400, defaultHeight: 900 },
  "inventory-receiving": { key: "inventory-receiving", label: "Inventory Receiving", description: "Scan deliveries against purchase requisitions, update par levels, variance tracking", icon: "", defaultWidth: 1400, defaultHeight: 900 },
  "menu-eng-matrix": { key: "menu-eng-matrix", label: "Menu Engineering Matrix", description: "Stars/Puzzles/Plowhorses/Dogs matrix with scatter plot, recommendations per outlet", icon: "", defaultWidth: 1400, defaultHeight: 900 },
  "schedule": { key: "schedule", label: "Schedule (Manager)", description: "Echo Schedule v2 — employee tier 1/2/3, position scheduled, in/out times, legal compliance, schedule checker. All departments (BOH culinary, stewards, FOH restaurant, banquets, pool/rooftop, spa, engineering, housekeeping).", icon: "", defaultWidth: 1500, defaultHeight: 900 },
  "chronos": { key: "chronos", label: "Echo Chronos", description: "Operational time machine — portfolio health grid of all the outlets you oversee, with drill-down to 16 KPI sparkline tiles per outlet, time slider, event pins, Monte Carlo tomorrow-forecast, and side-by-side outlet compare (2-3 outlets). Auto-loads on sign-in for all salaried oversight roles.", icon: "", defaultWidth: 1600, defaultHeight: 940 },
  "property-pulse": { key: "property-pulse", label: "Property Pulse · Live Dashboard", description: "Pier Sixty-Six live dashboard — Pace · Cash Runway · Exceptions · 21-day Living Forecast · Lifecycle standup · Outlet Capture grid — with click-through to outlet trial-level retrospectives and the May P&L Close Why-Changed §1.1 drill.", icon: "", defaultWidth: 1500, defaultHeight: 940 },
  "pace-mtd": { key: "pace-mtd", label: "Pace · MTD Deep-Dive", description: "Month-to-date revenue + P10/P50/P90 projection per property and per outlet.", icon: "", defaultWidth: 1200, defaultHeight: 820 },
  "cash-runway-deep": { key: "cash-runway-deep", label: "Cash Runway · Deep-Dive", description: "P75 worst-quartile burn + largest-outflows ledger + acceleration trace.", icon: "", defaultWidth: 1200, defaultHeight: 820 },
  "exception-review-daily": { key: "exception-review-daily", label: "Exception Review · Daily", description: "Red/amber/green daily anomaly screen with historical ledger and severity trend.", icon: "", defaultWidth: 1200, defaultHeight: 820 },
  "vendor-pareto": { key: "vendor-pareto", label: "Vendor Pareto", description: "Vendor concentration risk + 80/20 spend ranking + diversification index.", icon: "", defaultWidth: 1200, defaultHeight: 820 },
  "cross-property-benchmark": { key: "cross-property-benchmark", label: "Cross-Property Benchmark", description: "Outlet-type cohort benchmarks across the portfolio (capture rate, RevPAR-equivalent, F&B contribution).", icon: "", defaultWidth: 1200, defaultHeight: 820 },
  "tip-audit-panel": { key: "tip-audit-panel", label: "Tip Audit", description: "Tip-share configuration audit + pool integrity validation + distribution reconciliation.", icon: "", defaultWidth: 1200, defaultHeight: 820 },
};

export function getAllPanels(): PanelMetadata[] {
  return Object.values(PANEL_METADATA) as PanelMetadata[];
}

export function getPanelMetadata(key: PanelKey): PanelMetadata | undefined {
  return PANEL_METADATA[key];
}

export function getDefaultPanelDimensions(key: PanelKey) {
  const metadata = PANEL_METADATA[key];
  return {
    width: metadata?.defaultWidth ?? 600,
    height: metadata?.defaultHeight ?? 400,
  };
}
