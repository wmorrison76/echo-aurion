import React, { useState } from "react";
import { X } from "lucide-react";
import { exportCanvas } from "../lib/export";
interface BatchExportDialogProps {
  canvases: { name: string; canvas: HTMLCanvasElement }[];
  onClose: () => void;
}
export default function BatchExportDialog({
  canvases,
  onClose,
}: BatchExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<"png" | "jpg" | "webp">(
    "png",
  );
  const [quality, setQuality] = useState(95);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const handleExportAll = async () => {
    setExporting(true);
    const total = canvases.length;
    for (let i = 0; i < canvases.length; i++) {
      const { name, canvas } = canvases[i];
      exportCanvas(canvas, {
        format: selectedFormat,
        quality: quality / 100,
        filename: name || `export-${i + 1}`,
      });
      setProgress(Math.round(((i + 1) / total) * 100));
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    setExporting(false);
    onClose();
  };
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      {" "}
      <div
        style={{
          backgroundColor: "#0b0f1a",
          border: "1px solid #444",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "500px",
          width: "90%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {" "}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          {" "}
          <h2
            style={{
              margin: 0,
              color: "#c8a97e",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            {" "}
            Batch Export {canvases.length} Files{" "}
          </h2>{" "}
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#ccc",
              cursor: "pointer",
            }}
          >
            {" "}
            <X size={20} />{" "}
          </button>{" "}
        </div>{" "}
        {!exporting ? (
          <>
            {" "}
            <div style={{ marginBottom: "16px" }}>
              {" "}
              <label
                style={{
                  color: "#aaa",
                  fontSize: "12px",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                {" "}
                Format{" "}
              </label>{" "}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "8px",
                }}
              >
                {" "}
                {["png", "jpg", "webp"].map((format) => (
                  <button
                    key={format}
                    onClick={() => setSelectedFormat(format as any)}
                    style={{
                      padding: "8px",
                      backgroundColor:
                        selectedFormat === format
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border: `1px solid ${selectedFormat === format ? "#c8a97e" : "#444"}`,
                      color: selectedFormat === format ? "#c8a97e" : "#aaa",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      fontWeight: selectedFormat === format ? "600" : "400",
                    }}
                  >
                    {" "}
                    {format}{" "}
                  </button>
                ))}{" "}
              </div>{" "}
            </div>{" "}
            {selectedFormat === "jpg" && (
              <div style={{ marginBottom: "16px" }}>
                {" "}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  {" "}
                  <label style={{ color: "#aaa", fontSize: "12px" }}>
                    Quality
                  </label>{" "}
                  <span
                    style={{
                      color: "#c8a97e",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    {quality}%
                  </span>{" "}
                </div>{" "}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  style={{ width: "100%" }}
                />{" "}
              </div>
            )}{" "}
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              {" "}
              <button
                onClick={onClose}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "transparent",
                  border: "1px solid #444",
                  color: "#ccc",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                {" "}
                Cancel{" "}
              </button>{" "}
              <button
                onClick={handleExportAll}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "rgba(200, 169, 126, 0.2)",
                  border: "1px solid #c8a97e",
                  color: "#c8a97e",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                {" "}
                Export All{" "}
              </button>{" "}
            </div>{" "}
          </>
        ) : (
          <div>
            {" "}
            <div style={{ marginBottom: "16px" }}>
              {" "}
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  backgroundColor: "#333",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                {" "}
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    backgroundColor: "#c8a97e",
                    transition: "width 0.3s",
                  }}
                />{" "}
              </div>{" "}
            </div>{" "}
            <p style={{ color: "#aaa", fontSize: "12px", textAlign: "center" }}>
              {" "}
              Exporting {progress}% (
              {Math.ceil((progress / 100) * canvases.length)} of{" "}
              {canvases.length}){" "}
            </p>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
