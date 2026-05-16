import type { RequestHandler } from "express";
import { analyzeWithEchoSentinel } from "../../shared/sentinel";
import type { SentinelTransaction } from "../../shared/sentinel";
function isSentinelTransaction(value: unknown): value is SentinelTransaction {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<SentinelTransaction>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.submittedAt === "string" &&
    typeof candidate.ledgerId === "string" &&
    typeof candidate.vendor === "string" &&
    typeof candidate.amount === "number" &&
    typeof candidate.currency === "string"
  );
}
export const handleSentinelAnalysis: RequestHandler = (req, res) => {
  const transactions = req.body?.transactions;
  if (
    !Array.isArray(transactions) ||
    !transactions.every(isSentinelTransaction)
  ) {
    return res.status(400).json({ error: "transactions array required" });
  }
  const summary = analyzeWithEchoSentinel(transactions);
  res.json({ summary });
};
