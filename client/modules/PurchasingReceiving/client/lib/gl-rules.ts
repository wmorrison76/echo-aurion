import ruleSet from "@/data/echo_gl_rules.json";
export interface GLRule {
  code: string;
  name: string;
  category: string;
  priority: number;
  patterns: string[];
}
export interface GLRuleSet {
  version?: string;
  notes?: string;
  rules: GLRule[];
}
export interface GLMatch {
  code: string;
  name: string;
  category: string;
  matched: string;
  priority: number;
}
const STORAGE_KEY = "echo_gl_rules";
let cachedRuleSet: GLRuleSet | null = null;
const regexCache = new Map<string, RegExp>();
function isRuleSet(value: unknown): value is GLRuleSet {
  if (!value || typeof value !== "object") return false;
  const candidate = value as GLRuleSet;
  if (!Array.isArray(candidate.rules)) return false;
  return candidate.rules.every(
    (rule) =>
      rule &&
      typeof rule.code === "string" &&
      typeof rule.name === "string" &&
      typeof rule.category === "string" &&
      typeof rule.priority === "number" &&
      Array.isArray(rule.patterns),
  );
}
function normalizeRuleSet(value: unknown): GLRuleSet | null {
  if (isRuleSet(value)) return value;
  if (Array.isArray(value)) {
    return { rules: value as GLRule[] };
  }
  return null;
}
function readFromStorage(): GLRuleSet | null {
  if (typeof window === "undefined") return null;
  if (cachedRuleSet) return cachedRuleSet;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const normalized = normalizeRuleSet(parsed);
    if (!normalized) return null;
    cachedRuleSet = normalized;
    return cachedRuleSet;
  } catch (error) {
    console.warn("Failed to read GL rules from localStorage", error);
    return null;
  }
}
function writeToStorage(ruleSetToSave: GLRuleSet) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ruleSetToSave));
    cachedRuleSet = ruleSetToSave;
  } catch (error) {
    console.warn("Failed to write GL rules to localStorage", error);
  }
}
export function loadRuleSet(): GLRuleSet | null {
  return readFromStorage();
}
export function loadRules(): GLRule[] {
  return readFromStorage()?.rules ?? [];
}
export function installDefaultRules(customRuleSet?: GLRuleSet) {
  const set = customRuleSet ?? (ruleSet as GLRuleSet);
  writeToStorage(set);
}
export function ensureDefaultRules() {
  const existing = readFromStorage();
  const defaultSet = ruleSet as GLRuleSet;
  const hasExistingRules =
    existing && Array.isArray(existing.rules) && existing.rules.length > 0;
  const versionChanged =
    existing?.version &&
    defaultSet.version &&
    existing.version !== defaultSet.version;
  if (!hasExistingRules || versionChanged) {
    writeToStorage(defaultSet);
  }
}
function patternToRegex(pattern: string): RegExp {
  let cached = regexCache.get(pattern);
  if (!cached) {
    cached = new RegExp(pattern, "i");
    regexCache.set(pattern, cached);
  }
  return cached;
}
export function classify(text: string | null | undefined): GLMatch | null {
  if (!text) return null;
  const rules = loadRules();
  if (!rules.length) return null;
  const haystack = String(text).toLowerCase();
  let best: GLMatch | null = null;
  for (const rule of rules) {
    for (const pattern of rule.patterns) {
      const regex = patternToRegex(pattern);
      if (regex.test(haystack)) {
        if (!best || rule.priority < best.priority) {
          best = {
            code: rule.code,
            name: rule.name,
            category: rule.category,
            matched: pattern,
            priority: rule.priority,
          };
        }
        break;
      }
    }
  }
  return best;
}
function attachToWindow() {
  if (typeof window === "undefined") return;
  const api = { loadRules, installDefaultRules, classify } as const;
  (window as typeof window & { EchoGL?: typeof api }).EchoGL = api;
}
if (typeof window !== "undefined") {
  ensureDefaultRules();
  attachToWindow();
}
