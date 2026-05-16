import React from 'react';

export function AlertMessage({ type = 'info', message }) {
  if (!message) return null;

  const colorMap = {
    info: 'blue',
    success: 'green',
    warning: 'yellow',
    error: 'red',
  };

  return (
    <div className={`alert-message bg-${colorMap[type]}-500 text-white p-3 rounded mb-4`}>
      {message}
    </div>
  );
}
