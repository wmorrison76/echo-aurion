import React from 'react';

export default function StructuralGuide({ tiers }) {
  const dowelsPerTier = (tier) => {
    if (tier === 1) return 0;
    if (tier === 2) return 3;
    if (tier === 3) return 6;
    return tier * 3;
  };

  const boardSize = `${tiers * 4}" board`;
  const boxSize = `${tiers * 5}" x ${tiers * 5}" x ${tiers * 4}"`;

  return (
    <div className="bg-white p-6 rounded shadow text-gray-800">
      <h2 className="text-2xl font-bold mb-4">🔧 Structural Guide</h2>
      <ul className="space-y-2 text-sm">
        <li><strong>Recommended Dowels:</strong> {dowelsPerTier(tiers)} total</li>
        <li><strong>Board Size:</strong> {boardSize}</li>
        <li><strong>Box Size:</strong> {boxSize}</li>
      </ul>
      <p className="text-xs mt-3 text-gray-500">Adjust these based on final weight and decoration style.</p>
    </div>
  );
}
