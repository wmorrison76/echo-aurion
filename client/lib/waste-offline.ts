/**
 * iter212 · EchoWaste mobile offline queue (IndexedDB).
 *
 * When the phone is offline (or the backend rejects), capture payloads are
 * persisted to IndexedDB and replayed on the next `online` event or manual
 * flush. Mirrors the iter206 BEO Builder localStorage pattern, but uses
 * IndexedDB because each capture can carry a base64 image larger than the
 * 5 MB localStorage limit.
 *
 * API
 * ───
 *   enqueueWasteCapture(payload) · queueList() · flushWasteQueue(apiBase)
 */

const DB_NAME = "echowaste_offline";
const DB_VERSION = 1;
const STORE = "captures";

type Queued = {
  id: string;              // client-side uuid
  endpoint: "/api/waste/capture/still" | "/api/waste/capture/video-mot" | "/api/waste/capture/voice";
  body: any;               // JSON-serialisable payload
  headers: Record<string, string>;
  enqueued_at: string;
  attempts: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueWasteCapture(item: Omit<Queued, "enqueued_at" | "attempts">): Promise<void> {
  const full: Queued = { ...item, enqueued_at: new Date().toISOString(), attempts: 0 };
  await tx<IDBValidKey>("readwrite", (s) => s.put(full));
}

export async function queueList(): Promise<Queued[]> {
  return new Promise<Queued[]>((resolve, reject) => {
    openDb().then((db) => {
      const t = db.transaction(STORE, "readonly");
      const req = t.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as Queued[]);
      req.onerror = () => reject(req.error);
    }).catch(reject);
  });
}

export async function queueCount(): Promise<number> {
  try {
    const list = await queueList();
    return list.length;
  } catch {
    return 0;
  }
}

async function removeQueued(id: string): Promise<void> {
  await tx<undefined>("readwrite", (s) => s.delete(id));
}

async function bumpAttempt(item: Queued): Promise<void> {
  item.attempts += 1;
  await tx<IDBValidKey>("readwrite", (s) => s.put(item));
}

/** Drain the queue. Returns `{flushed, remaining, errors}`. */
export async function flushWasteQueue(apiBase: string): Promise<{ flushed: number; remaining: number; errors: string[] }> {
  const errors: string[] = [];
  let flushed = 0;
  const list = await queueList();
  for (const q of list) {
    // Cap attempts to avoid retry-storms on permanent failures
    if (q.attempts >= 5) continue;
    try {
      const r = await fetch(`${apiBase}${q.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(q.headers || {}) },
        body: JSON.stringify(q.body),
      });
      if (r.ok) {
        await removeQueued(q.id);
        flushed += 1;
      } else {
        await bumpAttempt(q);
        errors.push(`${q.id}: HTTP ${r.status}`);
      }
    } catch (e: any) {
      await bumpAttempt(q);
      errors.push(`${q.id}: ${e?.message || e}`);
    }
  }
  const remaining = (await queueList()).length;
  return { flushed, remaining, errors };
}
