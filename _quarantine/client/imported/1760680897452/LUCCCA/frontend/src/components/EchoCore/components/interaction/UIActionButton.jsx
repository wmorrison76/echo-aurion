// File: src/components/EchoCore/components/interaction/UIActionButton.jsx
import React from 'react';

const UIActionButton = ({ label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
    >
      {label}
    </button>
  );
};

export default UIActionButton;
