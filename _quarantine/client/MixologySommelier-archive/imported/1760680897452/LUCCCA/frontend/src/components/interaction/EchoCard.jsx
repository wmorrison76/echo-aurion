// File: src/components/EchoCore/components/interaction/EchoCard.jsx

import React from "react";

const EchoCard = ({ title, description, children }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <h3 className="text-md font-semibold mb-2 text-gray-800 dark:text-gray-100">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{description}</p>
      {children}
    </div>
  );
};

export default EchoCard;