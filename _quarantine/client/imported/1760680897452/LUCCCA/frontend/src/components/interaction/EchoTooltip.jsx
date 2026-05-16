// File: src/components/EchoCore/components/interaction/EchoTooltip.jsx

import React from "react";

const EchoTooltip = ({ text, children }) => {
  return (
    <div className="relative group">
      {children}
      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-gray-800 text-white opacity-0 group-hover:opacity-100 transition-opacity">
        {text}
      </span>
    </div>
  );
};

export default EchoTooltip;
