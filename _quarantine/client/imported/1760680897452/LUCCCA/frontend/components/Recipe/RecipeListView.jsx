import React from 'react';
import { BookOpen, Eye } from 'lucide-react';

const RecipeListView = ({ recipes = [], onView }) => {
  if (!recipes.length) {
    return <p className="text-sm italic text-gray-400">No recipes yet.</p>;
  }

  return (
    <ul className="divide-y border rounded shadow-sm">
      {recipes.map((r, i) => (
        <li key={i} className="flex items-center justify-between p-2 hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="font-medium">{r.name}</span>
            <span className="text-xs text-gray-500 italic">({r.category})</span>
          </div>
          <button onClick={() => onView(r)} title="View Recipe">
            <Eye className="w-4 h-4 text-gray-600 hover:text-black" />
          </button>
        </li>
      ))}
    </ul>
  );
};

export default RecipeListView;
