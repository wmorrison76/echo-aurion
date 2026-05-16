export interface StandardRule {
  low: number;
  high: number;
  count: number;
}

export type Standards = Record<string, StandardRule[]>;

const KEY = "shiftflow:lms:standards";

function k(outlet?: string, dept?: string) {
  const o =
    outlet ||
    (typeof window !== "undefined"
      ? localStorage.getItem("shiftflow:outlet") || "Main"
      : "Main");
  const d =
    (dept ||
      (typeof window !== "undefined"
        ? localStorage.getItem("shiftflow:lms:dept") || "BOH"
        : "BOH"))
      .toUpperCase();
  return `${KEY}:${o}:${d}`;
}

export function loadStandards(outlet?: string, dept?: string): Standards {
  try {
    const s = localStorage.getItem(k(outlet, dept));
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

export function saveStandards(st: Standards, outlet?: string, dept?: string) {
  try {
    localStorage.setItem(k(outlet, dept), JSON.stringify(st));
  } catch {
    // ignore storage errors
  }
}

export function requiredFor(
  position: string,
  covers: number,
  st: Standards,
): number {
  const rules = st[position] || [];
  for (const r of rules) {
    if (covers >= r.low && covers <= r.high) return r.count;
  }

  const lower = rules
    .filter((r) => covers >= r.low)
    .sort((a, b) => b.low - a.low)[0];

  return lower ? lower.count : 0;
}

export const DEFAULT_PRESETS: Record<string, string[]> = {
  BOH: ["Saute", "Broiler", "Garde Manger", "Grill", "Hot Line Prep", "Omelet", "Expo"],
  FOH: ["Server", "Host", "Busser", "Runner", "Bartender"],
  STEWARDS: ["Dish", "Steward"],
  BANQUETS: ["Banquet Cook", "Banquet Server", "BQT Chef"],
};

function presetKey(dept: string) {
  return `shiftflow:lms:preset:${dept.toUpperCase()}`;
}

export function loadPresets(dept: string) {
  try {
    const s = localStorage.getItem(presetKey(dept));
    return s ? JSON.parse(s) : DEFAULT_PRESETS[dept.toUpperCase()] || [];
  } catch {
    return DEFAULT_PRESETS[dept.toUpperCase()] || [];
  }
}

export function savePresets(dept: string, list: string[]) {
  try {
    localStorage.setItem(
      presetKey(dept),
      JSON.stringify(Array.from(new Set(list))),
    );
  } catch {
    // ignore storage errors
  }
}
