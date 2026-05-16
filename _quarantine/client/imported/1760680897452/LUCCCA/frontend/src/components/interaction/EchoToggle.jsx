// File: src/components/EchoCore/components/interaction/EchoToggle.jsx

import React from "react";

const EchoToggle = ({ isActive, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1 rounded-full text-white text-sm transition-colors duration-200 ${
        isActive ? "bg-cyan-600" : "bg-gray-500"
      }`}
    >
      {isActive ? "On" : "Off"}
    </button>
  );
};

export default EchoToggle;

// ------------------------------