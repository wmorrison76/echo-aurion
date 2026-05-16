import React from 'react';

export function SystemTile({ title, value, footer }) {
  return (
    <div className="system-tile bg-white dark:bg-zinc-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-2xl font-bold my-2">{value}</p>
      {footer && <p className="text-sm text-gray-500">{footer}</p>}
    </div>
  );
}
