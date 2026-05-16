// File: src/components/interaction/EchoShell.jsx

import React, { useState } from "react";
import EchoMainView from "./EchoMainView";
import EchoResponsePanel from "./EchoResponsePanel";
import EchoCommandDock from "./EchoCommandDock";

// [TEAM LOG: A] EchoShell is the root container for EchoCore.
// It acts as the dynamic whiteboard where modules and AI responses are rendered.
// EchoShell manages the layout, toggling of modules, and Echo AI responses.

const EchoShell = ({ defaultModules = [] }) => {
  const [activeModules, setActiveModules] = useState(defaultModules);
  const [echoQuery, setEchoQuery] = useState("");
  const [echoResponse, setEchoResponse] = useState(null);

  const handleEchoQuery = (query) => {
    setEchoQuery(query);
    // [TEAM LOG: A] Placeholder AI call – will integrate with EchoCore AI later
    setEchoResponse({
      title: "Echo AI Response",
      notes: `You asked: ${query}`,
      dataPoints: ["Module 1", "Module 2"],
    });
  };

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-slate-900 to-gray-800 text-white p-4">
      <EchoCommandDock onAskEcho={handleEchoQuery} />
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <EchoMainView modules={activeModules} />
        <EchoResponsePanel response={echoResponse} />
      </div>
    </div>
  );
};

export default EchoShell;
