import React from 'react';

export function BadgeStatus({ status }) {
  const colorMap = {
    online: 'green',
    offline: 'red',
    maintenance: 'yellow',
  };

  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-bold rounded bg-${colorMap[status]}-500 text-white`}
    >
      {status.toUpperCase()}
    </span>
  );
}
