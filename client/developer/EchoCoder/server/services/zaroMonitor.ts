import { integrity } from "../zaro-lib";
import { appendLog } from "../routes/logs";
import { handleGuardEvent } from "../routes/guard";

const ROOT = process.cwd();

export async function runZaroMonitor() {
  const threshold = Number(process.env.ECHO_ZARO_ANOMALY_THRESHOLD || "5");
  const result = await integrity(ROOT);

  if (!result.ok) {
    await appendLog(`[ZARO_MONITOR] integrity check failed: ${result.error}`);
    await handleGuardEvent(
      {
        body: {
          type: "defcon1",
          detail: `ZARO integrity failed: ${result.error}`,
        },
      } as any,
      {} as any,
      () => undefined,
    );
    return {
      ok: false,
      alertTriggered: true,
      changes: [],
      changesCount: 0,
      error: result.error,
    };
  }

  const changes = result.changes || [];
  const changesCount = changes.length;
  const alertTriggered = changesCount >= threshold;

  await appendLog(
    `[ZARO_MONITOR] changes=${changesCount} threshold=${threshold} alert=${alertTriggered}`,
  );

  if (alertTriggered) {
    await handleGuardEvent(
      {
        body: {
          type: "defcon1",
          detail: `ZARO detected ${changesCount} changes`,
        },
      } as any,
      {} as any,
      () => undefined,
    );
  }

  return {
    ok: true,
    alertTriggered,
    changesCount,
    changes: changes.slice(0, 50),
  };
}
