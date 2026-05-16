export interface Preset {
  id: string;
  name: string;
  description: string;
  category: "filter" | "adjustment" | "color" | "effect";
  adjustments: Record<string, any>;
  tags: string[];
  thumbnail?: string;
  createdAt: number;
  modifiedAt: number;
}

const STORAGE_KEY = "echocanva-presets";
const MAX_PRESETS = 50;

export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: "vintage-warm",
    name: "Vintage Warm",
    description: "Warm vintage film look",
    category: "effect",
    adjustments: { brightness: 5, contrast: 10, saturation: -10, hue: 5 },
    tags: ["vintage", "warm", "film"],
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  },
  {
    id: "cool-cinema",
    name: "Cool Cinema",
    description: "Cool cinematic color grade",
    category: "color",
    adjustments: { cyanRed: -15, magentaGreen: 5, yellowBlue: 20, contrast: 15 },
    tags: ["cinema", "cool", "dramatic"],
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  },
  {
    id: "bright-boost",
    name: "Bright Boost",
    description: "Increase brightness and contrast",
    category: "adjustment",
    adjustments: { brightness: 20, contrast: 25, saturation: 15 },
    tags: ["bright", "high-key", "vibrant"],
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  },
  {
    id: "moody-noir",
    name: "Moody Noir",
    description: "Dark and dramatic black & white",
    category: "effect",
    adjustments: { saturation: -100, contrast: 40, brightness: -10 },
    tags: ["noir", "bw", "dramatic"],
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  },
  {
    id: "neon-pop",
    name: "Neon Pop",
    description: "Vibrant neon colors",
    category: "color",
    adjustments: { saturation: 80, contrast: 30, brightness: 10 },
    tags: ["neon", "vibrant", "pop"],
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  },
];

export function savePreset(
  preset: Omit<Preset, "id" | "createdAt" | "modifiedAt">,
): Preset {
  const presets = getAllPresets();
  if (presets.length >= MAX_PRESETS) {
    throw new Error(`Maximum ${MAX_PRESETS} presets reached`);
  }
  const newPreset: Preset = {
    ...preset,
    id: `preset-${Date.now()}`,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  };
  presets.push(newPreset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  return newPreset;
}

export function updatePreset(id: string, updates: Partial<Preset>): Preset {
  const presets = getAllPresets();
  const index = presets.findIndex((p) => p.id === id);
  if (index === -1) throw new Error("Preset not found");
  const updated: Preset = {
    ...presets[index],
    ...updates,
    id: presets[index].id,
    createdAt: presets[index].createdAt,
    modifiedAt: Date.now(),
  };
  presets[index] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  return updated;
}

export function deletePreset(id: string): boolean {
  const presets = getAllPresets();
  const filtered = presets.filter((p) => p.id !== id);
  if (filtered.length === presets.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function getPreset(id: string): Preset | null {
  return getAllPresets().find((p) => p.id === id) || null;
}

export function getAllPresets(): Preset[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return BUILT_IN_PRESETS;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : BUILT_IN_PRESETS;
  } catch {
    return BUILT_IN_PRESETS;
  }
}

export function getPresetsByCategory(category: Preset["category"]): Preset[] {
  return getAllPresets().filter((p) => p.category === category);
}

export function searchPresets(query: string): Preset[] {
  const q = query.toLowerCase();
  return getAllPresets().filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((tag) => tag.toLowerCase().includes(q)),
  );
}

export function exportPresets(): string {
  return JSON.stringify(getAllPresets(), null, 2);
}

export function importPresets(json: string): number {
  try {
    const imported = JSON.parse(json);
    if (!Array.isArray(imported)) throw new Error("Invalid preset format");
    const presets = getAllPresets();
    let added = 0;
    for (const preset of imported) {
      if (presets.length >= MAX_PRESETS) break;
      presets.push({
        ...preset,
        id: `preset-${Date.now()}-${Math.random()}`,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      });
      added++;
    }
    if (added > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return added;
  } catch {
    throw new Error("Failed to import presets");
  }
}

export function clearAllPresets(): void {
  localStorage.removeItem(STORAGE_KEY);
}
