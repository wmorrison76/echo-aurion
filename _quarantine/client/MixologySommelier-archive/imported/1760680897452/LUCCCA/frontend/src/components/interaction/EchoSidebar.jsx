// File: src/components/EchoCore/components/interaction/EchoSidebar.jsx

import React from "react";
import UIActionButton from "./UIActionButton";

const EchoSidebar = ({ onClose }) => {
  return (
    <aside className="w-64 bg-gray-100 dark:bg-gray-800 p-4 h-full shadow-lg">
      <h2 className="text-lg font-bold mb-4">Echo Sidebar</h2>
      <UIActionButton label="Close" onClick={onClose} />
    </aside>
  );
};

export default EchoSidebar;
