import * as crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { appendImmutableEvent, MemoryJournalStore } from "./ledger";
import type { JournalEventEnvelope } from "./ledger";
import { SnapshotStore, generateSnapshot } from "./snapshots";
import type { SnapshotEnvelope } from "./snapshots";
import { buildArgusAuditSurface } from "./argus";
function signEvent(
  base: Omit<JournalEventEnvelope, "hash">,
): JournalEventEnvelope {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(base));
  return { ...base, hash: hash.digest("hex") };
}
function signSnapshot(base: Omit<SnapshotEnvelope, "hash">): SnapshotEnvelope {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(base));
  return { ...base, hash: hash.digest("hex") };
}
describe("buildArgusAuditSurface", () => {
  it("produces a clean audit surface when ledger and snapshots align", () => {
    const ledgerId = "ledger-clean";
    const journal = new MemoryJournalStore();
    const snapshots = new SnapshotStore();
    appendImmutableEvent(journal, {
      ledgerId,
      payload: {
        debitAccount: "1200",
        creditAccount: "4000",
        amount: 150,
        currency: "USD",
        serviceDate: "2024-10-01",
      },
      source: { type: "opera", reservationId: "res-1" },
    });
    appendImmutableEvent(journal, {
      ledgerId,
      payload: {
        debitAccount: "4000",
        creditAccount: "2000",
        amount: 150,
        currency: "USD",
        serviceDate: "2024-10-02",
      },
      source: { type: "toast", checkId: "chk-2" },
    });
    generateSnapshot({ ledgerId }, journal, snapshots);
    const surface = buildArgusAuditSurface({
      ledgerId,
      journalStore: journal,
      snapshotStore: snapshots,
    });
    expect(surface.integrity).toBe(true);
    expect(surface.snapshotContinuity).toBe(true);
    expect(surface.coverage.snapshotEventCoverage).toBe(1);
    expect(surface.findings).toHaveLength(0);
    expect(surface.journalHash).toBeTruthy();
    expect(surface.evidence.latestSnapshot?.ledgerId).toBe(ledgerId);
  });
  it("flags sequence gaps and duplicate identifiers", () => {
    const ledgerId = "ledger-sequence";
    const journal = new MemoryJournalStore();
    const first = appendImmutableEvent(journal, {
      ledgerId,
      payload: {
        debitAccount: "1100",
        creditAccount: "3000",
        amount: 200,
        currency: "USD",
        serviceDate: "2024-09-15",
      },
      source: { type: "manual", submittedBy: "auditor" },
    });
    const manualBase: Omit<JournalEventEnvelope, "hash"> = {
      id: first.id,
      ledgerId,
      sequence: 3,
      payload: {
        debitAccount: "3000",
        creditAccount: "2100",
        amount: 220,
        currency: "USD",
        serviceDate: "2024-09-16",
      },
      source: { type: "manual", submittedBy: "auditor" },
      recordedAt: new Date(Date.now() + 1_000).toISOString(),
      previousHash: first.hash,
    };
    const manualEvent = signEvent(manualBase);
    journal.append(manualEvent);
    const snapshots = new SnapshotStore();
    generateSnapshot({ ledgerId }, journal, snapshots);
    const surface = buildArgusAuditSurface({
      ledgerId,
      journalStore: journal,
      snapshotStore: snapshots,
    });
    const codes = surface.findings.map((finding) => finding.code);
    expect(codes).toContain("ARGUS_SEQUENCE_GAP");
    expect(codes).toContain("ARGUS_DUPLICATE_EVENT_ID");
    expect(surface.snapshotContinuity).toBe(true);
  });
  it("detects stale snapshots and pending unsnapshotted events", () => {
    const ledgerId = "ledger-stale";
    const journal = new MemoryJournalStore();
    appendImmutableEvent(journal, {
      ledgerId,
      payload: {
        debitAccount: "1300",
        creditAccount: "4100",
        amount: 500,
        currency: "USD",
        serviceDate: "2024-08-01",
      },
      source: { type: "opera", reservationId: "res-77" },
    });
    appendImmutableEvent(journal, {
      ledgerId,
      payload: {
        debitAccount: "4100",
        creditAccount: "2300",
        amount: 500,
        currency: "USD",
        serviceDate: "2024-08-02",
      },
      source: { type: "toast", checkId: "chk-88" },
    });
    const snapshots = new SnapshotStore();
    const oldAsOf = new Date(Date.now() - 48 * 3_600_000).toISOString();
    generateSnapshot({ ledgerId, asOf: oldAsOf }, journal, snapshots);
    appendImmutableEvent(journal, {
      ledgerId,
      payload: {
        debitAccount: "5100",
        creditAccount: "2400",
        amount: 125,
        currency: "USD",
        serviceDate: "2024-08-03",
      },
      source: { type: "manual", submittedBy: "controller" },
    });
    const surface = buildArgusAuditSurface({
      ledgerId,
      journalStore: journal,
      snapshotStore: snapshots,
    });
    const codes = surface.findings.map((finding) => finding.code);
    expect(codes).toContain("ARGUS_STALE_SNAPSHOT");
    expect(codes).toContain("ARGUS_PENDING_UNSNAPSHOTTED_EVENTS");
    expect(surface.coverage.snapshotEventCoverage).toBeCloseTo(2 / 3, 5);
    expect(surface.coverage.lastSnapshotLagHours).toBeGreaterThan(40);
  });
  it("flags ledgers missing Zelda snapshots when evidence is required", () => {
    const ledgerId = "ledger-nosnapshot";
    const journal = new MemoryJournalStore();
    appendImmutableEvent(journal, {
      ledgerId,
      payload: {
        debitAccount: "1500",
        creditAccount: "5200",
        amount: 90,
        currency: "USD",
        serviceDate: "2024-07-01",
      },
      source: { type: "manual", submittedBy: "night-audit" },
    });
    const snapshots = new SnapshotStore();
    const surface = buildArgusAuditSurface({
      ledgerId,
      journalStore: journal,
      snapshotStore: snapshots,
    });
    expect(surface.snapshotContinuity).toBe(false);
    expect(surface.findings.map((finding) => finding.code)).toContain(
      "ARGUS_MISSING_SNAPSHOT",
    );
  });
  it("detects snapshot chain discontinuities", () => {
    const ledgerId = "ledger-chain";
    const journal = new MemoryJournalStore();
    const canonicalStore = new SnapshotStore();
    appendImmutableEvent(journal, {
      ledgerId,
      payload: {
        debitAccount: "1700",
        creditAccount: "4300",
        amount: 300,
        currency: "USD",
        serviceDate: "2024-06-01",
      },
      source: { type: "opera", reservationId: "res-200" },
    });
    appendImmutableEvent(journal, {
      ledgerId,
      payload: {
        debitAccount: "4300",
        creditAccount: "2600",
        amount: 300,
        currency: "USD",
        serviceDate: "2024-06-02",
      },
      source: { type: "toast", checkId: "chk-300" },
    });
    const firstSnapshot = generateSnapshot(
      { ledgerId },
      journal,
      canonicalStore,
    );
    appendImmutableEvent(journal, {
      ledgerId,
      payload: {
        debitAccount: "1800",
        creditAccount: "2700",
        amount: 120,
        currency: "USD",
        serviceDate: "2024-06-03",
      },
      source: { type: "manual", submittedBy: "controller" },
    });
    const secondSnapshot = generateSnapshot(
      { ledgerId },
      journal,
      canonicalStore,
    );
    const tamperedStore = new SnapshotStore();
    tamperedStore.append(firstSnapshot);
    const { hash: _discard, ...rest } = secondSnapshot;
    const forgedBase = { ...rest, previousSnapshotHash: "bogus-link" };
    const forgedSnapshot = signSnapshot(forgedBase);
    tamperedStore.append(forgedSnapshot);
    const surface = buildArgusAuditSurface({
      ledgerId,
      journalStore: journal,
      snapshotStore: tamperedStore,
    });
    expect(surface.snapshotContinuity).toBe(false);
    expect(surface.findings.map((finding) => finding.code)).toContain(
      "ARGUS_SNAPSHOT_CHAIN_BROKEN",
    );
  });
});
