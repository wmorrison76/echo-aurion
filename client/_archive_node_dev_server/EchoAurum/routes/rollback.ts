import type { RequestHandler } from "express";
import { MemoryJournalStore } from "../../shared/ledger";
import { applyRollback, createRollbackPlan } from "../../shared/rollback";
const store = new MemoryJournalStore();
export const handleRollback: RequestHandler = (req, res) => {
  const { ledgerId, eventId, reason, requestedBy } = req.body ?? {};
  if (!ledgerId || !eventId || !reason || !requestedBy) {
    return res
      .status(400)
      .json({ error: "ledgerId, eventId, reason, requestedBy required" });
  }
  try {
    const plan = createRollbackPlan(store, {
      ledgerId,
      eventId,
      reason,
      requestedBy,
    });
    const result = applyRollback(store, plan);
    res.json({ rollback: result.applied, plan });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
