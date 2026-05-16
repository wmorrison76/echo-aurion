/**
 * Maestro RBAC (Role-Based Access Control)
 *
 * Defines visibility and edit permissions for roles across the dashboard.
 * Controls which panels, fields, and actions are available per role.
 *
 * Roles:
 * - admin: Full access to everything
 * - executive_chef: All panels except costs; can approve changes
 * - sous_chef: Production + inventory + labor (read-only costs)
 * - chef: Production + inventory (own station only)
 * - event_planner: BEO + menu + timeline; cannot edit costs
 * - purchasing_manager: Inventory + orders; cannot access production
 * - labor_manager: Labor + scheduling only
 */

export type MaestroRole =
  | "admin"
  | "executive_chef"
  | "sous_chef"
  | "chef"
  | "event_planner"
  | "purchasing_manager"
  | "labor_manager"
  | "guest";

export type PanelId =
  | "event_command"
  | "beo"
  | "changelog"
  | "production"
  | "production_calendar"
  | "inventory"
  | "labor"
  | "watch_panels"
  | "ai";

export interface PanelPermissions {
  visible: boolean;
  canRead: boolean;
  canEdit: boolean;
  canApprove: boolean;
}

/**
 * RBAC Matrix: Which roles can access which panels?
 */
const PANEL_RBAC: Record<MaestroRole, Record<PanelId, PanelPermissions>> = {
  admin: {
    event_command: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: true,
    },
    beo: { visible: true, canRead: true, canEdit: true, canApprove: true },
    changelog: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: true,
    },
    production: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: true,
    },
    production_calendar: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: true,
    },
    inventory: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: true,
    },
    labor: { visible: true, canRead: true, canEdit: true, canApprove: true },
    watch_panels: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: true,
    },
    ai: { visible: true, canRead: true, canEdit: true, canApprove: true },
  },

  executive_chef: {
    event_command: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: true,
    },
    beo: { visible: true, canRead: true, canEdit: true, canApprove: true },
    changelog: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: true,
    },
    production: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: true,
    },
    production_calendar: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: true,
    },
    inventory: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: true,
    },
    labor: { visible: true, canRead: true, canEdit: true, canApprove: true },
    watch_panels: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: true,
    },
    ai: { visible: true, canRead: true, canEdit: false, canApprove: false },
  },

  sous_chef: {
    event_command: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: false,
    },
    beo: { visible: true, canRead: true, canEdit: false, canApprove: false },
    changelog: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: false,
    },
    production: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: false,
    },
    production_calendar: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: false,
    },
    inventory: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: false,
    },
    labor: { visible: true, canRead: true, canEdit: false, canApprove: false },
    watch_panels: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: false,
    },
    ai: { visible: false, canRead: false, canEdit: false, canApprove: false },
  },

  chef: {
    event_command: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: false,
    },
    beo: { visible: true, canRead: true, canEdit: false, canApprove: false },
    changelog: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    production: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: false,
    }, // Own station only (filtered)
    production_calendar: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    inventory: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: false,
    }, // Read-only for own station
    labor: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    watch_panels: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: false,
    },
    ai: { visible: false, canRead: false, canEdit: false, canApprove: false },
  },

  event_planner: {
    event_command: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: false,
    },
    beo: { visible: true, canRead: true, canEdit: true, canApprove: false },
    changelog: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: false,
    },
    production: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: false,
    },
    production_calendar: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    inventory: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    labor: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    watch_panels: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    ai: { visible: false, canRead: false, canEdit: false, canApprove: false },
  },

  purchasing_manager: {
    event_command: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: false,
    },
    beo: { visible: false, canRead: false, canEdit: false, canApprove: false },
    changelog: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: false,
    },
    production: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: false,
    },
    production_calendar: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    inventory: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: false,
    },
    labor: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    watch_panels: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: false,
    },
    ai: { visible: false, canRead: false, canEdit: false, canApprove: false },
  },

  labor_manager: {
    event_command: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: false,
    },
    beo: { visible: false, canRead: false, canEdit: false, canApprove: false },
    changelog: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    production: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    production_calendar: {
      visible: true,
      canRead: true,
      canEdit: true,
      canApprove: false,
    },
    inventory: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    labor: { visible: true, canRead: true, canEdit: true, canApprove: false },
    watch_panels: {
      visible: true,
      canRead: true,
      canEdit: false,
      canApprove: false,
    },
    ai: { visible: false, canRead: false, canEdit: false, canApprove: false },
  },

  guest: {
    event_command: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    beo: { visible: false, canRead: false, canEdit: false, canApprove: false },
    changelog: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    production: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    production_calendar: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    inventory: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    labor: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    watch_panels: {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    },
    ai: { visible: false, canRead: false, canEdit: false, canApprove: false },
  },
};

/**
 * Field-level permissions for sensitive data
 */
const FIELD_RBAC: Record<MaestroRole, Record<string, boolean>> = {
  admin: {
    cost: true,
    budget: true,
    profit_margin: true,
    labor_cost: true,
    cogs: true,
  },

  executive_chef: {
    cost: false,
    budget: false,
    profit_margin: false,
    labor_cost: false,
    cogs: false,
  },

  sous_chef: {
    cost: false,
    budget: false,
    profit_margin: false,
    labor_cost: false,
    cogs: false,
  },

  chef: {
    cost: false,
    budget: false,
    profit_margin: false,
    labor_cost: false,
    cogs: false,
  },

  event_planner: {
    cost: false,
    budget: false,
    profit_margin: false,
    labor_cost: false,
    cogs: false,
  },

  purchasing_manager: {
    cost: true,
    budget: false,
    profit_margin: false,
    labor_cost: false,
    cogs: true,
  },

  labor_manager: {
    cost: false,
    budget: false,
    profit_margin: false,
    labor_cost: true,
    cogs: false,
  },

  guest: {},
};

/**
 * Get panel permissions for a role
 */
export function getPanelPermissions(
  role: MaestroRole,
  panelId: PanelId,
): PanelPermissions {
  return (
    PANEL_RBAC[role]?.[panelId] || {
      visible: false,
      canRead: false,
      canEdit: false,
      canApprove: false,
    }
  );
}

/**
 * Check if a role can perform an action on a panel
 */
export function canAccess(
  role: MaestroRole,
  panelId: PanelId,
  action: "read" | "edit" | "approve",
): boolean {
  const perms = getPanelPermissions(role, panelId);

  switch (action) {
    case "read":
      return perms.visible && perms.canRead;
    case "edit":
      return perms.canEdit;
    case "approve":
      return perms.canApprove;
    default:
      return false;
  }
}

/**
 * Get visible panels for a role
 */
export function getVisiblePanels(role: MaestroRole): PanelId[] {
  const panels = PANEL_RBAC[role];
  if (!panels) return [];
  return (Object.entries(panels) as Array<[PanelId, PanelPermissions]>)
    .filter(([_, perms]) => perms.visible)
    .map(([panelId]) => panelId);
}

/**
 * Get all permissions for a role (for RBAC matrix)
 */
export function getRbacPermissions(
  role: MaestroRole,
): Record<PanelId, PanelPermissions> {
  return (
    PANEL_RBAC[role] || {
      event_command: {
        visible: false,
        canRead: false,
        canEdit: false,
        canApprove: false,
      },
      beo: {
        visible: false,
        canRead: false,
        canEdit: false,
        canApprove: false,
      },
      changelog: {
        visible: false,
        canRead: false,
        canEdit: false,
        canApprove: false,
      },
      production: {
        visible: false,
        canRead: false,
        canEdit: false,
        canApprove: false,
      },
      production_calendar: {
        visible: false,
        canRead: false,
        canEdit: false,
        canApprove: false,
      },
      inventory: {
        visible: false,
        canRead: false,
        canEdit: false,
        canApprove: false,
      },
      labor: {
        visible: false,
        canRead: false,
        canEdit: false,
        canApprove: false,
      },
      watch_panels: {
        visible: false,
        canRead: false,
        canEdit: false,
        canApprove: false,
      },
      ai: { visible: false, canRead: false, canEdit: false, canApprove: false },
    }
  );
}

/**
 * Check if a role can view a field
 */
export function canViewField(role: MaestroRole, fieldName: string): boolean {
  return FIELD_RBAC[role]?.[fieldName] ?? false;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: MaestroRole): string {
  const names: Record<MaestroRole, string> = {
    admin: "Administrator",
    executive_chef: "Executive Chef",
    sous_chef: "Sous Chef",
    chef: "Chef",
    event_planner: "Event Planner",
    purchasing_manager: "Purchasing Manager",
    labor_manager: "Labor Manager",
    guest: "Guest",
  };
  return names[role] || role;
}
