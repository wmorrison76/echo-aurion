export type ReadyMadeItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultYieldPercent: number;
  standardBatchQty: number;
  standardBatchUnit: string;
  portionSize: number;
  portionUnit: string;
  defaultPortions: number;
  supplierId: string;
  leadTimeDays: number;
  tags: string[];
};

export const READY_MADE_ITEMS: ReadyMadeItem[] = [
  {
    id: "rm-veloute-base",
    name: "Roasted Vegetable Velouté Base",
    category: "sauce",
    description:
      "Slow-roasted root vegetables and aromatics emulsified into a velvety base ideal for soups or finishing sauces.",
    defaultYieldPercent: 86,
    standardBatchQty: 18,
    standardBatchUnit: "L",
    portionSize: 240,
    portionUnit: "ML",
    defaultPortions: 75,
    supplierId: "sup-harvest-kitchens",
    leadTimeDays: 2,
    tags: ["plant-based", "ready-to-serve", "gluten-free"],
  },
  {
    id: "rm-braised-short-rib",
    name: "Cabernet Braised Short Rib",
    category: "protein",
    description:
      "Boneless beef short rib braised with cabernet, mirepoix, and veal stock; portioned and blast-chilled for service.",
    defaultYieldPercent: 68,
    standardBatchQty: 22,
    standardBatchUnit: "KG",
    portionSize: 170,
    portionUnit: "G",
    defaultPortions: 110,
    supplierId: "sup-urban-butcher",
    leadTimeDays: 4,
    tags: ["premium", "ready-to-heat", "chef-series"],
  },
  {
    id: "rm-confit-garlic",
    name: "Confit Garlic Puree",
    category: "condiment",
    description:
      "Whole garlic cloves confit in olive oil and whipped into a smooth puree with lemon and thyme.",
    defaultYieldPercent: 92,
    standardBatchQty: 12,
    standardBatchUnit: "KG",
    portionSize: 45,
    portionUnit: "G",
    defaultPortions: 240,
    supplierId: "sup-coastal-produce",
    leadTimeDays: 1,
    tags: ["mise-en-place", "bulk", "vegan"],
  },
  {
    id: "rm-vegan-panna-cotta",
    name: "Coconut Cashew Panna Cotta",
    category: "dessert",
    description:
      "Silky coconut and cashew panna cotta set with agar and vanilla bean; plated in recyclable ramekins.",
    defaultYieldPercent: 93,
    standardBatchQty: 9,
    standardBatchUnit: "L",
    portionSize: 150,
    portionUnit: "G",
    defaultPortions: 60,
    supplierId: "sup-atelier-patisserie",
    leadTimeDays: 3,
    tags: ["vegan", "gluten-free", "premium"],
  },
  {
    id: "rm-fermented-chili",
    name: "Fermented Calabrian Chili Paste",
    category: "condiment",
    description:
      "Three-week fermented Calabrian chilies balanced with honey, citrus, and smoked salt.",
    defaultYieldPercent: 88,
    standardBatchQty: 8,
    standardBatchUnit: "KG",
    portionSize: 35,
    portionUnit: "G",
    defaultPortions: 185,
    supplierId: "sup-lavilla-preserves",
    leadTimeDays: 5,
    tags: ["artisanal", "small-batch", "spicy"],
  },
];

export function getReadyMadeItem(id: string): ReadyMadeItem | undefined {
  return READY_MADE_ITEMS.find((item) => item.id === id);
}

export function searchReadyMadeItems(query: string): ReadyMadeItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return READY_MADE_ITEMS;
  return READY_MADE_ITEMS.filter((item) => {
    const haystack = [
      item.name,
      item.category,
      item.description,
      ...item.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}
