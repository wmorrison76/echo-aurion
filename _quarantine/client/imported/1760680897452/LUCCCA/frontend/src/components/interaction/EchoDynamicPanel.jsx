// File: src/components/EchoCore/components/interaction/EchoDynamicPanel.jsx

import React from "react";
import EchoPanelWrapper from "./EchoPanelWrapper";

const EchoDynamicPanel = ({ title, children }) => {
  return (
    <EchoPanelWrapper>
      <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
        {title}
      </h3>
      {children}
    </EchoPanelWrapper>
  );
};

export default EchoDynamicPanel;