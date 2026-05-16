import React, { useState } from "react";
import { Zap, Loader } from "lucide-react";
interface ImageEnhancementPanelProps {
  onEnhance: (enhancementType: string, params: any) => void;
}
export default function ImageEnhancementPanel({
  onEnhance,
}: ImageEnhancementPanelProps) {
  const [activeTab, setActiveTab] = useState<"quality" | "style" | "special">(
    "quality",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [enhancementStrength, setEnhancementStrength] = useState(50);
  const qualityEnhancements = [
    {
      id: "upscale-2x",
      label: "Upscale 2x",
      icon: "🔍",
      description: "Double resolution with AI enhancement",
      strength: true,
    },
    {
      id: "upscale-4x",
      label: "Upscale 4x",
      icon: "🔎",
      description: "4x resolution enhancement",
      strength: true,
    },
    {
      id: "denoise",
      label: "Denoise",
      icon: "✨",
      description: "Remove noise while preserving details",
      strength: true,
    },
    {
      id: "sharpen-details",
      label: "Sharpen Details",
      icon: "⚡",
      description: "Enhance fine details and edges",
      strength: true,
    },
    {
      id: "color-enhance",
      label: "Color Enhance",
      icon: "🎨",
      description: "Improve color vibrancy and accuracy",
      strength: true,
    },
    {
      id: "contrast-enhance",
      label: "Contrast",
      icon: "🔆",
      description: "Auto-adjust contrast for better definition",
      strength: true,
    },
  ];
  const styleEnhancements = [
    {
      id: "vintage-film",
      label: "Vintage Film",
      icon: "📽️",
      description: "Apply vintage film grain and color",
    },
    {
      id: "noir",
      label: "Noir",
      icon: "🎬",
      description: "High contrast black and white",
    },
    {
      id: "sepia-tone",
      label: "Sepia",
      icon: "📸",
      description: "Warm, nostalgic brown tone",
    },
    {
      id: "cool-tone",
      label: "Cool Tone",
      icon: "❄️",
      description: "Cool blue/cyan color grading",
    },
    {
      id: "warm-tone",
      label: "Warm Tone",
      icon: "🔥",
      description: "Warm orange/yellow color grading",
    },
    {
      id: "cyberpunk",
      label: "Cyberpunk",
      icon: "🤖",
      description: "Neon colors and high contrast",
    },
  ];
  const specialEffects = [
    {
      id: "hdr",
      label: "HDR Effect",
      icon: "🌈",
      description: "High dynamic range effect",
    },
    {
      id: "cinematic",
      label: "Cinematic",
      icon: "🎥",
      description: "Movie-like color grading",
    },
    {
      id: "tilt-shift",
      label: "Tilt-Shift",
      icon: "🎯",
      description: "Miniature effect with focus blur",
    },
    {
      id: "bokeh",
      label: "Bokeh",
      icon: "💫",
      description: "Add artistic bokeh effect",
    },
    {
      id: "motion-blur",
      label: "Motion Blur",
      icon: "💨",
      description: "Add directional motion effect",
    },
    {
      id: "light-leak",
      label: "Light Leak",
      icon: "💡",
      description: "Add vintage light leak effect",
    },
  ];
  const handleEnhance = async (enhancementType: string) => {
    setIsProcessing(true);
    try {
      onEnhance(enhancementType, { strength: enhancementStrength });
    } finally {
      setIsProcessing(false);
    }
  };
  const renderEnhancements = (items: any[]) => (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}
    >
      {" "}
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => handleEnhance(item.id)}
          disabled={isProcessing}
          title={item.description}
          style={{
            padding: "12px",
            backgroundColor: "#0f0f0f",
            color: "#c8a97e",
            border: "1px solid #333",
            borderRadius: "4px",
            cursor: isProcessing ? "not-allowed" : "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            textAlign: "center",
            transition: "all 0.2s",
            opacity: isProcessing ? 0.5 : 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {" "}
          <span style={{ fontSize: "16px" }}>{item.icon}</span>{" "}
          <span>{item.label}</span>{" "}
        </button>
      ))}{" "}
    </div>
  );
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
          { id: "quality", label: "Quality" },
          { id: "style", label: "Style" },
          { id: "special", label: "Special" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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
        {/* Strength Slider - Only for quality enhancements */}{" "}
        {activeTab === "quality" && (
          <div style={{ marginBottom: "16px" }}>
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
              Enhancement Strength: {enhancementStrength}%{" "}
            </label>{" "}
            <input
              type="range"
              min="0"
              max="100"
              value={enhancementStrength}
              onChange={(e) => setEnhancementStrength(Number(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#c8a97e",
                cursor: "pointer",
              }}
            />{" "}
          </div>
        )}{" "}
        {/* Quality Enhancements */}{" "}
        {activeTab === "quality" && renderEnhancements(qualityEnhancements)}{" "}
        {/* Style Enhancements */}{" "}
        {activeTab === "style" && renderEnhancements(styleEnhancements)}{" "}
        {/* Special Effects */}{" "}
        {activeTab === "special" && renderEnhancements(specialEffects)}{" "}
        {/* Processing indicator */}{" "}
        {isProcessing && (
          <div
            style={{
              marginTop: "12px",
              padding: "12px",
              backgroundColor: "rgba(0, 240, 255, 0.1)",
              borderRadius: "4px",
              border: "1px solid #c8a97e",
              color: "#c8a97e",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {" "}
            <Loader
              size={16}
              style={{ animation: "spin 2s linear infinite" }}
            />{" "}
            Processing enhancement...{" "}
          </div>
        )}{" "}
      </div>{" "}
      <style>{` @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>{" "}
    </div>
  );
}
