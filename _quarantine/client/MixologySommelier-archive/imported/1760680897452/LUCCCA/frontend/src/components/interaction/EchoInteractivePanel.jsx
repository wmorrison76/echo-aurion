// File: src/components/EchoCore/components/interaction/EchoInteractivePanel.jsx

import React, { useState } from "react";
import EchoDynamicPanel from "./EchoDynamicPanel";

const EchoInteractivePanel = ({ initialMessage }) => {
  const [message, setMessage] = useState(initialMessage || "");

  return (
    <EchoDynamicPanel>
      <textarea
        className="w-full p-2 border rounded mb-2"
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type something for Echo..."
      />
      <p className="text-sm text-gray-600 dark:text-gray-300">Current: {message}</p>
    </EchoDynamicPanel>
  );
};

export default EchoInteractivePanel;
