import type { Ingredient, VendorItem } from "../data/schemas";
const MASS_CONVERSIONS: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};
const VOLUME_CONVERSIONS: Record<string, number> = {
  ml: 1,
  l: 1000,
  gal: 3785.41,
};
const IDENTITY_UNITS = new Set(["each", "case", "pack", "tray"]);
export function convertQuantity(qty: number, from: string, to: string): number {
  if (from === to) return qty;
  const fromMass = MASS_CONVERSIONS[from];
  const toMass = MASS_CONVERSIONS[to];
  if (fromMass && toMass) {
    return (qty * fromMass) / toMass;
  }
  const fromVol = VOLUME_CONVERSIONS[from];
  const toVol = VOLUME_CONVERSIONS[to];
  if (fromVol && toVol) {
    return (qty * fromVol) / toVol;
  }
  if (IDENTITY_UNITS.has(from) && IDENTITY_UNITS.has(to)) {
    return qty;
  }
  throw new Error(`Unsupported unit conversion from ${from} to ${to}`);
}
export function convertToBaseUnit(
  qty: number,
  fromUom: string,
  ingredient: Ingredient,
): number {
  return convertQuantity(qty, fromUom, ingredient.baseUom);
}
export function calcSuggestedOrder(par: number, onHand: number): number {
  return Math.max(0, Math.ceil(par - onHand));
}
export function costPerBaseFromVendorItem(item: VendorItem): number {
  return item.pricePerPack / item.convToBase;
}
export function extendedCost(unitCost: number, qty: number): number {
  return roundCurrency(unitCost * qty);
}
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
export function applyYieldAndWaste(
  qty: number,
  yieldPct: number,
  wastePct: number,
): number {
  const usable = qty * (1 - wastePct);
  if (yieldPct <= 0) return usable;
  return usable / yieldPct;
}
