import React, { useState } from 'react';
import RecipeListView from './RecipeListView';
import { sampleRecipes } from '@/data/recipes/sampleRecipes';

const RecipeListWrapper = ({ category }) => {
  const [recipes, setRecipes] = useState(
    sampleRecipes.filter((r) => r.category === category)
  );

  const handleView = (recipe) => {
    alert(`🔍 Viewing: ${recipe.name}`);
    // TODO: Navigate to full recipe detail view
  };

  return (
    <div>
      <RecipeListView recipes={recipes} onView={handleView} />
    </div>
  );
};

export default RecipeListWrapper;
