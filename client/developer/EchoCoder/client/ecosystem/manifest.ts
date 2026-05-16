/**
 * Ecosystem Module Manifest
 * Unified module registry combining core modules with imported Builder.io ecosystem
 */

import { BuilderIOModule } from "./builder-io-importer";

export interface ModuleInfo {
  id: string;
  name: string;
  route: string;
  path: string;
  generated: boolean;
  icon?: string;
  description?: string;
  source: "core" | "builder-io" | "echocoder";
  metadata?: Record<string, any>;
}

/**
 * Get all available modules (core + imported + generated)
 */
export function getAllModules(): ModuleInfo[] {
  const coreModules = getCoreModules();
  const importedModules = getImportedModules();
  const generatedModules = getGeneratedModules();

  return [...coreModules, ...importedModules, ...generatedModules];
}

/**
 * Get core system modules
 */
function getCoreModules(): ModuleInfo[] {
  return [
    {
      id: "culinary",
      name: "Culinary",
      route: "/culinary",
      path: "client/pages/modules/Culinary.tsx",
      generated: false,
      icon: "🍳",
      description: "Recipe management",
      source: "core",
    },
    {
      id: "pastry",
      name: "Pastry",
      route: "/pastry",
      path: "client/pages/modules/Pastry.tsx",
      generated: false,
      icon: "🎂",
      description: "Cake design",
      source: "core",
    },
    {
      id: "schedule",
      name: "Schedule",
      route: "/schedule",
      path: "client/pages/modules/Schedule.tsx",
      generated: false,
      icon: "📅",
      description: "Production timeline",
      source: "core",
    },
    {
      id: "inventory",
      name: "Inventory",
      route: "/inventory",
      path: "client/pages/modules/Inventory.tsx",
      generated: false,
      icon: "📦",
      description: "Supply tracking",
      source: "core",
    },
    {
      id: "crm",
      name: "CRM",
      route: "/crm",
      path: "client/pages/modules/CRM.tsx",
      generated: false,
      icon: "👥",
      description: "Customer management",
      source: "core",
    },
    {
      id: "chefnet",
      name: "ChefNet",
      route: "/chefnet",
      path: "client/pages/modules/ChefNet.tsx",
      generated: false,
      icon: "👨‍🍳",
      description: "Team collaboration",
      source: "core",
    },
    {
      id: "support",
      name: "Support",
      route: "/support",
      path: "client/pages/modules/Support.tsx",
      generated: false,
      icon: "💬",
      description: "Help & support",
      source: "core",
    },
    {
      id: "whiteboard",
      name: "Whiteboard",
      route: "/whiteboard",
      path: "client/pages/modules/Whiteboard.tsx",
      generated: false,
      icon: "✏️",
      description: "Drawing & sketching",
      source: "core",
    },
    {
      id: "video",
      name: "Video",
      route: "/video",
      path: "client/pages/modules/Video.tsx",
      generated: false,
      icon: "🎥",
      description: "Video management",
      source: "core",
    },
    {
      id: "canvas",
      name: "Canvas",
      route: "/canvas",
      path: "client/pages/modules/Canvas.tsx",
      generated: false,
      icon: "🎨",
      description: "Design canvas",
      source: "core",
    },
    {
      id: "stickynotes",
      name: "Sticky Notes",
      route: "/stickynotes",
      path: "client/pages/modules/StickyNotes.tsx",
      generated: false,
      icon: "📝",
      description: "Quick notes",
      source: "core",
    },
    {
      id: "maestro",
      name: "Maestro",
      route: "/maestro",
      path: "client/pages/modules/Maestro.tsx",
      generated: false,
      icon: "🎼",
      description: "Kitchen management",
      source: "core",
    },
    {
      id: "mixology",
      name: "Mixology",
      route: "/mixology",
      path: "client/pages/modules/Mixology.tsx",
      generated: false,
      icon: "🍹",
      description: "Bar management",
      source: "core",
    },
    {
      id: "echocoder",
      name: "EchoCoder",
      route: "/echocoder",
      path: "client/pages/modules/EchoCoder.tsx",
      generated: false,
      icon: "💻",
      description: "AI module builder",
      source: "core",
    },
    {
      id: "aurum",
      name: "Aurum",
      route: "/aurum",
      path: "client/pages/modules/Aurum.tsx",
      generated: false,
      icon: "💰",
      description: "Financial tracking",
      source: "core",
    },
    {
      id: "layout",
      name: "Layout",
      route: "/layout",
      path: "client/pages/modules/Layout.tsx",
      generated: false,
      icon: "🏗️",
      description: "Layout builder",
      source: "core",
    },
  ];
}

/**
 * Get imported Builder.io modules
 */
function getImportedModules(): ModuleInfo[] {
  try {
    const data = localStorage.getItem("builder-io.modules");
    if (!data) return [];

    const builderModules: BuilderIOModule[] = JSON.parse(data);
    return builderModules.map((m) => ({
      id: m.id,
      name: m.name,
      route: m.route,
      path: m.componentPath,
      generated: false,
      icon: m.icon || "📦",
      description: m.description,
      source: "builder-io" as const,
      metadata: m.metadata,
    }));
  } catch (error) {
    console.error("Error loading imported modules:", error);
    return [];
  }
}

/**
 * Get EchoCoder-generated modules
 */
function getGeneratedModules(): ModuleInfo[] {
  try {
    const data = localStorage.getItem("echocoder.generatedModules");
    if (!data) return [];

    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading generated modules:", error);
    return [];
  }
}

/**
 * Find module by ID
 */
export function findModuleById(id: string): ModuleInfo | undefined {
  return getAllModules().find((m) => m.id === id);
}

/**
 * Find module by route
 */
export function findModuleByRoute(route: string): ModuleInfo | undefined {
  return getAllModules().find((m) => m.route === route);
}

/**
 * Get modules by source
 */
export function getModulesBySource(
  source: "core" | "builder-io" | "echocoder",
): ModuleInfo[] {
  return getAllModules().filter((m) => m.source === source);
}

/**
 * Get module statistics
 */
export function getModuleStatistics(): {
  total: number;
  core: number;
  builderIO: number;
  generated: number;
} {
  const all = getAllModules();
  return {
    total: all.length,
    core: all.filter((m) => m.source === "core").length,
    builderIO: all.filter((m) => m.source === "builder-io").length,
    generated: all.filter((m) => m.source === "echocoder").length,
  };
}

/**
 * Search modules by name or description
 */
export function searchModules(query: string): ModuleInfo[] {
  const normalizedQuery = query.toLowerCase();
  return getAllModules().filter(
    (m) =>
      m.name.toLowerCase().includes(normalizedQuery) ||
      m.description?.toLowerCase().includes(normalizedQuery),
  );
}

/**
 * Export ecosystem manifest
 */
export function getEcosystemManifest(): {
  version: string;
  timestamp: string;
  modules: ModuleInfo[];
  statistics: ReturnType<typeof getModuleStatistics>;
} {
  return {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    modules: getAllModules(),
    statistics: getModuleStatistics(),
  };
}
