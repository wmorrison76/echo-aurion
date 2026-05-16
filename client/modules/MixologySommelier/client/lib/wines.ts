export interface Wine {
  id: string;
  name: string;
  region: string;
  vintage: number;
  type: "red" | "white" | "rosé" | "sparkling";
  grapeVarieties: string[];
  price: number;
  rating: number;
  description: string;
  pairing: string[];
  image: string;
}
export interface PairingNote {
  id: string;
  wineId: string;
  dishName: string;
  notes: string;
  rating: number;
  createdAt: Date;
}
export interface TastingNote {
  id: string;
  wineId: string;
  aromaNotes: string[];
  palateNotes: string[];
  finishNotes: string;
  personalRating: number;
  createdAt: Date;
}
export const wines: Wine[] = [
  {
    id: "1",
    name: "Château Margaux",
    region: "Bordeaux",
    vintage: 2015,
    type: "red",
    grapeVarieties: ["Cabernet Sauvignon", "Merlot"],
    price: 350,
    rating: 9.8,
    description:
      "Elegant and complex with layers of dark fruit, cedar, and mineral notes.",
    pairing: ["Grilled lamb", "Duck confit", "Aged cheese"],
    image: "🍷",
  },
  {
    id: "2",
    name: "Chablis William Fèvre",
    region: "Burgundy",
    vintage: 2022,
    type: "white",
    grapeVarieties: ["Chardonnay"],
    price: 28,
    rating: 8.5,
    description: "Crisp and mineral with stone fruit and herbaceous notes.",
    pairing: ["Oysters", "Seafood", "Light pasta"],
    image: "🥂",
  },
  {
    id: "3",
    name: "Barolo Luciano Sandrone",
    region: "Piedmont",
    vintage: 2018,
    type: "red",
    grapeVarieties: ["Nebbiolo"],
    price: 95,
    rating: 9.3,
    description: "Full-bodied with notes of red cherry, leather, and truffle.",
    pairing: ["Beef steak", "Truffle risotto", "Hard cheese"],
    image: "🍷",
  },
  {
    id: "4",
    name: "Sancerre Domaine Huet",
    region: "Loire Valley",
    vintage: 2021,
    type: "white",
    grapeVarieties: ["Sauvignon Blanc"],
    price: 32,
    rating: 8.8,
    description: "Vibrant and herbaceous with citrus and floral notes.",
    pairing: ["Goat cheese", "Salads", "Grilled chicken"],
    image: "🥂",
  },
  {
    id: "5",
    name: "Prosecco Valdobbiadene",
    region: "Veneto",
    vintage: 2023,
    type: "sparkling",
    grapeVarieties: ["Glera"],
    price: 18,
    rating: 8.2,
    description: "Light and refreshing with green apple and citrus notes.",
    pairing: ["Appetizers", "Seafood", "Celebrations"],
    image: "🍾",
  },
  {
    id: "6",
    name: "Tavel Rosé",
    region: "Rhône Valley",
    vintage: 2022,
    type: "rosé",
    grapeVarieties: ["Grenache", "Cinsault"],
    price: 22,
    rating: 8.4,
    description: "Dry and complex with red fruit and mineral notes.",
    pairing: ["Seafood paella", "Mediterranean salads", "Grilled vegetables"],
    image: "🍷",
  },
];
export const foodPairings: Record<string, string[]> = {
  red: ["Grilled steak", "Lamb", "Duck", "Mushroom risotto", "Hard cheese"],
  white: ["Seafood", "Light pasta", "Chicken", "Goat cheese", "Sushi"],
  rosé: ["Seafood", "Salads", "Grilled chicken", "Mediterranean cuisine"],
  sparkling: ["Oysters", "Caviar", "Appetizers", "Celebrations", "Desserts"],
};
export const aromaOptions = [
  "Cherry",
  "Blackberry",
  "Plum",
  "Apple",
  "Pear",
  "Citrus",
  "Floral",
  "Spice",
  "Oak",
  "Mineral",
  "Herbal",
  "Leather",
];
