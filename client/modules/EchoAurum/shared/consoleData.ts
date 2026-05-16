import type { ConsoleOverview } from "./console";
export const consoleOverview: ConsoleOverview = {
  hero: {
    title: "EchoAurum Console",
    subtitle: "Live command surface for LUCCCA finance and treasury.",
    description:
      "Monitor ledger health, approve releases, and interrogate variances in one secure interface. Zelda, Argus, Phoenix, and Echo Ai³ work together to keep every posting auditable and reversible.",
  },
  metrics: [
    {
      label: "Entities streaming",
      value: "18 properties",
      change: "+3 vs last week",
    },
    {
      label: "Exceptions resolved",
      value: "96%",
      change: "12 flagged overnight",
    },
    {
      label: "Payment cycle time",
      value: "42 hrs",
      change: "-18% vs prior month",
    },
    {
      label: "Forecast confidence",
      value: "±1.9%",
      change: "4 week rolling window",
    },
  ],
  quickActions: [
    {
      title: "Approve ACH release",
      description:
        "6 ready batches across EchoLedger² entities with Zelda guardrails engaged.",
      action: "Review batches",
      to: "/console#invoice-payment",
    },
    {
      title: "Variance narratives",
      description:
        "Ai³ generated narratives for banquet overages and F&B overtime variance.",
      action: "Open narratives",
      to: "/console#forecast-studio",
    },
    {
      title: "Snapshot CPA binder",
      description:
        "Export Argus-approved binder with workpapers for LUCCCA Holdings Q2 close.",
      action: "Generate binder",
      to: "/console#cpa-portal",
    },
    {
      title: "Resolve receiving variance",
      description:
        "LUCCCA purchasing exchange flagged a shortage during dock check—sync with buyers before invoice approval.",
      action: "Open purchasing workspace",
      to: "/purchasing",
    },
  ],
  modules: [
    {
      id: "invoice-payment",
      badge: "AP",
      name: "Invoice & Payment Hub",
      summary:
        "Triad matching across PO, invoice, and receipt flows with Zelda duplicate detection and Argus audit evidence embedded in every payout.",
      metrics: [
        { label: "Invoices processed", value: "1,482 today" },
        { label: "Exceptions", value: "24 awaiting review" },
        { label: "Cash impact", value: "$612K releases" },
      ],
      controls: [
        "Real-time vendor exchange + Fintech ingestion with OCR confidence scoring",
        "Dynamic approval ladders mapped to LUCCCA policy tiers",
        "Payment rail routing across ACH, virtual card, and instant payouts",
      ],
      workflows: [
        "EchoSentinel flags duplicate vendors and blocked suppliers",
        "Treasury ladder recommends optimal release windows",
        "Audit trail exports align with SOC 2 and PCI obligations",
      ],
    },
    {
      id: "ledger-viewer",
      badge: "GL",
      name: "Ledger Viewer",
      summary:
        "Unified journal explorer with side-by-side source evidence, entity filters, and Phoenix-powered reversals down to individual TIMESTAMPTZ events.",
      metrics: [
        { label: "Entities consolidated", value: "18" },
        { label: "Latency", value: "126 ms ingest" },
        { label: "Adjustments", value: "3 pending" },
      ],
      controls: [
        "USALI + GAAP dual-book views with instant toggles",
        "Inline evidence previews with Zelda provenance tags",
        "Dimension filters for department, property, vendor, and program",
      ],
      workflows: [
        "Phoenix rollback enables safe restatement with full history",
        "Variance radar surfaces deltas vs. budget and prior period",
        "CPA view exports trial balance, JE packet, and tie-out links",
      ],
    },
    {
      id: "pnl-engine",
      badge: "P&L",
      name: "Outlet P&L Engine",
      summary:
        "Outlet-level profitability mapped to cost centers, maintenance schedules, and payment timelines so finance can manage property EBITDA in real time.",
      metrics: [
        { label: "Outlets tracked", value: "3 live" },
        { label: "EBITDA variance", value: "+$38K vs plan" },
        { label: "Scheduled spend", value: "$52K due" },
      ],
      controls: [
        "USALI cost center hierarchy with drill-down to account codes",
        "Budget overlays with variance alerts per property",
        "Maintenance schedules synced to Argus evidence binder",
      ],
      workflows: [
        "Zapier automation pushes overdue maintenance to ServiceNow",
        "Payment timeline syncs with treasury release windows",
        "Cost center signals feed Echo Ai³ variance narratives",
      ],
    },
    {
      id: "architecture-system",
      badge: "Arch",
      name: "LUCCCA Financial Singularity",
      summary:
        "Dual-core architecture overview showing EchoAurum (financial intelligence) ↔ EchoStratus (predictive brain) connected via Synapse Mesh with Guardian AI oversight.",
      metrics: [
        { label: "Core systems", value: "2 operational" },
        { label: "Synapse latency", value: "<100ms" },
        { label: "Guardian status", value: "All active" },
      ],
      controls: [
        "EchoAurum: Deterministic GL, AP/AR, payments, compliance",
        "EchoStratus: Probabilistic forecasting, scenario modeling, optimization",
        "Synapse: Kafka event mesh with real-time data flows",
      ],
      workflows: [
        "Closed-loop cycle: Real → Analyze → Predict → Adjust → Record",
        "Four Guardian AIs: Argus, Zelda, Phoenix, Odin oversight across systems",
        "EchoAI³ orchestration ensures data accuracy and forecast validity",
      ],
    },
    {
      id: "aurum-ap",
      badge: "AP",
      name: "EchoAurum AP/Invoice Manager",
      summary:
        "3-way invoice matching, real-time approvals, payment orchestration, and Guardian oversight. Hero module: deep domain intelligence for restaurants and hotels.",
      metrics: [
        { label: "Outstanding AP", value: "$487K" },
        { label: "Pending approvals", value: "24" },
        { label: "Processing time", value: "4.2 days" },
      ],
      controls: [
        "Invoice capture with OCR confidence scoring",
        "3-way matching: PO/Receipt/Invoice with tolerance handling",
        "Dynamic approval workflows based on amount and vendor tier",
        "Real-time OPERA & Toast connector integration",
      ],
      workflows: [
        "Auto-post GL entries for matched invoices",
        "Zelda duplicate detection and auto-healing",
        "Payment batching with optimal method selection",
        "Vendor analytics and variance trending",
      ],
    },
    {
      id: "aurum-guardian",
      badge: "Security",
      name: "Guardian Oversight Suite",
      summary:
        "Four specialized AI guardians (Argus, Zelda, Phoenix, Odin) protecting financial integrity with real-time compliance checks, anomaly detection, and immutable audit trails.",
      metrics: [
        { label: "Audit events", value: "2,847" },
        { label: "Compliance rate", value: "100%" },
        { label: "Guardian status", value: "All healthy" },
      ],
      controls: [
        "Argus: Data compliance validation and GL rule enforcement",
        "Zelda: Auto-healing of duplicates and rounding variances",
        "Phoenix: Anomaly detection and emergency rollback prep",
        "Odin: Immutable audit trails and point-in-time restore",
      ],
      workflows: [
        "Real-time Guardian checks on all journal entries",
        "Automated escalation for critical issues",
        "SOC 2 evidence collection and audit trail",
        "Zero-trust financial security model",
      ],
    },
    {
      id: "forecast-studio",
      badge: "Ai³",
      name: "Forecast Studio",
      summary:
        "Scenario modeling that blends PMS occupancy, PredictHQ demand, NOAA weather, and wage data to project cash and labor positions in minutes.",
      metrics: [
        { label: "Scenario bands", value: "27 active" },
        { label: "Accuracy", value: "±1.9%" },
        { label: "Decisions", value: "14 automations" },
      ],
      controls: [
        "Sensitivity sliders for ADR, group pickup, and wage pressure",
        "Stress tests for capital projects and event cancellations",
        "Alerting pipeline pushes AI signals into finance Slack channels",
      ],
      workflows: [
        "Cash ladder projects 90-day runway with variance explanations",
        "Labor optimizer Recommends overtime trades per property",
        "Portfolio roll-ups expose region and brand level exposure",
      ],
    },
    {
      id: "cpa-portal",
      badge: "CPA",
      name: "CPA Portal",
      summary:
        "CPA-focused workspace delivering binder packaging, tick marks, and secure document exchange so external auditors receive ready-to-file packets.",
      metrics: [
        { label: "Binders issued", value: "32 YTD" },
        { label: "Turnaround", value: "< 12 hrs" },
        { label: "Exports", value: "Axcess • UltraTax • Lacerte" },
      ],
      controls: [
        "Role-based access with SOC 2 Type II enforcement",
        "Binder composer with templated workpaper sections and tick marks",
        "Secure portal for PBC requests and status tracking",
      ],
      workflows: [
        "CPA checklist auto-validates tie-outs before release",
        "Versioned evidence ensures continuity across quarterly reviews",
        "Bulk download and DocuSign-ready packets from Zelda snapshots",
      ],
    },
    {
      id: "aurum-reports",
      badge: "Reports",
      name: "Financial Reports",
      summary:
        "Comprehensive financial reporting suite including trial balance, balance sheet, income statement, cash flow, and variance analysis with drill-down capabilities.",
      metrics: [
        { label: "Reports generated", value: "94 YTD" },
        { label: "Coverage", value: "18 entities" },
        { label: "Audit ready", value: "100%" },
      ],
      controls: [
        "Multi-dimensional reporting with entity and period filters",
        "GAAP and USALI dual-book reporting",
        "Variance analysis with prior period and budget comparisons",
        "Account-level drill-down with GL detail",
      ],
      workflows: [
        "Month-end close automation",
        "CPA workpaper package generation",
        "Variance explanation templates",
        "Management reporting dashboard",
      ],
    },
    {
      id: "aurum-invoice-payment",
      badge: "AP",
      name: "Invoice Payment Workflow",
      summary:
        "End-to-end invoice capture, matching, approval, and payment processing with 3-way PO/Receipt/Invoice matching and payment orchestration.",
      metrics: [
        { label: "Invoices processed", value: "1,482 today" },
        { label: "Processing time", value: "4.2 days avg" },
        { label: "Match rate", value: "98.7%" },
      ],
      controls: [
        "Invoice capture with OCR and vendor matching",
        "3-way PO/Receipt/Invoice matching with tolerance handling",
        "Dynamic approval workflows by amount and vendor",
        "Payment method optimization",
      ],
      workflows: [
        "Auto GL posting for matched invoices",
        "Duplicate detection and prevention",
        "Payment batching and ACH processing",
        "Vendor analytics and spend reporting",
      ],
    },
    {
      id: "aurum-gl-entry",
      badge: "GL",
      name: "GL Journal Entry System",
      summary:
        "Journal entry creation and posting with Guardian validation, reversals, multi-entity consolidation, and complete audit trail with point-in-time recovery.",
      metrics: [
        { label: "Entries posted", value: "847 YTD" },
        { label: "Guardian checks", value: "100% pass" },
        { label: "Reversals available", value: "All entries" },
      ],
      controls: [
        "Journal entry templates for recurring entries",
        "Real-time Guardian validation on posting",
        "Multi-entity consolidation and eliminations",
        "Safe reversal with re-forecasting",
      ],
      workflows: [
        "Month-end adjusting entries",
        "Accrual and prepaid management",
        "Intercompany eliminations",
        "Variance analysis and adjustment",
      ],
    },
    {
      id: "aurum-reconciliation",
      badge: "Reconciliation",
      name: "Bank Reconciliation System",
      summary:
        "Automated 4-step bank reconciliation workflow with variance detection, investigation analysis, and GL adjustment creation. Eliminates manual reconciliation.",
      metrics: [
        { label: "Reconciliations", value: "47 YTD" },
        { label: "Variance detection", value: "100% automated" },
        { label: "Time saved", value: "24 hrs/month" },
      ],
      controls: [
        "Bank statement CSV upload with transaction parsing",
        "Automatic GL matching with tolerance thresholds",
        "Variance investigation with root cause analysis",
        "GL adjustment creation for unmatched items",
      ],
      workflows: [
        "Real-time balance reconciliation with audit trail",
        "Outstanding items analysis for timing differences",
        "Bank fee and NSF charge detection",
        "Monthly close automation support",
      ],
    },
    {
      id: "aurum-approvals",
      badge: "Approvals",
      name: "Approval Queue Dashboard",
      summary:
        "Multi-level approval workflows with delegation, escalation, and full audit trails. Real-time approval queue management for finance transactions.",
      metrics: [
        { label: "Pending approvals", value: "12" },
        { label: "Approved today", value: "34" },
        { label: "Average cycle time", value: "2.5 hrs" },
      ],
      controls: [
        "Real-time approval queue with transaction details",
        "Quick approve/reject/delegate buttons",
        "Filter by transaction type and approval status",
        "Full approval history with comments",
      ],
      workflows: [
        "Multi-level approval chains with role-based routing",
        "Escalation on rejection with audit trail",
        "Delegation to alternate approvers",
        "Email notifications for pending approvals",
      ],
    },
    {
      id: "aurum-user-management",
      badge: "Admin",
      name: "RBAC User Management",
      summary:
        "Role-based access control (RBAC) for managing user permissions, role assignments, and system access. Complete user lifecycle management.",
      metrics: [
        { label: "Active users", value: "28" },
        { label: "Roles defined", value: "5" },
        { label: "Audit entries", value: "1,247" },
      ],
      controls: [
        "User creation and role assignment",
        "Fine-grained permission matrix",
        "Role templates for quick provisioning",
        "Audit log of all access changes",
      ],
      workflows: [
        "Automated user onboarding workflows",
        "Permission escalation with approval",
        "Quarterly access reviews",
        "Compliance reporting and attestation",
      ],
    },
    {
      id: "aurum-notifications",
      badge: "Alerts",
      name: "Notification Center",
      summary:
        "Centralized in-app notification management with approval requests, status updates, and system alerts. Real-time user engagement platform.",
      metrics: [
        { label: "Notifications sent", value: "147 today" },
        { label: "Delivery rate", value: "99.8%" },
        { label: "Unread count", value: "8" },
      ],
      controls: [
        "Real-time notification delivery",
        "Notification filtering and prioritization",
        "Mark as read/unread and archive",
        "Notification templates",
      ],
      workflows: [
        "Approval request notifications",
        "Transaction status updates",
        "System health alerts",
        "Batch notification digest",
      ],
    },
    {
      id: "aurum-consolidation",
      badge: "Consolidation",
      name: "Multi-Entity Consolidation",
      summary:
        "Consolidate financials across multiple properties and regions with elimination entries, intercompany reconciliation, and consolidated reporting.",
      metrics: [
        { label: "Entities consolidated", value: "18" },
        { label: "Elimination entries", value: "847 YTD" },
        { label: "Consolidation time", value: "15 mins" },
      ],
      controls: [
        "Property, region, and brand-level consolidation",
        "Automated intercompany eliminations",
        "Consolidation rule builder",
        "Multi-currency conversion",
      ],
      workflows: [
        "Month-end consolidated statements",
        "Elimination entry generation",
        "Consolidation variance analysis",
        "Corporate reporting packages",
      ],
    },
    {
      id: "aurum-guardian-dashboard",
      badge: "AI Guardian",
      name: "Guardian Dashboard",
      summary:
        "Real-time monitoring of four specialized AI guardians (Argus, Zelda, Phoenix, Odin) with health scores, anomaly detection, and fraud prevention.",
      metrics: [
        { label: "Guardian health", value: "98%" },
        { label: "Checks performed", value: "8,847 today" },
        { label: "Anomalies detected", value: "12" },
      ],
      controls: [
        "Argus: GL compliance and data validation",
        "Zelda: Duplicate detection and auto-healing",
        "Phoenix: Anomaly detection and rollback prep",
        "Odin: Immutable audit trails",
      ],
      workflows: [
        "Real-time Guardian health monitoring",
        "Anomaly detection and investigation",
        "Fraud pattern recognition",
        "Auto-healing of common issues",
      ],
    },
    {
      id: "aurum-advanced-matching",
      badge: "Matching",
      name: "Advanced Matching",
      summary:
        "Intelligent 3-way PO/Receipt/Invoice matching with variance detection, line-item level matching, and auto-reconciliation.",
      metrics: [
        { label: "Match rate", value: "98.7%" },
        { label: "Average score", value: "94%" },
        { label: "Exceptions", value: "12" },
      ],
      controls: [
        "Line-item level PO matching",
        "Receipt and invoice reconciliation",
        "Quantity and price variance detection",
        "Auto-matching with ML algorithms",
      ],
      workflows: [
        "Real-time match scoring",
        "Exception investigation workflow",
        "Automatic GL posting for matches",
        "Variance analysis and trending",
      ],
    },
    {
      id: "aurum-report-export",
      badge: "Export",
      name: "Report Export",
      summary:
        "Export financial reports in multiple formats (PDF, Excel, XBRL, CSV) for distribution, filing, and analysis.",
      metrics: [
        { label: "Exports today", value: "47" },
        { label: "Formats supported", value: "4" },
        { label: "Average export", value: "1.8 MB" },
      ],
      controls: [
        "PDF export with custom formatting",
        "Excel export with pivot tables",
        "XBRL for SEC filings",
        "CSV for data import/export",
      ],
      workflows: [
        "Month-end report generation",
        "Audit workpaper package creation",
        "Tax filing document preparation",
        "Board reporting automation",
      ],
    },
    {
      id: "aurum-budget-planning",
      badge: "Budget",
      name: "Budget Planning",
      summary:
        "Create and manage budgets with real-time variance tracking, budget-to-actual analysis, and forecasting.",
      metrics: [
        { label: "Active budgets", value: "8" },
        { label: "Budget utilization", value: "32.5%" },
        { label: "Variance alerts", value: "3" },
      ],
      controls: [
        "Flexible budget templates and rollups",
        "Multi-period budget management",
        "Real-time actuals integration",
        "Variance threshold alerts",
      ],
      workflows: [
        "Annual budget creation and approval",
        "Monthly forecast updates",
        "Budget variance investigation",
        "Reforecast and rolling forecast",
      ],
    },
    {
      id: "aurum-stripe",
      badge: "Payments",
      name: "Stripe Payment Integration",
      summary:
        "Integrate Stripe payments with AP invoices for real-time payment syncing, auto-reconciliation, and GL posting. One-click setup with secure OAuth authentication.",
      metrics: [
        { label: "Payments synced", value: "2,847" },
        { label: "Match rate", value: "94.3%" },
        { label: "Processing time", value: "<2 hrs" },
      ],
      controls: [
        "One-click Stripe OAuth authentication",
        "Real-time payment data syncing with retry logic",
        "Auto-matching payments to outstanding invoices",
        "Webhook event monitoring for payment status updates",
      ],
      workflows: [
        "Sync Stripe payments by date range",
        "Auto-reconcile payments to AP invoices by amount/email",
        "Create GL entries for matched payments",
        "Track unmatched payments for investigation",
      ],
    },
    {
      id: "aurum-slack",
      badge: "Notifications",
      name: "Slack Integration",
      summary:
        "Receive Guardian alerts and approval notifications directly in Slack with interactive approval buttons. Real-time notifications for critical financial events with message threading and rich formatting.",
      metrics: [
        { label: "Notifications sent", value: "1,247" },
        { label: "Delivery rate", value: "99.8%" },
        { label: "Response time", value: "Instant" },
      ],
      controls: [
        "Slack bot configuration with secure OAuth",
        "Guardian alert notifications with severity levels",
        "Interactive approval buttons for direct Slack actions",
        "Message threading for organized conversations",
        "Channel management and routing rules",
      ],
      workflows: [
        "Real-time Guardian alerts to finance teams",
        "Invoice approval notifications with 1-click actions",
        "Payment processing updates and confirmations",
        "Daily financial summary reports",
        "Approval escalation and delegation",
      ],
    },
    {
      id: "aurum-gusto",
      badge: "Payroll",
      name: "Gusto Payroll Integration",
      summary:
        "Sync payroll data from Gusto and automatically create GL entries for salaries, payroll taxes, and deductions. Supports multi-entity payrolls with foreign currency and GL mapping.",
      metrics: [
        { label: "Payrolls synced", value: "48" },
        { label: "GL entries created", value: "144" },
        { label: "Sync accuracy", value: "100%" },
      ],
      controls: [
        "Gusto API token authentication",
        "Automatic payroll data fetch by date range",
        "GL entry creation for salaries and taxes",
        "Deduction tracking with GL mapping",
        "Draft or auto-post GL entries",
      ],
      workflows: [
        "Weekly payroll sync from Gusto",
        "Auto-create GL entries for payroll expense",
        "Accrual of payroll liabilities",
        "Tax expense tracking and reporting",
        "Month-end payroll reconciliation",
      ],
    },
    {
      id: "aurum-toast",
      badge: "POS",
      name: "Toast POS Revenue Integration",
      summary:
        "Real-time hourly revenue sync from Toast POS with automatic COGS tracking and discrepancy detection. Handles timezone conversion, multi-location aggregation, and GL posting.",
      metrics: [
        { label: "Revenue records synced", value: "2,847" },
        { label: "GL entries created", value: "456" },
        { label: "Open discrepancies", value: "3" },
      ],
      controls: [
        "Toast API authentication with location mapping",
        "Hourly revenue sync with timezone handling",
        "Automatic COGS tracking from inventory",
        "Real-time discrepancy detection and alerting",
        "Multi-location aggregation and reporting",
      ],
      workflows: [
        "Hourly revenue sync creates GL entries within 1 hour",
        "COGS auto-posted from inventory consumption",
        "Anomaly detection flags revenue spikes/drops",
        "Payment method reconciliation checks",
        "Daily revenue summary and variance analysis",
      ],
    },
  ],
  activity: [
    {
      time: "06:10",
      title: "Phoenix reversal executed",
      detail:
        "Night audit rolled back a duplicate banquet accrual for LUCCCA Downtown.",
      actor: "Argus bot",
    },
    {
      time: "07:45",
      title: "ACH batch ready",
      detail: "EchoSentinel cleared 128 vendor payments with dual approval.",
      actor: "Treasury",
    },
    {
      time: "09:20",
      title: "Variance narrative published",
      detail:
        "Ai³ explained F&B labor variance citing group arrival shift and overtime trade.",
      actor: "Echo Ai³",
    },
    {
      time: "11:05",
      title: "Forecast scenario locked",
      detail:
        "Revenue team locked hurricane contingency scenario for Southeast portfolio.",
      actor: "Forecast Studio",
    },
  ],
  guardrails: [
    {
      title: "Zelda cold snapshots",
      description:
        "Immutable daily ledger snapshots with MQ proof ensure recovery within 5 minutes and satisfy SOC 2 evidence requests.",
    },
    {
      title: "Argus immutable audit",
      description:
        "Every GL event stores provenance, hash chain, and reviewer decisions for full defensibility across audits.",
    },
    {
      title: "Phoenix reversibility",
      description:
        "Time-travel safe reversals with automatic re-forecasting keep downstream reporting aligned when corrections occur.",
    },
  ],
  complianceBadges: [
    "SOC 2 Type II controls mapped",
    "PCI DSS v4 card data isolation",
    "GDPR + CCPA data residency routing",
    "HashiCorp Vault secret rotation",
  ],
};
