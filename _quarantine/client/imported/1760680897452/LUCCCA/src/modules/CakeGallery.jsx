import React from 'react';

const sampleGallery = [
  { title: 'Modern Wedding Cake', image: '/images/cake1.jpg' },
  { title: 'Floral Celebration Cake', image: '/images/cake2.jpg' },
  { title: 'Chocolate Ganache Stack', image: '/images/cake3.jpg' },
];

export default function CakeGallery() {
  return (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">📸 Cake Gallery</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sampleGallery.map((cake, i) => (
          <div key={i} className="rounded shadow overflow-hidden border">
            <img src={cake.image} alt={cake.title} className="w-full h-48 object-cover" />
            <div className="p-3">
              <h4 className="font-semibold text-sm text-gray-700">{cake.title}</h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
