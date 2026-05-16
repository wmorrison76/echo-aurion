/**
 * Module Discovery System
 * Automatically discovers and registers generated modules
 */

export interface ModuleInfo {
  id: string;
  name: string;
  route: string;
  path: string;
  generated: boolean;
  icon?: string;
  description?: string;
}

// Core modules that come with the system
const CORE_MODULES: ModuleInfo[] = [
  {
    id: "culinary",
    name: "Culinary",
    route: "/culinary",
    path: "client/pages/modules/Culinary.tsx",
    generated: false,
    icon: "🍳",
    description: "Recipe management",
  },
  {
    id: "pastry",
    name: "Pastry",
    route: "/pastry",
    path: "client/pages/modules/Pastry.tsx",
    generated: false,
    icon: "🎂",
    description: "Cake design",
  },
  {
    id: "schedule",
    name: "Schedule",
    route: "/schedule",
    path: "client/pages/modules/Schedule.tsx",
    generated: false,
    icon: "📅",
    description: "Production timeline",
  },
  {
    id: "inventory",
    name: "Inventory",
    route: "/inventory",
    path: "client/pages/modules/Inventory.tsx",
    generated: false,
    icon: "📦",
    description: "Supply tracking",
  },
  {
    id: "crm",
    name: "CRM",
    route: "/crm",
    path: "client/pages/modules/CRM.tsx",
    generated: false,
    icon: "👥",
    description: "Customer management",
  },
  {
    id: "chefnet",
    name: "ChefNet",
    route: "/chefnet",
    path: "client/pages/modules/ChefNet.tsx",
    generated: false,
    icon: "👨‍🍳",
    description: "Team collaboration",
  },
  {
    id: "support",
    name: "Support",
    route: "/support",
    path: "client/pages/modules/Support.tsx",
    generated: false,
    icon: "💬",
    description: "Help & support",
  },
  {
    id: "whiteboard",
    name: "Whiteboard",
    route: "/whiteboard",
    path: "client/pages/modules/Whiteboard.tsx",
    generated: false,
    icon: "✏️",
    description: "Drawing & sketching",
  },
  {
    id: "video",
    name: "Video",
    route: "/video",
    path: "client/pages/modules/Video.tsx",
    generated: false,
    icon: "🎥",
    description: "Video management",
  },
  {
    id: "canvas",
    name: "Canvas",
    route: "/canvas",
    path: "client/pages/modules/Canvas.tsx",
    generated: false,
    icon: "🎨",
    description: "Design canvas",
  },
  {
    id: "stickynotes",
    name: "Sticky Notes",
    route: "/stickynotes",
    path: "client/pages/modules/StickyNotes.tsx",
    generated: false,
    icon: "📝",
    description: "Quick notes",
  },
  {
    id: "maestro",
    name: "Maestro",
    route: "/maestro",
    path: "client/pages/modules/Maestro.tsx",
    generated: false,
    icon: "🎼",
    description: "Kitchen management",
  },
  {
    id: "mixology",
    name: "Mixology",
    route: "/mixology",
    path: "client/pages/modules/Mixology.tsx",
    generated: false,
    icon: "🍹",
    description: "Bar management",
  },
  {
    id: "echocoder",
    name: "EchoCoder",
    route: "/echocoder",
    path: "client/pages/modules/EchoCoder.tsx",
    generated: false,
    icon: "💻",
    description: "AI module builder",
  },
  {
    id: "aurum",
    name: "Aurum",
    route: "/aurum",
    path: "client/pages/modules/Aurum.tsx",
    generated: false,
    icon: "💰",
    description: "Financial tracking",
  },
  {
    id: "layout",
    name: "Layout",
    route: "/layout",
    path: "client/pages/modules/Layout.tsx",
    generated: false,
    icon: "🏗️",
    description: "Layout builder",
  },
];

const GENERATED_MODULES_KEY = "echocoder.generatedModules";

export function getGeneratedModulesFromStorage(): ModuleInfo[] {
  try {
    const stored = localStorage.getItem(GENERATED_MODULES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveGeneratedModule(module: ModuleInfo): void {
  const existing = getGeneratedModulesFromStorage();
  const filtered = existing.filter((m) => m.id !== module.id);
  const updated = [...filtered, module];
  localStorage.setItem(GENERATED_MODULES_KEY, JSON.stringify(updated));
}

export function getAllModules(): ModuleInfo[] {
  const generated = getGeneratedModulesFromStorage();
  return [...CORE_MODULES, ...generated];
}

export function getModulesByCategory(generated: boolean): ModuleInfo[] {
  return getAllModules().filter((m) => m.generated === generated);
}

export function findModuleByRoute(route: string): ModuleInfo | undefined {
  return getAllModules().find((m) => m.route === route);
}

export function findModuleById(id: string): ModuleInfo | undefined {
  return getAllModules().find((m) => m.id === id);
}

export function registerGeneratedModule(
  name: string,
  description: string,
): ModuleInfo {
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const route = "/" + id;

  const module: ModuleInfo = {
    id,
    name,
    route,
    path: `client/pages/modules/${name}.tsx`,
    generated: true,
    description,
  };

  saveGeneratedModule(module);
  return module;
}
