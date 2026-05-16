/**
 * Staff Needs Pipeline — Aggregates staff need layers and pinch points for EchoAurum, EchoStratus, and decision makers.
 */

export {
  runStaffNeedsPipeline,
  writeOperationalNeedsMapping,
  type PipelineInputs,
} from "./aggregator.js";
export { setLatestOperationalNeedsMapping, getLatestOperationalNeedsMapping } from "./onm-store.js";
export type { OperationalNeedsMapping, StaffNeedLayer, PinchPoint, SmokeRunSummary } from "./types.js";

import { setLatestOperationalNeedsMapping as setOnm } from "./onm-store.js";
import type { OperationalNeedsMapping as ONM } from "./types.js";
import { eventBridgeService } from "../echostratus/event-bridge.js";

/** Publish ONM to in-memory store and emit OPERATIONAL_NEEDS_UPDATE to EchoStratus. Call after runStaffNeedsPipeline when running in server. */
export async function publishOperationalNeedsToStratus(mapping: ONM): Promise<void> {
  setOnm(mapping);
  await eventBridgeService.emitOperationalNeedsUpdate(mapping);
}
