// File: src/components/EchoCore/components/interaction/EchoContextMenu.jsx

import React from "react";

const EchoContextMenu = ({ options, onSelect }) => {
  return (
    <ul className="bg-white dark:bg-gray-800 shadow rounded-lg p-2 text-sm">
      {options.map((opt) => (
        <li
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded"
        >
          {opt.label}
        </li>
      ))}
    </ul>
  );
};

export default EchoContextMenu;
