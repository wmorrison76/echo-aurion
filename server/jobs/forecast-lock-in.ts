/**
 * Scheduled job: 24h forecast lock-in.
 * Run daily to lock forecasts for D+1.
 */

export async function runForecastLockInJob(
  _orgId: string,
  _outletIds: string[],
): Promise<{ locked: number; errors: string[] }> {
  const errors: string[] = [];
  let locked = 0;
  // Stub: iterate outlets and lock forecast for tomorrow
  return { locked, errors };
}
