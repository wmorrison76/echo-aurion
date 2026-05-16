import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
interface VectorPanelProps {
  strokeColor: string;
  strokeWidth: number;
  strokeAlpha: number;
  fillColor: string;
  fillAlpha: number;
  fillEnabled: boolean;
  onStrokeColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onStrokeAlphaChange: (alpha: number) => void;
  onFillColorChange: (color: string) => void;
  onFillAlphaChange: (alpha: number) => void;
  onFillEnabledChange: (enabled: boolean) => void;
}
export default function VectorPanel({
  strokeColor,
  strokeWidth,
  strokeAlpha,
  fillColor,
  fillAlpha,
  fillEnabled,
  onStrokeColorChange,
  onStrokeWidthChange,
  onStrokeAlphaChange,
  onFillColorChange,
  onFillAlphaChange,
  onFillEnabledChange,
}: VectorPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const Section = ({
    title,
    id,
    children,
  }: {
    title: string;
    id: string;
    children: React.ReactNode;
  }) => (
    <div style={{ marginBottom: "16px", borderBottom: "1px solid #333" }}>
      {" "}
      <button
        onClick={() => setExpandedSection(expandedSection === id ? null : id)}
        style={{
          width: "100%",
          padding: "12px",
          backgroundColor: "transparent",
          border: "none",
          color: "#c8a97e",
          fontSize: "11px",
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "rgba(200, 169, 126, 0.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "transparent";
        }}
      >
        {" "}
        {title}{" "}
        <ChevronDown
          size={14}
          style={{
            transform:
              expandedSection === id ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />{" "}
      </button>{" "}
      {expandedSection === id && (
        <div style={{ padding: "12px", backgroundColor: "rgba(0, 0, 0, 0.3)" }}>
          {" "}
          {children}{" "}
        </div>
      )}{" "}
    </div>
  );
  return (
    <div
      style={{ backgroundColor: "#0a0a0a", color: "#ccc", fontSize: "11px" }}
    >
      {" "}
      <Section title="Stroke" id="stroke">
        {" "}
        <div style={{ marginBottom: "12px" }}>
          {" "}
          <label
            style={{ color: "#aaa", display: "block", marginBottom: "4px" }}
          >
            Color
          </label>{" "}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {" "}
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => onStrokeColorChange(e.target.value)}
              style={{
                width: "40px",
                height: "32px",
                border: "1px solid #444",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            />{" "}
            <input
              type="text"
              value={strokeColor}
              onChange={(e) => onStrokeColorChange(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: "#0b0f1a",
                border: "1px solid #444",
                color: "#c8a97e",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "10px",
              }}
            />{" "}
          </div>{" "}
        </div>{" "}
        <div style={{ marginBottom: "12px" }}>
          {" "}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            {" "}
            <label style={{ color: "#aaa" }}>Width</label>{" "}
            <span style={{ color: "#c8a97e" }}>{strokeWidth}px</span>{" "}
          </div>{" "}
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={strokeWidth}
            onChange={(e) => onStrokeWidthChange(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />{" "}
        </div>{" "}
        <div style={{ marginBottom: "12px" }}>
          {" "}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            {" "}
            <label style={{ color: "#aaa" }}>Opacity</label>{" "}
            <span style={{ color: "#c8a97e" }}>{strokeAlpha}%</span>{" "}
          </div>{" "}
          <input
            type="range"
            min="0"
            max="100"
            value={strokeAlpha}
            onChange={(e) => onStrokeAlphaChange(Number(e.target.value))}
            style={{ width: "100%" }}
          />{" "}
        </div>{" "}
      </Section>{" "}
      <Section title="Fill" id="fill">
        {" "}
        <div style={{ marginBottom: "12px" }}>
          {" "}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              marginBottom: "8px",
            }}
          >
            {" "}
            <input
              type="checkbox"
              checked={fillEnabled}
              onChange={(e) => onFillEnabledChange(e.target.checked)}
              style={{ cursor: "pointer" }}
            />{" "}
            <span style={{ color: "#aaa" }}>Enable Fill</span>{" "}
          </label>{" "}
        </div>{" "}
        {fillEnabled && (
          <>
            {" "}
            <div style={{ marginBottom: "12px" }}>
              {" "}
              <label
                style={{ color: "#aaa", display: "block", marginBottom: "4px" }}
              >
                Color
              </label>{" "}
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                {" "}
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => onFillColorChange(e.target.value)}
                  style={{
                    width: "40px",
                    height: "32px",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                />{" "}
                <input
                  type="text"
                  value={fillColor}
                  onChange={(e) => onFillColorChange(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: "#0b0f1a",
                    border: "1px solid #444",
                    color: "#c8a97e",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "10px",
                  }}
                />{" "}
              </div>{" "}
            </div>{" "}
            <div style={{ marginBottom: "12px" }}>
              {" "}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                {" "}
                <label style={{ color: "#aaa" }}>Opacity</label>{" "}
                <span style={{ color: "#c8a97e" }}>{fillAlpha}%</span>{" "}
              </div>{" "}
              <input
                type="range"
                min="0"
                max="100"
                value={fillAlpha}
                onChange={(e) => onFillAlphaChange(Number(e.target.value))}
                style={{ width: "100%" }}
              />{" "}
            </div>{" "}
          </>
        )}{" "}
      </Section>{" "}
    </div>
  );
}
