import React from 'react';

export function ButtonPrimary({ label, onClick }) {
  return (
    <button
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
