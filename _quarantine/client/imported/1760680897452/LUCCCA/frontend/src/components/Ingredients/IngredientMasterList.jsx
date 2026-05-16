// ✅ BLOCK 2 – LUCCCA Invoice Intelligence Core Expansion
// This block enhances system logic with storeroom integration, Echo logic hooks, and sample vendor logic.

// File: components/Ingredients/IngredientMasterList.jsx
import React from 'react';

const IngredientMasterList = ({ ingredients }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-2">Master Ingredient List</h2>
      <ul className="list-disc list-inside space-y-1">
        {ingredients.map((item, index) => (
          <li key={index} className="text-sm">
            {item.name} ({item.vendorCode}) — {item.packageSize}
          </li>
        ))}
      </ul>
    </div>
  );
};
export default IngredientMasterList;