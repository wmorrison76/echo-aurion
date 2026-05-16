import React from 'react';

export function FormButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-2 bg-pink-600 text-white rounded hover:bg-pink-700 w-full"
    >
      {label}
    </button>
  );
}
