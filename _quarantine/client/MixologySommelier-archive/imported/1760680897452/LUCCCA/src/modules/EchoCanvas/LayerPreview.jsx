import React from 'react';

export default function LayerPreview() {
  return (
    <div className="border rounded p-4 bg-gradient-to-b from-pink-50 to-pink-100 shadow-inner">
      <h2 className="text-xl font-semibold text-pink-700 mb-3">Layer Preview</h2>
      <div className="flex flex-col items-center gap-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-32 h-6 bg-white border border-pink-300 rounded-full shadow"
          />
        ))}
      </div>
    </div>
  );
}
