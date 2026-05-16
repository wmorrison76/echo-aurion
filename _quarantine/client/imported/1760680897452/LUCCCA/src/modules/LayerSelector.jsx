import React from 'react';

export default function LayerSelector({ tiers, setTiers }) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-700 mb-2">🎂 Number of Layers</label>
      <input
        type="range"
        min="1"
        max="7"
        value={tiers}
        onChange={(e) => setTiers(parseInt(e.target.value))}
        className="w-full"
      />
      <p className="text-sm text-gray-600 mt-1">Selected: {tiers} layer{tiers > 1 ? 's' : ''}</p>
    </div>
  );
}
