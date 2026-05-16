/**
 * Integrity Verification Job
 * 
 * Scheduled job to run daily integrity checks.
 */

import { logger } from "../lib/logger";
import { getDataIntegrityChecker } from "../lib/data-integrity-checker";
import { getAlertManager } from "../lib/alert-manager";

/**
 * Run daily integrity verification
 */
export async function runDailyIntegrityCheck(): Promise<void> {
  logger.info("[IntegrityVerification] Starting daily integrity check");

  try {
    // Get all organizations (in production, this would query the database)
    const organizations = []; // TODO: Fetch from database

    for (const org of organizations) {
      const period = new Date().toISOString().substring(0, 7); // YYYY-MM
      const checker = getDataIntegrityChecker();
      const checks = await checker.runAllChecks(org.id, period);

      // Check for failures
      const failures = checks.filter(c => c.status === "fail");
      if (failures.length > 0) {
        const alertManager = getAlertManager();
        await alertManager.triggerAlert({
          severity: "critical",
          service: "data-integrity",
          message: `Data integrity check failed for ${org.id}: ${failures.map(f => f.name).join(", ")}`,
          timestamp: new Date(),
          metadata: { organizationId: org.id, failures },
        });
      }

      logger.info(`[IntegrityVerification] Completed checks for ${org.id}: ${checks.length} checks, ${failures.length} failures`);
    }
  } catch (error) {
    logger.error("[IntegrityVerification] Error running integrity check:", error);
  }
}
