import React from 'react';

export function FormButton({ label, onClick }) {
  return (
    <button
      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
