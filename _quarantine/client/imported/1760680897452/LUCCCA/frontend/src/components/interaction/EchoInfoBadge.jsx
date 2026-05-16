// File: src/components/EchoCore/components/interaction/EchoInfoBadge.jsx

import React from "react";

const EchoInfoBadge = ({ label, type = "info" }) => {
  const colorMap = {
    info: "bg-blue-500",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
  };
  return (
    <span className={`px-2 py-1 text-xs text-white rounded ${colorMap[type]}`}>{label}</span>
  );
};

export default EchoInfoBadge;
