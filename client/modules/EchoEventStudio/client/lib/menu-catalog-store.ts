import type { MenuItem } from "../components/BeoMenuPicker";

export type MenuCatalogItem = MenuItem & {
  createdAt: string;
  updatedAt: string;
  source?: {
    kind: "manual" | "import";
    fileName?: string;
    fileType?: string;
  };
};

const STORAGE_KEY = "echoeventstudio:menuCatalog:v1";

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadMenuCatalog(): MenuCatalogItem[] {
  if (typeof window === "undefined") return [];
  const parsed = safeJsonParse<{ items?: MenuCatalogItem[] }>(
    localStorage.getItem(STORAGE_KEY),
  );
  const items = Array.isArray(parsed?.items) ? parsed!.items! : [];
  return items.filter(Boolean);
}

export function saveMenuCatalog(items: MenuCatalogItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
  } catch {
    // ignore (storage quota / privacy modes)
  }
}

export function getMenuCatalogItems(): MenuCatalogItem[] {
  return loadMenuCatalog();
}

export function upsertMenuCatalogItems(
  incoming: MenuItem[],
  meta?: { source?: MenuCatalogItem["source"] },
): MenuCatalogItem[] {
  const now = new Date().toISOString();
  const existing = loadMenuCatalog();
  const map = new Map<string, MenuCatalogItem>();
  for (const it of existing) map.set(it.id, it);

  for (const it of incoming) {
    const prev = map.get(it.id);
    map.set(it.id, {
      ...it,
      createdAt: prev?.createdAt || now,
      updatedAt: now,
      source: meta?.source ?? prev?.source,
    });
  }

  const next = Array.from(map.values()).sort((a, b) =>
    (b.updatedAt || "").localeCompare(a.updatedAt || ""),
  );
  saveMenuCatalog(next);
  return next;
}

export function removeMenuCatalogItem(id: string): MenuCatalogItem[] {
  const next = loadMenuCatalog().filter((x) => x.id !== id);
  saveMenuCatalog(next);
  return next;
}

export function clearMenuCatalog(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
