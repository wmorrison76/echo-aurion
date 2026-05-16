// File: src/components/EchoCore/components/interaction/EchoQuickStatus.jsx

import React from "react";

const EchoQuickStatus = ({ status }) => {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`w-3 h-3 rounded-full ${status === "online" ? "bg-green-500" : "bg-gray-400"}`}
      ></span>
      <span className="text-gray-700 dark:text-gray-300 capitalize">{status}</span>
    </div>
  );
};

export default EchoQuickStatus;

// ------------------------------