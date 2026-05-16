import React from 'react';

export function ProgressBar({ value = 0 }) {
  return (
    <div className="progress-bar bg-gray-300 rounded h-4 w-full overflow-hidden">
      <div
        className="bg-blue-600 h-4"
        style={{ width: `${value}%`, transition: 'width 0.3s ease' }}
      ></div>
    </div>
  );
}
