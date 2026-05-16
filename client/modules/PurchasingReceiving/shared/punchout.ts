export type PunchoutProtocol = "OCI" | "cXML" | "URL";
export interface Vendor {
  id: string;
  name: string;
  protocol: PunchoutProtocol;
  homepage?: string;
}
export interface PunchoutSession {
  id: string;
  vendorId: string;
  startedAt: string;
}
export interface CatalogItem {
  sku: string;
  name: string;
  pack?: string;
  unit: string; // purchase unit, e.g., case, lb, ea price: number; // total per purchase unit vendorId: string;
}
export interface VendorConnector {
  startSession(vendor: Vendor): Promise<PunchoutSession>;
  search(session: PunchoutSession, query: string): Promise<CatalogItem[]>;
}
