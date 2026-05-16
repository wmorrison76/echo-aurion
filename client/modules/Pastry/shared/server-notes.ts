import type { Recipe } from "./recipes";

export type StandardLayoutConfig = {
  id: string;
  name: string;
  description: string;
  headerStyle: "centered" | "split" | "left";
  recipeLayout: "two-column" | "compact" | "narrative";
  includeImages: boolean;
  includeNutrition: boolean;
  fontFamily: string;
  preferredOrientation?: "vertical" | "horizontal";
};

export type IndexCardLayoutConfig = {
  headerStyle: "centered" | "minimal";
  contentPriority: "balanced" | "ingredients" | "instructions";
  includeImages: boolean;
  fontSize: "small" | "regular";
};

export type LayoutPreset = {
  id: string;
  name: string;
  description: string;
  standardLayout: StandardLayoutConfig;
  indexCardLayout: IndexCardLayoutConfig;
};

export type ColorScheme = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
};

export type ServerNoteRecipe = {
  recipe: Recipe;
  order: number;
  wineSelection?: string;
  sellingNotes?: string;
  serviceInstructions?: string;
  silverwareRequired?: string[];
};

export type ServerNote = {
  id: string;
  title: string;
  distributionDate: string;
  companyName: string;
  outletName: string;
  layout: LayoutPreset;
  colorScheme: ColorScheme;
  orientation: "vertical" | "horizontal";
  pageFormat: "standard" | "index-card";
  cardsPerPage: number;
  logos: string[];
  selectedRecipes: ServerNoteRecipe[];
  distributionNotes?: string;
  docxDataUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type RecipeCollection = {
  id: string;
  name: string;
  season: string;
  year: number;
  version: number;
  description?: string;
  recipeIds: string[];
  createdAt: string;
  updatedAt: string;
};

export const silverwareOptions = [
  "Dinner Fork",
  "Salad Fork",
  "Dessert Fork",
  "Dinner Knife",
  "Butter Knife",
  "Steak Knife",
  "Teaspoon",
  "Tablespoon",
  "Soup Spoon",
  "Bouillon Spoon",
  "Espresso Spoon",
  "Chopsticks",
  "Fondue Fork",
  "Serving Spoon",
  "Serving Fork",
  "Tongs",
];

export const colorSchemes: ColorScheme[] = [
  {
    id: "heritage-brass",
    name: "Heritage Brass",
    primary: "#d4a373",
    secondary: "#8d6b4f",
    accent: "#f4d7b6",
    background: "#fdfaf5",
    text: "#2f261c",
  },
  {
    id: "midnight-platinum",
    name: "Midnight Platinum",
    primary: "#7d9fe6",
    secondary: "#3c4d74",
    accent: "#b7c6f3",
    background: "#0f1729",
    text: "#f8fafc",
  },
  {
    id: "seaside-glass",
    name: "Seaside Glass",
    primary: "#2d9cdb",
    secondary: "#1f6f93",
    accent: "#b5e2f8",
    background: "#f2fbff",
    text: "#123544",
  },
  {
    id: "terra-cotta",
    name: "Terra Cotta",
    primary: "#c06014",
    secondary: "#8b4513",
    accent: "#f7c59f",
    background: "#fff8f1",
    text: "#2b1d12",
  },
  {
    id: "custom",
    name: "Custom",
    primary: "#1f2937",
    secondary: "#4b5563",
    accent: "#9ca3af",
    background: "#ffffff",
    text: "#111827",
  },
];

export const layoutPresets: LayoutPreset[] = [
  {
    id: "luccca-briefing",
    name: "LUCCCA Service Sheet",
    description:
      "Service briefing modeled on the LUCCCA Word template with structured sections for dish components, serviceware, allergens, and beverage pairings.",
    standardLayout: {
      id: "standard-luccca",
      name: "LUCCCA Service Sheet",
      description:
        "Two-column template with dedicated tables for dish components, serviceware, allergens, and beverage pairings.",
      headerStyle: "left",
      recipeLayout: "two-column",
      includeImages: true,
      includeNutrition: true,
      fontFamily: "'Arial', 'Helvetica', sans-serif",
      preferredOrientation: "vertical",
    },
    indexCardLayout: {
      headerStyle: "centered",
      contentPriority: "balanced",
      includeImages: true,
      fontSize: "regular",
    },
  },
  {
    id: "brasserie-classic",
    name: "Brasserie Classic",
    description:
      "Wide hero header with chef notes, two column detail, and pacing footer cues.",
    standardLayout: {
      id: "standard-brasserie",
      name: "Brasserie Classic",
      description: "Hero header with chef notes and dual column detail.",
      headerStyle: "left",
      recipeLayout: "two-column",
      includeImages: true,
      includeNutrition: true,
      fontFamily: "'Playfair Display', 'Times New Roman', serif",
      preferredOrientation: "vertical",
    },
    indexCardLayout: {
      headerStyle: "centered",
      contentPriority: "balanced",
      includeImages: true,
      fontSize: "regular",
    },
  },
  {
    id: "tasting-flight",
    name: "Tasting Flight",
    description:
      "Three course tasting flight with plating rhythm and beverage cues.",
    standardLayout: {
      id: "standard-flight",
      name: "Tasting Flight",
      description: "Horizontal card style layout for tasting progression.",
      headerStyle: "split",
      recipeLayout: "compact",
      includeImages: false,
      includeNutrition: false,
      fontFamily: "'Source Sans Pro', 'Helvetica', sans-serif",
      preferredOrientation: "horizontal",
    },
    indexCardLayout: {
      headerStyle: "minimal",
      contentPriority: "instructions",
      includeImages: false,
      fontSize: "small",
    },
  },
  {
    id: "banquet-rally",
    name: "Banquet Rally",
    description:
      "High throughput banquet rally sheets organized by station timeline.",
    standardLayout: {
      id: "standard-banquet",
      name: "Banquet Rally",
      description: "Station timeline with equipment and staffing cues.",
      headerStyle: "centered",
      recipeLayout: "narrative",
      includeImages: true,
      includeNutrition: false,
      fontFamily: "'IBM Plex Sans', 'Helvetica', sans-serif",
      preferredOrientation: "vertical",
    },
    indexCardLayout: {
      headerStyle: "centered",
      contentPriority: "ingredients",
      includeImages: false,
      fontSize: "regular",
    },
  },
  {
    id: "mixology-deck",
    name: "Mixology Deck",
    description:
      "Compact beverage cards with glassware, garnish, and selling points.",
    standardLayout: {
      id: "standard-mixology",
      name: "Mixology Deck",
      description: "Compact beverage sheets with pairing and garnish cues.",
      headerStyle: "split",
      recipeLayout: "compact",
      includeImages: true,
      includeNutrition: false,
      fontFamily: "'Montserrat', 'Helvetica', sans-serif",
      preferredOrientation: "horizontal",
    },
    indexCardLayout: {
      headerStyle: "minimal",
      contentPriority: "balanced",
      includeImages: true,
      fontSize: "small",
    },
  },
];

export function createEmptyServerNote(
  preset: LayoutPreset = layoutPresets[0]!,
  color: ColorScheme = colorSchemes[0]!,
): ServerNote {
  const now = new Date().toISOString();
  return {
    id: "",
    title: "",
    distributionDate: now.slice(0, 10),
    companyName: "",
    outletName: "",
    layout: preset,
    colorScheme: color,
    orientation: "vertical",
    pageFormat: "standard",
    cardsPerPage: 2,
    logos: [],
    selectedRecipes: [],
    createdAt: now,
    updatedAt: now,
  };
}
