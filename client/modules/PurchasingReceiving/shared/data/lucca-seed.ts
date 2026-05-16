export interface LuccaSeedItem {
  name: string;
  vendor: string;
  unit: string;
  pack?: string | null;
  glCode?: string;
  glName?: string;
  lastUnitPrice?: number;
  lastReceiptDate?: string;
}
export const luccaSeedItems: LuccaSeedItem[] = [
  {
    name: "Chicken Breast Boneless Skinless 10lb Case",
    vendor: "Sysco",
    unit: "case",
    pack: "10 lb",
    glCode: "5030-Proteins",
    glName: "Proteins",
    lastUnitPrice: 39.9,
  },
  {
    name: "Fryer Oil 35 lb Jug",
    vendor: "US Foods",
    unit: "jug",
    pack: "35 lb",
    glCode: "5075-OilsFats",
    glName: "Oils & Fats",
    lastUnitPrice: 28.5,
  },
  {
    name: "Romaine Hearts Fresh 12ct",
    vendor: "Mr Greens",
    unit: "case",
    pack: "12 ct",
    glCode: "5010-Produce",
    glName: "Produce",
    lastUnitPrice: 22.4,
  },
  {
    name: "Strawberries Fresh Flat 8 lb",
    vendor: "FreshPoint",
    unit: "flat",
    pack: "8 lb",
    glCode: "5010-Produce",
    glName: "Produce",
    lastUnitPrice: 31.2,
  },
  {
    name: "Kaiser Roll Bread 12ct",
    vendor: "Gold Medal Bakery",
    unit: "case",
    pack: "12 ct",
    glCode: "5120-Prepared",
    glName: "Prepared & Processed",
    lastUnitPrice: 14.75,
  },
  {
    name: "Tomato Paste #10 Can",
    vendor: "Halperns",
    unit: "case",
    pack: "6 #10",
    glCode: "5120-Prepared",
    glName: "Prepared & Processed",
    lastUnitPrice: 26.1,
  },
  {
    name: "Cabernet Sauvignon 750ml Reserve",
    vendor: "WineDirect",
    unit: "case",
    pack: "12 x 750 ml",
    glCode: "5111-Wine",
    glName: "Wine",
    lastUnitPrice: 132,
  },
  {
    name: "Orange Juice NFC 6/64 oz",
    vendor: "Baldor",
    unit: "case",
    pack: "6/64 oz",
    glCode: "5114-Juices",
    glName: "Juices & Non-Alcoholic",
    lastUnitPrice: 18.6,
  },
];
