import type { RequestHandler } from "express";
import { getLedgerExplorer } from "../services/ledgerExplorer";
export const handleLedgerExplorer: RequestHandler = (req, res) => {
  const { ledgerId } = req.body ?? req.query ?? {};
  if (typeof ledgerId !== "string" || ledgerId.trim().length === 0) {
    return res.status(400).json({ error: "ledgerId is required" });
  }
  try {
    const explorer = getLedgerExplorer(ledgerId);
    res.json({ explorer });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load ledger explorer.";
    res.status(404).json({ error: message });
  }
};
