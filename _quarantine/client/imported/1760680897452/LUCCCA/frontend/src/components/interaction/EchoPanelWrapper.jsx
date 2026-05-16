// File: src/components/EchoCore/components/interaction/EchoPanelWrapper.jsx

import React from "react";

const EchoPanelWrapper = ({ children }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 mb-4">
      {children}
    </div>
  );
};

export default EchoPanelWrapper;
