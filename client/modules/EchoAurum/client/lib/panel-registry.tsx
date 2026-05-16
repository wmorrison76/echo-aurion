import React from "react";
export type PanelKey =
  | "dashboard"
  | "aurum"
  | "apWorkflow"
  | "automation"
  | "compliance"
  | "console"
  | "help"
  | "insights"
  | "migration"
  | "onboarding"
  | "pnl"
  | "profile"
  | "purchRec";
export interface PanelMetadata {
  key: PanelKey;
  label: string;
  description: string;
  icon: string;
  defaultWidth?: number;
  defaultHeight?: number;
}
export interface PanelRegistry {
  [key in PanelKey]: () => Promise<{ default: React.ComponentType<any> }>;
}
const FallbackComponent = (name: string) => () => (
  <div className="p-4 text-center text-muted-foreground">
    {" "}
    {name} module not found{" "}
  </div>
);
export const PANEL_REGISTRY: PanelRegistry = {
  dashboard: () =>
    import("@/modules/Dashboard").catch(() => ({
      default: FallbackComponent("Dashboard"),
    })),
  aurum: () =>
    import("@/modules/aurum").catch(() => ({
      default: FallbackComponent("Aurum"),
    })),
  apWorkflow: () =>
    import("@/modules/apWorkflow").catch(() => ({
      default: FallbackComponent("AP Workflow"),
    })),
  automation: () =>
    import("@/modules/automation").catch(() => ({
      default: FallbackComponent("Automation"),
    })),
  compliance: () =>
    import("@/modules/compliance").catch(() => ({
      default: FallbackComponent("Compliance"),
    })),
  console: () =>
    import("@/modules/console").catch(() => ({
      default: FallbackComponent("Console"),
    })),
  help: () =>
    import("@/modules/help").catch(() => ({
      default: FallbackComponent("Help"),
    })),
  insights: () =>
    import("@/modules/insights").catch(() => ({
      default: FallbackComponent("Insights"),
    })),
  migration: () =>
    import("@/modules/migration").catch(() => ({
      default: FallbackComponent("Migration"),
    })),
  onboarding: () =>
    import("@/modules/onboarding").catch(() => ({
      default: FallbackComponent("Onboarding"),
    })),
  pnl: () =>
    import("@/modules/pnl").catch(() => ({
      default: FallbackComponent("P&L"),
    })),
  profile: () =>
    import("@/modules/profile").catch(() => ({
      default: FallbackComponent("Profile"),
    })),
  purchRec: () =>
    import("@/modules/purchRec").catch(() => ({
      default: FallbackComponent("Purchase & Receiving"),
    })),
};
export const PANEL_METADATA: Record<PanelKey, PanelMetadata> = {
  dashboard: {
    key: "dashboard",
    label: "Dashboard",
    description: "Main dashboard overview",
    icon: "📊",
    defaultWidth: 1200,
    defaultHeight: 800,
  },
  aurum: {
    key: "aurum",
    label: "EchoAurum",
    description: "Accounting and auditing suite",
    icon: "📖",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  apWorkflow: {
    key: "apWorkflow",
    label: "AP Workflow",
    description: "Accounts Payable workflow management",
    icon: "📋",
    defaultWidth: 900,
    defaultHeight: 600,
  },
  automation: {
    key: "automation",
    label: "Automation",
    description: "Automation rules and settings",
    icon: "⚙️",
    defaultWidth: 900,
    defaultHeight: 600,
  },
  compliance: {
    key: "compliance",
    label: "Compliance",
    description: "Compliance automation and monitoring",
    icon: "✓",
    defaultWidth: 900,
    defaultHeight: 600,
  },
  console: {
    key: "console",
    label: "Console",
    description: "System console and monitoring",
    icon: "🖥️",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  help: {
    key: "help",
    label: "Help & Support",
    description: "Help center and onboarding",
    icon: "❓",
    defaultWidth: 800,
    defaultHeight: 600,
  },
  insights: {
    key: "insights",
    label: "Insights",
    description: "Variance and business insights",
    icon: "💡",
    defaultWidth: 900,
    defaultHeight: 600,
  },
  migration: {
    key: "migration",
    label: "Migration Toolkit",
    description: "Data migration tools",
    icon: "🚀",
    defaultWidth: 900,
    defaultHeight: 600,
  },
  onboarding: {
    key: "onboarding",
    label: "Onboarding",
    description: "Onboarding playbooks and guides",
    icon: "📚",
    defaultWidth: 900,
    defaultHeight: 600,
  },
  pnl: {
    key: "pnl",
    label: "P&L Analysis",
    description: "Profit and Loss analysis",
    icon: "📈",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
  profile: {
    key: "profile",
    label: "Profile",
    description: "User profile and settings",
    icon: "👤",
    defaultWidth: 800,
    defaultHeight: 600,
  },
  purchRec: {
    key: "purchRec",
    label: "Purchase & Receiving",
    description: "Purchase orders and receiving",
    icon: "📦",
    defaultWidth: 1000,
    defaultHeight: 700,
  },
}; /** * Load a panel component dynamically */
export async function loadPanel(
  key: PanelKey,
): Promise<React.ComponentType<any>> {
  const loader = PANEL_REGISTRY[key];
  if (!loader) {
    throw new Error(`Panel"${key}" not found in registry`);
  }
  const module = await loader();
  return module.default;
} /** * Get metadata for a panel */
export function getPanelMetadata(key: PanelKey): PanelMetadata {
  const metadata = PANEL_METADATA[key];
  if (!metadata) {
    throw new Error(`Metadata for panel"${key}" not found`);
  }
  return metadata;
} /** * Get all available panels */
export function getAllPanels(): PanelMetadata[] {
  return Object.values(PANEL_METADATA);
}
