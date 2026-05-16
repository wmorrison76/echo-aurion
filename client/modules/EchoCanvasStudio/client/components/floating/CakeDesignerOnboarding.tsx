import React, { useState } from "react";
import { ChevronRight, Sparkles, Zap, Palette, Gift, Star } from "lucide-react";

interface CakeDesignerOnboardingProps {
  onStartDesign: (mode: "quick" | "detailed") => void;
  onViewGallery: () => void;
  onClose: () => void;
}

export default function CakeDesignerOnboarding({
  onStartDesign,
  onViewGallery,
  onClose,
}: CakeDesignerOnboardingProps) {
  const [selectedMode, setSelectedMode] = useState<"quick" | "detailed" | null>(null);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "linear-gradient(135deg, #0b0f1a 0%, #2a1a3a 100%)",
        color: "#fff",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        overflow: "auto",
      }}
    >
      {/* Header Hero */}
      <div
        style={{
          padding: "40px 30px",
          textAlign: "center",
          background: "linear-gradient(135deg, #c8a97e 0%, #94a3b8 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            fontWeight: "900",
            marginBottom: "10px",
            textShadow: "0 0 30px rgba(0, 240, 255, 0.3)",
          }}
        >
          🎨 Design Your Perfect Cake
        </div>
        <div
          style={{
            fontSize: "16px",
            color: "#aaa",
            marginBottom: "20px",
          }}
        >
          Let AI help you create stunning, custom cake designs in minutes
        </div>
      </div>

      {/* Two-Mode Selection */}
      <div
        style={{
          flex: 1,
          padding: "30px",
          display: "flex",
          gap: "20px",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Quick Design Mode */}
        <div
          onClick={() => {
            setSelectedMode("quick");
            onStartDesign("quick");
          }}
          style={{
            flex: 1,
            padding: "30px",
            backgroundColor: "rgba(0, 240, 255, 0.1)",
            border: `2px solid ${selectedMode === "quick" ? "#c8a97e" : "#333"}`,
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            transform: selectedMode === "quick" ? "scale(1.05)" : "scale(1)",
            textAlign: "center",
          }}
          onMouseEnter={(e) => {
            if (selectedMode !== "quick") {
              (e.currentTarget as HTMLElement).style.borderColor = "#c8a97e";
              (e.currentTarget as HTMLElement).style.background =
                "rgba(0, 240, 255, 0.15)";
            }
          }}
          onMouseLeave={(e) => {
            if (selectedMode !== "quick") {
              (e.currentTarget as HTMLElement).style.borderColor = "#333";
              (e.currentTarget as HTMLElement).style.background =
                "rgba(0, 240, 255, 0.1)";
            }
          }}
        >
          <Zap size={40} style={{ color: "#c8a97e", marginBottom: "16px" }} />
          <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
            ⚡ Quick Design
          </div>
          <div style={{ color: "#999", fontSize: "14px", marginBottom: "16px" }}>
            Get a custom cake design in 60 seconds with AI
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "center",
              fontSize: "12px",
              color: "#666",
            }}
          >
            <span style={{ backgroundColor: "#333", padding: "4px 8px", borderRadius: "4px" }}>
              💬 AI Powered
            </span>
            <span style={{ backgroundColor: "#333", padding: "4px 8px", borderRadius: "4px" }}>
              ⚡ Fast
            </span>
            <span style={{ backgroundColor: "#333", padding: "4px 8px", borderRadius: "4px" }}>
              🎯 Simple
            </span>
          </div>
        </div>

        {/* Detailed Design Mode */}
        <div
          onClick={() => {
            setSelectedMode("detailed");
            onStartDesign("detailed");
          }}
          style={{
            flex: 1,
            padding: "30px",
            backgroundColor: "rgba(148, 163, 184, 0.1)",
            border: `2px solid ${selectedMode === "detailed" ? "#94a3b8" : "#333"}`,
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            transform: selectedMode === "detailed" ? "scale(1.05)" : "scale(1)",
            textAlign: "center",
          }}
          onMouseEnter={(e) => {
            if (selectedMode !== "detailed") {
              (e.currentTarget as HTMLElement).style.borderColor = "#94a3b8";
              (e.currentTarget as HTMLElement).style.background =
                "rgba(148, 163, 184, 0.15)";
            }
          }}
          onMouseLeave={(e) => {
            if (selectedMode !== "detailed") {
              (e.currentTarget as HTMLElement).style.borderColor = "#333";
              (e.currentTarget as HTMLElement).style.background =
                "rgba(148, 163, 184, 0.1)";
            }
          }}
        >
          <Palette size={40} style={{ color: "#94a3b8", marginBottom: "16px" }} />
          <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
            🎨 Custom Design
          </div>
          <div style={{ color: "#999", fontSize: "14px", marginBottom: "16px" }}>
            Full control with detailed questions & refinement
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "center",
              fontSize: "12px",
              color: "#666",
            }}
          >
            <span style={{ backgroundColor: "#333", padding: "4px 8px", borderRadius: "4px" }}>
              🎯 Detailed
            </span>
            <span style={{ backgroundColor: "#333", padding: "4px 8px", borderRadius: "4px" }}>
              ✨ Refined
            </span>
            <span style={{ backgroundColor: "#333", padding: "4px 8px", borderRadius: "4px" }}>
              👥 Personal
            </span>
          </div>
        </div>
      </div>

      {/* Features Highlight */}
      <div
        style={{
          padding: "30px",
          backgroundColor: "rgba(0, 240, 255, 0.05)",
          borderTop: "1px solid #333",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>
          ✨ Why choose Cake Designer?
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
          }}
        >
          <FeatureItem icon="🤖" title="AI-Powered" desc="Intelligent design generation" />
          <FeatureItem icon="⚡" title="Lightning Fast" desc="Designs in seconds" />
          <FeatureItem icon="🎨" title="Fully Customizable" desc="Your creative control" />
          <FeatureItem icon="📱" title="Print Ready" desc="Perfect for production" />
        </div>
      </div>

      {/* Footer Actions */}
      <div
        style={{
          padding: "20px 30px",
          display: "flex",
          gap: "12px",
          borderTop: "1px solid #333",
        }}
      >
        <button
          onClick={onViewGallery}
          style={{
            flex: 1,
            padding: "12px",
            backgroundColor: "transparent",
            border: "2px solid #c8a97e",
            color: "#c8a97e",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "rgba(0, 240, 255, 0.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
          }}
        >
          📸 View Gallery
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: "12px",
            backgroundColor: "transparent",
            border: "2px solid #666",
            color: "#999",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#c8a97e";
            (e.currentTarget as HTMLElement).style.color = "#c8a97e";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#666";
            (e.currentTarget as HTMLElement).style.color = "#999";
          }}
        >
          ← Back to Editor
        </button>
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        padding: "12px",
        backgroundColor: "rgba(0, 240, 255, 0.05)",
        borderRadius: "6px",
        border: "1px solid #333",
      }}
    >
      <div style={{ fontSize: "20px", marginBottom: "4px" }}>{icon}</div>
      <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "2px" }}>
        {title}
      </div>
      <div style={{ fontSize: "11px", color: "#666" }}>{desc}</div>
    </div>
  );
}
