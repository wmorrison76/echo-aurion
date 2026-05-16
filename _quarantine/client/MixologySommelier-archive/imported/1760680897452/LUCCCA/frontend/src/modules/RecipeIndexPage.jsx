// Root: src/modules/RecipeIndexPage.jsx
import React from "react";
import { Link } from "react-router-dom";

// Mock data
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
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">📚 Recipe Library</h1>
      <p className="text-gray-500 dark:text-gray-300">
        Select a recipe to view or edit. R&D mode and categories are shown.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            className="bg-white dark:bg-black/40 rounded-xl shadow hover:shadow-xl transition p-4 space-y-2"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{recipe.title}</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                {recipe.category}
              </span>
              <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 rounded-full">
                {recipe.mode === "rnd" ? "🧪 R&D Mode" : "📄 Standard"}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Last edited: {recipe.lastEdited}</p>
            <Link
              to={`/recipe/${recipe.id}?mode=${recipe.mode}`}
              className="text-blue-500 dark:text-cyan-300 hover:underline"
            >
              Open Recipe →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
