/**
 * Module Capabilities Declaration System
 * Allows each module to declare what actions/permissions it supports
 * The system auto-scans these and generates permission matrices
 */

export interface ModuleAction {
  id: string;
  name: string;
  description: string;
  category: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'configure' | 'admin';
  defaultRoles?: string[]; // Roles that get this action by default
}

export interface ModuleCapabilities {
  moduleKey: string;
  moduleName: string;
  moduleIcon?: string;
  description: string;
  category: string;
  actions: ModuleAction[];
  departmentRestrictions?: string[]; // Only available in these departments
  outletsAvailable?: string[]; // Only available in these outlets
}

/**
 * Registry of all module capabilities
 */
const MODULE_CAPABILITIES_REGISTRY: Record<string, ModuleCapabilities> = {};

/**
 * Register module capabilities
 */
export function registerModuleCapabilities(capabilities: ModuleCapabilities) {
  MODULE_CAPABILITIES_REGISTRY[capabilities.moduleKey] = capabilities;
  console.log(`[ModuleCapabilities] Registered ${capabilities.moduleName}`, capabilities);
}

/**
 * Get all registered module capabilities
 */
export function getAllModuleCapabilities(): ModuleCapabilities[] {
  return Object.values(MODULE_CAPABILITIES_REGISTRY);
}

/**
 * Get capabilities for a specific module
 */
export function getModuleCapabilities(moduleKey: string): ModuleCapabilities | undefined {
  return MODULE_CAPABILITIES_REGISTRY[moduleKey];
}

/**
 * Get all actions across all modules
 */
export function getAllModuleActions(): Array<ModuleAction & { moduleKey: string }> {
  return Object.entries(MODULE_CAPABILITIES_REGISTRY).flatMap(([moduleKey, capabilities]) =>
    capabilities.actions.map((action) => ({ ...action, moduleKey }))
  );
}

/**
 * Pre-defined action templates
 */
export const ACTION_TEMPLATES = {
  CULINARY: {
    recipes: [
      { id: 'recipes:view', name: 'View Recipes', category: 'view' as const },
      { id: 'recipes:create', name: 'Create Recipe', category: 'create' as const },
      { id: 'recipes:edit', name: 'Edit Recipe', category: 'edit' as const },
      { id: 'recipes:delete', name: 'Delete Recipe', category: 'delete' as const },
      { id: 'recipes:approve', name: 'Approve Recipe', category: 'admin' as const },
    ],
    rd: [
      { id: 'rd:access', name: 'Access R&D Module', category: 'view' as const },
      { id: 'rd:experiment', name: 'Create Experiment', category: 'create' as const },
    ],
    inventory: [
      { id: 'inventory:view', name: 'View Inventory', category: 'view' as const },
      { id: 'inventory:edit', name: 'Edit Quantities', category: 'edit' as const },
      { id: 'inventory:order', name: 'Place Orders', category: 'create' as const },
    ],
  },
  PASTRY: {
    recipes: [
      { id: 'pastry:view', name: 'View Recipes', category: 'view' as const },
      { id: 'pastry:create', name: 'Create Recipe', category: 'create' as const },
      { id: 'pastry:edit', name: 'Edit Recipe', category: 'edit' as const },
    ],
    inventory: [
      { id: 'pastry:inventory:view', name: 'View Inventory', category: 'view' as const },
      { id: 'pastry:inventory:edit', name: 'Edit Quantities', category: 'edit' as const },
    ],
  },
  FINANCE: {
    reports: [
      { id: 'reports:view', name: 'View Reports', category: 'view' as const },
      { id: 'reports:export', name: 'Export Reports', category: 'export' as const },
    ],
    budgets: [
      { id: 'budgets:view', name: 'View Budgets', category: 'view' as const },
      { id: 'budgets:edit', name: 'Edit Budgets', category: 'edit' as const },
      { id: 'budgets:approve', name: 'Approve Budgets', category: 'admin' as const },
    ],
    payroll: [
      { id: 'payroll:view', name: 'View Payroll', category: 'view' as const },
      { id: 'payroll:edit', name: 'Edit Payroll', category: 'edit' as const },
    ],
  },
  SCHEDULING: {
    shifts: [
      { id: 'shifts:view', name: 'View Schedule', category: 'view' as const },
      { id: 'shifts:create', name: 'Create Shift', category: 'create' as const },
      { id: 'shifts:edit', name: 'Edit Shift', category: 'edit' as const },
      { id: 'shifts:approve', name: 'Approve Schedule', category: 'admin' as const },
    ],
    requests: [
      { id: 'requests:view', name: 'View Requests', category: 'view' as const },
      { id: 'requests:submit', name: 'Submit Request', category: 'create' as const },
      { id: 'requests:approve', name: 'Approve Requests', category: 'admin' as const },
    ],
  },
};

/**
 * Initialize default capabilities for core modules
 */
export function initializeDefaultCapabilities() {
  // Culinary Module
  registerModuleCapabilities({
    moduleKey: 'culinary',
    moduleName: 'Culinary Engine',
    category: 'Operations',
    description: 'Recipe management, R&D, and culinary operations',
    actions: ACTION_TEMPLATES.CULINARY.recipes
      .concat(ACTION_TEMPLATES.CULINARY.rd)
      .concat(ACTION_TEMPLATES.CULINARY.inventory)
      .map((a) => ({
        ...a,
        description: a.name,
        defaultRoles: ['EXEC_CHEF', 'SOUS_CHEF', 'LINE_COOK'],
      })),
  });

  // Pastry Module
  registerModuleCapabilities({
    moduleKey: 'pastry',
    moduleName: 'Pastry Operations',
    category: 'Operations',
    description: 'Pastry recipes and operations',
    actions: ACTION_TEMPLATES.PASTRY.recipes
      .concat(ACTION_TEMPLATES.PASTRY.inventory)
      .map((a) => ({
        ...a,
        description: a.name,
        defaultRoles: ['PASTRY_CHEF'],
      })),
  });

  // Finance Module
  registerModuleCapabilities({
    moduleKey: 'aurum',
    moduleName: 'EchoAurum (Financials)',
    category: 'Finance',
    description: 'Financial reporting, budgets, and payroll',
    actions: ACTION_TEMPLATES.FINANCE.reports
      .concat(ACTION_TEMPLATES.FINANCE.budgets)
      .concat(ACTION_TEMPLATES.FINANCE.payroll)
      .map((a) => ({
        ...a,
        description: a.name,
        defaultRoles: ['EC', 'FINANCE_DIRECTOR'],
      })),
  });

  // Schedule Module
  registerModuleCapabilities({
    moduleKey: 'schedule',
    moduleName: 'Schedule Management',
    category: 'Operations',
    description: 'Shift scheduling and time-off requests',
    actions: ACTION_TEMPLATES.SCHEDULING.shifts
      .concat(ACTION_TEMPLATES.SCHEDULING.requests)
      .map((a) => ({
        ...a,
        description: a.name,
        defaultRoles: ['DIRECTOR_FB', 'MANAGER'],
      })),
  });

  // Resort Forecast Module
  registerModuleCapabilities({
    moduleKey: 'resort_forecast',
    moduleName: '21-Day Resort Forecast',
    category: 'Operations',
    description: 'Outlet-level forecasting with overrides and drilldowns',
    actions: [
      {
        id: 'forecast:view',
        name: 'View Resort Forecast',
        description: 'View 21-day resort forecast data',
        category: 'view',
        defaultRoles: ['EC', 'DIRECTOR_FB', 'BANQUET_MANAGER', 'EXEC_CHEF', 'SOUS_CHEF'],
      },
      {
        id: 'forecast:override',
        name: 'Override Forecast',
        description: 'Submit outlet-level overrides',
        category: 'edit',
        defaultRoles: ['DIRECTOR_FB', 'BANQUET_MANAGER', 'EXEC_CHEF'],
      },
      {
        id: 'forecast:configure',
        name: 'Configure Forecast Model',
        description: 'Configure forecast drivers and parameters',
        category: 'configure',
        defaultRoles: ['EC', 'DIRECTOR_FB', 'FINANCE_DIRECTOR'],
      },
    ],
  });

  console.log('[ModuleCapabilities] Default capabilities initialized');
}

/**
 * Get actions for a module that should be visible for a role
 */
export function getActionsForRoleInModule(
  moduleKey: string,
  roleId: string
): ModuleAction[] {
  const capabilities = getModuleCapabilities(moduleKey);
  if (!capabilities) return [];

  return capabilities.actions.filter((action) => {
    if (!action.defaultRoles) return false;
    return action.defaultRoles.includes(roleId);
  });
}
