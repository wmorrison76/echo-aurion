// File: src/components/EchoCore/components/interaction/QuickActionPanel.jsx

import React from "react";

const QuickActionPanel = ({ actions = [] }) => {
  return (
    <div className="bg-gray-800 p-3 rounded-lg shadow-md">
      <h3 className="text-sm font-semibold mb-2">Quick Actions</h3>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionPanel;

// ------------------------------