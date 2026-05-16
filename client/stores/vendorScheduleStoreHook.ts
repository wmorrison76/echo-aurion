/**
 * Zustand hook wrapper for Vendor Schedule Store
 */

import { create } from "zustand";
import { getVendorSchedule } from "./vendorScheduleStore";
import { getVersion as getVendorRulesVersion } from "./vendorScheduleStore";

interface VendorScheduleStoreState {
  schedule: any;
  getVersion: (date: Date) => { versionId: string; asOfDateISO: string };
}

export const useVendorScheduleStore = create<VendorScheduleStoreState>(() => ({
  schedule: getVendorSchedule(),

  getVersion: (date: Date) => {
    const v = getVendorRulesVersion(date);
    return { versionId: v.versionId, asOfDateISO: v.asOfDateISO };
  },
}));
