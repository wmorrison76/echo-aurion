/**
 * Production Intelligence Types
 * Maps BEO menu items to station-based prep sheets
 * Used by kitchen/ops to execute against BEO documents
 */

export type ProductionStation =
  | "HOT"
  | "COLD"
  | "GARDE"
  | "PASTRY"
  | "BAR"
  | "OTHER";

export type ProductionItem = {
  itemId: string;
  itemName: string;
  station: ProductionStation;

  quantity: number;
  unit: string;

  derivedFrom: {
    beoId: string;
    menuPath: string; // path in BEODocument.menu
  };

  notes?: string;
};

export type ProductionSheet = {
  productionId: string;
  beoId: string;
  eventId: string;

  outletName: string;
  eventTitle: string;
  eventDate: string;

  station: ProductionStation;
  items: ProductionItem[];

  generatedAt: string;
  revision: number;
};
