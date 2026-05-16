// File: src/components/EchoCore/components/interaction/EchoSectionHeader.jsx

import React from "react";

const EchoSectionHeader = ({ title, subtitle }) => {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h2>
      {subtitle && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
      )}
    </div>
  );
};

export default EchoSectionHeader;

// ------------------------------