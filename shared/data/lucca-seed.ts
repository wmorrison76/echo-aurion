export const luccaSeedItems: Array<{
  name: string;
  vendor: string;
  unit: string;
  pack?: string | null;
  lastUnitPrice?: number | null;
  glCode?: string | null;
  glName?: string | null;
  lastReceiptDate?: string | null;
}> = [
  { name: "Chicken Breast, Boneless/Skinless", vendor: "US Foods", unit: "lb", pack: "40lb case", lastUnitPrice: 3.95, glCode: "5000-FOOD", glName: "Food" },
  { name: "Salmon Fillet", vendor: "Sysco", unit: "lb", pack: "10lb case", lastUnitPrice: 9.85, glCode: "5000-FOOD", glName: "Food" },
  { name: "Romaine Lettuce", vendor: "FreshPoint", unit: "ct", pack: "24ct case", lastUnitPrice: 1.25, glCode: "5000-FOOD", glName: "Food" },
  { name: "Tomatoes, Vine Ripe", vendor: "FreshPoint", unit: "lb", pack: "25lb case", lastUnitPrice: 1.75, glCode: "5000-FOOD", glName: "Food" },
  { name: "Butter, Unsalted", vendor: "Sysco", unit: "lb", pack: "36lb case", lastUnitPrice: 4.25, glCode: "5000-FOOD", glName: "Food" },
  { name: "Heavy Cream", vendor: "Sysco", unit: "gallon", pack: "4gal case", lastUnitPrice: 18.5, glCode: "5000-FOOD", glName: "Food" },
  { name: "Flour, AP", vendor: "US Foods", unit: "lb", pack: "50lb bag", lastUnitPrice: 0.55, glCode: "5000-FOOD", glName: "Food" },
  { name: "Sugar, Granulated", vendor: "US Foods", unit: "lb", pack: "50lb bag", lastUnitPrice: 0.68, glCode: "5000-FOOD", glName: "Food" },
  { name: "Olive Oil, Extra Virgin", vendor: "Sysco", unit: "gallon", pack: "2gal case", lastUnitPrice: 34.0, glCode: "5000-FOOD", glName: "Food" },
  { name: "Salt, Kosher", vendor: "US Foods", unit: "lb", pack: "25lb case", lastUnitPrice: 0.45, glCode: "5000-FOOD", glName: "Food" },
  { name: "Black Pepper, Ground", vendor: "US Foods", unit: "lb", pack: "5lb case", lastUnitPrice: 7.95, glCode: "5000-FOOD", glName: "Food" },
  { name: "Lemons", vendor: "FreshPoint", unit: "ct", pack: "140ct case", lastUnitPrice: 0.35, glCode: "5000-FOOD", glName: "Food" },
  { name: "Limes", vendor: "FreshPoint", unit: "ct", pack: "200ct case", lastUnitPrice: 0.28, glCode: "5000-FOOD", glName: "Food" },
  { name: "Eggs, Large", vendor: "Sysco", unit: "doz", pack: "15doz case", lastUnitPrice: 2.25, glCode: "5000-FOOD", glName: "Food" },
  { name: "Paper Towels", vendor: "Cintas", unit: "ct", pack: "12ct case", lastUnitPrice: 2.1, glCode: "5100-SUPPLIES", glName: "Supplies" },
  { name: "To-Go Containers, 9in", vendor: "Sysco", unit: "ct", pack: "250ct case", lastUnitPrice: 0.18, glCode: "5100-SUPPLIES", glName: "Supplies" },
  { name: "Dish Soap", vendor: "Cintas", unit: "gallon", pack: "4gal case", lastUnitPrice: 6.5, glCode: "5100-SUPPLIES", glName: "Supplies" },
  { name: "Bleach", vendor: "Cintas", unit: "gallon", pack: "6gal case", lastUnitPrice: 3.1, glCode: "5100-SUPPLIES", glName: "Supplies" },
  { name: "Sparkling Water", vendor: "Sysco", unit: "ct", pack: "24ct case", lastUnitPrice: 0.55, glCode: "5005-BEVERAGE", glName: "Beverage" },
  { name: "Coffee Beans", vendor: "US Foods", unit: "lb", pack: "5lb bag", lastUnitPrice: 6.75, glCode: "5005-BEVERAGE", glName: "Beverage" },
];

