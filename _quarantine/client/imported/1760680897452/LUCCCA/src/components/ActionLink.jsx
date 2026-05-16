import React from 'react';

export function ActionLink({ label, onClick }) {
  return (
    <button
      className="text-blue-600 hover:underline text-sm"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
