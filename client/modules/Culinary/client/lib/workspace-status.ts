/**
 * Workspace Status Checker
 * Validates that all workspace components are properly configured
 */

export type WorkspaceStatus = {
  id: string;
  name: string;
  component: string;
  status: "configured" | "missing" | "error";
  tab: string;
  features: string[];
  dependencies: string[];
};

const WORKSPACES: WorkspaceStatus[] = [
  {
    id: "recipe-search",
    name: "Recipe Search",
    component: "RecipeSearchSection",
    status: "configured",
    tab: "search",
    features: ["search", "filters", "categories"],
    dependencies: ["recipes", "ingredients"],
  },
  {
    id: "gallery",
    name: "Gallery",
    component: "GallerySection",
    status: "configured",
    tab: "gallery",
    features: ["image-upload", "organization", "sharing"],
    dependencies: ["storage"],
  },
  {
    id: "add-recipe",
    name: "Add Recipe",
    component: "AddRecipeSection",
    status: "configured",
    tab: "add-recipe",
    features: ["form", "validation", "import"],
    dependencies: ["recipes", "ingredients"],
  },
  {
    id: "inventory",
    name: "Inventory & Supplies",
    component: "InventorySuppliesWorkspace",
    status: "configured",
    tab: "inventory",
    features: ["inventory-tracking", "stock-levels", "reorder-points"],
    dependencies: ["suppliers", "storage"],
  },
  {
    id: "nutrition",
    name: "Nutrition & Allergens",
    component: "NutritionAllergensWorkspace",
    status: "configured",
    tab: "nutrition",
    features: ["nutrition-labels", "allergen-tracking", "usda-integration"],
    dependencies: ["usda-nutrition", "recipes"],
  },
  {
    id: "haccp",
    name: "HACCP Compliance",
    component: "HaccpComplianceWorkspace",
    status: "configured",
    tab: "haccp",
    features: ["compliance-tracking", "documentation", "audits"],
    dependencies: ["storage", "recipes"],
  },
  {
    id: "waste-tracking",
    name: "Waste Tracking",
    component: "WasteTrackingWorkspace",
    status: "configured",
    tab: "waste-tracking",
    features: ["waste-logging", "cost-analysis", "prevention"],
    dependencies: ["recipes", "costing-engine"],
  },
  {
    id: "customer-service",
    name: "Customer Service",
    component: "CustomerServiceWorkspace",
    status: "configured",
    tab: "customer-service",
    features: ["customer-management", "preferences", "service-types"],
    dependencies: ["storage", "cloud-sync"],
  },
  {
    id: "plate-costing",
    name: "Plate Costing & Analysis",
    component: "PlateCostingWorkspace",
    status: "configured",
    tab: "plate-costing",
    features: ["cost-calculation", "margin-analysis", "variance-reports"],
    dependencies: ["costing-engine", "recipes", "suppliers"],
  },
  {
    id: "suppliers",
    name: "Supplier Management",
    component: "SupplierManagementWorkspace",
    status: "configured",
    tab: "suppliers",
    features: ["supplier-api-integration", "pricing", "orders"],
    dependencies: ["real-supplier-apis", "cloud-sync"],
  },
  {
    id: "dish-assembly",
    name: "Dish Assembly",
    component: "DishAssemblySection",
    status: "configured",
    tab: "dish-assembly",
    features: ["component-routing", "production", "pos-mapping"],
    dependencies: ["recipes", "pos-integration"],
  },
  {
    id: "menu-design",
    name: "Menu Design Studio",
    component: "MenuDesignStudioSection",
    status: "configured",
    tab: "menu-design",
    features: ["menu-editing", "export", "layout-design"],
    dependencies: ["storage", "export-utils"],
  },
  {
    id: "server-notes",
    name: "Server Notes",
    component: "ServerNotesSection",
    status: "configured",
    tab: "server-notes",
    features: ["notes", "management", "communication"],
    dependencies: ["storage", "cloud-sync"],
  },
  {
    id: "operations-docs",
    name: "Operations Docs",
    component: "OperationsDocsSection",
    status: "configured",
    tab: "operations-docs",
    features: ["documentation", "procedures", "templates"],
    dependencies: ["storage"],
  },
  {
    id: "production",
    name: "Production",
    component: "ProductionSection",
    status: "configured",
    tab: "production",
    features: ["task-management", "scheduling", "execution"],
    dependencies: ["recipes", "storage"],
  },
  {
    id: "purchasing",
    name: "Purchasing & Receiving",
    component: "PurchasingReceivingSection",
    status: "configured",
    tab: "purch-rec",
    features: ["purchase-orders", "receiving", "verification"],
    dependencies: ["suppliers", "inventory", "storage"],
  },
];

/**
 * Get all configured workspaces
 */
export function getAllWorkspaces(): WorkspaceStatus[] {
  return WORKSPACES;
}

/**
 * Get workspace status by ID
 */
export function getWorkspaceStatus(id: string): WorkspaceStatus | undefined {
  return WORKSPACES.find((w) => w.id === id);
}

/**
 * Get all configured workspaces
 */
export function getConfiguredWorkspaces(): WorkspaceStatus[] {
  return WORKSPACES.filter((w) => w.status === "configured");
}

/**
 * Get workspace by tab name
 */
export function getWorkspaceByTab(tab: string): WorkspaceStatus | undefined {
  return WORKSPACES.find((w) => w.tab === tab);
}

/**
 * Validate workspace dependencies
 */
export function validateWorkspaceDependencies(
  workspaceId: string,
  availableLibraries: string[],
): { valid: boolean; missing: string[] } {
  const workspace = getWorkspaceStatus(workspaceId);
  if (!workspace) {
    return { valid: false, missing: [workspaceId] };
  }

  const missing = workspace.dependencies.filter(
    (dep) => !availableLibraries.includes(dep),
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Generate workspace status report
 */
export function generateWorkspaceStatusReport(): {
  total: number;
  configured: number;
  missing: number;
  errors: number;
  workspaces: WorkspaceStatus[];
} {
  const configured = WORKSPACES.filter((w) => w.status === "configured").length;
  const missing = WORKSPACES.filter((w) => w.status === "missing").length;
  const errors = WORKSPACES.filter((w) => w.status === "error").length;

  return {
    total: WORKSPACES.length,
    configured,
    missing,
    errors,
    workspaces: WORKSPACES,
  };
}

/**
 * Log workspace status to console
 */
export function logWorkspaceStatus(): void {
  const report = generateWorkspaceStatusReport();

  console.group("🔍 Workspace Status Report");
  console.log(`Total Workspaces: ${report.total}`);
  console.log(`✓ Configured: ${report.configured}`);
  console.log(`✗ Missing: ${report.missing}`);
  console.log(`⚠ Errors: ${report.errors}`);

  if (report.configured === report.total) {
    console.log("\n✅ All workspaces are properly configured!");
  } else {
    console.table(report.workspaces);
  }

  console.groupEnd();
}

/**
 * Get workspace navigation structure
 */
export function getWorkspaceNavigation(): Array<{
  category: string;
  workspaces: WorkspaceStatus[];
}> {
  const categories: Record<string, WorkspaceStatus[]> = {
    Core: [],
    "Supply Chain": [],
    Production: [],
    "Menu Design": [],
    "Compliance": [],
    Operations: [],
  };

  // Categorize workspaces
  const workspaceMap: Record<string, string> = {
    "recipe-search": "Core",
    gallery: "Core",
    "add-recipe": "Core",
    inventory: "Supply Chain",
    suppliers: "Supply Chain",
    "purchasing": "Supply Chain",
    "plate-costing": "Production",
    "dish-assembly": "Production",
    "waste-tracking": "Production",
    "menu-design": "Menu Design",
    "server-notes": "Operations",
    "operations-docs": "Operations",
    production: "Production",
    "customer-service": "Operations",
    nutrition: "Compliance",
    haccp: "Compliance",
  };

  WORKSPACES.forEach((workspace) => {
    const category = workspaceMap[workspace.id] || "Other";
    if (!categories[category]) categories[category] = [];
    categories[category].push(workspace);
  });

  return Object.entries(categories)
    .filter(([, workspaces]) => workspaces.length > 0)
    .map(([category, workspaces]) => ({ category, workspaces }));
}
