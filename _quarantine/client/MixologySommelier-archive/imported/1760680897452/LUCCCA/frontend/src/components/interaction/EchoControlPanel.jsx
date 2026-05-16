// File: src/components/EchoCore/components/interaction/EchoControlPanel.jsx

import React from "react";

const EchoControlPanel = ({ children }) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
      {children}
    </div>
  );
};

export default EchoControlPanel;
