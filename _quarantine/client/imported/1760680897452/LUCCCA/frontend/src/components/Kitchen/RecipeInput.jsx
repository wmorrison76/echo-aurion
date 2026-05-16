// Root: src/components/RecipeInput.jsx
import React, { useState } from "react";
import TextEditorToolbar from "./shared/TextEditorToolbar"; // Include rich text editor

export default function RecipeInput() {
  const [directions, setDirections] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [modifiers, setModifiers] = useState([]);
  const [totalCost, setTotalCost] = useState(0);

  const handleDirectionChange = (value) => {
    setDirections(value);
  };

  const handleCostChange = () => {
    const cost = ingredients.reduce((acc, ing) => acc + (parseFloat(ing.cost || 0) * parseFloat(ing.quantity || 1)), 0);
    setTotalCost(cost.toFixed(2));
  };

  return (
    <div className="flex flex-col h-full w-full p-4 bg-white text-slate-800">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white z-10 border-b pb-2 mb-4">
        <h1 className="text-2xl font-semibold">Recipe Input</h1>
        <div className="flex justify-between items-center mt-2">
          <div className="text-sm font-medium text-gray-600">Modifiers: {modifiers.join(", ")}</div>
          <div className="text-sm font-medium text-gray-800">Total Cost: ${totalCost}</div>
        </div>
      </div>

      {/* Ingredients Section */}
      <div className="space-y-2">
        {ingredients.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              placeholder="Ingredient"
              className="border px-2 py-1 rounded w-1/2"
              value={item.name || ""}
              onChange={(e) => {
                const copy = [...ingredients];
                copy[index].name = e.target.value;
                setIngredients(copy);
              }}
            />
            <input
              type="number"
              placeholder="Qty"
              className="border px-2 py-1 rounded w-1/4"
              value={item.quantity || ""}
              onChange={(e) => {
                const copy = [...ingredients];
                copy[index].quantity = e.target.value;
                setIngredients(copy);
                handleCostChange();
              }}
            />
            <input
              type="number"
              placeholder="Cost"
              className="border px-2 py-1 rounded w-1/4"
              value={item.cost || ""}
              onChange={(e) => {
                const copy = [...ingredients];
                copy[index].cost = e.target.value;
                setIngredients(copy);
                handleCostChange();
              }}
            />
          </div>
        ))}
        <button
          className="mt-2 px-4 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          onClick={() => setIngredients([...ingredients, { name: "", quantity: "", cost: "" }])}
        >
          + Add Ingredient
        </button>
      </div>

      {/* Directions with Rich Text Editor */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Directions</h2>
        <TextEditorToolbar value={directions} onChange={handleDirectionChange} />
      </div>
    </div>
  );
}
