/* Types are intentionally loose here to avoid coupling shared/api to optional shared/types modules. */
export type WastePreventionAction = any;
export type WastePreventionROI = any;
export type WasteReport = any;

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

export async function getPreventionActions(
  organizationId: string,
  options?: { outletId?: string; status?: "proposed" | "approved" | "in_progress" | "completed" | "cancelled" },
): Promise<WastePreventionAction[]> {
  const res = await fetch(
    `/api/waste-prevention/actions${qs({ organizationId, outletId: options?.outletId, status: options?.status })}`,
    { method: "GET" },
  );
  return json<WastePreventionAction[]>(res);
}

export async function createPreventionAction(
  action: Omit<WastePreventionAction, "id" | "created_at" | "updated_at">,
): Promise<WastePreventionAction> {
  const res = await fetch(`/api/waste-prevention/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  return json<WastePreventionAction>(res);
}

export async function getPreventionROI(
  organizationId: string,
  options?: { outletId?: string; completed?: boolean },
): Promise<WastePreventionROI[]> {
  const res = await fetch(
    `/api/waste-prevention/roi${qs({ organizationId, outletId: options?.outletId, completed: options?.completed })}`,
    { method: "GET" },
  );
  return json<WastePreventionROI[]>(res);
}

export async function getWasteReports(
  organizationId: string,
  options?: { outletId?: string },
): Promise<WasteReport[]> {
  const res = await fetch(`/api/waste-prevention/reports${qs({ organizationId, outletId: options?.outletId })}`, {
    method: "GET",
  });
  return json<WasteReport[]>(res);
}

export async function generateWasteReport(
  organizationId: string,
  options: { reportType: string; periodStart: string; periodEnd: string; outletId?: string },
): Promise<WasteReport> {
  const res = await fetch(`/api/waste-prevention/reports/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId, ...options }),
  });
  return json<WasteReport>(res);
}

export async function getWorstSuppliers(organizationId: string, limit = 10) {
  const res = await fetch(`/api/waste-prevention/suppliers/worst${qs({ organizationId, limit })}`, { method: "GET" });
  return json<any[]>(res);
}

