import React from 'react';

export default function Gallery() {
  return (
    <div className="mt-6 border rounded p-4 bg-pink-50 shadow-inner">
      <h2 className="text-xl font-semibold text-pink-700 mb-3">Cake Gallery</h2>
      <p className="text-sm text-gray-600">Saved designs will appear here for inspiration.</p>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(id => (
          <div key={id} className="bg-white border rounded h-24 shadow flex items-center justify-center text-pink-400">
            Cake #{id}
          </div>
        ))}
      </div>
    </div>
  );
}
