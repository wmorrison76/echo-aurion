// File: src/components/EchoCore/components/interaction/EchoInlineAlert.jsx

import React from "react";

const EchoInlineAlert = ({ message, type = "info" }) => {
  const colorMap = {
    info: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
  };
  return <div className={`p-2 rounded ${colorMap[type]} text-sm`}>{message}</div>;
};

export default EchoInlineAlert;

// ------------------------------