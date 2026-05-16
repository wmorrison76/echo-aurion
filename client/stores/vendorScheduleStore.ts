/**
 * Vendor Schedule Store (Genesis F Signal) — Patch D Upgrade
 * Persists vendor delivery calendars with effective-dating support
 * Storage key: luccca:genesis:vendor_schedule:v1
 *
 * Patch D adds:
 * - Effective-dated rule changes (schedule for future dates)
 * - Deterministic versioning (versionId tied to asOfDate + vendors)
 * - Backward compatibility with existing API
 */

import type {
  VendorSchedule,
  Vendor,
} from "@/../shared/types/genesis-procurement";
import type {
  VendorRuleChange,
  VendorRulesVersion,
} from "@/../shared/types/vendor-effective-dated";
import {
  applyEffectiveChanges,
  createVendorRuleChange,
  getPendingChanges,
} from "@/lib/genesis/vendorRules/effectiveRules";
import { osBus } from "@/lib/os-bus";

const STORAGE_KEY = "luccca:genesis:vendor_schedule:v1";

interface VendorScheduleStoreData {
  schedule: VendorSchedule;
  changes: VendorRuleChange[];
  updatedAt: string;
}

/**
 * Load vendor schedule from storage
 */
function loadVendorScheduleData(): VendorScheduleStoreData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return {
        schedule: createDefaultVendorSchedule(),
        changes: [],
        updatedAt: new Date().toISOString(),
      };
    }
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load vendor schedule:", e);
    return {
      schedule: createDefaultVendorSchedule(),
      changes: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Save vendor schedule to storage
 */
function saveVendorScheduleData(data: VendorScheduleStoreData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save vendor schedule (quota exceeded?):", e);
  }
}

/**
 * Get current vendor schedule (backward compatible)
 */
export function getVendorSchedule(): VendorSchedule {
  const data = loadVendorScheduleData();
  return data.schedule;
}

/**
 * Save vendor schedule (backward compatible)
 */
export function setVendorSchedule(schedule: VendorSchedule): void {
  const data = loadVendorScheduleData();
  data.schedule = schedule;
  data.updatedAt = new Date().toISOString();
  saveVendorScheduleData(data);
}

/**
 * Get a vendor by ID (backward compatible)
 */
export function getVendorById(vendorId: string): Vendor | null {
  const schedule = getVendorSchedule();
  return schedule.vendors.find((v) => v.vendorId === vendorId) || null;
}

/**
 * Add a vendor to the schedule (backward compatible)
 */
export function addVendor(vendor: Vendor): void {
  const schedule = getVendorSchedule();
  const exists = schedule.vendors.find((v) => v.vendorId === vendor.vendorId);
  if (!exists) {
    schedule.vendors.push(vendor);
    schedule.updatedAt = new Date().toISOString();
    setVendorSchedule(schedule);
  }
}

/**
 * Update a vendor (backward compatible)
 */
export function updateVendor(vendorId: string, updates: Partial<Vendor>): void {
  const schedule = getVendorSchedule();
  const vendor = schedule.vendors.find((v) => v.vendorId === vendorId);
  if (vendor) {
    Object.assign(vendor, updates);
    schedule.updatedAt = new Date().toISOString();
    setVendorSchedule(schedule);
  }
}

/**
 * Remove a vendor (backward compatible)
 */
export function removeVendor(vendorId: string): void {
  const schedule = getVendorSchedule();
  schedule.vendors = schedule.vendors.filter((v) => v.vendorId !== vendorId);
  schedule.updatedAt = new Date().toISOString();
  setVendorSchedule(schedule);
}

/**
 * Get vendors by delivery day (backward compatible)
 */
export function getVendorsByDeliveryDay(day: string): Vendor[] {
  const schedule = getVendorSchedule();
  return schedule.vendors.filter((v) => v.deliveryDays.includes(day as any));
}

/**
 * Clear vendor schedule (backward compatible)
 */
export function clearVendorSchedule(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear vendor schedule:", e);
  }
}

// ============================================================================
// PATCH D: NEW EFFECTIVE-DATING FUNCTIONS
// ============================================================================

/**
 * Get vendor rules as-of a specific date, with all applicable changes applied
 * Returns a VendorRulesVersion snapshot including versionId (for audit trail)
 */
export function getVersion(asOf: Date = new Date()): VendorRulesVersion {
  const data = loadVendorScheduleData();

  // Convert Vendor[] to VendorScheduleRule[] format
  const baseRules = data.schedule.vendors.map((v) => ({
    vendorId: v.vendorId,
    vendorName: v.name || v.vendorId,
    deliveryDays: (v.deliveryDays || []) as any,
    cutoffTimeLocal: v.cutoffTimeUTC || "14:00",
    minLeadDays: v.leadTimeDays || 1,
    preferConsolidatedDrops: false, // Default from legacy Vendor structure
  }));

  return applyEffectiveChanges(baseRules, data.changes, asOf);
}

/**
 * Schedule a vendor rule change for a future effective date
 * Emits OSBus event for audit trail
 */
export function scheduleChange(
  vendorId: string,
  effectiveDateISO: string,
  patch: any, // Partial<Omit<VendorScheduleRule, "vendorId">>
  memo: string,
  actor?: string,
): VendorRuleChange {
  const data = loadVendorScheduleData();

  const change = createVendorRuleChange(
    vendorId,
    effectiveDateISO,
    patch,
    memo,
    actor,
  );

  // Check if a change for this vendor on this date already exists
  const existingIndex = data.changes.findIndex(
    (c) => c.vendorId === vendorId && c.effectiveDateISO === effectiveDateISO,
  );

  if (existingIndex >= 0) {
    // Update existing change
    data.changes[existingIndex] = change;
  } else {
    // Add new change
    data.changes.push(change);
  }

  data.updatedAt = new Date().toISOString();
  saveVendorScheduleData(data);

  // Emit audit event
  osBus.emit("genesis:vendor_change_scheduled", {
    changeId: change.changeId,
    vendorId,
    effectiveDateISO,
    memo,
    actor,
    timestamp: new Date().toISOString(),
  });

  return change;
}

/**
 * Get all pending changes (effective in the future)
 */
export function getPending(): VendorRuleChange[] {
  const data = loadVendorScheduleData();
  return getPendingChanges(data.changes);
}

/**
 * Get all historical changes (effective in the past)
 */
export function getHistorical(): VendorRuleChange[] {
  const data = loadVendorScheduleData();
  return data.changes.filter(
    (c) => c.effectiveDateISO < new Date().toISOString().split("T")[0],
  );
}

/**
 * Get a specific change by ID
 */
export function getChangeById(changeId: string): VendorRuleChange | null {
  const data = loadVendorScheduleData();
  return data.changes.find((c) => c.changeId === changeId) || null;
}

/**
 * Revert a pending change (delete it)
 */
export function revertChange(changeId: string): void {
  const data = loadVendorScheduleData();
  data.changes = data.changes.filter((c) => c.changeId !== changeId);
  data.updatedAt = new Date().toISOString();
  saveVendorScheduleData(data);

  osBus.emit("genesis:vendor_change_reverted", {
    changeId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Create default vendor schedule with sample vendors
 */
function createDefaultVendorSchedule(): VendorSchedule {
  return {
    scheduleId: `schedule_${Date.now()}`,
    propertyId: "prop_default",
    vendors: [
      {
        vendorId: "vendor_sysco",
        name: "Sysco",
        leadTimeDays: 1,
        deliveryDays: ["MONDAY", "WEDNESDAY", "FRIDAY"],
        cutoffTimeUTC: "14:00",
        minOrderValue: 100,
        maxOrderValue: 50000,
      },
      {
        vendorId: "vendor_us_foods",
        name: "US Foods",
        leadTimeDays: 1,
        deliveryDays: ["TUESDAY", "THURSDAY", "SATURDAY"],
        cutoffTimeUTC: "14:00",
        minOrderValue: 150,
        maxOrderValue: 40000,
      },
      {
        vendorId: "vendor_local_produce",
        name: "Local Produce",
        leadTimeDays: 0,
        deliveryDays: ["MONDAY", "WEDNESDAY", "FRIDAY"],
        cutoffTimeUTC: "06:00",
        minOrderValue: 50,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}
