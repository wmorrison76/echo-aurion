/**
 * EchoAi^3 System Knowledge Index
 * -------------------------------
 * Complete understanding of the entire LUCCCA Framework system
 * This is the "brain" that understands every module, every integration, every line of code
 */

export interface SystemModule {
  id: string;
  name: string;
  description: string;
  path: string;
  type: "core" | "culinary" | "financial" | "operational" | "inventory" | "hr" | "analytics" | "integration";
  dependencies: string[];
  integrations: string[];
  keyFeatures: string[];
  dataFlows: string[];
  apiEndpoints: string[];
  stores: string[];
  contexts: string[];
  routes: string[];
  components: string[];
  services: string[];
  knowledgeBase: Record<string, any>;
}

export interface SystemIntegration {
  from: string;
  to: string;
  type: "data" | "event" | "api" | "store" | "context" | "osbus";
  description: string;
  implementation: string;
}

export interface CodebaseKnowledge {
  modules: SystemModule[];
  integrations: SystemIntegration[];
  dataFlows: string[];
  eventBus: Record<string, string[]>;
  sharedStores: Record<string, any>;
  sharedContexts: Record<string, any>;
  apiRoutes: Record<string, string[]>;
  hospitalityDomain: HospitalityKnowledge;
}

export interface HospitalityKnowledge {
  roles: RoleKnowledge[];
  workflows: WorkflowKnowledge[];
  domains: DomainKnowledge[];
}

export interface RoleKnowledge {
  role: string;
  responsibilities: string[];
  permissions: string[];
  tools: string[];
  knowledgeRequired: string[];
  typicalQuestions: string[];
}

export interface WorkflowKnowledge {
  workflow: string;
  description: string;
  steps: string[];
  participants: string[];
  integrations: string[];
  metrics: string[];
}

export interface DomainKnowledge {
  domain: string;
  expertise: string[];
  systems: string[];
  terminology: string[];
  bestPractices: string[];
}

/**
 * System Knowledge Index
 * Complete understanding of the entire LUCCCA Framework
 */
export const SYSTEM_KNOWLEDGE: CodebaseKnowledge = {
  modules: [
    {
      id: "culinary",
      name: "Culinary / Echo Recipe Pro",
      description: "Recipe management, menu design, R&D Labs, plate costing, nutritional analysis",
      path: "client/modules/Culinary",
      type: "culinary",
      dependencies: ["echo-ai3", "os-bus", "zustand"],
      integrations: ["Pastry", "PurchasingReceiving", "Inventory", "Schedule"],
      keyFeatures: [
        "Recipe workspace & versioning",
        "Cost calculator & analytics",
        "Ingredient library",
        "Menu design studio",
        "R&D Labs workspace",
        "Plate costing",
        "Nutritional analysis",
        "HACCP compliance"
      ],
      dataFlows: [
        "Recipes → Inventory (ingredient requirements)",
        "Recipes → Purchasing (ordering needs)",
        "Recipes → Schedule (prep times)",
        "Menu → POS (menu items)"
      ],
      apiEndpoints: ["/api/recipes", "/api/menu", "/api/plate-costing"],
      stores: ["recipeStore", "menuStore", "rdLabStore"],
      contexts: ["AppDataContext", "OutletContext", "YieldContext"],
      routes: ["/culinary", "/culinary/recipes", "/culinary/menu"],
      components: ["RecipeEditor", "MenuStudio", "RDLabsWorkspace"],
      services: ["recipeService", "menuService", "costingService"],
      knowledgeBase: {
        culinary: {
          techniques: ["sauté", "braise", "roast", "grill", "poach", "sous vide"],
          flavorProfiles: ["sweet", "sour", "salty", "bitter", "umami"],
          cuisines: ["French", "Italian", "Asian", "American", "Mexican"],
          dietaryRestrictions: ["vegan", "vegetarian", "gluten-free", "dairy-free", "kosher", "halal"],
          equipment: ["oven", "range", "sauté pan", "sous vide", "grill", "fryer"]
        }
      }
    },
    {
      id: "pastry",
      name: "Pastry / Echo Recipe Pro",
      description: "Pastry & dessert recipe management, R&D Labs, costing",
      path: "client/modules/Pastry",
      type: "culinary",
      dependencies: ["echo-ai3", "os-bus", "zustand"],
      integrations: ["Culinary", "PurchasingReceiving", "Inventory"],
      keyFeatures: [
        "Pastry recipe workspace",
        "Dessert menu design",
        "Pastry R&D Labs",
        "Specialty ingredients",
        "Baking techniques"
      ],
      dataFlows: ["Pastry recipes → Inventory", "Pastry menu → POS"],
      apiEndpoints: ["/api/pastry-recipes"],
      stores: ["pastryStore", "rdLabStore"],
      contexts: ["AppDataContext", "OutletContext"],
      routes: ["/pastry"],
      components: ["PastryRecipeEditor", "PastryRDLabs"],
      services: ["pastryRecipeService"],
      knowledgeBase: {
        pastry: {
          techniques: ["creaming", "folding", "tempering", "lamination", "ganache"],
          ingredients: ["flour", "sugar", "butter", "eggs", "chocolate", "cream"],
          desserts: ["cakes", "pastries", "cookies", "pies", "tarts"]
        }
      }
    },
    {
      id: "ordering-inventory",
      name: "Ordering & Inventory",
      description: "AI procurement, commissary ordering, vendor orders, inventory management, storage layout",
      path: "client/modules/OrderingInventory",
      type: "inventory",
      dependencies: ["Genesis", "PurchasingReceiving"],
      integrations: ["PurchasingReceiving", "Schedule", "Culinary", "EchoAurum"],
      keyFeatures: [
        "AI Procurement (Genesis Ordering Hub)",
        "Commissary Ordering",
        "Vendor Ordering",
        "Inventory by Outlet",
        "Quick Counts",
        "Storage Layout",
        "Invoice Scan",
        "Waste Trackers"
      ],
      dataFlows: [
        "Inventory → Purchasing (reorder points)",
        "Inventory → Culinary (ingredient availability)",
        "Orders → Receiving (deliveries)",
        "Receiving → Inventory (updates)",
        "Inventory → Schedule (prep planning)"
      ],
      apiEndpoints: ["/api/inventory", "/api/orders", "/api/invoices/scan"],
      stores: ["inventoryStore", "procurementStore"],
      contexts: ["MultiOutletContext"],
      routes: ["/inventory", "/order"],
      components: ["GenesisOrderingHub", "InventoryByOutlet", "CommissaryOrdering"],
      services: ["inventoryService", "procurementService"],
      knowledgeBase: {
        inventory: {
          categories: ["food", "beverage", "disposables", "smallwares", "linen"],
          storageTypes: ["refrigerated", "frozen", "dry", "wine cellar"],
          parLevels: "minimum stock levels",
          lotTracking: "expiry dates, lot numbers"
        }
      }
    },
    {
      id: "schedule",
      name: "Schedule",
      description: "Employee scheduling, time tracking, labor cost management, attendance",
      path: "client/modules/Schedule",
      type: "hr",
      dependencies: ["os-bus"],
      integrations: ["JobSharing", "EchoAurum", "Inventory"],
      keyFeatures: [
        "Weekly schedule grid",
        "Employee management",
        "Time tracking",
        "Labor cost analysis",
        "Forecast planning",
        "Attendance tracking",
        "Leave management"
      ],
      dataFlows: [
        "Schedule → Time Clock",
        "Schedule → Payroll",
        "Schedule → Labor Cost",
        "Forecast → Schedule (planning)"
      ],
      apiEndpoints: ["/api/schedule", "/api/timesheet"],
      stores: ["scheduleStore"],
      contexts: ["AuthContext"],
      routes: ["/schedule"],
      components: ["WeekGrid", "DayCell", "TimeInput"],
      services: ["scheduleService", "timesheetService"],
      knowledgeBase: {
        scheduling: {
          positions: ["chef", "cook", "server", "bartender", "host", "manager"],
          shiftTypes: ["breakfast", "lunch", "dinner", "overnight"],
          laborMetrics: ["hours", "overtime", "labor percentage", "cost per hour"]
        }
      }
    },
    {
      id: "echo-aurum",
      name: "EchoAurum",
      description: "Financial management, GL operations, AP, reporting, audit",
      path: "client/modules/EchoAurum",
      type: "financial",
      dependencies: [],
      integrations: ["PurchasingReceiving", "Schedule", "Inventory"],
      keyFeatures: [
        "GL Operations",
        "AP & Invoices",
        "Financial Reports",
        "Audit Trail",
        "Budget Tracking"
      ],
      dataFlows: [
        "Invoices → AP",
        "AP → GL",
        "Schedule → Labor Cost → GL",
        "Inventory → Cost of Goods → GL"
      ],
      apiEndpoints: ["/api/financial", "/api/gl", "/api/ap"],
      stores: ["financialStore"],
      contexts: [],
      routes: ["/aurum"],
      components: ["GLPanel", "APPanel", "ReportsPanel"],
      services: ["financialService"],
      knowledgeBase: {
        financial: {
          accounts: ["revenue", "expenses", "cost of goods sold", "labor", "overhead"],
          reports: ["P&L", "balance sheet", "cash flow", "budget variance"],
          accounting: ["GAAP", "accrual", "cash basis", "period close"]
        }
      }
    },
    {
      id: "purchasing-receiving",
      name: "Purchasing & Receiving",
      description: "Purchase orders, receiving, invoice processing, vendor management",
      path: "client/modules/PurchasingReceiving",
      type: "inventory",
      dependencies: ["os-bus"],
      integrations: ["OrderingInventory", "EchoAurum", "Inventory"],
      keyFeatures: [
        "Order Guide",
        "Purchase Order Form",
        "Receiving Dashboard",
        "Invoice Processing",
        "Vendor Management",
        "Commissary Ordering"
      ],
      dataFlows: [
        "Order Guide → PO",
        "PO → Receiving",
        "Receiving → Inventory",
        "Invoice → AP"
      ],
      apiEndpoints: ["/api/purchase-orders", "/api/receiving", "/api/invoices"],
      stores: ["purchasingStore"],
      contexts: ["MultiOutletContext", "AuthContext"],
      routes: ["/purchasing-receiving"],
      components: ["OrderGuidePanel", "ReceivingPanel", "InvoiceReview"],
      services: ["purchasingService", "receivingService"],
      knowledgeBase: {
        purchasing: {
          vendors: "supplier management",
          purchaseOrders: "PO creation and tracking",
          receiving: "delivery check-in, QC",
          threeWayMatch: "PO, invoice, receiving matching"
        }
      }
    },
    {
      id: "genesis",
      name: "Genesis",
      description: "AI procurement engine, vendor scheduling, cost attribution, inventory offsets",
      path: "client/modules/Genesis",
      type: "integration",
      dependencies: [],
      integrations: ["OrderingInventory", "PurchasingReceiving"],
      keyFeatures: [
        "AI Procurement",
        "Vendor Drop Scheduling",
        "Cost Attribution",
        "Inventory Offsets",
        "Budget Tracking"
      ],
      dataFlows: [
        "Demand → Procurement → Orders",
        "Orders → Vendor Schedule",
        "Receiving → Cost Attribution"
      ],
      apiEndpoints: ["/api/genesis/procurement"],
      stores: ["genesisProcurementStore", "vendorScheduleStore", "inventoryOffsetsStore"],
      contexts: [],
      routes: ["/order"],
      components: ["GenesisOrderingHub"],
      services: ["procurementService"],
      knowledgeBase: {
        genesis: {
          procurement: "AI-powered ordering recommendations",
          vendorSchedule: "delivery day planning",
          costAttribution: "cost allocation to outlets"
        }
      }
    },
    {
      id: "job-sharing",
      name: "Job Sharing",
      description: "Shift coverage platform, qualification matching, PAF generation",
      path: "client/modules/JobSharing",
      type: "hr",
      dependencies: [],
      integrations: ["Schedule", "EchoAurum"],
      keyFeatures: [
        "Post Open Positions",
        "Qualification Matching",
        "Application Workflow",
        "Automatic PAF Generation",
        "Schedule Integration"
      ],
      dataFlows: [
        "Job Post → Applications",
        "Accept → PAF → HR",
        "PAF → Schedule",
        "PAF → Time Clock"
      ],
      apiEndpoints: ["/api/job-sharing"],
      stores: ["jobShareStore"],
      contexts: ["AuthContext"],
      routes: ["/job-sharing"],
      components: ["JobSharePlatform"],
      services: ["jobShareService"],
      knowledgeBase: {
        jobSharing: {
          qualifications: "position tier, skills, certifications",
          paf: "Personnel Action Form",
          classifications: "Job Share (temporary), Permanent"
        }
      }
    },
    {
      id: "mixology-sommelier",
      name: "Mixology & Sommelier",
      description: "Wine intelligence, mixology R&D, beverage management",
      path: "client/modules/MixologySommelier",
      type: "culinary",
      dependencies: ["echo-ai3"],
      integrations: ["Inventory", "Culinary"],
      keyFeatures: [
        "AI Wine Recommendations",
        "Cocktail Generation",
        "Mixology R&D Lab",
        "Recipe Workspace",
        "Cost Calculator"
      ],
      dataFlows: [
        "Wine recommendations → Inventory",
        "Cocktail recipes → POS",
        "Mixology R&D → Recipe Library"
      ],
      apiEndpoints: ["/api/beverage"],
      stores: ["wineStore", "mixologyStore"],
      contexts: [],
      routes: ["/mixology-sommelier"],
      components: ["SommelierAIModule", "MixologyRDLab"],
      services: ["wineService", "mixologyService"],
      knowledgeBase: {
        beverage: {
          wine: "vintages, regions, varietals, pairings",
          cocktails: "spirits, mixers, techniques, glassware",
          service: "temperature, storage, presentation"
        }
      }
    }
  ],
  integrations: [
    {
      from: "Culinary",
      to: "Inventory",
      type: "data",
      description: "Recipe ingredient requirements → Inventory availability",
      implementation: "os-bus events"
    },
    {
      from: "Schedule",
      to: "EchoAurum",
      type: "data",
      description: "Labor hours → Financial cost",
      implementation: "API integration"
    },
    {
      from: "PurchasingReceiving",
      to: "Inventory",
      type: "data",
      description: "Receiving → Inventory updates",
      implementation: "Inventory service API"
    },
    {
      from: "Genesis",
      to: "OrderingInventory",
      type: "api",
      description: "AI Procurement → Order creation",
      implementation: "Procurement store hooks"
    },
    {
      from: "JobSharing",
      to: "Schedule",
      type: "data",
      description: "Accepted coverage → Schedule update",
      implementation: "Schedule API"
    }
  ],
  dataFlows: [
    "Recipe → Ingredient Requirements → Inventory → Purchasing → Receiving → Inventory Update",
    "Schedule → Labor Hours → Payroll → Financial → GL",
    "Inventory → Par Levels → Procurement → Orders → Receiving",
    "Invoice Scan → Receiving → Inventory Update → AP → GL"
  ],
  eventBus: {
    "inventory:updated": ["Culinary", "PurchasingReceiving", "OrderingInventory"],
    "recipe:created": ["Inventory", "PurchasingReceiving"],
    "schedule:published": ["TimeClock", "Payroll"],
    "order:placed": ["Vendors", "Receiving"]
  },
  sharedStores: {
    "inventoryStore": "Multi-module inventory state",
    "procurementStore": "Genesis procurement state",
    "scheduleStore": "Employee schedule state"
  },
  sharedContexts: {
    "MultiOutletContext": "Outlet selection and switching",
    "AuthContext": "User authentication and permissions",
    "OutletContext": "Current outlet context"
  },
  apiRoutes: {
    "/api/recipes": "Recipe CRUD operations",
    "/api/inventory": "Inventory management",
    "/api/schedule": "Schedule operations",
    "/api/purchase-orders": "PO management",
    "/api/invoices": "Invoice processing",
    "/api/financial": "Financial operations"
  },
  hospitalityDomain: {
    roles: [
      {
        role: "Master Chef",
        responsibilities: [
          "Menu development and recipe creation",
          "Kitchen operations management",
          "Food cost control",
          "Quality standards enforcement",
          "Staff training and development",
          "Vendor relationships"
        ],
        permissions: ["recipe:create", "recipe:edit", "menu:publish", "inventory:view", "inventory:adjust"],
        tools: ["Recipe Editor", "Menu Studio", "R&D Labs", "Plate Costing", "Inventory"],
        knowledgeRequired: [
          "Culinary techniques and methods",
          "Ingredient knowledge and sourcing",
          "Food safety and HACCP",
          "Cost management",
          "Nutritional analysis",
          "Menu engineering"
        ],
        typicalQuestions: [
          "What's the food cost for this recipe?",
          "Do we have enough ingredients for tonight's service?",
          "What recipes use this ingredient?",
          "Show me recipes under $5 plate cost",
          "What's the nutritional breakdown?"
        ]
      },
      {
        role: "Lead CPA / Finance Director",
        responsibilities: [
          "Financial reporting and analysis",
          "Budget management",
          "Cost control and variance analysis",
          "AP/AR management",
          "Audit compliance",
          "Financial forecasting"
        ],
        permissions: ["financial:view", "financial:edit", "reports:generate", "gl:post"],
        tools: ["EchoAurum", "Financial Reports", "Budget Tracking", "AP Dashboard"],
        knowledgeRequired: [
          "GAAP accounting principles",
          "Financial reporting",
          "Cost accounting",
          "Budget variance analysis",
          "Hospitality financial metrics",
          "Tax compliance"
        ],
        typicalQuestions: [
          "What's our labor cost percentage?",
          "Show me the P&L for this period",
          "What's the variance from budget?",
          "Which outlets are most profitable?",
          "What are our outstanding invoices?"
        ]
      },
      {
        role: "Purchasing Manager",
        responsibilities: [
          "Vendor management",
          "Purchase order creation",
          "Receiving oversight",
          "Inventory optimization",
          "Cost negotiation"
        ],
        permissions: ["purchasing:create", "purchasing:approve", "receiving:process", "inventory:view"],
        tools: ["Order Guide", "Purchase Orders", "Receiving", "Vendor Management", "Genesis Procurement"],
        knowledgeRequired: [
          "Vendor relationships",
          "Purchase order workflow",
          "Receiving procedures",
          "Inventory par levels",
          "Cost analysis"
        ],
        typicalQuestions: [
          "What items need reordering?",
          "Show me pending purchase orders",
          "What did we receive today?",
          "Which vendor has the best price?",
          "What's our inventory value?"
        ]
      },
      {
        role: "Inventory Manager",
        responsibilities: [
          "Inventory tracking and accuracy",
          "Par level management",
          "Storage organization",
          "Waste tracking",
          "Inventory counts"
        ],
        permissions: ["inventory:view", "inventory:adjust", "inventory:count"],
        tools: ["Inventory", "Quick Counts", "Storage Layout", "Waste Trackers"],
        knowledgeRequired: [
          "Inventory management",
          "FIFO/LIFO principles",
          "Storage requirements",
          "Waste management",
          "Par level calculation"
        ],
        typicalQuestions: [
          "What's the current inventory level?",
          "Show me items below par",
          "What's our inventory value?",
          "Where is this item stored?",
          "What's our waste percentage?"
        ]
      },
      {
        role: "HR Manager",
        responsibilities: [
          "Employee management",
          "Schedule oversight",
          "Payroll coordination",
          "Compliance",
          "Training"
        ],
        permissions: ["schedule:view", "schedule:edit", "employee:manage", "hr:view"],
        tools: ["Schedule", "Employee Management", "Job Sharing", "Time Off"],
        knowledgeRequired: [
          "Labor laws and compliance",
          "Scheduling best practices",
          "Payroll processing",
          "Employee relations"
        ],
        typicalQuestions: [
          "Who's scheduled this week?",
          "What's our labor cost?",
          "Show me open positions",
          "Who's on leave?",
          "What's our staffing ratio?"
        ]
      }
    ],
    workflows: [
      {
        workflow: "Recipe to Menu",
        description: "Create recipe → Add to menu → Publish → POS",
        steps: ["Create recipe", "Cost calculation", "Menu placement", "Pricing", "Publish"],
        participants: ["Chef", "Menu Manager"],
        integrations: ["Recipe Editor", "Menu Studio", "POS"],
        metrics: ["Plate cost", "Menu mix", "Sales"]
      },
      {
        workflow: "Order to Inventory",
        description: "Identify need → Create PO → Receive → Update Inventory",
        steps: ["Demand identification", "Vendor selection", "PO creation", "Receiving", "Inventory update"],
        participants: ["Purchasing Manager", "Receiver"],
        integrations: ["Order Guide", "PO", "Receiving", "Inventory"],
        metrics: ["Order accuracy", "Delivery time", "Cost variance"]
      },
      {
        workflow: "Invoice to GL",
        description: "Receive invoice → Scan → Approve → Post to GL",
        steps: ["Invoice receipt", "Scanning", "Review", "Approval", "GL posting"],
        participants: ["AP Clerk", "Manager", "Accountant"],
        integrations: ["Invoice Scan", "AP", "GL"],
        metrics: ["Processing time", "Accuracy", "Cost"]
      },
      {
        workflow: "Schedule to Payroll",
        description: "Create schedule → Time tracking → Payroll → GL",
        steps: ["Schedule creation", "Employee clock in/out", "Timesheet review", "Payroll processing", "GL posting"],
        participants: ["Scheduler", "Employees", "Payroll"],
        integrations: ["Schedule", "Time Clock", "Payroll", "GL"],
        metrics: ["Hours", "Overtime", "Labor cost"]
      }
    ],
    domains: [
      {
        domain: "Culinary",
        expertise: ["Recipe development", "Menu engineering", "Food cost", "Kitchen operations"],
        systems: ["Recipe Editor", "Menu Studio", "R&D Labs", "Plate Costing"],
        terminology: ["Mise en place", "Prep time", "Plate cost", "Food cost percentage", "Menu mix"],
        bestPractices: [
          "Maintain accurate recipe costs",
          "Update recipes with price changes",
          "Track prep times accurately",
          "Monitor food waste"
        ]
      },
      {
        domain: "Financial",
        expertise: ["Accounting", "Financial reporting", "Cost control", "Budgeting"],
        systems: ["EchoAurum", "GL", "AP", "Reports"],
        terminology: ["P&L", "COGS", "Labor cost", "Prime cost", "Budget variance", "GAAP"],
        bestPractices: [
          "Close periods on time",
          "Reconcile accounts regularly",
          "Monitor budget variances",
          "Maintain audit trail"
        ]
      },
      {
        domain: "Inventory",
        expertise: ["Inventory management", "Par levels", "Waste reduction", "Storage"],
        systems: ["Inventory", "Ordering", "Receiving", "Quick Counts"],
        terminology: ["Par level", "FIFO", "Lot tracking", "Waste percentage", "Inventory turnover"],
        bestPractices: [
          "Maintain accurate par levels",
          "Conduct regular counts",
          "Track waste",
          "Organize storage efficiently"
        ]
      },
      {
        domain: "Human Resources",
        expertise: ["Scheduling", "Labor management", "Compliance", "Payroll"],
        systems: ["Schedule", "Job Sharing", "Time Off", "Attendance"],
        terminology: ["Labor percentage", "Overtime", "Shift coverage", "FMLA", "Labor cost"],
        bestPractices: [
          "Balance labor cost with service",
          "Plan for peak times",
          "Track attendance",
          "Manage overtime"
        ]
      }
    ]
  }
};

/**
 * Get comprehensive system knowledge for a module
 */
export function getModuleKnowledge(moduleId: string): SystemModule | null {
  return SYSTEM_KNOWLEDGE.modules.find(m => m.id === moduleId) || null;
}

/**
 * Get all integrations for a module
 */
export function getModuleIntegrations(moduleId: string): SystemIntegration[] {
  return SYSTEM_KNOWLEDGE.integrations.filter(i => 
    i.from === moduleId || i.to === moduleId
  );
}

/**
 * Get role-specific knowledge
 */
export function getRoleKnowledge(role: string): RoleKnowledge | null {
  return SYSTEM_KNOWLEDGE.hospitalityDomain.roles.find(r => 
    r.role.toLowerCase().includes(role.toLowerCase())
  ) || null;
}

/**
 * Get domain knowledge
 */
export function getDomainKnowledge(domain: string): DomainKnowledge | null {
  return SYSTEM_KNOWLEDGE.hospitalityDomain.domains.find(d => 
    d.domain.toLowerCase().includes(domain.toLowerCase())
  ) || null;
}
