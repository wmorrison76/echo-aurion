// File: src/components/EchoCore/components/interaction/EchoSummaryCard.jsx

import React from "react";

const EchoSummaryCard = ({ title, summary }) => {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-700 dark:text-gray-300">{summary}</p>
    </div>
  );
};

export default EchoSummaryCard;
