import React, { useState } from "react";
import { Upload, Download, Loader, CheckCircle } from "lucide-react";

interface ProcessingTask {
  id: string;
  filename: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  error?: string;
}

export interface ProcessingOptions {
  filters: string[];
  brightness: number;
  contrast: number;
  saturation: number;
  quality: number;
  format: "png" | "jpg" | "webp";
}

interface BatchProcessingPanelProps {
  onProcessImages?: (files: File[], options: ProcessingOptions) => void;
}

export default function BatchProcessingPanel({
  onProcessImages: _onProcessImages,
}: BatchProcessingPanelProps) {
  const [tasks, setTasks] = useState<ProcessingTask[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, _setSaturation] = useState(0);
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<"png" | "jpg" | "webp">("png");
  const [isProcessing, setIsProcessing] = useState(false);
  const [_downloadInProgress, setDownloadInProgress] = useState(false);

  const filters = [
    { id: "grayscale", label: "Grayscale" },
    { id: "sepia", label: "Sepia" },
    { id: "blur", label: "Blur" },
    { id: "sharpen", label: "Sharpen" },
    { id: "invert", label: "Invert" },
    { id: "vibrance", label: "Vibrance" },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newTasks: ProcessingTask[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      filename: file.name,
      status: "pending",
      progress: 0,
    }));
    setTasks([...tasks, ...newTasks]);
  };

  const handleProcessAll = async () => {
    if (tasks.length === 0) return;
    setIsProcessing(true);
    const _options: ProcessingOptions = {
      filters: selectedFilters,
      brightness,
      contrast,
      saturation,
      quality,
      format,
    };
    for (const task of tasks) {
      if (task.status === "pending") {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: "processing" } : t)),
        );
        // Simulated progress
        for (let i = 0; i <= 100; i += 10) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id ? { ...t, progress: i, status: "processing" } : t,
            ),
          );
        }
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, status: "completed", progress: 100 } : t,
          ),
        );
      }
    }
    setIsProcessing(false);
  };

  const handleClearCompleted = () => {
    setTasks(tasks.filter((t) => t.status !== "completed"));
  };

  const handleDownloadAll = () => {
    const completedCount = tasks.filter((t) => t.status === "completed").length;
    if (completedCount === 0) return;
    setDownloadInProgress(true);
    // Simulated download
    setTimeout(() => {
      setDownloadInProgress(false);
      handleClearCompleted();
    }, 1000);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "16px",
        backgroundColor: "#0a0a0a",
        borderRadius: "8px",
        border: "1px solid #333",
        maxHeight: "600px",
        overflow: "hidden",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div>
        <h3
          style={{
            color: "#c8a97e",
            fontSize: "12px",
            fontWeight: "bold",
            margin: "0 0 12px 0",
          }}
        >
          Batch Processing
        </h3>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px",
            backgroundColor: "rgba(200, 169, 126, 0.1)",
            border: "2px dashed #c8a97e",
            borderRadius: "6px",
            cursor: "pointer",
            color: "#c8a97e",
            fontSize: "11px",
            fontWeight: "bold",
            transition: "all 0.2s",
          }}
        >
          <Upload size={14} /> Select Images
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {/* Filters */}
      <div>
        <label
          style={{
            display: "block",
            color: "#c8a97e",
            fontSize: "10px",
            fontWeight: "bold",
            marginBottom: "8px",
          }}
        >
          Filters
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() =>
                setSelectedFilters((prev) =>
                  prev.includes(filter.id)
                    ? prev.filter((f) => f !== filter.id)
                    : [...prev, filter.id],
                )
              }
              style={{
                padding: "6px",
                backgroundColor: selectedFilters.includes(filter.id)
                  ? "rgba(200, 169, 126, 0.2)"
                  : "#0b0f1a",
                color: selectedFilters.includes(filter.id) ? "#c8a97e" : "#666",
                border: `1px solid ${
                  selectedFilters.includes(filter.id) ? "#c8a97e" : "#333"
                }`,
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: "bold",
                transition: "all 0.2s",
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Adjustments */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          fontSize: "10px",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              color: "#c8a97e",
              fontWeight: "bold",
              marginBottom: "4px",
            }}
          >
            Brightness: {brightness}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c8a97e" }}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              color: "#c8a97e",
              fontWeight: "bold",
              marginBottom: "4px",
            }}
          >
            Contrast: {contrast}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c8a97e" }}
          />
        </div>
      </div>

      {/* Format & Quality */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          fontSize: "10px",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              color: "#c8a97e",
              fontWeight: "bold",
              marginBottom: "4px",
            }}
          >
            Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as "png" | "jpg" | "webp")}
            style={{
              width: "100%",
              padding: "6px",
              backgroundColor: "#0b0f1a",
              color: "#c8a97e",
              border: "1px solid #333",
              borderRadius: "4px",
            }}
          >
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
            <option value="webp">WebP</option>
          </select>
        </div>
        <div>
          <label
            style={{
              display: "block",
              color: "#c8a97e",
              fontWeight: "bold",
              marginBottom: "4px",
            }}
          >
            Quality: {quality}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c8a97e" }}
          />
        </div>
      </div>

      {/* Tasks list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          border: "1px solid #333",
          borderRadius: "4px",
          backgroundColor: "#0b0f1a",
        }}
      >
        {tasks.length === 0 ? (
          <div
            style={{
              padding: "12px",
              color: "#666",
              fontSize: "10px",
              textAlign: "center",
            }}
          >
            No images selected
          </div>
        ) : (
          <div>
            {tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #333",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "#c8a97e",
                      fontSize: "10px",
                      fontWeight: "bold",
                      marginBottom: "4px",
                    }}
                  >
                    {task.filename}
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "4px",
                      backgroundColor: "#333",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        backgroundColor: "#c8a97e",
                        width: `${task.progress}%`,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
                {task.status === "processing" && (
                  <Loader size={12} style={{ animation: "spin 1s linear infinite" }} />
                )}
                {task.status === "completed" && <CheckCircle size={12} color="#c8a97e" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={handleProcessAll}
          disabled={isProcessing || tasks.length === 0}
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor: "#c8a97e",
            color: "#000",
            border: "none",
            borderRadius: "4px",
            cursor: isProcessing ? "not-allowed" : "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            opacity: isProcessing || tasks.length === 0 ? 0.6 : 1,
          }}
        >
          {isProcessing ? "Processing..." : "Process All"}
        </button>
        <button
          onClick={handleDownloadAll}
          disabled={tasks.every((t) => t.status !== "completed")}
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor: "#0b0f1a",
            color: "#c8a97e",
            border: "1px solid #333",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          <Download size={10} /> Download
        </button>
        <button
          onClick={handleClearCompleted}
          style={{
            padding: "8px 12px",
            backgroundColor: "#0b0f1a",
            color: "#666",
            border: "1px solid #333",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "10px",
            fontWeight: "bold",
          }}
        >
          Clear
        </button>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
