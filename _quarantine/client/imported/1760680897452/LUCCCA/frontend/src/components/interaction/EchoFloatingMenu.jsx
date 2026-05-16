// File: src/components/EchoCore/components/interaction/EchoFloatingMenu.jsx

import React from "react";
import UIActionButton from "./UIActionButton";

const EchoFloatingMenu = ({ options }) => {
  return (
    <div className="fixed bottom-6 right-6 bg-gray-100 dark:bg-gray-700 p-3 rounded-full shadow-xl flex gap-2">
      {options.map((opt, idx) => (
        <UIActionButton key={idx} label={opt.label} onClick={opt.onClick} />
      ))}
    </div>
  );
};

export default EchoFloatingMenu;
