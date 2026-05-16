/**
 * In-memory store for latest Operational Needs Mapping.
 * EchoStratus and APIs read from here; pipeline and jobs write here.
 */

import type { OperationalNeedsMapping } from "./types.js";

let latestOnm: OperationalNeedsMapping | null = null;

export function setLatestOperationalNeedsMapping(mapping: OperationalNeedsMapping): void {
  latestOnm = mapping;
}

export function getLatestOperationalNeedsMapping(): OperationalNeedsMapping | null {
  return latestOnm;
}
