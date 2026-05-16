import React, { useState } from "react";
import { Upload, Loader } from "lucide-react";
interface BackgroundReplacementPanelProps {
  onApply: (mode: string, background?: string) => void;
  onCancel: () => void;
}
export default function BackgroundReplacementPanel({
  onApply,
  onCancel,
}: BackgroundReplacementPanelProps) {
  const [mode, setMode] = useState<"remove" | "replace">("remove");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setBackgroundImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  const handleApply = async () => {
    setIsProcessing(true);
    try {
      if (mode === "remove") {
        onApply("remove");
      } else if (mode === "replace") {
        const bg =
          backgroundImage || `data:image/png;base64,${btoa(backgroundColor)}`;
        onApply("replace", bg);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        backgroundColor: "#0a0a0a",
        borderRadius: "8px",
        border: "1px solid #333",
      }}
    >
      {" "}
      {/* Title */}{" "}
      <h3
        style={{
          color: "#c8a97e",
          fontSize: "12px",
          fontWeight: "bold",
          margin: 0,
        }}
      >
        {" "}
        Background Tools{" "}
      </h3>{" "}
      {/* Mode Toggle */}{" "}
      <div style={{ display: "flex", gap: "8px" }}>
        {" "}
        <button
          onClick={() => setMode("remove")}
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor:
              mode === "remove" ? "rgba(0, 240, 255, 0.2)" : "#0b0f1a",
            color: mode === "remove" ? "#c8a97e" : "#666",
            border: `1px solid ${mode === "remove" ? "#c8a97e" : "#333"}`,
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            transition: "all 0.2s",
          }}
        >
          {" "}
          Remove{" "}
        </button>{" "}
        <button
          onClick={() => setMode("replace")}
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor:
              mode === "replace" ? "rgba(0, 240, 255, 0.2)" : "#0b0f1a",
            color: mode === "replace" ? "#c8a97e" : "#666",
            border: `1px solid ${mode === "replace" ? "#c8a97e" : "#333"}`,
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            transition: "all 0.2s",
          }}
        >
          {" "}
          Replace{" "}
        </button>{" "}
      </div>{" "}
      {/* Content */}{" "}
      {mode === "remove" && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#0b0f1a",
            borderRadius: "4px",
            border: "1px solid #333",
            fontSize: "10px",
            color: "#c8a97e",
            textAlign: "center",
          }}
        >
          {" "}
          ✓ Remove background and make transparent{" "}
        </div>
      )}{" "}
      {mode === "replace" && (
        <>
          {" "}
          {/* Color Option */}{" "}
          <div>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "10px",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              {" "}
              Background Color{" "}
            </label>{" "}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {" "}
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => {
                  setBackgroundColor(e.target.value);
                  setBackgroundImage(null);
                }}
                style={{
                  width: "50px",
                  height: "40px",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              />{" "}
              <div
                style={{
                  flex: 1,
                  padding: "8px",
                  backgroundColor: backgroundColor,
                  borderRadius: "4px",
                  border: "1px solid #333",
                  minHeight: "40px",
                }}
              />{" "}
            </div>{" "}
          </div>{" "}
          {/* OR Divider */}{" "}
          <div
            style={{
              textAlign: "center",
              color: "#666",
              fontSize: "10px",
              fontWeight: "bold",
            }}
          >
            {" "}
            OR{" "}
          </div>{" "}
          {/* Image Option */}{" "}
          <div>
            {" "}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px",
                backgroundColor: "#0b0f1a",
                border: "1px solid #333",
                borderRadius: "4px",
                cursor: "pointer",
                color: "#c8a97e",
                fontSize: "11px",
                fontWeight: "bold",
                transition: "all 0.2s",
              }}
            >
              {" "}
              <Upload size={14} /> Upload Background Image{" "}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />{" "}
            </label>{" "}
          </div>{" "}
          {/* Preview */}{" "}
          {backgroundImage && (
            <div
              style={{
                width: "100%",
                height: "100px",
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: "4px",
                border: "1px solid #333",
              }}
            />
          )}{" "}
        </>
      )}{" "}
      {/* Apply Button */}{" "}
      <button
        onClick={handleApply}
        disabled={isProcessing}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: "#c8a97e",
          color: "#000",
          border: "none",
          borderRadius: "4px",
          cursor: isProcessing ? "not-allowed" : "pointer",
          fontSize: "11px",
          fontWeight: "bold",
          opacity: isProcessing ? 0.6 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
        }}
      >
        {" "}
        {isProcessing ? (
          <>
            {" "}
            <Loader
              size={12}
              style={{ animation: "spin 1s linear infinite" }}
            />
            {""} Processing...{" "}
          </>
        ) : (
          `Apply ${mode === "remove" ? "Removal" : "Replacement"}`
        )}{" "}
      </button>{" "}
      {/* Cancel Button */}{" "}
      <button
        onClick={onCancel}
        style={{
          width: "100%",
          padding: "8px",
          backgroundColor: "#0b0f1a",
          color: "#666",
          border: "1px solid #333",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "11px",
          fontWeight: "bold",
        }}
      >
        {" "}
        Cancel{" "}
      </button>{" "}
      <style>{` @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>{" "}
    </div>
  );
}
