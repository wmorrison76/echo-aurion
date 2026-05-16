// File: components/Recipe/RecipeIconBar.jsx
import React from 'react';
import { Plus, Upload, Filter, Settings } from 'lucide-react';

const RecipeIconBar = ({ category }) => {
  return (
    <div className="flex items-center gap-4 border-b pb-2">
      <button title="Add Recipe">
        <Plus className="w-5 h-5" />
      </button>
      <button title="Import Recipe Files">
        <Upload className="w-5 h-5" />
      </button>
      <button title="Filter">
        <Filter className="w-5 h-5" />
      </button>
      <button title="Settings">
        <Settings className="w-5 h-5" />
      </button>
      <span className="ml-auto text-xs text-gray-500 italic">{category}</span>
    </div>
  );
};

export default RecipeIconBar;