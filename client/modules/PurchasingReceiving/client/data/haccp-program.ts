import type {
  HACCPChecklistTask,
  HACCPReminder,
  HACCPTrainingModule,
} from "@shared/haccp";
export const HACCP_CHECKLISTS: HACCPChecklistTask[] = [
  {
    id: "dock-sanitized",
    category: "Dock Readiness",
    frequency: "daily",
    title: "Sanitize receiving dock surfaces",
    description:
      "Confirm the dock floor, drains, and contact surfaces are cleaned and sanitized before the first delivery.",
    roles: ["Receiver", "Steward"],
    verification:
      "Initial on HACCP sheet and capture photo in receiving folder.",
  },
  {
    id: "thermometer-calibration",
    category: "Dock Readiness",
    frequency: "daily",
    title: "Ice bath thermometer calibration",
    description:
      "Calibrate probe thermometers using an ice bath and document variance.",
    roles: ["Receiver"],
    criticalControlPoint: true,
    criticalLimit: "±2°F",
    verification: "Record in calibration log.",
  },
  {
    id: "pest-check",
    category: "Dock Readiness",
    frequency: "daily",
    title: "Pest prevention sweep",
    description:
      "Check dock doors, seals, and pest traps; report any pest activity immediately.",
    roles: ["Receiver", "Facilities"],
    verification: "Initial trap log; submit work order if deficiency found.",
  },
  {
    id: "delivery-truck-temp",
    category: "Per Delivery Receiving",
    frequency: "per_delivery",
    title: "Verify truck air and product temps",
    description:
      "Measure ambient truck temperature and sample two high-risk products before accepting.",
    roles: ["Receiver", "Chef"],
    criticalControlPoint: true,
    criticalLimit: "Protein ≤ 41°F; Frozen ≤ 0°F",
    verification:
      "Record temps in receiving log and attach photo when non-compliant.",
  },
  {
    id: "seal-and-paperwork",
    category: "Per Delivery Receiving",
    frequency: "per_delivery",
    title: "Check seal integrity and paperwork",
    description:
      "Confirm truck seal matches bill of lading and inspect invoices for allergens and lot numbers.",
    roles: ["Receiver"],
    verification:
      "Document seal number; flag discrepancies to manager immediately.",
  },
  {
    id: "allergen-segregation",
    category: "Per Delivery Receiving",
    frequency: "per_delivery",
    title: "Segregate allergens and chemicals",
    description:
      "Ensure allergens and chemicals remain sealed and are stored away from ready-to-eat foods.",
    roles: ["Receiver"],
    verification: "Label allergen locations on receiving log.",
  },
  {
    id: "weekly-dock-audit",
    category: "Weekly Verification",
    frequency: "weekly",
    title: "Weekly dock audit walkthrough",
    description:
      "Use audit sheet to review dock condition, lighting, pest control, and equipment maintenance.",
    roles: ["Manager", "Receiver"],
    documentation: "Upload completed audit to shared compliance drive.",
  },
  {
    id: "weekly-corrective-review",
    category: "Weekly Verification",
    frequency: "weekly",
    title: "Review corrective actions",
    description:
      "Verify all corrective actions from the past week were documented and closed out.",
    roles: ["Manager", "Chef"],
    verification: "Sign-off in digital HACCP binder.",
  },
];
export const HACCP_REMINDERS: HACCPReminder[] = [
  {
    id: "daily-0800-dock-ready",
    frequency: "daily",
    title: "0800 Dock readiness stand-up",
    description:
      "5-minute huddle to review deliveries, staffing, and remind team of today's CCPs.",
    timeWindow: "08:00",
    roles: ["Receiver", "Manager"],
    relatedTaskIds: ["dock-sanitized", "thermometer-calibration"],
  },
  {
    id: "daily-1500-review",
    frequency: "daily",
    title: "15:00 receiving log review",
    description:
      "Manager signs digital HACCP log and escalates any deviations to Chef.",
    timeWindow: "15:00",
    roles: ["Manager"],
    relatedTaskIds: ["delivery-truck-temp", "seal-and-paperwork"],
  },
  {
    id: "weekly-training-touchpoint",
    frequency: "weekly",
    title: "Friday dock refresher",
    description:
      "15-minute recap of issues observed and reinforce allergen handling SOP.",
    timeWindow: "Friday",
    roles: ["Receiver", "Chef"],
  },
  {
    id: "monthly-third-party-audit",
    frequency: "monthly",
    title: "3rd-party receiving audit",
    description:
      "Schedule monthly inspection with QA partner to validate HACCP controls.",
    roles: ["Manager", "QA"],
    escalation: "If missed, notify Director of Operations.",
  },
];
export const HACCP_TRAINING_MODULES: HACCPTrainingModule[] = [
  {
    id: "module-ccp-fundamentals",
    title: "Receiving Critical Control Points",
    description:
      "Comprehensive review of CCPs specific to receiving and how to document corrective actions.",
    objectives: [
      "Identify high-risk deliveries and required checks",
      "Perform calibrated temperature readings",
      "Complete corrective action documentation",
    ],
    cadence: "onboarding",
    durationMinutes: 60,
    delivery: "in_person",
    roles: ["Receiver", "Chef"],
    resources: [
      {
        label: "Receiving CCP Slide Deck",
        url: "https://example.com/haccp/receiving-ccp.pdf",
      },
      { label: "Corrective Action Form" },
    ],
  },
  {
    id: "module-allergen-flow",
    title: "Allergen Control at the Dock",
    description:
      "Training focused on segregation, labeling, and communication of allergen-containing goods.",
    objectives: [
      "Segment allergen zones during receiving",
      "Apply and verify allergen labels",
      "Report and document allergen incidents",
    ],
    cadence: "quarterly",
    durationMinutes: 30,
    delivery: "video",
    roles: ["Receiver", "Manager"],
    resources: [
      {
        label: "Allergen Segregation SOP",
        url: "https://example.com/haccp/allergen-sop",
      },
    ],
  },
  {
    id: "module-pest-prevention",
    title: "Pest Prevention & Dock Hygiene",
    description:
      "Covers sanitation standards, pest monitoring, and escalation protocols for the dock area.",
    objectives: [
      "Recognize signs of pest activity",
      "Execute sanitation checklist",
      "Complete pest incident reports",
    ],
    cadence: "biannual",
    durationMinutes: 45,
    delivery: "quiz",
    roles: ["Receiver", "Facilities"],
    resources: [
      {
        label: "Dock Cleaning Checklist",
        url: "https://example.com/haccp/dock-cleaning",
      },
      { label: "Pest Escalation Flowchart" },
    ],
  },
];
