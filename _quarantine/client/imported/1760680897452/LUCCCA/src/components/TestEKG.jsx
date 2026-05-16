
import React, { useRef } from "react";
import EKGView from "./EKGView";

export default function TestEKG() {
  const graphRef = useRef();

  const handleExport = () => {
    fetch("/pulse_status.json")
      .then(res => res.json())
      .then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "LUCCCA_EKG_snapshot.json";
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">🔬 LUCCCA System Pulse: EKG Test</h1>
      <EKGView ref={graphRef} />
      <button
        className="mt-4 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
        onClick={handleExport}
      >
        ⬇️ Export Snapshot to JSON
      </button>
    </div>
  );
}
