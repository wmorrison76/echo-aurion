/**
 * LUCCCA Inventory Framework - Location Type Definitions
 * 
 * Locations represent physical places where inventory is stored:
 * Kitchens, bars, storerooms, commissaries, outlets, etc.
 */

export enum LocationType {
  CENTRAL_STOREROOM = "CENTRAL_STOREROOM",
  COMMISSARY = "COMMISSARY",
  PASTRY = "PASTRY",
  MAESTRO = "MAESTRO",
  MAIN_KITCHEN = "MAIN_KITCHEN",
  OUTLET = "OUTLET",
  POOL_BAR = "POOL_BAR",
  ROOM_SERVICE = "ROOM_SERVICE",
  BANQUET = "BANQUET",
  CUSTOM = "CUSTOM",
}

export enum LocationStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  MAINTENANCE = "maintenance",
}

/**
 * Location: Physical place where inventory is stored
 * Examples:
 *  - Central Storeroom (CENTRAL_STOREROOM)
 *  - Pastry Kitchen (PASTRY)
 *  - Maestro Kitchen (MAESTRO)
 *  - Pool Bar (POOL_BAR)
 *  - Outlet at Rooftop Restaurant (OUTLET)
 */
export interface Location {
  id: string; // UUID or string code (e.g., "MAIN_KITCHEN")
  org_id: string; // Multi-tenant isolation (which hotel/resort?)
  name: string; // e.g., "Main Kitchen", "Pool Bar"
  type: LocationType; // Category of location
  parent_location_id?: string; // For hierarchical locations (e.g., Bar inside Restaurant)
  timezone?: string; // For reporting (e.g., "America/New_York")
  address?: string; // Physical address
  manager_id?: string; // Employee ID of location manager
  status: LocationStatus; // Is this location active?
  is_production?: boolean; // Is this a production location? (vs. point of use)
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * LocationTransferPermission: Define which transfers are allowed between locations
 * Used for controls like "Pool Bar can't transfer to Pastry" or "only daily transfers allowed"
 */
export interface LocationTransferPermission {
  id: string;
  from_location_id: string;
  to_location_id: string;
  is_allowed: boolean;
  requires_approval?: boolean;
  transfer_frequency?: "any_time" | "daily" | "weekly" | "manual";
}
