import React from 'react';

export function SystemTileStatus({ label, status }) {
  const colorMap = {
    online: 'green',
    offline: 'red',
    maintenance: 'yellow',
    unknown: 'gray',
  };

  return (
    <div className="system-tile-status flex justify-between items-center p-2 rounded bg-gray-100 dark:bg-zinc-700">
      <span>{label}</span>
      <span
        className={`px-2 py-1 rounded text-xs font-bold bg-${colorMap[status]}-500 text-white`}
      >
        {status.toUpperCase()}
      </span>
    </div>
  );
}
