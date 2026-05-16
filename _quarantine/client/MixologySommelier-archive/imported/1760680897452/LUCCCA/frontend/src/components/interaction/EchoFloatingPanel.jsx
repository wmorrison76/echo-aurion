// File: src/components/EchoCore/components/interaction/EchoFloatingPanel.jsx

import React from "react";

const EchoFloatingPanel = ({ children, position = "bottom-right" }) => {
  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
  };
  return (
    <div className={`fixed z-50 ${positionClasses[position]} bg-white dark:bg-gray-900 shadow-lg rounded-lg p-4`}> 
      {children}
    </div>
  );
};

export default EchoFloatingPanel;
