import React, { useState } from "react";
import { Sparkles, X } from "lucide-react";
interface AdvancedAIPanelProps {
  onAIAction: (action: string, params: any) => void;
}
export default function AdvancedAIPanel({ onAIAction }: AdvancedAIPanelProps) {
  const [activeTab, setActiveTab] = useState("generate");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("photorealistic");
  const [quality, setQuality] = useState("hd");
  const [isLoading, setIsLoading] = useState(false);
  const aiStyles = [
    { id: "photorealistic", label: "Photorealistic", icon: "📷" },
    { id: "oil-painting", label: "Oil Painting", icon: "🎨" },
    { id: "watercolor", label: "Watercolor", icon: "🌊" },
    { id: "sketch", label: "Pencil Sketch", icon: "✏️" },
    { id: "digital-art", label: "Digital Art", icon: "💻" },
    { id: "anime", label: "Anime", icon: "👹" },
    { id: "3d-render", label: "3D Render", icon: "🎲" },
    { id: "cyberpunk", label: "Cyberpunk", icon: "🤖" },
  ];
  const aiFeatures = [
    {
      id: "remove-bg",
      label: "Remove Background",
      icon: "🎭",
      desc: "Remove or replace image backgrounds intelligently",
    },
    {
      id: "enhance",
      label: "Enhance Quality",
      icon: "✨",
      desc: "Upscale and enhance image quality 4x",
    },
    {
      id: "colorize",
      label: "Colorize B&W",
      icon: "🌈",
      desc: "Add natural colors to black & white photos",
    },
    {
      id: "style-transfer",
      label: "Style Transfer",
      icon: "🎨",
      desc: "Apply artistic styles to any image",
    },
    {
      id: "object-remove",
      label: "Remove Objects",
      icon: "🧹",
      desc: "Remove unwanted objects from images",
    },
    {
      id: "face-enhance",
      label: "Enhance Faces",
      icon: "😊",
      desc: "AI-powered face enhancement and retouching",
    },
    {
      id: "background-gen",
      label: "Generate Background",
      icon: "🌅",
      desc: "Generate seamless backgrounds",
    },
    {
      id: "detail-boost",
      label: "Boost Details",
      icon: "🔍",
      desc: "Sharpen and enhance fine details",
    },
  ];
  const handleGenerateAdvanced = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      onAIAction("generate-advanced", {
        prompt: `${prompt}. Style: ${style}`,
        quality,
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleFeatureClick = async (featureId: string) => {
    setIsLoading(true);
    try {
      onAIAction(`ai-${featureId}`, { quality });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div
      style={{
        backgroundColor: "#0b0f1a",
        borderRadius: "8px",
        border: "1px solid #c8a97e",
        overflow: "hidden",
      }}
    >
      {" "}
      {/* Tab Navigation */}{" "}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #333",
          backgroundColor: "#0f0f0f",
        }}
      >
        {" "}
        {[
          { id: "generate", label: "Generate" },
          { id: "enhance", label: "Enhance" },
          { id: "transform", label: "Transform" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor:
                activeTab === tab.id ? "rgba(0, 240, 255, 0.1)" : "transparent",
              color: activeTab === tab.id ? "#c8a97e" : "#666",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              borderBottom: activeTab === tab.id ? "2px solid #c8a97e" : "none",
              transition: "all 0.2s",
            }}
          >
            {" "}
            {tab.label}{" "}
          </button>
        ))}{" "}
      </div>{" "}
      {/* Content */}{" "}
      <div style={{ padding: "16px" }}>
        {" "}
        {activeTab === "generate" && (
          <div>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "12px",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              {" "}
              What do you want to create?{" "}
            </label>{" "}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your image in detail..."
              style={{
                width: "100%",
                minHeight: "80px",
                padding: "8px",
                backgroundColor: "#0f0f0f",
                color: "#fff",
                border: "1px solid #333",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "11px",
                marginBottom: "12px",
                resize: "none",
              }}
            />{" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "12px",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              {" "}
              Art Style{" "}
            </label>{" "}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px",
                marginBottom: "12px",
              }}
            >
              {" "}
              {aiStyles.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  style={{
                    padding: "8px",
                    backgroundColor:
                      style === s.id ? "rgba(0, 240, 255, 0.2)" : "#0f0f0f",
                    color: style === s.id ? "#c8a97e" : "#666",
                    border: `1px solid ${style === s.id ? "#c8a97e" : "#333"}`,
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "bold",
                    transition: "all 0.2s",
                  }}
                >
                  {" "}
                  {s.icon} {s.label}{" "}
                </button>
              ))}{" "}
            </div>{" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "12px",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              {" "}
              Quality{" "}
            </label>{" "}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              {" "}
              {["standard", "hd", "ultra"].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    backgroundColor:
                      quality === q ? "rgba(0, 240, 255, 0.2)" : "#0f0f0f",
                    color: quality === q ? "#c8a97e" : "#666",
                    border: `1px solid ${quality === q ? "#c8a97e" : "#333"}`,
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    transition: "all 0.2s",
                  }}
                >
                  {" "}
                  {q === "standard" ? "⚡" : q === "hd" ? "✨" : "🚀"} {q}{" "}
                </button>
              ))}{" "}
            </div>{" "}
            <button
              onClick={handleGenerateAdvanced}
              disabled={isLoading || !prompt.trim()}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#c8a97e",
                color: "#000",
                border: "none",
                borderRadius: "4px",
                cursor: isLoading ? "not-allowed" : "pointer",
                fontSize: "12px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              {" "}
              {isLoading && <span>⏳</span>}{" "}
              {isLoading ? "Generating..." : "✨ Generate"}{" "}
            </button>{" "}
          </div>
        )}{" "}
        {activeTab === "enhance" && (
          <div>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "12px",
                fontWeight: "bold",
                marginBottom: "12px",
              }}
            >
              {" "}
              Quick Enhancement Tools{" "}
            </label>{" "}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              {" "}
              {aiFeatures.slice(0, 4).map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => handleFeatureClick(feature.id)}
                  disabled={isLoading}
                  style={{
                    padding: "12px",
                    backgroundColor: "#0f0f0f",
                    color: "#c8a97e",
                    border: "1px solid #333",
                    borderRadius: "4px",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    fontSize: "11px",
                    fontWeight: "bold",
                    textAlign: "center",
                    transition: "all 0.2s",
                    opacity: isLoading ? 0.5 : 1,
                  }}
                  title={feature.desc}
                >
                  {" "}
                  {feature.icon} <br /> {feature.label}{" "}
                </button>
              ))}{" "}
            </div>{" "}
          </div>
        )}{" "}
        {activeTab === "transform" && (
          <div>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "12px",
                fontWeight: "bold",
                marginBottom: "12px",
              }}
            >
              {" "}
              Image Transformation Tools{" "}
            </label>{" "}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              {" "}
              {aiFeatures.slice(4).map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => handleFeatureClick(feature.id)}
                  disabled={isLoading}
                  style={{
                    padding: "12px",
                    backgroundColor: "#0f0f0f",
                    color: "#c8a97e",
                    border: "1px solid #333",
                    borderRadius: "4px",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    fontSize: "11px",
                    fontWeight: "bold",
                    textAlign: "center",
                    transition: "all 0.2s",
                    opacity: isLoading ? 0.5 : 1,
                  }}
                  title={feature.desc}
                >
                  {" "}
                  {feature.icon} <br /> {feature.label}{" "}
                </button>
              ))}{" "}
            </div>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
