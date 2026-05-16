// File: src/components/EchoCore/components/interaction/EchoCardContainer.jsx

import React from "react";

const EchoCardContainer = ({ title, children }) => {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div>{children}</div>
    </div>
  );
};

export default EchoCardContainer;