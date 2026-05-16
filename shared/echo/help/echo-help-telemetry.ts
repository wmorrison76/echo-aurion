import { EchoHelpTelemetryEvent } from "./types";

const TELEMETRY_ENABLED = process.env.ECHO_HELP_TELEMETRY_ENABLED !== "false";

export async function logHelpEvent(event: EchoHelpTelemetryEvent): Promise<void> {
  if (!TELEMETRY_ENABLED) return;

  try {
    console.debug("[EchoHelp][Telemetry]", JSON.stringify(event));
  } catch (err) {
    console.error("[EchoHelp] Telemetry log failed:", err);
  }
}
