import React from 'react';

export default function MenuMaker() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📋 Menu Maker</h1>
      <p>Drag & drop sections, style your layout, and export your menu as a proposal or printout.</p>
      <div className="mt-6 border rounded-lg p-4 shadow-sm bg-white">
        <p>🧩 Choose from preset templates or start from scratch.</p>
        <ul className="mt-3 list-disc pl-5 text-sm text-gray-700">
          <li>Buffet Menu</li>
          <li>A La Carte</li>
          <li>Prix Fixe</li>
          <li>Wedding Style</li>
        </ul>
      </div>
    </div>
  );
}
