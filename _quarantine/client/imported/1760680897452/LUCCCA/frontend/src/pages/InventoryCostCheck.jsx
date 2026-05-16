import React, { useState } from 'react';

export default function InventoryCostCheck() {
  const [item, setItem] = useState('');
  const [cost, setCost] = useState(null);

  const handleCheck = () => {
    // Placeholder simulation: Replace with actual inventory fetch
    const mockInventory = {
      "Vanilla": 0.25,
      "Butter": 1.20,
      "Eggs": 0.20,
    };

    setCost(mockInventory[item] || 'Not Found');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Ingredient Cost Lookup</h1>
      <input
        type="text"
        value={item}
        onChange={(e) => setItem(e.target.value)}
        className="p-2 border rounded mr-2"
        placeholder="Enter Ingredient"
      />
      <button onClick={handleCheck} className="p-2 bg-green-600 text-white rounded">
        Check Cost
      </button>
      {cost !== null && <p className="mt-4">Cost: {typeof cost === 'string' ? cost : `$${cost.toFixed(2)} per unit`}</p>}
    </div>
  );
}
