/********************************************************************
 * LUCCCA — BUILD 13 (2 of 2)
 * API for space governance evaluation
 *
 * PURPOSE:
 *  - Scheduler UI posts event/maintenance request here
 *  - Server runs evaluation logic
 *  - Returns governance result (OK or conflict)
 *********************************************************************/

import { Router, Request, Response } from "express";
import { evaluateEvent, calculateSeverity } from "../lib/space-governance";
import { getOrgContext } from "../lib/org-resolver";

export const governanceRouter = Router();

// TEMP: fetch existing events from mock store per org
// Later: query from Postgres
function loadExistingEventsByOrg(orgId: string) {
  // This would normally query Postgres for events in the organization
  // For now, return empty array - events will be loaded from actual data source
  return [];
}

// POST /api/governance/evaluate
// Evaluates an incoming event against existing events
// Returns: { ok, severity, reason, overrideRequired }
governanceRouter.post("/evaluate", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const input = req.body;

    // Validate input
    if (!input.space || !input.start || !input.end) {
      return res
        .status(400)
        .json({ error: "Missing required fields: space, start, end" });
    }

    const existing = loadExistingEventsByOrg(orgContext.orgId);
    const result = evaluateEvent(input, existing);

    // Calculate severity score
    const severityScore = calculateSeverity(result);

    console.log(`[GOVERNANCE] Event evaluated for ${input.space}:`, result);

    res.json({
      ...result,
      severityScore,
    });
  } catch (error) {
    console.error("[GOVERNANCE] Evaluation error:", error);
    res.status(500).json({ error: "Failed to evaluate event" });
  }
});

// POST /api/governance/evaluate-maintenance
// Similar evaluation for maintenance/engineering requests
governanceRouter.post(
  "/evaluate-maintenance",
  async (req: Request, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const input = req.body;

      if (!input.space || !input.start || !input.end) {
        return res
          .status(400)
          .json({ error: "Missing required fields: space, start, end" });
      }

      const existing = loadExistingEventsByOrg(orgContext.orgId);
      const result = evaluateEvent(input, existing);

      const severityScore = calculateSeverity(result);

      console.log(
        `[GOVERNANCE] Maintenance evaluated for ${input.space}:`,
        result,
      );

      res.json({
        ...result,
        severityScore,
      });
    } catch (error) {
      console.error("[GOVERNANCE] Maintenance evaluation error:", error);
      res.status(500).json({ error: "Failed to evaluate maintenance request" });
    }
  },
);

// GET /api/governance/status
// Health check for governance engine
governanceRouter.get("/status", async (req: Request, res: Response) => {
  res.json({
    status: "ready",
    timestamp: Date.now(),
    existingEventsCount: loadExistingEvents().length,
  });
});
