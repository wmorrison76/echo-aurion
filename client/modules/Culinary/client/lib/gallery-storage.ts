const DB_NAME = "echo-gallery";
const DB_VERSION = 1;
const STORE_IMAGES = "images";

type ImageRecord = {
  id: string;
  blob: Blob;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }
  if (!dbPromise) {
    dbPromise = (
      new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_IMAGES)) {
            db.createObjectStore(STORE_IMAGES, { keyPath: "id" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("Failed to open gallery storage"));
        request.onblocked = () => {
          reject(new Error("Gallery storage upgrade is blocked"));
        };
      }) as Promise<IDBDatabase>
    ).catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => void,
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_IMAGES, mode);
      const store = tx.objectStore(STORE_IMAGES);
      handler(store);
      tx.oncomplete = () => resolve(undefined as T);
      tx.onerror = () =>
        reject(tx.error ?? new Error("Gallery storage transaction failed"));
      tx.onabort = () =>
        reject(tx.error ?? new Error("Gallery storage transaction aborted"));
    } catch (error) {
      reject(error);
    }
  });
}

export async function saveImageBlob(id: string, blob: Blob): Promise<void> {
  await runTransaction<void>("readwrite", (store) => {
    store.put({ id, blob } satisfies ImageRecord);
  });
}

export async function loadImageBlob(id: string): Promise<Blob | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, "readonly");
    const store = tx.objectStore(STORE_IMAGES);
    const request = store.get(id);
    request.onsuccess = () => {
      const record = request.result as ImageRecord | undefined;
      resolve(record?.blob ?? null);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to load gallery blob"));
  });
}

export async function deleteImageBlob(id: string): Promise<void> {
  await runTransaction<void>("readwrite", (store) => {
    store.delete(id);
  });
}

export async function clearAllImageBlobs(): Promise<void> {
  await runTransaction<void>("readwrite", (store) => {
    store.clear();
  });
}
