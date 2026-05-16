import { logger } from "../logger";

/* localStorage keys */
export const LS = {
  po: "echo_pos",
  receipts: "echo_receipts",
  haccp: "echo_haccp",
  haccpTasks: "echo_haccp_tasks",
  haccpTraining: "echo_haccp_training",
  vendors: "echo_vendors",
  outlets: "echo_outlets",
  scans: "echo_scans",
  images: "echo_images",
  items: "echo_items",
  glGroups: "echo_gl_groups",
  glMappings: "echo_gl_mappings",
  financeControls: "echo_finance_controls",
  storageAreas: "echo_storage_areas",
  storageRacks: "echo_storage_racks",
  storageBins: "echo_storage_bins",
  quickCountTemplates: "echo_quick_counts",
};

/* UUID/ID generation */
export const id = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? (crypto as any).randomUUID()
    : Math.random().toString(36).slice(2);

/* localStorage helpers */
export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err: any) {
    const quotaError = err && err.name === "QuotaExceededError";

    if (quotaError) {
      try {
        if (key === LS.scans) {
          const scans = read(LS.scans, [] as any[]);
          localStorage.setItem(LS.scans, JSON.stringify(scans.slice(0, 50)));
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        }

        if (key === LS.images) {
          const imgs = read(LS.images, [] as any[]);
          localStorage.setItem(LS.images, JSON.stringify(imgs.slice(0, 100)));
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        }

        if (
          key === LS.storageBins ||
          key === LS.storageRacks ||
          key === LS.storageAreas ||
          key === LS.quickCountTemplates
        ) {
          const existing = read(key, [] as any[]);
          const trimmedLength = Math.max(0, Math.floor(existing.length * 0.75));
          localStorage.setItem(
            key,
            JSON.stringify(existing.slice(0, trimmedLength || 0)),
          );
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        }
      } catch (inner) {
        logger.error("Failed quota recovery for", key, inner);
      }
    }

    logger.error("Failed to persist", key, err);

    try {
      if (quotaError) localStorage.removeItem(key);
    } catch {
      /* ignore cleanup failure */
    }

    try {
      window.dispatchEvent?.(
        new CustomEvent("echo:store:write-error", {
          detail: { key, error: err },
        }),
      );
    } catch {
      /* ignore */
    }

    return false;
  }
}

/* Sanitization utilities */
type AnyRecord = Record<string, unknown>;
export const sanitizeString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const sanitizeNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.+-]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const sanitizeTime = (value: unknown, fallback = "05:00"): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (match) {
      const hours = match[1].padStart(2, "0");
      const minutes = match[2];
      return `${hours}:${minutes}`;
    }
  }
  return fallback;
};

export const sanitizePositiveInt = (
  value: unknown,
  fallback: number,
  min = 1,
  max = 24,
): number => {
  const numeric = sanitizeNumber(value);
  if (numeric == null) return Math.max(min, Math.min(max, fallback));
  const rounded = Math.round(numeric);
  return Math.max(min, Math.min(max, rounded));
};

export const arrayShallowEqual = <T>(
  a: readonly T[] | null | undefined,
  b: readonly T[] | null | undefined,
): boolean => {
  if (a === b) return true;
  const arrA = a ?? [];
  const arrB = b ?? [];
  if (arrA.length !== arrB.length) return false;
  for (let i = 0; i < arrA.length; i += 1) {
    if (arrA[i] !== arrB[i]) return false;
  }
  return true;
};

const DAY_CODES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const normalizeDaysOfWeek = (input: unknown): string[] => {
  if (!Array.isArray(input)) return ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const seen = new Set<string>();
  for (const value of input) {
    if (typeof value !== "string") continue;
    const normalized = value.trim().slice(0, 3).toLowerCase();
    const match = DAY_CODES.find((day) =>
      day.toLowerCase().startsWith(normalized),
    );
    if (match) seen.add(match);
  }
  if (!seen.size) return ["Mon", "Tue", "Wed", "Thu", "Fri"];
  return Array.from(seen);
};

export const dateKey = (date: Date) => date.toISOString().slice(0, 10);

export const isoWeekKey = (date: Date) => {
  const target = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

export const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const itemNameKey = (
  value: string | null | undefined,
): string | null => {
  if (!value) return null;
  return value.trim().toLowerCase().replace(/\s+/g, "");
};

export const average = (values: number[]): number => {
  if (!values.length) return 0;
  const total = values.reduce((acc, v) => acc + v, 0);
  return total / values.length;
};

export const sum = (values: number[]): number =>
  values.reduce((acc, v) => acc + v, 0);

/* Keep for backwards-compat with callers that typeguard unknown objects */
export const isRecord = (value: unknown): value is AnyRecord =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
