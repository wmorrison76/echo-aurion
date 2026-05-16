export interface LuccaBeverageCategory {
  category: string;
  subcategories: string[];
  glCode: string;
  keywords: string[];
}
const dataset: LuccaBeverageCategory[] = [
  {
    category: "Non-Alcoholic",
    subcategories: [
      "Coffee",
      "Tea",
      "Matcha",
      "Chai",
      "Soft drinks",
      "Sparkling water",
      "Kombucha",
    ],
    glCode: "5114-Juices",
    keywords: [
      "coffee",
      "espresso",
      "latte",
      "tea",
      "matcha",
      "chai",
      "soft drink",
      "soda",
      "sparkling water",
      "kombucha",
    ],
  },
];
export const luccaBeverageCategories: LuccaBeverageCategory[] = dataset;
