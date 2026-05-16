import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, UtensilsCrossed, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Dessert {
  id: string;
  name: string;
  category: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  ingredients: Array<{ name: string; amount: string; unit: string }>;
  allergens: string[];
  notes: string;
  lastMade: string;
}

const defaultDesserts: Dessert[] = [
  {
    id: "1",
    name: "Chocolate Lava Cake",
    category: "Individual Desserts",
    prepTime: 10,
    cookTime: 12,
    servings: 1,
    difficulty: "hard",
    ingredients: [
      { name: "Dark Chocolate", amount: "5", unit: "oz" },
      { name: "Butter", amount: "3", unit: "tbsp" },
      { name: "Egg", amount: "1", unit: "whole" },
      { name: "Sugar", amount: "2", unit: "tbsp" },
      { name: "Flour", amount: "2", unit: "tbsp" },
    ],
    allergens: ["Eggs", "Dairy", "Gluten"],
    notes: "Individual plating required. Best served immediately.",
    lastMade: "2025-01-12",
  },
  {
    id: "2",
    name: "Crème Brûlée",
    category: "Chilled Desserts",
    prepTime: 20,
    cookTime: 40,
    servings: 4,
    difficulty: "medium",
    ingredients: [
      { name: "Heavy Cream", amount: "2", unit: "cups" },
      { name: "Egg Yolk", amount: "4", unit: "whole" },
      { name: "Vanilla Bean", amount: "1", unit: "whole" },
      { name: "Sugar", amount: "4", unit: "tbsp" },
    ],
    allergens: ["Eggs", "Dairy"],
    notes: "Requires torch for brûléing. Chill for at least 4 hours.",
    lastMade: "2025-01-10",
  },
  {
    id: "3",
    name: "Tiramisu",
    category: "Chilled Desserts",
    prepTime: 30,
    cookTime: 0,
    servings: 8,
    difficulty: "medium",
    ingredients: [
      { name: "Mascarpone Cheese", amount: "1", unit: "lb" },
      { name: "Eggs (separated)", amount: "4", unit: "whole" },
      { name: "Sugar", amount: "1/2", unit: "cup" },
      { name: "Espresso", amount: "1", unit: "cup" },
      { name: "Ladyfingers", amount: "40", unit: "pieces" },
      { name: "Cocoa Powder", amount: "2", unit: "tbsp" },
    ],
    allergens: ["Eggs", "Dairy", "Gluten"],
    notes: "Raw eggs used. Prepare day ahead for best flavor.",
    lastMade: "2025-01-08",
  },
  {
    id: "4",
    name: "Fruit Tart",
    category: "Pastry",
    prepTime: 25,
    cookTime: 30,
    servings: 8,
    difficulty: "hard",
    ingredients: [
      { name: "Puff Pastry Sheet", amount: "1", unit: "sheet" },
      { name: "Pastry Cream", amount: "2", unit: "cups" },
      { name: "Fresh Berries", amount: "2", unit: "cups" },
      { name: "Apricot Glaze", amount: "1/2", unit: "cup" },
    ],
    allergens: ["Gluten", "Dairy", "Eggs"],
    notes: "Arrange fruit in attractive pattern. Glaze before service.",
    lastMade: "2025-01-11",
  },
  {
    id: "5",
    name: "Macarons (Assorted)",
    category: "Petit Fours",
    prepTime: 45,
    cookTime: 18,
    servings: 24,
    difficulty: "hard",
    ingredients: [
      { name: "Almond Flour", amount: "1", unit: "cup" },
      { name: "Powdered Sugar", amount: "1", unit: "cup" },
      { name: "Egg Whites", amount: "3", unit: "whole" },
      { name: "Sugar", amount: "1/4", unit: "cup" },
      { name: "Food Coloring", amount: "as needed", unit: "" },
    ],
    allergens: ["Nuts", "Eggs"],
    notes: "Humidity sensitive. Must age 24 hours after baking.",
    lastMade: "2025-01-09",
  },
];

export default function PastryContent() {
  const [desserts, setDesserts] = useState<Dessert[]>(defaultDesserts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDessert, setSelectedDessert] = useState<Dessert | null>(null);

  const filteredDesserts = desserts.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.category.toLowerCase().includes(searchTerm.toLowerCase()),
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
      {/* Desserts List */}
      <div className="col-span-1 flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search desserts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-sm"
          />
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto space-y-2 flex-1">
          {filteredDesserts.map((dessert) => (
            <Card
              key={dessert.id}
              className={`cursor-pointer transition-colors ${
                selectedDessert?.id === dessert.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              onClick={() => setSelectedDessert(dessert)}
            >
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <p className="font-semibold text-sm">{dessert.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {dessert.category}
                  </p>
                  <div className="flex gap-2">
                    <Badge
                      className={getDifficultyColor(dessert.difficulty)}
                      variant="secondary"
                    >
                      {dessert.difficulty}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {dessert.prepTime + dessert.cookTime} min
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Dessert Details */}
      <div className="col-span-2 overflow-y-auto">
        {selectedDessert ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedDessert.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedDessert.category}
                    </p>
                  </div>
                  <Badge
                    className={getDifficultyColor(selectedDessert.difficulty)}
                    variant="secondary"
                  >
                    {selectedDessert.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Clock className="h-3 w-3" /> Prep Time
                    </p>
                    <p className="font-semibold">
                      {selectedDessert.prepTime} min
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Clock className="h-3 w-3" /> Cook Time
                    </p>
                    <p className="font-semibold">
                      {selectedDessert.cookTime} min
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Users className="h-3 w-3" /> Servings
                    </p>
                    <p className="font-semibold">{selectedDessert.servings}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Made</p>
                    <p className="font-semibold text-sm">
                      {selectedDessert.lastMade}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="font-semibold text-sm mb-2">Ingredients</p>
                  <div className="space-y-1 text-sm">
                    {selectedDessert.ingredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded"
                      >
                        <span>{ing.name}</span>
                        <span className="font-semibold">
                          {ing.amount} {ing.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedDessert.allergens.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="font-semibold text-sm mb-2">Allergens</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDessert.allergens.map((allergen, idx) => (
                        <Badge key={idx} variant="destructive">
                          {allergen}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDessert.notes && (
                  <div className="border-t pt-4 bg-amber-50 dark:bg-amber-950/20 p-3 rounded border-l-4 border-amber-500">
                    <p className="text-sm">
                      <strong>Notes:</strong> {selectedDessert.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="flex items-center justify-center h-full">
            <CardContent>
              <p className="text-muted-foreground">
                Select a dessert to view details
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
