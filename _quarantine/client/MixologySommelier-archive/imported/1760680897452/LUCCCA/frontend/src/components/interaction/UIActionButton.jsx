// File: src/components/EchoCore/components/interaction/UIActionButton.jsx

import React from "react";
import clsx from "clsx";

const UIActionButton = ({ label, onClick, icon: Icon, className = "" }) => (
  <button
    onClick={onClick}
    className={clsx(
      "flex items-center gap-2 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium shadow",
      className
    )}
  >
    {Icon && <Icon className="w-4 h-4" />} {label}
  </button>
);

export default UIActionButton;

// ------------------------------