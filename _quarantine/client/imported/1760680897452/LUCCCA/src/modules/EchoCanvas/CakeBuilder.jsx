import React from 'react';
import LayerPreview from './LayerPreview';
import FlavorBuilder from './FlavorBuilder';
import NotesAndPricing from './NotesAndPricing';
import Gallery from './Gallery';

export default function CakeBuilder() {
  return (
    <div className="p-6 bg-white rounded shadow max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-center text-pink-800 mb-6">🎂 EchoCanvas: Custom Cake Builder</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LayerPreview />
        <FlavorBuilder />
      </div>
      <NotesAndPricing />
      <Gallery />
    </div>
  );
}
