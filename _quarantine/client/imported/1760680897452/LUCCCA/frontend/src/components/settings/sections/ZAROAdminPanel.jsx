// src/components/settings/sections/ZAROAdminPanel.jsx
import React, { useState } from "react";
import { FolderPlus } from "lucide-react";

export default function ZAROAdminPanel() {
  const [safeMode, setSafeMode] = useState(true);
  const [logs, setLogs] = useState(["ZARO initialized in Safe Mode."]);

  const toggleSafeMode = () => {
    const newState = !safeMode;
    setSafeMode(newState);
    setLogs((prev) => [...prev, `ZARO Safe Mode $\{newState ? "enabled" : "disabled"\}.`]);
  };

  const handleModuleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const name = files[0].name;
      setLogs((prev) => [...prev, `Module dropped: $\{name\}. Verifying…`]);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">ZARO Admin Tools</h2>

      <div className="flex items-center mb-4">
        <label className="mr-3">Safe Mode:</label>
        <button
          onClick={toggleSafeMode}
          className={`px-4 py-1 rounded $\{
            safeMode ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {safeMode ? "ON" : "OFF"}
        </button>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleModuleDrop}
        className="border-2 border-dashed border-blue-500 rounded-lg p-6 text-center text-blue-500 mb-4"
      >
        <FolderPlus className="mx-auto mb-2" />
        Drag & Drop a Module to Install
      </div>

      <div className="bg-zinc-800 text-white rounded p-4 h-40 overflow-y-scroll">
        {logs.map((log, i) => (
          <div key={i} className="text-sm">
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
