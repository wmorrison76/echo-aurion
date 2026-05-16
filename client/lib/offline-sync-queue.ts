/**
 * Offline sync queue (Moat 4: offline-first mobile with sync guarantees)
 * Use when offline: push items to local queue; when back online, POST to /api/offline-sync/submit.
 * Call GET /api/offline-sync/status to show "X pending" in UI.
 */

const QUEUE_KEY = "luccca_offline_queue";

export interface OfflineQueueItem {
  entityType: string;
  payload: Record<string, unknown>;
  clientId: string;
  createdAt: string;
}

export function getOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function pushToOfflineQueue(item: Omit<OfflineQueueItem, "clientId" | "createdAt">): void {
  const queue = getOfflineQueue();
  queue.push({
    ...item,
    clientId: `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
  });
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // quota or private mode
  }
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {}
}

export async function flushOfflineQueue(
  baseUrl: string,
  getAuthHeaders: () => Record<string, string>
): Promise<{ accepted: number; totalPending: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { accepted: 0, totalPending: 0 };
  const items = queue.map((q) => ({ entityType: q.entityType, payload: q.payload }));
  const res = await fetch(`${baseUrl}/api/offline-sync/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ items }),
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.accepted > 0) {
    clearOfflineQueue();
  }
  return { accepted: data.accepted ?? 0, totalPending: data.totalPending ?? 0 };
}
