// src/components/PastryLibrary/CakePreview.jsx
import React from 'react';

export default function CakePreview({ layers }) {
  return (
    <div className="w-full max-w-md h-96 bg-[url('/bg/marble.png')] bg-cover border rounded shadow mb-8 relative overflow-hidden">
      <div className="absolute bottom-4 w-full flex flex-col items-center justify-end transition-all duration-500">
        {layers.map((layer, i) => (
          <div
            key={i}
            className="w-3/4 h-8 rounded-full mb-2"
            style={{
              background: getFrostingColor(layer.frosting),
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: 'inset 0 0 2px #999',
            }}
          />
        ))}
      </div>
      <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full shadow text-xs font-semibold text-zinc-600">
        Live Preview
      </div>
    </div>
  );
}

function getFrostingColor(frosting) {
  switch (frosting) {
    case 'Buttercream': return '#f8e1c1';
    case 'Fondant': return '#f3f3f3';
    case 'Cream Cheese': return '#fff7f1';
    case 'Ganache': return '#4b2e2e';
    default: return '#e0e0e0';
  }
}
