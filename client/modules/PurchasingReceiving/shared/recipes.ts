import type { StandardizedLineItem } from "./api";
import type { Outlet } from "./purchasing";
export interface RecipeCatalogApiEntry {
  item: StandardizedLineItem;
  outletId: string | null;
  outletName: string | null;
  vendorId: string | null;
  vendorName: string | null;
  capturedAt: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  payload: Record<string, unknown> | null;
}
export interface RecipeCatalogResponse {
  entries: RecipeCatalogApiEntry[];
  outlets: Outlet[];
}
