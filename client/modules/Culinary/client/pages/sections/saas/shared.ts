export const ALLERGENS = [
  "Milk",
  "Eggs",
  "Fish",
  "Shellfish",
  "Tree Nuts",
  "Peanuts",
  "Wheat",
  "Soy",
  "Sesame",
  "Gluten",
  "Sulfites",
  "Mustard",
];

export const DIET_PROFILES: Record<
  string,
  { allow: string[]; avoid: string[] }
> = {
  vegan: {
    allow: ["Vegetables", "Legumes", "Whole Grains", "Seeds", "Fruits"],
    avoid: ["Meat", "Fish", "Eggs", "Dairy", "Honey", "Gelatin"],
  },
  vegetarian: {
    allow: ["Vegetables", "Legumes", "Dairy", "Eggs", "Whole Grains"],
    avoid: ["Meat", "Fish", "Shellfish"],
  },
  keto: {
    allow: ["Meat", "Fish", "Eggs", "Cheese", "Low-carb Vegetables"],
    avoid: ["Sugar", "Grains", "High-carb Fruit", "Starches"],
  },
  halal: {
    allow: ["Halal Certified Meat", "Seafood", "Vegetables", "Legumes"],
    avoid: ["Pork", "Alcohol", "Non-Halal Meat", "Blood"],
  },
  kosher: {
    allow: [
      "Kosher Meat",
      "Fish with Fins and Scales",
      "Vegetables",
      "Dairy (with rules)",
      "Grains",
    ],
    avoid: ["Pork", "Shellfish", "Meat with Dairy", "Non-Kosher Slaughter"],
  },
};

export function generateId(prefix = "id") {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function percent(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total === 0)
    return "0%";
  return `${Math.round((value / total) * 100)}%`;
}
