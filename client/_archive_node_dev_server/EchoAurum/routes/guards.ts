import type { RequestHandler } from "express";
import { evaluateGuardrails } from "../../shared/guards";
export const handleGuardrails: RequestHandler = (req, res) => {
  const { ledgerId, vendor, amount, currency, bankAccount, country, metadata } =
    req.body ?? {};
  if (!ledgerId || !vendor || typeof amount !== "number" || !currency) {
    return res
      .status(400)
      .json({ error: "ledgerId, vendor, amount, currency required" });
  }
  const result = evaluateGuardrails({
    ledgerId,
    vendor,
    amount,
    currency,
    bankAccount,
    country,
    metadata,
  });
  res.json({ evaluation: result });
};
