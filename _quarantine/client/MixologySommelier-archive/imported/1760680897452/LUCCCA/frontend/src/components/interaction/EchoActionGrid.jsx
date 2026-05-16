// File: src/components/EchoCore/components/interaction/EchoActionGrid.jsx

import React from "react";
import UIActionButton from "./UIActionButton";

const EchoActionGrid = ({ actions }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action, idx) => (
        <UIActionButton key={idx} label={action.label} onClick={action.onClick} />
      ))}
    </div>
  );
};

export default EchoActionGrid;