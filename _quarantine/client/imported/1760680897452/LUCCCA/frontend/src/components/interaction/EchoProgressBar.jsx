// File: src/components/EchoCore/components/interaction/EchoProgressBar.jsx

import React from "react";

const EchoProgressBar = ({ value, max = 100 }) => {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full bg-gray-200 rounded h-4 overflow-hidden">
      <div
        className="bg-cyan-600 h-4 transition-all duration-500"
        style={{ width: `${percent}%` }}
      ></div>
    </div>
  );
};

export default EchoProgressBar;

// ------------------------------