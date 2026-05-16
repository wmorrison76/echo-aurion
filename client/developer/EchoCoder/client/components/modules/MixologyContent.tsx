import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Wine, Droplet, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Cocktail {
  id: string;
  name: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  ingredients: Array<{ name: string; amount: string; type: string }>;
  instructions: string[];
  garnish: string;
  price: number;
  glassType: string;
  servings: number;
  lastServed: string;
}

const defaultCocktails: Cocktail[] = [
  {
    id: "1",
    name: "Classic Martini",
    category: "Spirit Forward",
    difficulty: "easy",
    ingredients: [
      { name: "Gin", amount: "2.5 oz", type: "spirit" },
      { name: "Dry Vermouth", amount: "0.5 oz", type: "fortified" },
      { name: "Olives", amount: "3", type: "garnish" },
    ],
    instructions: [
      "Chill martini glass",
      "Stir gin and vermouth with ice",
      "Strain into glass",
      "Garnish with olives",
    ],
    garnish: "Olive spear",
    price: 14.0,
    glassType: "Martini Glass",
    servings: 1,
    lastServed: "2025-01-13",
  },
  {
    id: "2",
    name: "Mojito",
    category: "Refreshing",
    difficulty: "medium",
    ingredients: [
      { name: "White Rum", amount: "2 oz", type: "spirit" },
      { name: "Fresh Mint", amount: "10 leaves", type: "herb" },
      { name: "Lime Juice", amount: "0.75 oz", type: "citrus" },
      { name: "Simple Syrup", amount: "0.5 oz", type: "syrup" },
      { name: "Soda Water", amount: "2 oz", type: "mixer" },
    ],
    instructions: [
      "Muddle mint gently",
      "Add rum, lime juice, and syrup",
      "Fill with ice",
      "Top with soda",
      "Stir and garnish",
    ],
    garnish: "Mint sprig & lime wheel",
    price: 12.0,
    glassType: "Highball",
    servings: 1,
    lastServed: "2025-01-12",
  },
  {
    id: "3",
    name: "Old Fashioned",
    category: "Spirit Forward",
    difficulty: "medium",
    ingredients: [
      { name: "Bourbon Whiskey", amount: "2 oz", type: "spirit" },
      { name: "Simple Syrup", amount: "0.25 oz", type: "syrup" },
      { name: "Angostura Bitters", amount: "2 dashes", type: "bitters" },
      { name: "Orange Peel", amount: "1", type: "garnish" },
    ],
    instructions: [
      "Add syrup and bitters to glass",
      "Add whiskey and large ice cube",
      "Stir well",
      "Twist orange peel over drink",
    ],
    garnish: "Orange peel & cherry",
    price: 13.5,
    glassType: "Rocks Glass",
    servings: 1,
    lastServed: "2025-01-10",
  },
  {
    id: "4",
    name: "Margarita",
    category: "Citrus",
    difficulty: "medium",
    ingredients: [
      { name: "Tequila", amount: "2 oz", type: "spirit" },
      { name: "Cointreau", amount: "1 oz", type: "liqueur" },
      { name: "Lime Juice", amount: "0.75 oz", type: "citrus" },
      { name: "Salt", amount: "rim", type: "garnish" },
    ],
    instructions: [
      "Rim glass with salt",
      "Shake tequila, Cointreau, and lime with ice",
      "Strain into glass",
      "Serve over ice",
    ],
    garnish: "Lime wheel",
    price: 11.5,
    glassType: "Margarita Glass",
    servings: 1,
    lastServed: "2025-01-13",
  },
  {
    id: "5",
    name: "Pina Colada",
    category: "Tropical",
    difficulty: "medium",
    ingredients: [
      { name: "White Rum", amount: "2 oz", type: "spirit" },
      { name: "Coconut Cream", amount: "1.5 oz", type: "cream" },
      { name: "Pineapple Juice", amount: "3 oz", type: "juice" },
    ],
    instructions: [
      "Add all ingredients to blender",
      "Blend with ice",
      "Strain into chilled glass",
      "Serve cold",
    ],
    garnish: "Pineapple & cherry",
    price: 12.5,
    glassType: "Tiki Glass",
    servings: 1,
    lastServed: "2025-01-11",
  },
];

export default function MixologyContent() {
  const [cocktails, setCocktails] = useState<Cocktail[]>(defaultCocktails);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCocktail, setSelectedCocktail] = useState<Cocktail | null>(
    null,
  );
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = ["all", ...new Set(cocktails.map((c) => c.category))];

  const filteredCocktails = cocktails.filter(
    (c) =>
      (filterCategory === "all" || c.category === filterCategory) &&
      c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: "bg-green-500/20 text-green-700 dark:text-green-400",
      medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
      hard: "bg-red-500/20 text-red-700 dark:text-red-400",
    };
    return colors[difficulty as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* Cocktails List */}
      <div className="col-span-1 flex flex-col gap-4">
        <div className="space-y-2">
          <Input
            placeholder="Search cocktails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-sm"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full text-sm border rounded px-2 py-1"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-y-auto space-y-2 flex-1">
          {filteredCocktails.map((cocktail) => (
            <Card
              key={cocktail.id}
              className={`cursor-pointer transition-colors ${
                selectedCocktail?.id === cocktail.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              onClick={() => setSelectedCocktail(cocktail)}
            >
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-sm">{cocktail.name}</p>
                    <span className="text-sm font-bold text-emerald-600">
                      ${cocktail.price}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cocktail.category}
                  </p>
                  <Badge
                    className={getDifficultyColor(cocktail.difficulty)}
                    variant="secondary"
                  >
                    {cocktail.difficulty}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cocktail Details */}
      <div className="col-span-2 overflow-y-auto">
        {selectedCocktail ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Wine className="h-5 w-5" />
                      {selectedCocktail.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedCocktail.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={getDifficultyColor(
                        selectedCocktail.difficulty,
                      )}
                      variant="secondary"
                    >
                      {selectedCocktail.difficulty}
                    </Badge>
                    <p className="text-xl font-bold text-emerald-600 mt-2">
                      ${selectedCocktail.price}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key Info */}
                <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
                  <div>
                    <p className="text-xs text-muted-foreground">Glass Type</p>
                    <p className="font-semibold text-sm">
                      {selectedCocktail.glassType}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Servings</p>
                    <p className="font-semibold text-sm">
                      {selectedCocktail.servings}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Served</p>
                    <p className="font-semibold text-sm">
                      {selectedCocktail.lastServed}
                    </p>
                  </div>
                </div>

                {/* Ingredients */}
                <div className="border-t pt-4">
                  <p className="font-semibold text-sm mb-3">Ingredients</p>
                  <div className="space-y-2">
                    {selectedCocktail.ingredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded border border-l-4 border-blue-500"
                      >
                        <div>
                          <p className="font-semibold text-sm">{ing.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ing.type}
                          </p>
                        </div>
                        <span className="font-semibold">{ing.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Garnish */}
                <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded border border-l-4 border-amber-500">
                  <p className="text-sm">
                    <strong>Garnish:</strong> {selectedCocktail.garnish}
                  </p>
                </div>

                {/* Instructions */}
                <div className="border-t pt-4">
                  <p className="font-semibold text-sm mb-3">
                    Preparation Steps
                  </p>
                  <ol className="space-y-2 text-sm">
                    {selectedCocktail.instructions.map((step, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">
                          {idx + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="flex items-center justify-center h-full">
            <CardContent>
              <p className="text-muted-foreground">
                Select a cocktail to view recipe
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
