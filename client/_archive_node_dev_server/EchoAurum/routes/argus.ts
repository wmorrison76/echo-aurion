import type { RequestHandler } from "express";
import { buildArgusAuditSurface } from "../../shared/argus";
import { MemoryJournalStore } from "../../shared/ledger";
import type { JournalEventEnvelope } from "../../shared/ledger";
import { SnapshotStore } from "../../shared/snapshots";
import type { SnapshotEnvelope } from "../../shared/snapshots";
export const handleArgusAudit: RequestHandler = (req, res) => {
  const { ledgerId, events, snapshots, options } = req.body ?? {};
  if (!ledgerId || typeof ledgerId !== "string" || !Array.isArray(events)) {
    return res
      .status(400)
      .json({ error: "ledgerId and events array required" });
  }
  const journalStore = new MemoryJournalStore();
  for (const event of events) {
    if (!isJournalEventEnvelope(event)) {
      return res.status(400).json({ error: "invalid journal event payload" });
    }
    journalStore.append(event);
  }
  const snapshotStore = new SnapshotStore();
  if (Array.isArray(snapshots)) {
    for (const snapshot of snapshots) {
      if (!isSnapshotEnvelope(snapshot)) {
        return res.status(400).json({ error: "invalid snapshot payload" });
      }
      snapshotStore.append(snapshot);
    }
  }
  const surface = buildArgusAuditSurface({
    ledgerId,
    journalStore,
    snapshotStore,
    options,
  });
  res.json({ surface });
};
function isJournalEventEnvelope(value: unknown): value is JournalEventEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<JournalEventEnvelope>;
  const payload = candidate.payload as
    | JournalEventEnvelope["payload"]
    | undefined;
  const source = candidate.source as JournalEventEnvelope["source"] | undefined;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.ledgerId === "string" &&
    typeof candidate.sequence === "number" &&
    typeof candidate.recordedAt === "string" &&
    typeof candidate.hash === "string" &&
    (candidate.previousHash === null ||
      typeof candidate.previousHash === "string") &&
    !!payload &&
    typeof payload.debitAccount === "string" &&
    typeof payload.creditAccount === "string" &&
    typeof payload.amount === "number" &&
    typeof payload.currency === "string" &&
    typeof payload.serviceDate === "string" &&
    !!source &&
    typeof source === "object"
  );
}
function isSnapshotEnvelope(value: unknown): value is SnapshotEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<SnapshotEnvelope>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.ledgerId === "string" &&
    typeof candidate.asOf === "string" &&
    typeof candidate.eventCount === "number" &&
    Array.isArray(candidate.balances) &&
    typeof candidate.journalHash === "string" &&
    typeof candidate.hash === "string" &&
    (candidate.previousSnapshotHash === null ||
      typeof candidate.previousSnapshotHash === "string")
  );
}
