// File: src/components/EchoCore/components/interaction/EchoStatusBar.jsx

import React from "react";
import EchoQuickStatus from "./EchoQuickStatus";

const EchoStatusBar = ({ status, lastUpdated }) => {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-200 dark:bg-gray-700 rounded-md text-sm">
      <EchoQuickStatus status={status} />
      <span className="text-gray-600 dark:text-gray-300">Last updated: {lastUpdated}</span>
    </div>
  );
};

export default EchoStatusBar;

// ------------------------------