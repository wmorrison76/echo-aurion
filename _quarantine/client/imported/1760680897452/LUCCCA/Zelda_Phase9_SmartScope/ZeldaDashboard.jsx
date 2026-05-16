import React from "react";

export default function ZeldaDashboard({ summary = [], issues = [] }) {
  return (
    <div className="p-4 bg-black text-green-400 font-mono">
      <h2 className="text-xl font-bold mb-2">🧬 Zelda Scan Summary</h2>
      <ul className="list-disc pl-4">
        {summary.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
      {issues.length > 0 && (
        <>
          <h3 className="mt-4 text-red-400">⚠️ Issues Detected</h3>
          <ul className="list-disc pl-4 text-red-200">
            {issues.map((issue, i) => <li key={i}>{issue}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}