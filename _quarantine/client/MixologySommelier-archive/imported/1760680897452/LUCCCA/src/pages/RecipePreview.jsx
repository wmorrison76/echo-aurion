// src/pages/RecipePreview.jsx
import React, { useEffect, useState } from "react";

const RecipePreview = () => {
  const [recipe, setRecipe] = useState(null);

  // useEffect(() => {
  //   const saved = localStorage.getItem("recipeDraft");
  //   if (saved) {
  //     setRecipe(JSON.parse(saved));
  //   }
  // }, []);

  // Static placeholder for visual layout
  const sampleRecipe = {
    recipeName: "Chocolate Croissant",
    ingredients: [
      { name: "Flour", quantity: "500", unit: "g", prep: "Sifted", yield: "90" },
      { name: "Butter", quantity: "250", unit: "g", prep: "", yield: "100" },
      { name: "Dark Chocolate", quantity: "200", unit: "g", prep: "Chopped", yield: "100" },
    ],
    prepNotes: "1. Mix dough\n2. Roll and layer with butter\n3. Bake at 375°F for 20 minutes",
  };

  const recipeToRender = sampleRecipe; // fallback while recipe is null

  return (
    <div className="max-w-3xl mx-auto p-8 text-gray-900 font-serif">
      <h1 className="text-4xl font-bold mb-4 border-b pb-2 uppercase">
        {recipeToRender.recipeName}
      </h1>

      <h2 className="text-xl font-semibold mt-6 mb-2">Ingredients</h2>
      <table className="w-full mb-6 border border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Qty</th>
            <th className="p-2 border">Unit</th>
            <th className="p-2 border">Prep</th>
            <th className="p-2 border">Yield %</th>
          </tr>
        </thead>
        <tbody>
          {recipeToRender.ingredients.map((item, index) =>
            item.name ? (
              <tr key={index}>
                <td className="p-2 border">{item.name}</td>
                <td className="p-2 border">{item.quantity}</td>
                <td className="p-2 border">{item.unit}</td>
                <td className="p-2 border">{item.prep}</td>
                <td className="p-2 border">{item.yield}</td>
              </tr>
            ) : null
          )}
        </tbody>
      </table>

      <h2 className="text-xl font-semibold mb-2">Preparation Notes</h2>
      <p className="whitespace-pre-line border p-4 rounded bg-gray-50">
        {recipeToRender.prepNotes}
      </p>
    </div>
  );
};

export default RecipePreview;
