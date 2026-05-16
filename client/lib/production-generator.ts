import type { BEODocument } from "@/../shared/types/beo";
import type { ProductionSheet } from "@/../shared/types/production";
import { mapBEOToProductionItems } from "./production-mapper";

/**
 * Generate station-based production sheets from a BEO document
 * One sheet per station, grouping all menu items that belong to that station
 */
export function generateProductionSheets(doc: BEODocument): ProductionSheet[] {
  const items = mapBEOToProductionItems(doc);

  const byStation = new Map<string, ProductionSheet>();

  items.forEach((item) => {
    if (!byStation.has(item.station)) {
      byStation.set(item.station, {
        productionId: `${doc.beoId}:${item.station}`,
        beoId: doc.beoId,
        eventId: doc.eventId,

        outletName: doc.outletName ?? "—",
        eventTitle: doc.title,
        eventDate: doc.start,

        station: item.station,
        items: [],

        generatedAt: new Date().toISOString(),
        revision: doc.revisionNumber,
      });
    }

    byStation.get(item.station)!.items.push(item);
  });

  return Array.from(byStation.values());
}
