import React from "react";

const RecipeCard = ({ recipe }) => {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow hover:shadow-glacier-500/20 transition">
      <h3 className="text-lg font-semibold text-white">{recipe.name}</h3>
      <p className="text-sm text-gray-400">Category: {recipe.category}</p>
      <div className="flex gap-2 mt-2 flex-wrap">
        {recipe.tags.map((tag, idx) => (
          <span
            key={idx}
            className="bg-emerald-700 text-white text-xs px-2 py-1 rounded"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default RecipeCard;
