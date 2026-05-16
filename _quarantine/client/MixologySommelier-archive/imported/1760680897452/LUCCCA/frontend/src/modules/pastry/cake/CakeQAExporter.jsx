// src/modules/pastry/cake/CakeQAExporter.jsx
import React from "react";
import { generateSupportMap } from "./utils/SupportMapEngine.js";
import { estimateBuildTime } from "./utils/TimeEstimator.js";

const SEVERITY = {
  low:   { color: "#16a34a", label: "LOW" },
  medium:{ color: "#f59e0b", label: "MEDIUM" },
  high:  { color: "#ef4444", label: "HIGH" },
};

export const CakeQAExporter = ({ layers = [], cakeName = "Custom Cake" }) => {
  const supports = generateSupportMap(layers);
  const time = estimateBuildTime(layers);

  const download = () => {
    const data = {
      cakeName,
      timeEstimate: time,
      supports,
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cakeName.replace(/\s+/g, "_")}_QA_Report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 16, border: "1px solid #2563eb", background: "rgba(37,99,235,.07)", borderRadius: 12 }}>
      <div style={{ fontWeight: 600, color: "#93c5fd", marginBottom: 8 }}>Cake QA & Support Overview</div>

      <div style={{ color: "#e5e7eb" }}>
        <div style={{ marginBottom: 8 }}>
          <strong>Estimated Build Time:</strong>{" "}
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
            {time.hours}h {time.minutes}m
          </span>
        </div>

        <div style={{ marginBottom: 6 }}><strong>Support Map:</strong></div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {supports.map((s, i) => {
            const sev = SEVERITY[s.risk] || SEVERITY.low;
            return (
              <li key={i} style={{ color: sev.color, marginBottom: 4 }}>
                Tier {s.tier}: {s.description} — <strong>{sev.label} RISK</strong>
              </li>
            );
          })}
        </ul>
      </div>

      <button
        onClick={download}
        style={{
          marginTop: 12,
          padding: "8px 12px",
          borderRadius: 8,
          background: "#1d4ed8",
          color: "#fff",
          border: "1px solid #1e40af",
          cursor: "pointer",
        }}
      >
        Download QA Support Report
      </button>
    </div>
  );
};

export default CakeQAExporter;
