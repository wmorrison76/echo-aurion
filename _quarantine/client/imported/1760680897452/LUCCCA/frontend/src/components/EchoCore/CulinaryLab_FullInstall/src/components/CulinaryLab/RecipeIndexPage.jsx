// Root: src/components/CulinaryLab/RecipeIndexPage.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock data for now — this will connect to DB or localStorage
const recipes = [
  {
    id: "1",
    title: "Reverse-Sphere Liquid Olive",
    category: "Pastry",
    mode: "rnd",
    lastEdited: "2025-07-30",
  },
  {
    id: "2",
    title: "Lavender Honey Glaze",
    category: "Outlet",
    mode: "standard",
    lastEdited: "2025-07-28",
  },
];

export default function RecipeIndexPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">📚 Recipe Library</h1>
      <p className="text-muted-foreground">
        Select a recipe to view or edit. R&D mode and categories are shown.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <Card key={recipe.id} className="hover:shadow-xl transition">
            <CardContent className="p-4 space-y-2">
              <h2 className="text-xl font-semibold">{recipe.title}</h2>
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{recipe.category}</Badge>
                <Badge>{recipe.mode === "rnd" ? "🧪 R&D Mode" : "📄 Standard"}</Badge>
              </div>
              <p className="text-sm">Last edited: {recipe.lastEdited}</p>
              <Link
                className="text-blue-500 hover:underline"
                to={`/recipe/${recipe.id}?mode=${recipe.mode}`}
              >
                Open Recipe →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
