import type { VendorPack } from "@/../shared/types/vendor";
import { v4 as uuidv4 } from "uuid";

const KEY = "luccca:vendors";

/**
 * Get all vendor packs from localStorage
 */
export function listVendorPacks(): VendorPack[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Get all vendor options for a specific ingredient
 */
export function listVendorOptionsForIngredient(
  ingredientId: string,
): VendorPack[] {
  return listVendorPacks().filter((pack) => pack.ingredientId === ingredientId);
}

/**
 * Get all unique vendors
 */
export function listVendors(): { vendorId: string; vendorName: string }[] {
  const vendors = new Map<string, string>();
  listVendorPacks().forEach((pack) => {
    vendors.set(pack.vendorId, pack.vendorName);
  });
  return Array.from(vendors.entries()).map(([vendorId, vendorName]) => ({
    vendorId,
    vendorName,
  }));
}

/**
 * Create or update a vendor pack
 */
export function upsertVendorPack(
  pack: Omit<VendorPack, "effectiveUnitCost">,
): VendorPack {
  const packs = listVendorPacks();

  const effectiveUnitCost = pack.pricePerPack / pack.packSize;

  const upserted: VendorPack = {
    ...pack,
    effectiveUnitCost,
  };

  // Update existing or add new
  const existing = packs.findIndex(
    (p) =>
      p.vendorId === pack.vendorId &&
      p.ingredientId === pack.ingredientId &&
      p.packSize === pack.packSize,
  );

  const updated =
    existing >= 0
      ? packs.map((p, i) => (i === existing ? upserted : p))
      : [...packs, upserted];

  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(updated));
  }

  return upserted;
}

/**
 * Delete a vendor pack
 */
export function deleteVendorPack(
  vendorId: string,
  ingredientId: string,
  packSize: number,
): boolean {
  const packs = listVendorPacks();
  const updated = packs.filter(
    (p) =>
      !(
        p.vendorId === vendorId &&
        p.ingredientId === ingredientId &&
        p.packSize === packSize
      ),
  );

  if (updated.length === packs.length) return false; // Not found

  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(updated));
  }

  return true;
}

/**
 * Initialize with sample vendor packs (for demo purposes)
 */
export function initializeSampleVendors(): void {
  const existing = listVendorPacks();
  if (existing.length > 0) return; // Already initialized

  const samples: Omit<VendorPack, "effectiveUnitCost">[] = [
    // Salmon Fillet options
    {
      vendorId: "vendor_sysco",
      vendorName: "Sysco",
      ingredientId: "salmon_fillet",
      ingredientName: "Salmon Fillet (raw)",
      packSize: 10,
      packUnit: "lb",
      pricePerPack: 78.0,
    },
    {
      vendorId: "vendor_sysco",
      vendorName: "Sysco",
      ingredientId: "salmon_fillet",
      ingredientName: "Salmon Fillet (raw)",
      packSize: 5,
      packUnit: "lb",
      pricePerPack: 42.0,
    },
    {
      vendorId: "vendor_us_foods",
      vendorName: "US Foods",
      ingredientId: "salmon_fillet",
      ingredientName: "Salmon Fillet (raw)",
      packSize: 8,
      packUnit: "lb",
      pricePerPack: 69.5,
    },

    // Mixed Greens options
    {
      vendorId: "vendor_sysco",
      vendorName: "Sysco",
      ingredientId: "mixed_greens",
      ingredientName: "Mixed Greens (raw)",
      packSize: 3,
      packUnit: "lb",
      pricePerPack: 8.5,
    },
    {
      vendorId: "vendor_local_produce",
      vendorName: "Local Produce Co",
      ingredientId: "mixed_greens",
      ingredientName: "Mixed Greens (raw)",
      packSize: 5,
      packUnit: "lb",
      pricePerPack: 12.0,
    },

    // Dark Chocolate options
    {
      vendorId: "vendor_sysco",
      vendorName: "Sysco",
      ingredientId: "dark_chocolate",
      ingredientName: "Dark Chocolate",
      packSize: 5,
      packUnit: "lb",
      pricePerPack: 45.0,
    },
    {
      vendorId: "vendor_webstaurant",
      vendorName: "WebstaurantStore",
      ingredientId: "dark_chocolate",
      ingredientName: "Dark Chocolate",
      packSize: 10,
      packUnit: "lb",
      pricePerPack: 82.5,
    },
  ];

  samples.forEach((sample) => {
    upsertVendorPack(sample);
  });
}
