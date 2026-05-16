import type { JournalEventEnvelope, JournalStore } from "./ledger";
import { createHash } from "node:crypto";
import { verifyLedgerIntegrity } from "./ledger";
import type * as LedgerTypes from "./ledger";
import type * as SnapshotTypes from "./snapshots";
export type ArgusSeverity = "info" | "warning" | "critical";
export interface ArgusFinding {
  code: string;
  severity: ArgusSeverity;
  summary: string;
  detail?: string;
  events?: string[];
  snapshots?: string[];
}
export interface ArgusCoverage {
  snapshotEventCoverage: number;
  lastSnapshotLagHours: number | null;
}
export interface ArgusAuditSurface {
  ledgerId: string;
  generatedAt: string;
  eventCount: number;
  snapshotCount: number;
  integrity: boolean;
  snapshotContinuity: boolean;
  journalHash: string | null;
  coverage: ArgusCoverage;
  findings: ArgusFinding[];
  evidence: {
    latestEvent?: LedgerTypes.JournalEventEnvelope;
    latestSnapshot?: SnapshotTypes.SnapshotEnvelope;
    anchorHash?: string | null;
  };
}
export interface ArgusSurfaceOptions {
  maxSnapshotLagHours?: number;
  requireSnapshots?: boolean;
}
export interface BuildArgusSurfaceInput {
  ledgerId: string;
  journalStore: LedgerTypes.JournalStore;
  snapshotStore: SnapshotTypes.SnapshotStore;
  options?: ArgusSurfaceOptions;
}
const DEFAULT_OPTIONS: Required<ArgusSurfaceOptions> = {
  maxSnapshotLagHours: 12,
  requireSnapshots: true,
};
function computeJournalHash(events: LedgerTypes.JournalEventEnvelope[]) {
  const hash = createHash("sha256");
  for (const event of events) {
    hash.update(event.hash);
  }
  return hash.digest("hex");
}
function computeSnapshotHash(
  snapshot: Omit<SnapshotTypes.SnapshotEnvelope, "hash">,
) {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(snapshot));
  return hash.digest("hex");
}
function clampRatio(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}
export function buildArgusAuditSurface(
  input: BuildArgusSurfaceInput,
): ArgusAuditSurface {
  const options = { ...DEFAULT_OPTIONS, ...input.options };
  const rawEvents = input.journalStore.getEvents(input.ledgerId);
  const events = [...rawEvents].sort((a, b) => a.sequence - b.sequence);
  const rawSnapshots = input.snapshotStore.getAll(input.ledgerId);
  const snapshots = [...rawSnapshots].sort((a, b) => {
    if (a.eventCount === b.eventCount) {
      const aTime = Date.parse(a.asOf);
      const bTime = Date.parse(b.asOf);
      return aTime - bTime;
    }
    return a.eventCount - b.eventCount;
  });
  const findings: ArgusFinding[] = [];
  const eventCount = events.length;
  const snapshotCount = snapshots.length;
  const integrity =
    eventCount === 0
      ? true
      : verifyLedgerIntegrity(input.journalStore, input.ledgerId);
  if (!integrity) {
    findings.push({
      code: "ARGUS_INTEGRITY_FAILURE",
      severity: "critical",
      summary: "Ledger hash chain failed validation.",
      detail:
        "Journal events have been altered or are missing; chain of custody cannot be trusted.",
    });
  }
  let snapshotContinuity = true;
  if (snapshotCount === 0) {
    if (eventCount > 0 && options.requireSnapshots) {
      snapshotContinuity = false;
      findings.push({
        code: "ARGUS_MISSING_SNAPSHOT",
        severity: "critical",
        summary: "No Zelda snapshot evidence available for ledger.",
        detail:
          "Argus requires at least one notarized snapshot to attest balances.",
      });
    }
  } else {
    let previousHash: string | null = null;
    for (const snapshot of snapshots) {
      if (snapshot.previousSnapshotHash !== previousHash) {
        snapshotContinuity = false;
        findings.push({
          code: "ARGUS_SNAPSHOT_CHAIN_BROKEN",
          severity: "critical",
          summary: "Snapshot chain hash mismatch detected.",
          detail: `Snapshot ${snapshot.id} does not link to prior evidence.`,
          snapshots: [snapshot.id],
        });
      }
      const relevantEvents = events.slice(0, snapshot.eventCount);
      if (relevantEvents.length !== snapshot.eventCount) {
        snapshotContinuity = false;
        findings.push({
          code: "ARGUS_INCOMPLETE_SNAPSHOT",
          severity: "critical",
          summary:
            "Snapshot references events that are missing from the ledger feed.",
          detail: `Snapshot ${snapshot.id} expected ${snapshot.eventCount} events but only ${relevantEvents.length} provided.`,
          snapshots: [snapshot.id],
        });
      } else {
        const expectedJournalHash = computeJournalHash(relevantEvents);
        if (expectedJournalHash !== snapshot.journalHash) {
          snapshotContinuity = false;
          findings.push({
            code: "ARGUS_SNAPSHOT_JOURNAL_MISMATCH",
            severity: "critical",
            summary: "Snapshot journal hash diverges from ledger feed.",
            detail: `Snapshot ${snapshot.id} hash ${snapshot.journalHash} does not match recalculated ${expectedJournalHash}.`,
            snapshots: [snapshot.id],
          });
        }
        const { hash, ...rest } = snapshot;
        const recomputedSnapshotHash = computeSnapshotHash(rest);
        if (recomputedSnapshotHash !== hash) {
          snapshotContinuity = false;
          findings.push({
            code: "ARGUS_SNAPSHOT_TAMPERED",
            severity: "critical",
            summary: "Snapshot payload hash has changed since notarization.",
            detail: `Snapshot ${snapshot.id} hash ${hash} differs from recomputed ${recomputedSnapshotHash}.`,
            snapshots: [snapshot.id],
          });
        }
      }
      previousHash = snapshot.hash;
    }
  }
  let expectedSequence = 1;
  const seenIds = new Set<string>();
  for (const event of events) {
    if (event.sequence !== expectedSequence) {
      findings.push({
        code: "ARGUS_SEQUENCE_GAP",
        severity: "warning",
        summary: "Journal sequence gap detected.",
        detail: `Expected sequence ${expectedSequence} but found ${event.sequence}.`,
        events: [event.id],
      });
      expectedSequence = event.sequence + 1;
    } else {
      expectedSequence += 1;
    }
    if (seenIds.has(event.id)) {
      findings.push({
        code: "ARGUS_DUPLICATE_EVENT_ID",
        severity: "critical",
        summary: "Duplicate journal event identifier detected.",
        detail: `Event ${event.id} appears multiple times; review ingestion deduplication.`,
        events: [event.id],
      });
    } else {
      seenIds.add(event.id);
    }
    if (event.payload.amount <= 0) {
      findings.push({
        code: "ARGUS_NON_POSITIVE_AMOUNT",
        severity: "warning",
        summary: "Journal entry posted with non-positive amount.",
        detail: `Event ${event.id} posted amount ${event.payload.amount}; confirm source data directionality.`,
        events: [event.id],
      });
    }
  }
  const latestEvent = events[eventCount - 1];
  const latestSnapshot = snapshots[snapshotCount - 1];
  const journalHash = eventCount > 0 ? computeJournalHash(events) : null;
  let lastSnapshotLagHours: number | null = null;
  if (latestEvent && latestSnapshot) {
    const eventTime = Date.parse(latestEvent.recordedAt);
    const snapshotTime = Date.parse(latestSnapshot.asOf);
    if (Number.isFinite(eventTime) && Number.isFinite(snapshotTime)) {
      const lag = (eventTime - snapshotTime) / 3_600_000;
      const boundedLag = lag < 0 ? 0 : lag;
      lastSnapshotLagHours = Number(boundedLag.toFixed(3));
      if (boundedLag > options.maxSnapshotLagHours) {
        findings.push({
          code: "ARGUS_STALE_SNAPSHOT",
          severity: "warning",
          summary: "Latest Zelda snapshot lags behind ledger activity.",
          detail: `Snapshot is ${boundedLag.toFixed(2)} hours behind latest posting; schedule refresh.`,
          snapshots: [latestSnapshot.id],
        });
      }
    }
    if (latestSnapshot.eventCount < eventCount) {
      const pending = eventCount - latestSnapshot.eventCount;
      findings.push({
        code: "ARGUS_PENDING_UNSNAPSHOTTED_EVENTS",
        severity: "warning",
        summary: "Ledger has postings not yet notarized by Zelda.",
        detail: `${pending} events have posted since the last snapshot.`,
        snapshots: [latestSnapshot.id],
      });
    }
  }
  const coverageRatio =
    eventCount === 0
      ? 1
      : snapshotCount === 0
        ? 0
        : latestSnapshot.eventCount / eventCount;
  const coverage: ArgusCoverage = {
    snapshotEventCoverage: clampRatio(coverageRatio),
    lastSnapshotLagHours,
  };
  return {
    ledgerId: input.ledgerId,
    generatedAt: new Date().toISOString(),
    eventCount,
    snapshotCount,
    integrity,
    snapshotContinuity,
    journalHash,
    coverage,
    findings,
    evidence: {
      latestEvent,
      latestSnapshot,
      anchorHash: latestSnapshot?.hash ?? journalHash,
    },
  };
}
