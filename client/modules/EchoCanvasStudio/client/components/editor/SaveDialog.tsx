import React, { useState } from "react";
import { X } from "lucide-react";

interface SaveDialogProps {
  designTitle: string;
  onSave: (filename: string, format: string) => void;
  onCancel: () => void;
  isOpen: boolean;
  mode?: "save" | "save-as";
}

export default function SaveDialog({
  designTitle,
  onSave,
  onCancel,
  isOpen,
  mode = "save",
}: SaveDialogProps) {
  const [filename, setFilename] = useState(designTitle);
  const [format, setFormat] = useState("echocanva");

  const dialogTitle = mode === "save-as" ? "Save As" : "Save File";

  if (!isOpen) return null;

  const formats = [
    {
      id: "echocanva",
      name: "EchoCanva Project (.echocanva)",
      ext: ".echocanva",
    },
    { id: "png", name: "PNG Image (.png)", ext: ".png" },
    { id: "jpg", name: "JPEG Image (.jpg)", ext: ".jpg" },
    { id: "webp", name: "WebP Image (.webp)", ext: ".webp" },
    { id: "psd", name: "Photoshop File (.psd)", ext: ".psd" },
    { id: "svg", name: "SVG Vector (.svg)", ext: ".svg" },
  ];

  const handleSave = () => {
    if (!filename.trim()) {
      alert("Please enter a filename");
      return;
    }
    onSave(filename, format);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "#0b0f1a",
          border: "1px solid #444",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "500px",
          width: "90%",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ color: "#c8a97e", margin: 0, fontSize: "18px" }}>
            {dialogTitle}
          </h2>
          <button
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              color: "#c8a97e",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Filename Input */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            Filename
          </label>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Enter filename"
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "4px",
              backgroundColor: "#0a0a0a",
              border: "1px solid #444",
              color: "#ccc",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
        </div>

        {/* Format Selection */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            File Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "4px",
              backgroundColor: "#0a0a0a",
              border: "1px solid #444",
              color: "#ccc",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            {formats.map((fmt) => (
              <option key={fmt.id} value={fmt.id}>
                {fmt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Preview of full filename */}
        <div
          style={{
            padding: "12px",
            backgroundColor: "rgba(200, 169, 126, 0.05)",
            border: "1px solid #333",
            borderRadius: "4px",
            marginBottom: "24px",
            color: "#666",
            fontSize: "12px",
          }}
        >
          Full path: {filename}
          {formats.find((f) => f.id === format)?.ext}
        </div>

        {/* Buttons */}
        <div
          style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              borderRadius: "4px",
              backgroundColor: "transparent",
              border: "1px solid #444",
              color: "#ccc",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(200, 169, 126, 0.1)";
              (e.currentTarget as HTMLButtonElement).style.color = "#c8a97e";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "#ccc";
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "10px 20px",
              borderRadius: "4px",
              backgroundColor: "#c8a97e",
              border: "none",
              color: "#000",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
