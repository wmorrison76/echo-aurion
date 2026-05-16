import React from 'react';

export function ModalBasic({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="modal-content bg-white text-black p-6 rounded shadow-lg max-w-md w-full">
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        {children}
        <button onClick={onClose} className="mt-4 bg-red-600 text-white py-2 px-4 rounded">
          Close
        </button>
      </div>
    </div>
  );
}
