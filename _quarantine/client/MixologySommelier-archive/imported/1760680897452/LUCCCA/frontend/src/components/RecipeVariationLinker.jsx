import React from 'react';

export function RecipeVariationLinker({ baseRecipe, variations }) {
  return (
    <div className="recipe-variation-linker p-4 bg-white dark:bg-zinc-800 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-2">Base Recipe: {baseRecipe}</h3>
      <ul className="list-disc ml-4">
        {variations.map((v, i) => (
          <li key={i}>{v}</li>
        ))}
      </ul>
    </div>
  );
}
