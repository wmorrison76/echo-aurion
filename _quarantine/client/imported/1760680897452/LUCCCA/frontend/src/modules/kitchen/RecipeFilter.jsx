import React from "react";

const RecipeFilters = () => {
  return (
    <div className="mb-4 flex gap-4 flex-wrap">
      <input
        type="text"
        placeholder="Search Recipes..."
        className="px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 w-full sm:w-auto"
      />
      <select className="px-3 py-2 bg-gray-800 text-white rounded border border-gray-600">
        <option value="">All Categories</option>
        <option value="appetizer">Appetizer</option>
        <option value="main">Main Course</option>
        <option value="dessert">Dessert</option>
      </select>
      <select className="px-3 py-2 bg-gray-800 text-white rounded border border-gray-600">
        <option value="">All Tags</option>
        <option value="vegan">Vegan</option>
        <option value="gluten-free">Gluten-Free</option>
        <option value="spicy">Spicy</option>
      </select>
    </div>
  );
};

export default RecipeFilters;
