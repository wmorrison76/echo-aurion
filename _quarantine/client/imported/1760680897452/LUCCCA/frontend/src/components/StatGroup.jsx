import React from 'react';

export function StatGroup({ stats }) {
  return (
    <div className="stat-group grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((item, index) => (
        <div
          key={index}
          className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow text-center"
        >
          <h3 className="text-sm text-gray-500">{item.label}</h3>
          <p className="text-2xl font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
