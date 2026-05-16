import React, { useState } from 'react';

export function RecipeScalingForm({ baseRecipe }) {
  const [scaleFactor, setScaleFactor] = useState(1);

  const scaledIngredients = baseRecipe.ingredients.map(item => ({
    name: item.name,
    amount: (item.amount * scaleFactor).toFixed(2),
    unit: item.unit
  }));

  return (
    <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg shadow">
      <h2 className="text-lg font-bold mb-2">Scale Recipe</h2>
      <label className="block mb-2">
        Scale Factor:
        <input
          type="number"
          step="0.1"
          min="0.1"
          value={scaleFactor}
          onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
          className="w-full p-2 border rounded"
        />
      </label>
      <ul className="mt-4 space-y-1">
        {scaledIngredients.map((item, index) => (
          <li key={index}>
            {item.amount} {item.unit} {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
