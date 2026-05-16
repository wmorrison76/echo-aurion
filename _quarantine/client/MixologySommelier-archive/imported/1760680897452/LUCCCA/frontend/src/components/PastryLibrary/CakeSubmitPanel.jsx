// src/components/PastryLibrary/CakeSubmitPanel.jsx
import React from 'react';

export default function CakeSubmitPanel({ layers, guestCount, eventType, theme, notes }) {
  const basePrice = 30;
  const layerCost = 10;
  const estimatedCost = basePrice + layers.length * layerCost;

  return (
    <div className="mt-10 w-full max-w-2xl border-t pt-6 text-zinc-700">
      <h3 className="text-lg font-semibold mb-2">🎉 Cake Summary</h3>
      <ul className="text-sm space-y-1">
        <li><strong>Event:</strong> {eventType || '—'}</li>
        <li><strong>Guests:</strong> {guestCount || '—'}</li>
        <li><strong>Theme:</strong> {theme || '—'}</li>
        <li><strong>Layers:</strong> {layers.length}</li>
        <li><strong>Estimated Cost:</strong> ${estimatedCost.toFixed(2)}</li>
      </ul>
      {notes && (
        <p className="mt-4 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-sm text-yellow-700 rounded">
          Note: {notes}
        </p>
      )}

      <button
        className="mt-6 px-6 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
      >
        Submit Cake Design 💌
      </button>
    </div>
  );
}
