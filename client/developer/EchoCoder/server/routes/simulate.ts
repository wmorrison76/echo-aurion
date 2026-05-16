import type { RequestHandler } from "express";

export const handleSimulate: RequestHandler = async (req, res) => {
  try {
    const { name, size, kind, text } = req.body ?? {};
    const preview = typeof text === "string" ? text.slice(0, 2000) : undefined;
    const report = {
      ok: true,
      seed: { name, size, kind, previewLength: preview?.length ?? 0 },
      inferred: {
        routes: ["/", "/studio"],
        panels: ["MixologyPanel", "FinancePanel"],
        services: ["prime-cost", "menu-engineering"],
      },
      next: [
        "Plan candidates with scorecard",
        "Verify (lint/types/tests/a11y/perf/security)",
        "Integrate routes/registries and open Safe Mode PR",
      ],
    };
    res.json(report);
  } catch (e) {
    res.status(400).json({ ok: false, error: (e as Error).message });
  }
};
