import React from 'react';

export function Card({ title, children }) {
  return (
    <div className="card bg-white dark:bg-zinc-800 rounded-lg shadow p-4 mb-4">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      {children}
    </div>
  );
}
