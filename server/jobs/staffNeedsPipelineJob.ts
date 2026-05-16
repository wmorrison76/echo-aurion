/**
 * Staff Needs Pipeline Job — Runs periodically to refresh Operational Needs Mapping.
 * Publishes ONM to EchoStratus and EchoAurum so EchoAI^3 stays ahead of business volume.
 */

import { logger } from "../lib/logger.js";
import {
  runStaffNeedsPipeline,
  writeOperationalNeedsMapping,
  publishOperationalNeedsToStratus,
} from "../services/staff-needs-pipeline/index.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const REPORT_DIR = path.join(ROOT, "docs/smoke-system");

export interface StaffNeedsPipelineJobOptions {
  tenantId?: string;
  periodDays?: number;
  writeToDisk?: boolean;
  pushToAurum?: boolean;
}

/**
 * Execute the staff needs pipeline job.
 * Call from a scheduler (e.g. daily) or on-demand.
 */
export async function executeStaffNeedsPipelineJob(
  options: StaffNeedsPipelineJobOptions = {},
): Promise<void> {
  const tenantId = options.tenantId ?? "default";
  const periodDays = options.periodDays ?? 7;
  const writeToDisk = options.writeToDisk ?? true;
  const pushToAurum = options.pushToAurum ?? true;

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - periodDays);
  const periodStart = start.toISOString().slice(0, 10);
  const periodEnd = end.toISOString().slice(0, 10);

  logger.info("[StaffNeedsPipelineJob] Starting", {
    tenantId,
    periodStart,
    periodEnd,
  });

  try {
    let shortageForecast: import("../services/staff-shortage-forecaster.js").ShortageForecast | undefined;
    let laborModel: import("../services/echostratus/models/labor-model.js").LaborModelParams | undefined;

    try {
      const { staffShortageForecaster } = await import("../services/staff-shortage-forecaster.js");
      shortageForecast = await staffShortageForecaster.forecastShortages(periodStart, periodEnd, tenantId);
    } catch (e) {
      logger.debug("[StaffNeedsPipelineJob] Shortage forecaster skipped", { error: (e as Error).message });
    }

    try {
      const { laborModel: labor } = await import("../services/echostratus/models/labor-model.js");
      laborModel = await labor.buildFromScheduleData(tenantId, "default-outlet", 30);
    } catch (e) {
      logger.debug("[StaffNeedsPipelineJob] Labor model skipped", { error: (e as Error).message });
    }

    const onm = await runStaffNeedsPipeline({
      tenantId,
      periodStart,
      periodEnd,
      shortageForecast,
      laborModel,
    });

    await publishOperationalNeedsToStratus(onm);

    if (pushToAurum) {
      try {
        const { aurumIntegrationService } = await import("../services/echostratus/aurum-integration.js");
        await aurumIntegrationService.pushLaborDemandFromONM(onm);
      } catch (e) {
        logger.warn("[StaffNeedsPipelineJob] Aurum push failed", { error: (e as Error).message });
      }
    }

    if (writeToDisk) {
      const { jsonPath, mdPath } = writeOperationalNeedsMapping(onm, REPORT_DIR);
      logger.info("[StaffNeedsPipelineJob] ONM written", { jsonPath, mdPath });
    }

    logger.info("[StaffNeedsPipelineJob] Complete", {
      tenantId,
      staffLayers: onm.staffLayers.length,
      pinchPoints: onm.pinchPoints.length,
    });
  } catch (error) {
    logger.error("[StaffNeedsPipelineJob] Failed", { error: (error as Error).message });
    throw error;
  }
}
