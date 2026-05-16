import React from 'react';

export default function NotesAndPricing() {
  return (
    <div className="mt-6 border rounded p-4 bg-white shadow">
      <h2 className="text-xl font-semibold text-pink-700 mb-2">Notes & Pricing</h2>
      <textarea
        rows={4}
        placeholder="Add notes (e.g. structure, flavor request, allergies)..."
        className="w-full p-2 border border-gray-300 rounded mb-4"
      />
      <div className="text-right text-lg font-bold text-pink-700">
        Est. Price: $145.00
      </div>
    </div>
  );
}
