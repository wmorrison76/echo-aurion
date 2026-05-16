import React from "react";
import { ChevronDown } from "lucide-react";

const BLEND_MODES = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "softLight", label: "Soft Light" },
  { value: "hardLight", label: "Hard Light" },
  { value: "colorDodge", label: "Color Dodge" },
  { value: "colorBurn", label: "Color Burn" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "difference", label: "Difference" },
  { value: "exclusion", label: "Exclusion" },
  { value: "hue", label: "Hue" },
  { value: "saturation", label: "Saturation" },
  { value: "color", label: "Color" },
  { value: "luminosity", label: "Luminosity" },
  { value: "add", label: "Add" },
  { value: "subtract", label: "Subtract" },
  { value: "divide", label: "Divide" },
  { value: "vividLight", label: "Vivid Light" },
  { value: "linearLight", label: "Linear Light" },
  { value: "pinLight", label: "Pin Light" },
  { value: "hardMix", label: "Hard Mix" },
  { value: "reflect", label: "Reflect" },
  { value: "glow", label: "Glow" },
  { value: "phoenix", label: "Phoenix" },
  { value: "linearBurn", label: "Linear Burn" },
  { value: "linearDodge", label: "Linear Dodge" },
  { value: "screen2", label: "Screen 2" },
  { value: "screen3", label: "Screen 3" },
  { value: "grainExtract", label: "Grain Extract" },
  { value: "grainMerge", label: "Grain Merge" },
];

interface BlendModeSelectorProps {
  value?: string;
  onChange: (mode: string) => void;
  disabled?: boolean;
}

export default function BlendModeSelector({
  value = "normal",
  onChange,
  disabled = false,
}: BlendModeSelectorProps) {
  const selectedMode = BLEND_MODES.find((m) => m.value === value) || BLEND_MODES[0];

  return (
    <div
      style={{
        position: "relative",
      }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "6px 8px",
          backgroundColor: "#333",
          color: "#c8a97e",
          border: "1px solid #c8a97e",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: "bold",
          cursor: disabled ? "not-allowed" : "pointer",
          appearance: "none",
          paddingRight: "24px",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {BLEND_MODES.map((mode) => (
          <option key={mode.value} value={mode.value}>
            {mode.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        style={{
          position: "absolute",
          right: "8px",
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "#c8a97e",
        }}
      />
    </div>
  );
}

export { BLEND_MODES };
