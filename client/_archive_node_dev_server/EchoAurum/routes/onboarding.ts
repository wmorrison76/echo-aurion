import type { RequestHandler } from "express";
import {
  buildOnboardingPlaybook,
  type OnboardingPlaybookInput,
} from "../../shared/onboarding";
function coercePhases(value: unknown): OnboardingPlaybookInput["phases"] {
  return Array.isArray(value)
    ? (value as OnboardingPlaybookInput["phases"])
    : [];
}
export const handleOnboardingPlaybook: RequestHandler = (req, res) => {
  const { phases } = req.body ?? {};
  const payload: OnboardingPlaybookInput = { phases: coercePhases(phases) };
  try {
    const playbook = buildOnboardingPlaybook(payload);
    res.json({ playbook });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to build onboarding playbook.";
    res.status(500).json({ error: message });
  }
};
