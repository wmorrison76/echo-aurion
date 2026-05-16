// File: src/components/EchoCore/components/interaction/ModuleContainer.jsx

import React from "react";

const ModuleContainer = ({ title, children }) => {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
};

export default ModuleContainer;