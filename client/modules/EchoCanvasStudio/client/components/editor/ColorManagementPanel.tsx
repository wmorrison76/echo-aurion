/**
 * Color Management Panel
 * Allows users to manage color profiles and export with specific color spaces
 */

import React, { useState } from "react";
import { Settings } from "lucide-react";
import { ColorSpace, RenderingIntent } from "../../lib/color-management";

interface ColorManagementPanelProps {
  currentColorSpace: ColorSpace;
  onColorSpaceChange: (space: ColorSpace) => void;
  onExportWithColorSpace: (space: ColorSpace) => void;
  showAdvanced?: boolean;
}

export default function ColorManagementPanel({
  currentColorSpace,
  onColorSpaceChange,
  onExportWithColorSpace,
  showAdvanced = false,
}: ColorManagementPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(showAdvanced);
  const [selectedExportSpace, setSelectedExportSpace] =
    useState<ColorSpace>("RGB");
  const [renderingIntent, setRenderingIntent] =
    useState<RenderingIntent>("perceptual");
  const [blackPointCompensation, setBlackPointCompensation] = useState(true);

  const colorSpaces: {
    value: ColorSpace;
    label: string;
    description: string;
  }[] = [
    {
      value: "SRGB",
      label: "sRGB",
      description: "Web standard color space (default)",
    },
    {
      value: "RGB",
      label: "RGB",
      description: "Generic RGB for digital display",
    },
    {
      value: "CMYK",
      label: "CMYK",
      description: "Print color space (Cyan, Magenta, Yellow, Black)",
    },
    {
      value: "LAB",
      label: "LAB",
      description: "Device-independent color space",
    },
    {
      value: "GRAYSCALE",
      label: "Grayscale",
      description: "Black and white only",
    },
  ];

  const renderingIntents: { value: RenderingIntent; label: string }[] = [
    { value: "perceptual", label: "Perceptual" },
    { value: "relative", label: "Relative Colorimetric" },
    { value: "saturation", label: "Saturation" },
    { value: "absolute", label: "Absolute Colorimetric" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "12px",
        backgroundColor: "#0b0f1a",
        borderRadius: "4px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0, color: "#c8a97e", fontSize: "12px" }}>
          COLOR MANAGEMENT
        </h3>
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            backgroundColor: "transparent",
            border: "1px solid #666",
            borderRadius: "2px",
            color: "#888",
            fontSize: "9px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "#c8a97e";
            (e.currentTarget as HTMLButtonElement).style.color = "#c8a97e";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#666";
            (e.currentTarget as HTMLButtonElement).style.color = "#888";
          }}
          title="Advanced color settings"
        >
          <Settings size={12} />
          {advancedOpen ? "Hide" : "Advanced"}
        </button>
      </div>

      <div>
        <label
          style={{
            display: "block",
            color: "#888",
            fontSize: "10px",
            marginBottom: "6px",
          }}
        >
          Working Color Space
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
          }}
        >
          {colorSpaces.slice(0, 3).map((space) => (
            <button
              key={space.value}
              onClick={() => onColorSpaceChange(space.value)}
              style={{
                padding: "8px",
                backgroundColor:
                  currentColorSpace === space.value
                    ? "rgba(200, 169, 126, 0.2)"
                    : "rgba(100, 100, 100, 0.1)",
                border:
                  currentColorSpace === space.value
                    ? "1px solid #c8a97e"
                    : "1px solid #333",
                borderRadius: "2px",
                color: currentColorSpace === space.value ? "#c8a97e" : "#888",
                fontSize: "10px",
                fontWeight:
                  currentColorSpace === space.value ? "600" : "normal",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (currentColorSpace !== space.value) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "#c8a97e";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#c8a97e";
                }
              }}
              onMouseLeave={(e) => {
                if (currentColorSpace !== space.value) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "#333";
                  (e.currentTarget as HTMLButtonElement).style.color = "#888";
                }
              }}
              title={space.description}
            >
              {space.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: "8px",
          backgroundColor: "rgba(0, 200, 100, 0.1)",
          borderRadius: "2px",
          border: "1px solid #00c864",
        }}
      >
        <p style={{ margin: "0 0 6px 0", color: "#00c864", fontSize: "10px" }}>
          <strong>Current:</strong> {currentColorSpace}
        </p>
        <p style={{ margin: 0, color: "#888", fontSize: "9px" }}>
          {currentColorSpace === "CMYK"
            ? "Working in CMYK mode - best for print output"
            : currentColorSpace === "LAB"
              ? "Working in LAB mode - device-independent colors"
              : currentColorSpace === "GRAYSCALE"
                ? "Working in grayscale - no color information"
                : "Working in RGB mode - best for digital display"}
        </p>
      </div>

      <div
        style={{
          padding: "8px",
          backgroundColor: "rgba(255, 180, 0, 0.1)",
          borderRadius: "2px",
          border: "1px solid #ffb400",
        }}
      >
        <p style={{ margin: 0, color: "#ffb400", fontSize: "9px" }}>
          ⚠️ Note: Browsers are limited to RGB color space. CMYK export requires
          server-side conversion.
        </p>
      </div>

      <div style={{ borderTop: "1px solid #333", paddingTop: "8px" }}>
        <label
          style={{
            display: "block",
            color: "#888",
            fontSize: "10px",
            marginBottom: "6px",
          }}
        >
          Export Format
        </label>
        <select
          value={selectedExportSpace}
          onChange={(e) => setSelectedExportSpace(e.target.value as ColorSpace)}
          style={{
            width: "100%",
            padding: "8px",
            backgroundColor: "#0f0f0f",
            border: "1px solid #333",
            borderRadius: "2px",
            color: "#ccc",
            fontSize: "10px",
          }}
        >
          <option value="SRGB">sRGB (Web - Recommended)</option>
          <option value="RGB">RGB (Digital Display)</option>
          <option value="CMYK">CMYK (Print)</option>
          <option value="GRAYSCALE">Grayscale</option>
        </select>

        <button
          onClick={() => onExportWithColorSpace(selectedExportSpace)}
          style={{
            width: "100%",
            marginTop: "8px",
            padding: "10px",
            backgroundColor: "rgba(0, 200, 255, 0.15)",
            border: "1px solid #00c8ff",
            borderRadius: "2px",
            color: "#00c8ff",
            fontSize: "11px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(0, 200, 255, 0.25)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(0, 200, 255, 0.15)";
          }}
        >
          Export as {selectedExportSpace}
        </button>
      </div>

      {advancedOpen && (
        <div
          style={{
            padding: "8px",
            backgroundColor: "#0f0f0f",
            borderRadius: "2px",
            border: "1px solid #2a2a2a",
          }}
        >
          <h4
            style={{
              margin: "0 0 8px 0",
              color: "#96c8ff",
              fontSize: "9px",
            }}
          >
            Advanced Options
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ color: "#888", fontSize: "9px" }}>
              Rendering Intent:
              <select
                value={renderingIntent}
                onChange={(e) =>
                  setRenderingIntent(e.target.value as RenderingIntent)
                }
                style={{
                  width: "100%",
                  marginTop: "2px",
                  padding: "4px",
                  backgroundColor: "#0b0f1a",
                  border: "1px solid #333",
                  borderRadius: "2px",
                  color: "#ccc",
                  fontSize: "9px",
                }}
              >
                {renderingIntents.map((intent) => (
                  <option key={intent.value} value={intent.value}>
                    {intent.label}
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#888",
                fontSize: "9px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={blackPointCompensation}
                onChange={(e) => setBlackPointCompensation(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              Black Point Compensation
            </label>

            <div
              style={{
                padding: "6px",
                backgroundColor: "rgba(100, 150, 255, 0.1)",
                borderRadius: "2px",
                fontSize: "8px",
                color: "#96c8ff",
                lineHeight: "1.3",
              }}
            >
              <strong>Rendering Intent:</strong> Defines how colors outside the
              destination gamut are handled.
              <br />
              <strong>BPC:</strong> Aligns black points between color spaces for
              better print results.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
