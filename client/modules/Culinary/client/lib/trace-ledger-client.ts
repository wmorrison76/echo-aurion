/**
 * Trace Ledger Client – lightweight client-side operation logger
 * for audit trails and debugging.
 */

export interface TraceEntry {
  id: string;
  module: string;
  action: string;
  payload?: Record<string, unknown>;
  timestamp: number;
  userId?: string;
}

const MAX_ENTRIES = 500;
let entries: TraceEntry[] = [];
let seq = 0;

function uid(): string {
  return `trc_${Date.now().toString(36)}_${(++seq).toString(36)}`;
}

export const traceLedgerClient = {
  log(module: string, action: string, payload?: Record<string, unknown>) {
    const entry: TraceEntry = {
      id: uid(),
      module,
      action,
      payload,
      timestamp: Date.now(),
    };
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(-MAX_ENTRIES);
    }
    return entry;
  },

  getEntries(filter?: { module?: string; since?: number }): TraceEntry[] {
    let result = entries;
    if (filter?.module) {
      result = result.filter((e) => e.module === filter.module);
    }
    if (filter?.since) {
      result = result.filter((e) => e.timestamp >= filter.since!);
    }
    return result;
  },

  clear() {
    entries = [];
  },

  get count() {
    return entries.length;
  },
};
