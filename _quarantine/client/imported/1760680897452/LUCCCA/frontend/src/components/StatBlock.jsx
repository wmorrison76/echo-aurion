import React from 'react';

export function StatBlock({ label, value }) {
  return (
    <div className="stat-block bg-gray-800 text-white rounded p-4 text-center">
      <p className="text-sm">{label}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}
