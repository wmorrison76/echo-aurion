import type { RequestHandler } from "express";
import {
  composeAutomationStream,
  type AutomationStreamInput,
} from "../../shared/automation";
function coerceArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
export const handleAutomationStream: RequestHandler = (req, res) => {
  const { ledgerId, vendorTriads, operaCharges, toastChecks } = req.body ?? {};
  if (typeof ledgerId !== "string" || ledgerId.trim().length === 0) {
    return res.status(400).json({ error: "ledgerId is required" });
  }
  const payload: AutomationStreamInput = {
    ledgerId,
    vendorTriads: coerceArray(vendorTriads),
    operaCharges: coerceArray(operaCharges),
    toastChecks: coerceArray(toastChecks),
  };
  try {
    const feed = composeAutomationStream(payload);
    res.json({ feed });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to compose automation stream.";
    res.status(500).json({ error: message });
  }
};
