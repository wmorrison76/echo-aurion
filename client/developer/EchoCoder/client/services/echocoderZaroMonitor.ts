export type ZaroMonitorResult = {
  ok: boolean;
  alertTriggered: boolean;
  changesCount: number;
  changes?: Array<{ path: string; change: string }>;
  error?: string;
};

export async function runZaroMonitor(): Promise<ZaroMonitorResult> {
  const response = await fetch("/api/zaro/monitor", { method: "POST" });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.result;
}
