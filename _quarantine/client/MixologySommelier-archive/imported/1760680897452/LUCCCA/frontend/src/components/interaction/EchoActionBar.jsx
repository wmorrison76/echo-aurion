// File: src/components/EchoCore/components/interaction/EchoActionBar.jsx

import React from "react";
import UIActionButton from "./UIActionButton";

const EchoActionBar = ({ actions }) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {actions.map((action, idx) => (
        <UIActionButton key={idx} label={action.label} onClick={action.onClick} />
      ))}
    </div>
  );
};

export default EchoActionBar;