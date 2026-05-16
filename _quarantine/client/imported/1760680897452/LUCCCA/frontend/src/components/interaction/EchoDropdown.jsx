// File: src/components/EchoCore/components/interaction/EchoDropdown.jsx

import React, { useState } from "react";

const EchoDropdown = ({ label, items, onSelect }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700"
      >
        {label}
      </button>
      {open && (
        <div className="absolute mt-2 bg-white dark:bg-gray-800 shadow-lg rounded w-48">
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => { setOpen(false); onSelect(item); }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EchoDropdown;
