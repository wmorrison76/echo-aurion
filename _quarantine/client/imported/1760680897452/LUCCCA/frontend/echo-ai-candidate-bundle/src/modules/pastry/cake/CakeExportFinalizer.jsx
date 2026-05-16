// src/modules/pastry/cake/CakeExportFinalizer.jsx
import React, { useMemo } from "react";

export default function CakeExportFinalizer({ layers = [], onSave }) {
  const bundle = useMemo(
    () => ({
      version: 1,
      createdAt: new Date().toISOString(),
      layers,
      meta: {
        cakeLayers: layers.filter((l) => l.type === "cake").length,
        fillingLayers: layers.filter((l) => l.type === "filling").length,
        supportLayers: layers.filter((l) => l.type === "support").length,
      },
    }),
    [layers]
  );

  const asJson = useMemo(() => JSON.stringify(bundle, null, 2), [bundle]);
  const sizeKB = useMemo(() => Math.max(1, Math.round(asJson.length / 1024)), [asJson]);

  const download = () => {
    const blob = new Blob([asJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cake_bundle.json";
    a.click();
    URL.revokeObjectURL(url);
    if (onSave) onSave(bundle);
  };

  const copyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(asJson);
      alert("Bundle copied to clipboard.");
    } catch {
      // Fallback: open a window with JSON to copy manually
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(`<pre>${asJson.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</pre>`);
        w.document.close();
      } else {
        alert("Could not copy. Popup blocked?");
      }
    }
  };

  return (
    <div style={{ padding: 16, border: "1px solid #374151", borderRadius: 12 }}>
      <div style={{ fontWeight: 600, color: "#e5e7eb", marginBottom: 8 }}>Export</div>

      <div style={{ color: "#9ca3af", fontSize: 14, marginBottom: 10 }}>
        <div>
          <b>Layers:</b> {layers.length} &nbsp;|&nbsp; <b>Size:</b> ~{sizeKB} KB
        </div>
        <div>
          <b>Cake:</b> {bundle.meta.cakeLayers} &nbsp;|&nbsp; <b>Filling:</b> {bundle.meta.fillingLayers} &nbsp;|&nbsp;{" "}
          <b>Support:</b> {bundle.meta.supportLayers}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={download}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#111827",
            color: "#fff",
            border: "1px solid #374151",
            cursor: "pointer",
          }}
        >
          Download JSON
        </button>
        <button
          onClick={copyClipboard}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "transparent",
            color: "#e5e7eb",
            border: "1px solid #374151",
            cursor: "pointer",
          }}
        >
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
}
