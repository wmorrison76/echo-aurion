/** Shared server-notes types and presets (stub for Pastry2 server-notes section). */

export interface ServerNoteLayout {
  name: string;
  id?: string;
}

export interface ServerNoteColorScheme {
  name: string;
  id?: string;
  primary?: string;
  secondary?: string;
}

export interface ServerNoteRecipeRecipe {
  id: string;
  title?: string;
  ingredients?: string[];
  instructions?: string[];
  cookTime?: number;
  prepTime?: number;
  description?: string;
  course?: string;
}

export interface ServerNoteRecipe {
  recipe: ServerNoteRecipeRecipe;
  order: number;
  wineSelection?: string;
  sellingNotes?: string;
  serviceInstructions?: string;
  silverwareRequired?: string[];
}

export const silverwareOptions = [
  "Dinner Fork",
  "Dinner Knife",
  "Soup Spoon",
  "Salad Fork",
  "Dessert Spoon",
  "Steak Knife",
  "Butter Knife",
];

export interface ServerNote {
  id?: string;
  title?: string;
  companyName: string;
  outletName: string;
  logos: string[];
  orientation: "portrait" | "landscape";
  pageFormat: string;
  cardsPerPage: number;
  layout: ServerNoteLayout;
  colorScheme: ServerNoteColorScheme;
  selectedRecipes: ServerNoteRecipe[];
  distributionDate?: string;
  updatedAt: string;
  docxDataUrl?: string;
}

export const layoutPresets: ServerNoteLayout[] = [
  { name: "Standard", id: "standard" },
];

export const colorSchemes: ServerNoteColorScheme[] = [
  { name: "Default", id: "default", primary: "#0f172a", secondary: "#64748b" },
];

export function createEmptyServerNote(
  layout: ServerNoteLayout,
  colorScheme: ServerNoteColorScheme
): ServerNote {
  return {
    companyName: "",
    outletName: "",
    logos: [],
    orientation: "portrait",
    pageFormat: "a4",
    cardsPerPage: 4,
    layout: { ...layout },
    colorScheme: { ...colorScheme },
    selectedRecipes: [],
    distributionDate: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
}
