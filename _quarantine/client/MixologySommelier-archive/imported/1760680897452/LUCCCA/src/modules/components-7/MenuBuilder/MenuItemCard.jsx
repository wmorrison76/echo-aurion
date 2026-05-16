
import React from 'react';

export default function MenuItemCard({ item }) {
  return (
    <div className="border p-4 rounded shadow hover:bg-gray-50">
      <h3 className="font-semibold text-lg">{item.name}</h3>
      <p className="text-sm text-gray-500">{item.description}</p>
    </div>
  );
}
