/**
 * Run Forensic Audit Script
 * Standalone script to run system-wide forensic audit
 */

import { getForensicAuditService } from "../services/forensic-audit-service";
import { logger } from "../lib/logger";

async function main() {
  try {
    logger.info("Starting forensic system-wide audit script");

    const auditService = getForensicAuditService();
    const report = await auditService.runForensicAudit();

    console.log("\n" + "=".repeat(80));
    console.log("FORENSIC SYSTEM-WIDE AUDIT REPORT");
    console.log("=".repeat(80));
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Overall Completion: ${report.overallCompletion}%`);
    console.log("\nSystem Audit Results:");
    console.log("-".repeat(80));

    for (const system of report.systems) {
      const statusIcon = system.verified ? "✅" : "⚠️";
      console.log(`\n${statusIcon} ${system.system}: ${system.completion}% (${system.status})`);
      
      for (const finding of system.findings) {
        const findingIcon = finding.status === "found" ? "  ✓" : finding.status === "partial" ? "  ~" : "  ✗";
        console.log(`${findingIcon} ${finding.component}: ${finding.status}`);
        if (finding.path) {
          console.log(`    Path: ${finding.path}`);
        }
        if (finding.notes) {
          console.log(`    Notes: ${finding.notes}`);
        }
      }
    }

    if (report.missingItems.length > 0) {
      console.log("\n" + "=".repeat(80));
      console.log("MISSING ITEMS");
      console.log("=".repeat(80));
      for (const item of report.missingItems) {
        console.log(`  ✗ ${item}`);
      }
    }

    if (report.recommendations.length > 0) {
      console.log("\n" + "=".repeat(80));
      console.log("RECOMMENDATIONS");
      console.log("=".repeat(80));
      for (const rec of report.recommendations) {
        console.log(`  → ${rec}`);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log(`Overall Status: ${report.overallCompletion >= 95 ? "✅ EXCELLENT" : report.overallCompletion >= 80 ? "⚠️ GOOD" : "❌ NEEDS WORK"}`);
    console.log("=".repeat(80) + "\n");

    process.exit(report.overallCompletion >= 95 ? 0 : 1);
  } catch (error) {
    logger.error("Forensic audit script failed", { error });
    console.error("Audit failed:", error);
    process.exit(1);
  }
}

main();
