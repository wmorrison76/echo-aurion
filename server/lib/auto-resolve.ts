/********************************************************************
 * LUCCCA — BUILD 18
 * Auto-Resolve Engine for Low-Severity Conflicts
 *
 * PURPOSE:
 *  - Automatically resolve safe, low-risk conflicts
 *  - Reduce EC load and human approvals for trivial issues
 *
 * ASSUMPTIONS:
 *  - Conflicts live in some shared store/DB
 *  - "warn" severity and autoResolvable = true can be auto-resolved
 *********************************************************************/

export type ConflictRecord = {
  id: string;
  kind: "event" | "maintenance";
  space: string;
  severity: "warn" | "danger";
  description: string;
  status: "pending" | "approved" | "denied" | "auto-approved";
  autoResolvable?: boolean;
  requestedBy: string;
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
};

export type ConflictStore = {
  getAll: () => Promise<ConflictRecord[]>;
  save: (c: ConflictRecord) => Promise<void>;
};

/**
 * Automatically resolve low-risk conflicts
 *
 * Candidates:
 *  - Status: pending
 *  - Severity: warn (not danger)
 *  - autoResolvable flag: true
 *
 * Resolution:
 *  - Mark as auto-approved
 *  - Set resolvedBy = "system-auto-resolve"
 *  - Set resolvedAt = now
 *  - Write to audit log
 */
export async function autoResolveLowRiskConflicts(
  conflictStore: ConflictStore,
  logger?: (msg: string) => void
): Promise<number> {
  try {
    const conflicts = await conflictStore.getAll();

    const candidates = conflicts.filter(
      (c) =>
        c.status === "pending" &&
        c.severity === "warn" &&
        c.autoResolvable === true
    );

    for (const c of candidates) {
      c.status = "auto-approved";
      c.resolvedBy = "system-auto-resolve";
      c.resolvedAt = Date.now();

      await conflictStore.save(c);

      const msg = `Auto-resolved conflict ${c.id} in ${c.space}: ${c.description}`;
      if (logger) {
        logger(msg);
      }
      console.log(`[AUTO-RESOLVE] ${msg}`);
    }

    return candidates.length;
  } catch (error) {
    console.error("[AUTO-RESOLVE] Error:", error);
    return 0;
  }
}

/**
 * Check if a conflict is eligible for auto-resolution
 */
export function isAutoResolvable(conflict: ConflictRecord): boolean {
  return (
    conflict.status === "pending" &&
    conflict.severity === "warn" &&
    conflict.autoResolvable !== false
  );
}

/**
 * Compute auto-resolve score
 * Higher score = more likely to auto-resolve
 *
 * Factors:
 *  - severity: warn (good), danger (bad)
 *  - time since creation: older = more likely
 *  - kind: maintenance > event
 */
export function computeAutoResolveScore(conflict: ConflictRecord): number {
  let score = 0;

  // Severity factor
  if (conflict.severity === "warn") {
    score += 50;
  } else {
    score -= 100; // danger conflicts are never auto-resolved
  }

  // Age factor (more time = higher score)
  const ageMinutes = (Date.now() - conflict.createdAt) / 60000;
  score += Math.min(ageMinutes, 60); // Cap at 60 points

  // Kind factor
  if (conflict.kind === "maintenance") {
    score += 10; // maintenance conflicts slightly more resolvable
  }

  return Math.max(0, score);
}

/**
 * Batch auto-resolve with scoring
 * Only resolves conflicts with score above threshold
 */
export async function autoResolveBatch(
  conflictStore: ConflictStore,
  scoreThreshold = 50,
  logger?: (msg: string) => void
): Promise<number> {
  try {
    const conflicts = await conflictStore.getAll();
    const candidates = conflicts.filter((c) => c.status === "pending");

    let resolved = 0;

    for (const c of candidates) {
      const score = computeAutoResolveScore(c);

      if (score >= scoreThreshold) {
        c.status = "auto-approved";
        c.resolvedBy = "system-auto-resolve";
        c.resolvedAt = Date.now();

        await conflictStore.save(c);
        resolved++;

        const msg = `Auto-resolved (score: ${score}) ${c.id} in ${c.space}`;
        if (logger) {
          logger(msg);
        }
        console.log(`[AUTO-RESOLVE] ${msg}`);
      }
    }

    return resolved;
  } catch (error) {
    console.error("[AUTO-RESOLVE] Batch error:", error);
    return 0;
  }
}

/********************************************************************
 * USAGE:
 *
 * Call periodically (cron, worker, or after conflict creation):
 *
 *   const resolved = await autoResolveLowRiskConflicts(conflictStore);
 *   console.log(`Resolved ${resolved} conflicts automatically`);
 *
 * All auto-resolutions should still be written to:
 *   - Audit log via writeAudit()
 *   - Change Feed via notify()
 *********************************************************************/
