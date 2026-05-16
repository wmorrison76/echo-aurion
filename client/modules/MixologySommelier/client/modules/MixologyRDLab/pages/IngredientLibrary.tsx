/** * Ingredient Library Page * Browse and manage ingredients for recipes */ import React, {
  useState,
} from "react";
import { Search, Plus, Package } from "lucide-react";
export function IngredientLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [ingredients] = useState([
    { id: "1", name: "Vodka", category: "Spirits", unit: "oz", cost: 0.5 },
    { id: "2", name: "Gin", category: "Spirits", unit: "oz", cost: 0.6 },
    { id: "3", name: "Rum", category: "Spirits", unit: "oz", cost: 0.55 },
    { id: "4", name: "Tequila", category: "Spirits", unit: "oz", cost: 0.65 },
    { id: "5", name: "Whiskey", category: "Spirits", unit: "oz", cost: 0.7 },
    {
      id: "6",
      name: "Simple Syrup",
      category: "Mixers",
      unit: "oz",
      cost: 0.1,
    },
    { id: "7", name: "Lime Juice", category: "Juices", unit: "oz", cost: 0.15 },
    {
      id: "8",
      name: "Lemon Juice",
      category: "Juices",
      unit: "oz",
      cost: 0.15,
    },
    {
      id: "9",
      name: "Orange Juice",
      category: "Juices",
      unit: "oz",
      cost: 0.12,
    },
    {
      id: "10",
      name: "Angostura Bitters",
      category: "Bitters",
      unit: "dash",
      cost: 0.05,
    },
  ]);
  const filtered = ingredients.filter(
    (ing) =>
      ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ing.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  return (
    <div className="h-full flex flex-col p-6">
      {" "}
      <div className="flex items-center justify-between mb-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-2xl font-bold text-foreground">
            Ingredient Library
          </h1>{" "}
          <p className="text-sm text-muted-foreground mt-1">
            {" "}
            Browse and manage cocktail ingredients{" "}
          </p>{" "}
        </div>{" "}
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          {" "}
          <Plus size={18} /> Add Ingredient{" "}
        </button>{" "}
      </div>{" "}
      <div className="relative mb-6">
        {" "}
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={18}
        />{" "}
        <input
          type="text"
          placeholder="Search ingredients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />{" "}
      </div>{" "}
      <div className="flex-1 overflow-y-auto">
        {" "}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {" "}
          {filtered.map((ing) => (
            <div
              key={ing.id}
              className="bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors"
            >
              {" "}
              <div className="flex items-start justify-between mb-2">
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <Package size={18} className="text-primary" />{" "}
                  <h3 className="font-semibold text-foreground">
                    {ing.name}
                  </h3>{" "}
                </div>{" "}
              </div>{" "}
              <div className="space-y-1 text-sm">
                {" "}
                <div className="flex justify-between">
                  {" "}
                  <span className="text-muted-foreground">Category:</span>{" "}
                  <span className="text-foreground">{ing.category}</span>{" "}
                </div>{" "}
                <div className="flex justify-between">
                  {" "}
                  <span className="text-muted-foreground">Unit:</span>{" "}
                  <span className="text-foreground">{ing.unit}</span>{" "}
                </div>{" "}
                <div className="flex justify-between">
                  {" "}
                  <span className="text-muted-foreground">Cost:</span>{" "}
                  <span className="font-semibold text-foreground">
                    ${ing.cost.toFixed(2)}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>{" "}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            {" "}
            <p className="text-muted-foreground">No ingredients found</p>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
