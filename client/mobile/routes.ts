/**
 * Mobile PWA routes
 * Minimal nav: Receiving, Inventory Count, Recipe View, Approvals, Tasks
 * Shares auth + org context with main app; domain contracts from shared/types.
 */

export const MOBILE_BASE = "/mobile";

export type MobileRouteId =
  | "receiving"
  | "inventory-count"
  | "recipe-view"
  | "approvals"
  | "tasks";

export interface MobileRoute {
  id: MobileRouteId;
  path: string;
  label: string;
  exact?: boolean;
}

export const MOBILE_ROUTES: MobileRoute[] = [
  { id: "receiving", path: `${MOBILE_BASE}/receiving`, label: "Receiving", exact: true },
  { id: "inventory-count", path: `${MOBILE_BASE}/inventory-count`, label: "Inventory Count", exact: true },
  { id: "recipe-view", path: `${MOBILE_BASE}/recipe-view`, label: "Recipe View", exact: true },
  { id: "approvals", path: `${MOBILE_BASE}/approvals`, label: "Approvals", exact: true },
  { id: "tasks", path: `${MOBILE_BASE}/tasks`, label: "Tasks", exact: true },
];

export function getMobileRoute(id: MobileRouteId): MobileRoute | undefined {
  return MOBILE_ROUTES.find((r) => r.id === id);
}

export function getMobilePath(id: MobileRouteId): string {
  const r = getMobileRoute(id);
  return r?.path ?? MOBILE_BASE;
}
