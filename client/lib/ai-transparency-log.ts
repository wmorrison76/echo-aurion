export type AiTransparencyEntry = {
  id: string;
  timestamp: string;
  event: string;
  source?: string;
  summary?: string;
  payload?: Record<string, any>;
};

const STORAGE_KEY = "echoai:transparency-log";
const MAX_ENTRIES = 200;
let entries: AiTransparencyEntry[] = [];
const listeners = new Set<() => void>();

function readStored(): AiTransparencyEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AiTransparencyEntry[]) : [];
  } catch {
    return [];
  }
}

function writeStored(next: AiTransparencyEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, MAX_ENTRIES)));
  } catch {
    // ignore
  }
}

function notify() {
  listeners.forEach((cb) => cb());
}

export function pushAiTransparencyEntry(entry: AiTransparencyEntry) {
  const next = [entry, ...entries].slice(0, MAX_ENTRIES);
  entries = next;
  writeStored(next);
  notify();
}

export function useAiTransparencyLog(limit = 50) {
  if (entries.length === 0) {
    entries = readStored();
  }
  return {
    entries: entries.slice(0, limit),
    subscribe: (cb: () => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
