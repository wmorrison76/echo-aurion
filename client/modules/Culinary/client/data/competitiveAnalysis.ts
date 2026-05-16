export type CompetitorId = "apicbase" | "galley" | "meez" | "marketman";

export type CompetitorProfile = {
  id: CompetitorId;
  name: string;
  focus: string;
  pricingModel: string;
  idealCustomer: string;
  strengths: string[];
  cautions: string[];
};

export type FeatureKey =
  | "yieldIntelligence"
  | "supplierIntegration"
  | "predictiveProcurement"
  | "mobileExperience"
  | "teamCollaboration"
  | "mediaLookbook"
  | "nutritionCompliance"
  | "menuEngineering";

export type FeatureComparison = {
  key: FeatureKey;
  label: string;
  description: string;
  echoRecipePro: {
    stance: "lead" | "parity" | "lag";
    proofPoints: string[];
  };
  competitors: Record<CompetitorId, {
    stance: "lead" | "parity" | "lag";
    notes: string;
  }>;
};

export const COMPETITORS: CompetitorProfile[] = [
  {
    id: "apicbase",
    name: "Apicbase",
    focus: "Enterprise inventory & multi-site menu ops",
    pricingModel: "Custom enterprise; onboarding fees + annual license",
    idealCustomer: "Global hospitality groups with centralized purchasing",
    strengths: [
      "Deep inventory automation with perpetual stock counts",
      "Best-in-class photo asset taxonomy for marketing teams",
      "Robust procurement workflows across multiple warehouses",
    ],
    cautions: [
      "Limited predictive analytics beyond ordering heuristics",
      "Mobile experience optimized for tablets only",
      "Cost-prohibitive for R&D teams under 10 locations",
    ],
  },
  {
    id: "galley",
    name: "Galley Solutions",
    focus: "Culinary operations with centralized recipe single-source",
    pricingModel: "Per location subscription with required onboarding",
    idealCustomer: "Meal-kit and commissary kitchens scaling production",
    strengths: [
      "Powerful BOM management with manufacturing scale conversions",
      "Strong allergen + nutrition compliance workflows",
      "Tight integration with warehouse management partners",
    ],
    cautions: [
      "Supplier pricing sync limited to CSV uploads for many regions",
      "Yield tracking relies on manual overrides; no lab automation",
      "Creative tooling (media, concepting) is minimal",
    ],
  },
  {
    id: "meez",
    name: "Meez",
    focus: "Chef-first recipe costing and training",
    pricingModel: "Per seat SaaS with growth bundles",
    idealCustomer: "Boutique restaurant groups and culinary schools",
    strengths: [
      "Polished web and mobile UX for recipe capture",
      "Extensive video-first training workflows",
      "Quick onboarding with self-serve importers",
    ],
    cautions: [
      "Supplier catalogs require manual upkeep; no live contracts",
      "Limited predictive costing beyond simple scaling",
      "Yield experiments are captured as notes without analytics",
    ],
  },
  {
    id: "marketman",
    name: "MarketMan",
    focus: "Restaurant purchasing & inventory",
    pricingModel: "Tiered subscription; POS integrations add-ons",
    idealCustomer: "Independent restaurants focused on cost control",
    strengths: [
      "Large marketplace of suppliers with automated invoice capture",
      "Straightforward inventory counts with mobile support",
      "Invoice digitization accelerates bookkeeping",
    ],
    cautions: [
      "Recipe development tools are basic",
      "No native yield analytics or lab testing history",
      "Media management limited to simple galleries",
    ],
  },
];

export const FEATURE_COMPARISON: FeatureComparison[] = [
  {
    key: "yieldIntelligence",
    label: "Yield intelligence",
    description:
      "Lab-informed yields with chef history, heuristics, and reference datasets to power R&D decisions.",
    echoRecipePro: {
      stance: "lead",
      proofPoints: [
        "Integrated Yield Lab with ready-made linking and predictive planning",
        "Reference data blended with chef logs for automated best-match suggestions",
        "Ready-made catalog and procurement planner add structured context",
      ],
    },
    competitors: {
      apicbase: {
        stance: "parity",
        notes: "Tracks yields inside production runs; less granular chef attribution.",
      },
      galley: {
        stance: "lag",
        notes: "Manual yield overrides; no experimental timeline or contextual notes.",
      },
      meez: {
        stance: "lag",
        notes: "Yield stored as freeform notes, lacking analytics.",
      },
      marketman: {
        stance: "lag",
        notes: "Focuses on invoice variance; no lab tooling.",
      },
    },
  },
  {
    key: "supplierIntegration",
    label: "Supplier integration",
    description:
      "Live supplier pricing, catalog metadata, and sourcing governance tied directly to recipes.",
    echoRecipePro: {
      stance: "lead",
      proofPoints: [
        "Supplier quote intelligence surfaces cost per unit with lead time context",
        "Ready-made catalog can link to supplier SKUs and batch economics",
        "Collaboration panel records sourcing decisions with audit trail",
      ],
    },
    competitors: {
      apicbase: {
        stance: "lead",
        notes: "Native to enterprise procurement; best when paired with ERP integrations.",
      },
      galley: {
        stance: "parity",
        notes: "Strong purchasing but relies on marketplaces or partner integrations for real-time pricing.",
      },
      meez: {
        stance: "lag",
        notes: "Supplier pricing requires manual entry or spreadsheet import.",
      },
      marketman: {
        stance: "lead",
        notes: "Invoice digitization and supplier marketplace strong for day-to-day operations.",
      },
    },
  },
  {
    key: "predictiveProcurement",
    label: "Predictive procurement",
    description:
      "Forecast-driven purchasing that blends yield efficiency with demand history and buffers.",
    echoRecipePro: {
      stance: "lead",
      proofPoints: [
        "Procurement planner converts lab data into purchase-ready recommendations",
        "History-aware coverage windows highlight risk before service",
        "Ready-made defaults accelerate seasonal rollouts",
      ],
    },
    competitors: {
      apicbase: {
        stance: "parity",
        notes: "MRP-style forecasting available but tuned for large commissaries.",
      },
      galley: {
        stance: "parity",
        notes: "Production runs inform ordering; predictive elements rely on external BI.",
      },
      meez: {
        stance: "lag",
        notes: "Focuses on scaling recipes; procurement suggestions manual.",
      },
      marketman: {
        stance: "lag",
        notes: "Automates ordering thresholds but not yield-adjusted forecasting.",
      },
    },
  },
  {
    key: "mobileExperience",
    label: "Mobile & offline",
    description:
      "Responsive PWA-ready workspace with offline-safe collaboration and lab tooling.",
    echoRecipePro: {
      stance: "lead",
      proofPoints: [
        "Offline queue for tasks, feedback, and versions",
        "Mobile-friendly yield entry and procurement workflows",
        "Look Book optimized for thumbs-first browsing",
      ],
    },
    competitors: {
      apicbase: {
        stance: "lag",
        notes: "Tablet focus; offline requires pricey add-ons.",
      },
      galley: {
        stance: "parity",
        notes: "Responsive UI but offline coverage limited to forms.",
      },
      meez: {
        stance: "lead",
        notes: "Notable mobile UX for recipe capture and training.",
      },
      marketman: {
        stance: "lead",
        notes: "Inventory counts available offline; recipe tooling minimal.",
      },
    },
  },
  {
    key: "teamCollaboration",
    label: "Team workflows",
    description:
      "Assignments, feedback threads, and auto versioning keep teams aligned without meetings.",
    echoRecipePro: {
      stance: "lead",
      proofPoints: [
        "Collaboration panel with offline-safe task + feedback management",
        "Version snapshots auto-trigger from recipe activity",
        "Threads tie directly to ingredients and procurement actions",
      ],
    },
    competitors: {
      apicbase: {
        stance: "parity",
        notes: "Tasks exist but versioning limited to manual exports.",
      },
      galley: {
        stance: "parity",
        notes: "Workflow engine available; offline queue limited.",
      },
      meez: {
        stance: "parity",
        notes: "Commenting exists but lacks auto versioning.",
      },
      marketman: {
        stance: "lag",
        notes: "Focus on purchasing approvals; little collaboration for R&D.",
      },
    },
  },
  {
    key: "mediaLookbook",
    label: "Media look book",
    description:
      "High fidelity presentation layer for concept decks, plating notes, and marketing handoff.",
    echoRecipePro: {
      stance: "lead",
      proofPoints: [
        "Storyboard navigation, gradient stage, and download actions",
        "Tags and favorites drive smart sequencing",
        "Lightweight enough for mobile but cinematic on desktop",
      ],
    },
    competitors: {
      apicbase: {
        stance: "lead",
        notes: "Strong DAM capabilities but less culinary context.",
      },
      galley: {
        stance: "lag",
        notes: "Media support is basic; relies on external DAM integrations.",
      },
      meez: {
        stance: "parity",
        notes: "Recipe media viewer available but less curated for concepting.",
      },
      marketman: {
        stance: "lag",
        notes: "Media storage limited to attachments without presentation.",
      },
    },
  },
  {
    key: "nutritionCompliance",
    label: "Nutrition & compliance",
    description:
      "Regulatory-ready nutrition panels, allergen tracking, and HACCP documentation.",
    echoRecipePro: {
      stance: "parity",
      proofPoints: [
        "Automated nutrition panels with multi-language support",
        "Allergen matrix ties into recipe taxonomy",
        "HACCP workspace available for enterprise tenants",
      ],
    },
    competitors: {
      apicbase: {
        stance: "lead",
        notes: "Comprehensive HACCP toolkit for enterprise food safety.",
      },
      galley: {
        stance: "lead",
        notes: "Regulatory workflows top-tier; integrates with compliance ERP.",
      },
      meez: {
        stance: "parity",
        notes: "Nutrition labeling available but relies on manual validation.",
      },
      marketman: {
        stance: "lag",
        notes: "Nutrition tracking not core; focuses on purchasing.",
      },
    },
  },
  {
    key: "menuEngineering",
    label: "Menu engineering & analytics",
    description:
      "Turnkey menu mix analysis, profitability scoring, and launch planning.",
    echoRecipePro: {
      stance: "parity",
      proofPoints: [
        "Menu mix dashboard blends cost, contribution, and trend data",
        "Supports scenario planning via collections and tagging",
        "Upcoming: AI narrative builder for executive summaries",
      ],
    },
    competitors: {
      apicbase: {
        stance: "lead",
        notes: "Advanced menu engineering tied to POS and inventory feeds.",
      },
      galley: {
        stance: "lead",
        notes: "Robust analytics layered on production data.",
      },
      meez: {
        stance: "parity",
        notes: "Solid costing dashboards but limited scenario planning.",
      },
      marketman: {
        stance: "lag",
        notes: "Menu engineering minimal; relies on POS exports.",
      },
    },
  },
];
