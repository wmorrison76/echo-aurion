import React, { useState } from "react";
import { X, Loader } from "lucide-react";

interface GenerativeFillDialogProps {
  canvas: HTMLCanvasElement | null;
  onApply: (prompt: string, quality: "standard" | "hd") => void;
  onCancel: () => void;
}

export default function GenerativeFillDialog({
  canvas,
  onApply,
  onCancel,
}: GenerativeFillDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }
    if (!canvas) {
      setError("Canvas not ready");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      onApply(prompt, quality);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply generative fill");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "#2a2a2a",
          borderRadius: "8px",
          padding: "20px",
          maxWidth: "500px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
          border: "1px solid #c8a97e",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ color: "#c8a97e", margin: 0, fontSize: "18px" }}>Generative Fill</h2>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              background: "none",
              border: "none",
              color: "#c8a97e",
              cursor: isLoading ? "not-allowed" : "pointer",
              padding: "4px",
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <X size={20} />
          </button>
        </div>
        <p style={{ color: "#999", fontSize: "13px", marginBottom: "16px", lineHeight: "1.5" }}>
          Select an area of your image and describe what you want to fill it with. AI will
          intelligently generate the content based on your description and the surrounding context.
        </p>
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{ display: "block", color: "#c8a97e", fontSize: "12px", marginBottom: "8px" }}
          >
            Describe what to fill
          </label>
          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setError(null);
            }}
            placeholder="e.g., 'blue sky with white clouds', 'green grass', 'brick wall'"
            disabled={isLoading}
            style={{
              width: "100%",
              minHeight: "80px",
              padding: "8px",
              backgroundColor: "#0b0f1a",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "4px",
              fontFamily: "monospace",
              fontSize: "12px",
              resize: "vertical",
              opacity: isLoading ? 0.5 : 1,
            }}
          />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{ display: "block", color: "#c8a97e", fontSize: "12px", marginBottom: "6px" }}
          >
            Quality
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            {(["standard", "hd"] as const).map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "8px",
                  backgroundColor: quality === q ? "rgba(200, 169, 126, 0.2)" : "#0b0f1a",
                  color: "#c8a97e",
                  border: `1px solid ${quality === q ? "#c8a97e" : "#444"}`,
                  borderRadius: "4px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                {q === "standard" ? "Fast · Standard" : "HD · Slower"}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <div
            style={{
              padding: "8px",
              backgroundColor: "rgba(255, 100, 100, 0.1)",
              color: "#ff6666",
              borderRadius: "4px",
              fontSize: "12px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "8px",
              backgroundColor: "transparent",
              color: "#c8a97e",
              border: "1px solid #c8a97e",
              borderRadius: "4px",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: "12px",
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isLoading || !prompt.trim()}
            style={{
              flex: 1,
              padding: "8px",
              backgroundColor: "#c8a97e",
              color: "#000",
              border: "1px solid #c8a97e",
              borderRadius: "4px",
              cursor: isLoading || !prompt.trim() ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              opacity: isLoading || !prompt.trim() ? 0.5 : 1,
            }}
          >
            {isLoading && (
              <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
            )}
            {isLoading ? "Filling..." : "Fill"}
          </button>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
