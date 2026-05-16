import type { BEODocument } from "@/../shared/types/beo";
import type {
  ProductionItem,
  ProductionStation,
} from "@/../shared/types/production";

/**
 * Infer kitchen station from menu item name (v1)
 * Rules-based inference; can be replaced with AI later
 */
function inferStation(itemName: string): ProductionStation {
  const name = itemName.toLowerCase();

  if (name.includes("salad") || name.includes("fruit")) return "GARDE";
  if (
    name.includes("cake") ||
    name.includes("pastry") ||
    name.includes("dessert")
  )
    return "PASTRY";
  if (
    name.includes("cocktail") ||
    name.includes("wine") ||
    name.includes("drink")
  )
    return "BAR";
  if (
    name.includes("chicken") ||
    name.includes("beef") ||
    name.includes("salmon") ||
    name.includes("steak") ||
    name.includes("fish") ||
    name.includes("pork")
  )
    return "HOT";
  if (name.includes("cheese") || name.includes("pate")) return "COLD";

  return "OTHER";
}

/**
 * Map BEO menu items to production items with station assignments
 * Derives quantities from GTD (Guaranteed), falls back to EXP (Expected)
 */
export function mapBEOToProductionItems(doc: BEODocument): ProductionItem[] {
  const items: ProductionItem[] = [];

  doc.menu?.sections?.forEach((section, sIdx) => {
    section.items.forEach((item, iIdx) => {
      items.push({
        itemId: `${doc.beoId}:${sIdx}:${iIdx}`,
        itemName: item.itemName,
        station: inferStation(item.itemName),

        quantity: doc.gtd ?? doc.exp ?? 0,
        unit: "portions",

        derivedFrom: {
          beoId: doc.beoId,
          menuPath: `menu.sections[${sIdx}].items[${iIdx}]`,
        },
      });
    });
  });

  return items;
}
