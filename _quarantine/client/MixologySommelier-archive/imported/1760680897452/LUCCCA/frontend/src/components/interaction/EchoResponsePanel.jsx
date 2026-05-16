// File: src/components/EchoCore/components/interaction/EchoResponsePanel.jsx

import React from "react";
import EchoResponseBlock from "./EchoResponseBlock";

const EchoResponsePanel = ({ responses }) => {
  return (
    <div className="grid grid-cols-1 gap-4">
      {responses.map((response, i) => (
        <EchoResponseBlock key={i} response={response} />
      ))}
    </div>
  );
};

export default EchoResponsePanel;