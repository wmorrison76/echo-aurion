import { PurchaseOrder } from "@shared/purchasing";
interface CreateOrderPayload {
  vendorId: string;
  outletId: string;
  eta?: string | null;
  lines: {
    itemId?: string | null;
    name?: string | null;
    qty: number;
    uom: string;
    unitPrice?: number | null;
  }[];
}
interface StatusUpdatePayload {
  status: PurchaseOrder["status"];
  eta?: string | null;
}
async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}
export async function createPurchaseOrder(
  payload: CreateOrderPayload,
): Promise<PurchaseOrder> {
  const data = await apiFetch<{ order: PurchaseOrder }>("/api/orders/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.order;
}
export async function updatePurchaseOrderStatus(
  id: string,
  payload: StatusUpdatePayload,
): Promise<PurchaseOrder> {
  const data = await apiFetch<{ order: PurchaseOrder }>(
    `/api/orders/${id}/status`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return data.order;
}
