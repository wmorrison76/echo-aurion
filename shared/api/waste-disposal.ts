/* Types are intentionally loose here to avoid coupling shared/api to optional shared/types modules. */
export type WasteDisposal = any;
export type DisposalMethod = any;
export type WasteEnvironmentalImpact = any;

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

export async function getDisposalMethods(organizationId?: string): Promise<DisposalMethod[]> {
  const res = await fetch(`/api/waste-disposal/methods${qs({ organizationId })}`, { method: "GET" });
  return json<DisposalMethod[]>(res);
}

export async function getWasteDisposals(organizationId: string, options?: { outletId?: string; limit?: number }): Promise<WasteDisposal[]> {
  const res = await fetch(
    `/api/waste-disposal/disposals${qs({ organizationId, outletId: options?.outletId, limit: options?.limit })}`,
    { method: "GET" },
  );
  return json<WasteDisposal[]>(res);
}

export async function createWasteDisposal(disposal: Omit<WasteDisposal, "id" | "created_at" | "updated_at">): Promise<WasteDisposal> {
  const res = await fetch(`/api/waste-disposal/disposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(disposal),
  });
  return json<WasteDisposal>(res);
}

export async function getDisposalMethodUsage(organizationId: string, options?: { outletId?: string }) {
  const res = await fetch(`/api/waste-disposal/method-usage${qs({ organizationId, outletId: options?.outletId })}`, { method: "GET" });
  return json<any[]>(res);
}

export async function getEnvironmentalImpactSummary(organizationId: string, outletId?: string) {
  const res = await fetch(`/api/waste-disposal/environmental-impact${qs({ organizationId, outletId })}`, { method: "GET" });
  return json<WasteEnvironmentalImpact>(res);
}

