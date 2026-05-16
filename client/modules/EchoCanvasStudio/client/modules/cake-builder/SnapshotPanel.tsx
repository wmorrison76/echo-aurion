/**
 * Snapshot Panel
 * UI for capturing individual frames from the cake animation
 */

import React, { useState } from "react";
import { Camera, Download, Copy, Trash2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  captureCanvasFrame,
  captureCanvasAsJPEG,
  createThumbnail,
  type VideoExportProgress,
} from "@/lib/video-export-service";

interface Snapshot {
  id: string;
  timestamp: number;
  imageData: string;
  format: "png" | "jpeg";
  filename: string;
  createdAt: string;
}

interface SnapshotPanelProps {
  canvas: HTMLCanvasElement | null;
  animationProgress?: number;
  animationDuration?: number;
  onSnapshot?: (snapshot: Snapshot) => void;
  currentTime?: number;
}

export default function SnapshotPanel({
  canvas,
  animationProgress = 0,
  animationDuration = 10000,
  onSnapshot,
  currentTime = 0,
}: SnapshotPanelProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [captureFormat, setCaptureFormat] = useState<"png" | "jpeg">("png");
  const [jpegQuality, setJpegQuality] = useState(0.95);

  // Capture current frame
  const handleCaptureFrame = () => {
    if (!canvas) return;

    const timestamp = currentTime;
    const id = `snapshot-${Date.now()}`;
    const format = captureFormat;
    const filename = `cake-snapshot-${new Date().toISOString().split("T")[0]}-${Date.now()}.${format}`;

    try {
      const imageData = canvas.toDataURL(
        format === "png" ? "image/png" : `image/jpeg;quality=${jpegQuality}`,
      );

      const snapshot: Snapshot = {
        id,
        timestamp,
        imageData,
        format,
        filename,
        createdAt: new Date().toISOString(),
      };

      setSnapshots((prev) => [snapshot, ...prev]);
      setSelectedSnapshot(id);
      onSnapshot?.(snapshot);
    } catch (error) {
      console.error("Failed to capture frame:", error);
    }
  };

  // Download snapshot
  const handleDownloadSnapshot = (snapshot: Snapshot) => {
    const link = document.createElement("a");
    link.href = snapshot.imageData;
    link.download = snapshot.filename;
    link.click();
  };

  // Copy to clipboard
  const handleCopyToClipboard = async (snapshot: Snapshot) => {
    try {
      const blob = await fetch(snapshot.imageData).then((r) => r.blob());
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  // Delete snapshot
  const handleDeleteSnapshot = (id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
    if (selectedSnapshot === id) {
      setSelectedSnapshot(null);
    }
  };

  // Export all snapshots as gallery
  const handleExportGallery = () => {
    if (snapshots.length === 0) return;

    // Create a simple HTML gallery
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cake Design Snapshots</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
          h1 { color: #333; }
          .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
          .snapshot { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .snapshot img { width: 100%; display: block; }
          .info { padding: 15px; }
          .info p { margin: 5px 0; font-size: 12px; color: #666; }
          .timestamp { font-weight: bold; color: #333; }
        </style>
      </head>
      <body>
        <h1>🎂 Cake Design Snapshots</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        <div class="gallery">
          ${snapshots
            .map(
              (snapshot, index) => `
            <div class="snapshot">
              <img src="${snapshot.imageData}" alt="Snapshot ${index + 1}">
              <div class="info">
                <p class="timestamp">Snapshot ${index + 1}</p>
                <p>Time: ${(snapshot.timestamp / 1000).toFixed(1)}s</p>
                <p>Created: ${new Date(snapshot.createdAt).toLocaleString()}</p>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cake-snapshots-${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedSnapshotData = snapshots.find((s) => s.id === selectedSnapshot);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "16px",
        backgroundColor: "#1a1a1a",
        borderRadius: "8px",
        border: "1px solid #333",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <h3
          style={{
            color: "#00f0ff",
            fontSize: "14px",
            fontWeight: "bold",
            margin: 0,
            flex: 1,
          }}
        >
          📷 Frame Snapshots
        </h3>
        <span
          style={{
            backgroundColor: "#333",
            color: "#aaa",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "bold",
          }}
        >
          {snapshots.length}
        </span>
      </div>

      {/* Capture Format */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label
          style={{
            color: "#aaa",
            fontSize: "12px",
            fontWeight: "500",
            textTransform: "uppercase",
          }}
        >
          Capture Format
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
          }}
        >
          {(["png", "jpeg"] as const).map((format) => (
            <button
              key={format}
              onClick={() => setCaptureFormat(format)}
              style={{
                padding: "8px",
                backgroundColor: captureFormat === format ? "#00f0ff" : "#222",
                color: captureFormat === format ? "#000" : "#aaa",
                border: "1px solid #333",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: captureFormat === format ? "bold" : "normal",
                fontSize: "12px",
              }}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* JPEG Quality */}
      {captureFormat === "jpeg" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              color: "#aaa",
              fontSize: "12px",
              fontWeight: "500",
              textTransform: "uppercase",
            }}
          >
            Quality: {(jpegQuality * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={jpegQuality}
            onChange={(e) => setJpegQuality(parseFloat(e.target.value))}
            style={{
              width: "100%",
            }}
          />
        </div>
      )}

      {/* Current Time */}
      <div
        style={{
          backgroundColor: "#222",
          border: "1px solid #333",
          borderRadius: "4px",
          padding: "12px",
          fontSize: "12px",
          color: "#aaa",
        }}
      >
        <div>
          <strong>Current Time:</strong> {(currentTime / 1000).toFixed(2)}s /{" "}
          {(animationDuration / 1000).toFixed(1)}s
        </div>
        <div style={{ marginTop: "4px", fontSize: "11px", color: "#888" }}>
          Progress: {(animationProgress * 100).toFixed(0)}%
        </div>
      </div>

      {/* Capture Button */}
      <Button
        onClick={handleCaptureFrame}
        disabled={!canvas}
        style={{
          backgroundColor: !canvas ? "#333" : "#00f0ff",
          color: !canvas ? "#666" : "#000",
          border: "1px solid #00f0ff",
          padding: "12px 16px",
          borderRadius: "4px",
          cursor: !canvas ? "not-allowed" : "pointer",
          fontSize: "12px",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <Camera size={14} />
        Capture Frame
      </Button>

      {/* Snapshots List */}
      {snapshots.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          {snapshots.map((snapshot, index) => (
            <div
              key={snapshot.id}
              onClick={() => setSelectedSnapshot(snapshot.id)}
              style={{
                backgroundColor:
                  selectedSnapshot === snapshot.id ? "#222" : "#111",
                border:
                  selectedSnapshot === snapshot.id
                    ? "1px solid #00f0ff"
                    : "1px solid #333",
                borderRadius: "4px",
                padding: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "grid",
                gridTemplateColumns: "60px 1fr auto",
                gap: "12px",
                alignItems: "center",
              }}
            >
              {/* Thumbnail */}
              <img
                src={snapshot.imageData}
                alt={`Snapshot ${index + 1}`}
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "4px",
                  objectFit: "cover",
                  backgroundColor: "#000",
                }}
              />

              {/* Info */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <div
                  style={{ color: "#aaa", fontSize: "12px", fontWeight: "500" }}
                >
                  Snapshot {snapshots.length - index}
                </div>
                <div style={{ color: "#888", fontSize: "11px" }}>
                  {(snapshot.timestamp / 1000).toFixed(1)}s •{" "}
                  {snapshot.format.toUpperCase()}
                </div>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  onClick: (e) => e.stopPropagation(),
                }}
              >
                <button
                  onClick={() => handleDownloadSnapshot(snapshot)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#00f0ff")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
                  title="Download"
                >
                  <Download size={14} />
                </button>

                <button
                  onClick={() => handleCopyToClipboard(snapshot)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor: "pointer",
                    padding: "0 4px",
                    display: "flex",
                    alignItems: "center",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#00f0ff")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
                  title="Copy to clipboard"
                >
                  <Copy size={14} />
                </button>

                <button
                  onClick={() => handleDeleteSnapshot(snapshot.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor: "pointer",
                    padding: "0 4px",
                    display: "flex",
                    alignItems: "center",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f00")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            color: "#666",
            padding: "20px",
            fontSize: "12px",
          }}
        >
          No snapshots yet. Click "Capture Frame" to start!
        </div>
      )}

      {/* Selected Snapshot Preview */}
      {selectedSnapshotData && (
        <div
          style={{
            backgroundColor: "#000",
            borderRadius: "8px",
            overflow: "hidden",
            border: "1px solid #333",
          }}
        >
          <img
            src={selectedSnapshotData.imageData}
            alt="Selected snapshot"
            style={{
              width: "100%",
              display: "block",
            }}
          />
        </div>
      )}

      {/* Export Gallery Button */}
      {snapshots.length > 0 && (
        <Button
          onClick={handleExportGallery}
          style={{
            backgroundColor: "#222",
            color: "#aaa",
            border: "1px solid #333",
            padding: "10px 16px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#333";
            e.currentTarget.style.color = "#00f0ff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#222";
            e.currentTarget.style.color = "#aaa";
          }}
        >
          <Share2 size={14} />
          Export Gallery ({snapshots.length} snapshots)
        </Button>
      )}

      {/* Info */}
      <div
        style={{
          backgroundColor: "#222",
          border: "1px solid #333",
          borderRadius: "4px",
          padding: "12px",
          fontSize: "11px",
          color: "#888",
        }}
      >
        <strong>Tips:</strong> Use the capture button to take snapshots at
        different points in the animation. You can download individual frames or
        export all as an HTML gallery.
      </div>
    </div>
  );
}
