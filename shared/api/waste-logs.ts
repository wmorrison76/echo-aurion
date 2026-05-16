/* Types are intentionally loose here to avoid coupling shared/api to optional shared/types modules. */
export type WasteLog = any;
export type WasteDailySummary = any;
export type WasteMonthlyMetrics = any;
export type WasteCategory = any;

type Query = Record<string, string | number | boolean | null | undefined>;

function qs(query: Query) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function json<T>(res: Response): Promise<T> {
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
  return (text ? (JSON.parse(text) as T) : ({} as T));
}

export async function getWasteLogs(
  organizationId: string,
  options?: { outletId?: string; wasteCategory?: WasteCategory; limit?: number },
): Promise<WasteLog[]> {
  const res = await fetch(
    `/api/waste/logs${qs({
      organizationId,
      outletId: options?.outletId,
      wasteCategory: options?.wasteCategory as any,
      limit: options?.limit,
    })}`,
    { method: "GET" },
  );
  return json<WasteLog[]>(res);
}

export async function createWasteLog(log: Omit<WasteLog, "id" | "created_at" | "logged_at">): Promise<WasteLog> {
  const res = await fetch(`/api/waste/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  });
  return json<WasteLog>(res);
}

export async function updateWasteLog(logId: string, updates: Partial<WasteLog>): Promise<WasteLog> {
  const res = await fetch(`/api/waste/logs/${encodeURIComponent(logId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return json<WasteLog>(res);
}

export async function deleteWasteLog(logId: string): Promise<void> {
  const res = await fetch(`/api/waste/logs/${encodeURIComponent(logId)}`, { method: "DELETE" });
  await json<any>(res);
}

export async function getWasteDailySummary(
  organizationId: string,
  options?: { outletId?: string; startDate?: string; endDate?: string },
): Promise<WasteDailySummary[]> {
  const res = await fetch(
    `/api/waste/summaries/daily${qs({
      organizationId,
      outletId: options?.outletId,
      startDate: options?.startDate,
      endDate: options?.endDate,
    })}`,
    { method: "GET" },
  );
  return json<WasteDailySummary[]>(res);
}

export async function getWasteMonthlyMetrics(
  organizationId: string,
  options?: { outletId?: string },
): Promise<WasteMonthlyMetrics[]> {
  const res = await fetch(`/api/waste/metrics/monthly${qs({ organizationId, outletId: options?.outletId })}`, {
    method: "GET",
  });
  return json<WasteMonthlyMetrics[]>(res);
}

export async function getWasteCategoryBreakdown(organizationId: string, options?: { outletId?: string }) {
  const res = await fetch(`/api/waste/metrics/category-breakdown${qs({ organizationId, outletId: options?.outletId })}`, {
    method: "GET",
  });
  return json<Record<string, number>>(res);
}

export async function getWasteMetrics(organizationId: string, outletId?: string) {
  const res = await fetch(`/api/waste/metrics/summary${qs({ organizationId, outletId })}`, { method: "GET" });
  return json<any>(res);
}

export async function getTopWastedProducts(
  organizationId: string,
  options?: { outletId?: string; limit?: number },
): Promise<any[]> {
  const res = await fetch(
    `/api/waste/metrics/top-products${qs({ organizationId, outletId: options?.outletId, limit: options?.limit })}`,
    { method: "GET" },
  );
  return json<any[]>(res);
}

