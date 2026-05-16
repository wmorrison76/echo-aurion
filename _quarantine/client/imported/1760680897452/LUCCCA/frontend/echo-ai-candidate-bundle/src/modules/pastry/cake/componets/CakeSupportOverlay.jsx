// src/modules/pastry/cake/components/CakeSupportOverlay.jsx
import React from "react";

export const CakeSupportOverlay = ({ layers }) => {
  const hasSupport = layers.some((l) => l.type === "support");

  if (!hasSupport) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-red-400 opacity-30" />
      <div className="absolute bottom-1/3 left-0 right-0 h-1 bg-red-400 opacity-30" />
      {/* Placeholder visual lines for internal supports */}
    </div>
  );
};
