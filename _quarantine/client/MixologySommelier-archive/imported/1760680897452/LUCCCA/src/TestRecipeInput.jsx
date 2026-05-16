// File: src/pages/TestRecipeInput.jsx
import React from "react";
import RecipeInputPage from "@/components/Recipe/RecipeInputPage";

export default function TestRecipeInput() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 p-10">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white">
        Test Recipe Input Page
      </h1>
      <div className="max-w-5xl mx-auto border rounded-lg shadow-lg bg-white dark:bg-zinc-800 p-6">
        <RecipeInputPage />
      </div>
    </div>
  );
}
