import type { Tenancy } from "../hooks/useTenancy";

export interface OutletDepartmentOption {
  id: string;
  name: string;
}

export interface OutletAccessOption {
  org_id: string;
  org_name: string;
  outlet_id: string;
  outlet_name: string;
  departments: OutletDepartmentOption[];
}

export const DEMO_OUTLET_ACCESS: OutletAccessOption[] = [
  {
    org_id: "restaurant-group",
    org_name: "Restaurant Group",
    outlet_id: "restaurant-1",
    outlet_name: "Restaurant 1",
    departments: [
      { id: "front-of-house", name: "Front of House" },
      { id: "kitchen", name: "Kitchen" },
    ],
  },
  {
    org_id: "restaurant-group",
    org_name: "Restaurant Group",
    outlet_id: "restaurant-2",
    outlet_name: "Restaurant 2",
    departments: [
      { id: "dining-room", name: "Dining Room" },
      { id: "bar", name: "Bar" },
    ],
  },
];

export function getOutletAccessOptions(): OutletAccessOption[] {
  return DEMO_OUTLET_ACCESS;
}

export function getOutletAccessById(outletId: string) {
  return DEMO_OUTLET_ACCESS.find((outlet) => outlet.outlet_id === outletId) || null;
}

export function getPrimaryDepartment(outletId: string): OutletDepartmentOption | null {
  return getOutletAccessById(outletId)?.departments[0] || null;
}

export function buildTenancyFromOutletAccess(
  outlet: OutletAccessOption,
  deptId?: string,
): Tenancy {
  const department =
    outlet.departments.find((item) => item.id === deptId) || outlet.departments[0];

  return {
    org_id: outlet.org_id,
    org_name: outlet.org_name,
    outlet_id: outlet.outlet_id,
    outlet_name: outlet.outlet_name,
    dept_id: department?.id || "default",
    dept_name: department?.name || "Default",
    role: "EMPLOYEE",
  };
}
