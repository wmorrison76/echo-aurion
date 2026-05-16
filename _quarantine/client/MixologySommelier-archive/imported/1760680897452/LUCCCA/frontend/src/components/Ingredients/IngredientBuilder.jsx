// 3. components/Ingredients/IngredientBuilder.jsx
import React from 'react';

const IngredientBuilder = ({ ingredient }) => {
  return (
    <div className="ingredient-builder">
      <h4>{ingredient.name}</h4>
      <p>Vendor Code: {ingredient.vendorCode}</p>
      <p>Pack Size: {ingredient.packSize}</p>
      <p>Unit: {ingredient.unit}</p>
      <p>Date Received: {ingredient.dateReceived}</p>
      <p>Notes: {ingredient.notes}</p>
    </div>
  );
};

export default IngredientBuilder;