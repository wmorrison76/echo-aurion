import React from 'react';

export function LogEntry({ timestamp, message }) {
  return (
    <div className="log-entry border-b border-gray-700 py-2">
      <p className="text-xs text-gray-500">{timestamp}</p>
      <p>{message}</p>
    </div>
  );
}
