export type KitchenStation = {
  id: string;
  name: string;
  category: "hot" | "cold" | "pastry" | "beverage" | "expo" | "prep" | "butchery" | "banquet";
  description: string;
  defaultPrinters: string[];
};

export type ChitPrinterProfile = {
  id: string;
  name: string;
  technology: "thermal" | "impact" | "label";
  description: string;
  recommendedUse: string;
};

export const KITCHEN_STATIONS: KitchenStation[] = [
  {
    id: "expo",
    name: "Expo",
    category: "expo",
    description:
      "Final check point for plates leaving the line. Coordinates fires, garnishes, and pacing with service.",
    defaultPrinters: ["expo-thermal", "chef-handoff"],
  },
  {
    id: "saute",
    name: "Sauté",
    category: "hot",
    description:
      "Handles pan sauces, seared proteins, and composed entrees requiring à la minute finishing.",
    defaultPrinters: ["expo-thermal"],
  },
  {
    id: "grill",
    name: "Grill",
    category: "hot",
    description:
      "Open fire and plancha station for steaks, chops, and flame-forward menu features.",
    defaultPrinters: ["expo-thermal"],
  },
  {
    id: "garde-manger",
    name: "Garde Manger",
    category: "cold",
    description:
      "Cold pantry executing salads, chilled starters, composed raw items, and dessert setup mise.",
    defaultPrinters: ["cold-label"],
  },
  {
    id: "fry",
    name: "Hot Fry",
    category: "hot",
    description:
      "High volume fryer station handling crisps, garnishes, and quick fire bar bites.",
    defaultPrinters: ["expo-thermal"],
  },
  {
    id: "pastry",
    name: "Pastry",
    category: "pastry",
    description:
      "Pastry finishing, chocolate work, and plated dessert execution with blast chill coordination.",
    defaultPrinters: ["pastry-label"],
  },
  {
    id: "butchery",
    name: "Butchery",
    category: "butchery",
    description:
      "Fabrication and portioning of proteins, dry aging program pulls, and charcuterie staging.",
    defaultPrinters: ["prep-label"],
  },
  {
    id: "banquet",
    name: "Banquet Rally",
    category: "banquet",
    description:
      "Banquet line staging for large format plating, heat lamps, and timeline-based coursing.",
    defaultPrinters: ["banquet-impact", "prep-label"],
  },
  {
    id: "prep",
    name: "Production Prep",
    category: "prep",
    description:
      "Batch prep, vacuum sealing, and mise consolidation to support all hot and cold lines.",
    defaultPrinters: ["prep-label"],
  },
  {
    id: "bar",
    name: "Bar Program",
    category: "beverage",
    description:
      "Bar and mixology station handling cocktails, zero-proof pairings, and wine service alerts.",
    defaultPrinters: ["bar-impact"],
  },
];

export const CHIT_PRINTERS: ChitPrinterProfile[] = [
  {
    id: "expo-thermal",
    name: "Expo Thermal",
    technology: "thermal",
    description: "Kitchen-grade thermal ticket printer rated for 200mm/s output with auto-cutter.",
    recommendedUse: "Primary expo and sauté routing where high speed tickets are critical.",
  },
  {
    id: "chef-handoff",
    name: "Chef Pass Impact",
    technology: "impact",
    description: "Two-ply impact printer generating duplicate tickets for chef pass and pass support.",
    recommendedUse: "Chef pass stations needing carbon copies for QA and kitchen display backups.",
  },
  {
    id: "cold-label",
    name: "Cold Pantry Labeler",
    technology: "label",
    description: "2-inch linerless label printer for mise cups, dressing bottles, and ready-to-serve items.",
    recommendedUse: "Garde manger labels and FIFO rotation where adhesive tickets are required.",
  },
  {
    id: "pastry-label",
    name: "Pastry Label",
    technology: "label",
    description: "High-resolution label printer for dessert pickup, allergen callouts, and garnish kits.",
    recommendedUse: "Pastry room portioning and plated dessert pickup staging.",
  },
  {
    id: "prep-label",
    name: "Prep Room Label",
    technology: "label",
    description: "Industrial label printer supporting bulk batch production, cryovac, and walk-in labeling.",
    recommendedUse: "Production prep and butchery packaging with moisture-resistant stock.",
  },
  {
    id: "banquet-impact",
    name: "Banquet Impact",
    technology: "impact",
    description: "Heavy duty impact printer for banquet rally with audible fire notification.",
    recommendedUse: "Banquet timelines and coursing boards needing multi-copy tickets.",
  },
  {
    id: "bar-impact",
    name: "Bar Impact",
    technology: "impact",
    description: "Impact printer with splash guard for high volume cocktail and wine programs.",
    recommendedUse: "Bar program routing, especially where printers sit near wet wells.",
  },
];
