/**
 * Sprinkles Generator
 * UI component for generating and configuring sprinkles and decorative elements
 */

import React, { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generateSprinklesPrompt,
  generateFondantFlowerPrompt,
  generateChocolateShardsPrompt,
  type SprinckleOptions,
} from "@/lib/decoration-prompt-generator";
import {
  createSprinklesDecoration,
  type SprinklesDecoration,
  type FondantFlowerDecoration,
  type ChocolateShardsDecoration,
  type Decoration,
} from "@/lib/decoration-types";

interface SprinklesGeneratorProps {
  onDecorationCreate?: (decoration: Decoration) => void;
  onPromptGenerate?: (prompt: string) => void;
  isGenerating?: boolean;
}

type DecorationType = "sprinkles" | "fondant-flowers" | "chocolate";

interface SprinklesFormState {
  decorationType: DecorationType;
  sprinkleType:
    | "rainbow"
    | "chocolate"
    | "pearl"
    | "nonpareils"
    | "jimmies"
    | "sanding";
  density: "light" | "medium" | "heavy";
  pattern: "scattered" | "pattern" | "border" | "swirl";
  color?: string;
}

interface FlowerFormState {
  flowerType: string;
  color: string;
  quantity: number;
}

interface ChocolateFormState {
  style: "shards" | "curls" | "chunks" | "wafers";
  color: "dark" | "milk" | "white";
  quantity: number;
}

const SPRINKLE_TYPES = [
  "rainbow",
  "chocolate",
  "pearl",
  "nonpareils",
  "jimmies",
  "sanding",
];
const DENSITIES = ["light", "medium", "heavy"];
const PATTERNS = ["scattered", "pattern", "border", "swirl"];
const FLOWER_TYPES = [
  "rose",
  "peony",
  "daisy",
  "tulip",
  "sunflower",
  "hydrangea",
];
const CHOCOLATE_STYLES = ["shards", "curls", "chunks", "wafers"];
const CHOCOLATE_COLORS = ["dark", "milk", "white"];

const SPRINKLE_COLOR_PRESETS = [
  { label: "Rainbow", value: "rainbow" },
  { label: "Red", value: "#ff0000" },
  { label: "Gold", value: "#ffd700" },
  { label: "Silver", value: "#c0c0c0" },
  { label: "Pink", value: "#ff69b4" },
  { label: "Purple", value: "#9370db" },
];

const FLOWER_COLOR_PRESETS = [
  { label: "Red Rose", value: "#ff0000" },
  { label: "Pink", value: "#ff69b4" },
  { label: "White", value: "#ffffff" },
  { label: "Cream", value: "#fffdd0" },
  { label: "Purple", value: "#9370db" },
  { label: "Orange", value: "#ffa500" },
];

export default function SprinklesGenerator({
  onDecorationCreate,
  onPromptGenerate,
  isGenerating = false,
}: SprinklesGeneratorProps) {
  const [decorationType, setDecorationType] =
    useState<DecorationType>("sprinkles");
  const [sprinklesForm, setSprinklesForm] = useState<SprinklesFormState>({
    decorationType: "sprinkles",
    sprinkleType: "rainbow",
    density: "medium",
    pattern: "scattered",
  });

  const [flowerForm, setFlowerForm] = useState<FlowerFormState>({
    flowerType: "rose",
    color: "#ff0000",
    quantity: 1,
  });

  const [chocolateForm, setChocolateForm] = useState<ChocolateFormState>({
    style: "shards",
    color: "dark",
    quantity: 5,
  });

  const [preview, setPreview] = useState<string>("");
  const [error, setError] = useState<string>("");

  const generatePrompt = () => {
    let prompt = "";

    if (decorationType === "sprinkles") {
      const options: SprinckleOptions = {
        type: sprinklesForm.sprinkleType as any,
        density: sprinklesForm.density,
        pattern: sprinklesForm.pattern,
        color:
          sprinklesForm.color !== "rainbow" ? sprinklesForm.color : undefined,
      };
      prompt = generateSprinklesPrompt(options);
    } else if (decorationType === "fondant-flowers") {
      prompt = generateFondantFlowerPrompt(
        flowerForm.flowerType,
        flowerForm.color,
        flowerForm.quantity,
      );
    } else if (decorationType === "chocolate") {
      prompt = generateChocolateShardsPrompt(
        chocolateForm.style,
        chocolateForm.color,
        chocolateForm.quantity,
      );
    }

    setPreview(prompt);
    onPromptGenerate?.(prompt);
  };

  const handleGenerateDecoration = async () => {
    let prompt = "";
    let decoration: Decoration | null = null;

    if (decorationType === "sprinkles") {
      const options: SprinckleOptions = {
        type: sprinklesForm.sprinkleType as any,
        density: sprinklesForm.density,
        pattern: sprinklesForm.pattern,
        color:
          sprinklesForm.color !== "rainbow" ? sprinklesForm.color : undefined,
      };
      prompt = generateSprinklesPrompt(options);

      decoration = {
        id: `sprinkles-${Date.now()}`,
        type: "sprinkles",
        sprinkleType: sprinklesForm.sprinkleType,
        density: sprinklesForm.density,
        pattern: sprinklesForm.pattern,
        color: sprinklesForm.color,
        position: { x: 0, y: 0, z: 50 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        opacity: 1,
        imageUrl: "",
        prompt,
        generationStatus: "pending",
      } as SprinklesDecoration;
    } else if (decorationType === "fondant-flowers") {
      prompt = generateFondantFlowerPrompt(
        flowerForm.flowerType,
        flowerForm.color,
        flowerForm.quantity,
      );

      decoration = {
        id: `flower-${Date.now()}`,
        type: "fondant-flower",
        flowerType: flowerForm.flowerType,
        color: flowerForm.color,
        quantity: flowerForm.quantity,
        position: { x: 0, y: 0, z: 100 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        opacity: 1,
        imageUrl: "",
        prompt,
        generationStatus: "pending",
      } as FondantFlowerDecoration;
    } else if (decorationType === "chocolate") {
      prompt = generateChocolateShardsPrompt(
        chocolateForm.style,
        chocolateForm.color,
        chocolateForm.quantity,
      );

      decoration = {
        id: `chocolate-${Date.now()}`,
        type: "chocolate-shards",
        style: chocolateForm.style,
        color: chocolateForm.color,
        quantity: chocolateForm.quantity,
        position: { x: 0, y: 0, z: 75 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        opacity: 1,
        imageUrl: "",
        prompt,
        generationStatus: "pending",
      } as ChocolateShardsDecoration;
    }

    if (decoration) {
      onDecorationCreate?.(decoration);
    }
  };

  const handleReset = () => {
    if (decorationType === "sprinkles") {
      setSprinklesForm({
        decorationType: "sprinkles",
        sprinkleType: "rainbow",
        density: "medium",
        pattern: "scattered",
      });
    } else if (decorationType === "fondant-flowers") {
      setFlowerForm({
        flowerType: "rose",
        color: "#ff0000",
        quantity: 1,
      });
    } else if (decorationType === "chocolate") {
      setChocolateForm({
        style: "shards",
        color: "dark",
        quantity: 5,
      });
    }
    setPreview("");
    setError("");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "16px",
        backgroundColor: "#1a1a1a",
        borderRadius: "8px",
        border: "1px solid #333",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <h3
          style={{
            color: "#00f0ff",
            fontSize: "14px",
            fontWeight: "bold",
            margin: 0,
          }}
        >
          ✨ Decorative Elements
        </h3>
      </div>

      {/* Decoration Type Selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label
          style={{
            color: "#aaa",
            fontSize: "12px",
            fontWeight: "500",
            textTransform: "uppercase",
          }}
        >
          Decoration Type
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
          }}
        >
          {(
            ["sprinkles", "fondant-flowers", "chocolate"] as DecorationType[]
          ).map((type) => (
            <button
              key={type}
              onClick={() => {
                setDecorationType(type);
                handleReset();
              }}
              style={{
                padding: "8px",
                backgroundColor: decorationType === type ? "#00f0ff" : "#222",
                color: decorationType === type ? "#000" : "#aaa",
                border: "1px solid #333",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: decorationType === type ? "bold" : "normal",
                fontSize: "12px",
              }}
            >
              {type === "sprinkles" && "Sprinkles"}
              {type === "fondant-flowers" && "Flowers"}
              {type === "chocolate" && "Chocolate"}
            </button>
          ))}
        </div>
      </div>

      {/* Sprinkles Form */}
      {decorationType === "sprinkles" && (
        <>
          {/* Sprinkle Type */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                color: "#aaa",
                fontSize: "12px",
                fontWeight: "500",
                textTransform: "uppercase",
              }}
            >
              Sprinkle Type
            </label>
            <Select
              value={sprinklesForm.sprinkleType}
              onValueChange={(v) =>
                setSprinklesForm((prev) => ({
                  ...prev,
                  sprinkleType: v as any,
                }))
              }
            >
              <SelectTrigger
                style={{
                  backgroundColor: "#222",
                  border: "1px solid #333",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: "4px",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPRINKLE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Density */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                color: "#aaa",
                fontSize: "12px",
                fontWeight: "500",
                textTransform: "uppercase",
              }}
            >
              Density
            </label>
            <Select
              value={sprinklesForm.density}
              onValueChange={(v) =>
                setSprinklesForm((prev) => ({ ...prev, density: v as any }))
              }
            >
              <SelectTrigger
                style={{
                  backgroundColor: "#222",
                  border: "1px solid #333",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: "4px",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DENSITIES.map((density) => (
                  <SelectItem key={density} value={density}>
                    {density.charAt(0).toUpperCase() + density.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pattern */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                color: "#aaa",
                fontSize: "12px",
                fontWeight: "500",
                textTransform: "uppercase",
              }}
            >
              Pattern
            </label>
            <Select
              value={sprinklesForm.pattern}
              onValueChange={(v) =>
                setSprinklesForm((prev) => ({ ...prev, pattern: v as any }))
              }
            >
              <SelectTrigger
                style={{
                  backgroundColor: "#222",
                  border: "1px solid #333",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: "4px",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PATTERNS.map((pattern) => (
                  <SelectItem key={pattern} value={pattern}>
                    {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                color: "#aaa",
                fontSize: "12px",
                fontWeight: "500",
                textTransform: "uppercase",
              }}
            >
              Color
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
              }}
            >
              {SPRINKLE_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() =>
                    setSprinklesForm((prev) => ({
                      ...prev,
                      color: preset.value,
                    }))
                  }
                  style={{
                    padding: "8px",
                    backgroundColor:
                      preset.value !== "rainbow" ? preset.value : "#eee",
                    border:
                      sprinklesForm.color === preset.value
                        ? "3px solid #00f0ff"
                        : "1px solid #333",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    color:
                      preset.value === "rainbow" || preset.value === "#c0c0c0"
                        ? "#000"
                        : "#fff",
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Flowers Form */}
      {decorationType === "fondant-flowers" && (
        <>
          {/* Flower Type */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                color: "#aaa",
                fontSize: "12px",
                fontWeight: "500",
                textTransform: "uppercase",
              }}
            >
              Flower Type
            </label>
            <Select
              value={flowerForm.flowerType}
              onValueChange={(v) =>
                setFlowerForm((prev) => ({ ...prev, flowerType: v }))
              }
            >
              <SelectTrigger
                style={{
                  backgroundColor: "#222",
                  border: "1px solid #333",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: "4px",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FLOWER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Flower Color */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                color: "#aaa",
                fontSize: "12px",
                fontWeight: "500",
                textTransform: "uppercase",
              }}
            >
              Color
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
              }}
            >
              {FLOWER_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() =>
                    setFlowerForm((prev) => ({ ...prev, color: preset.value }))
                  }
                  style={{
                    padding: "8px",
                    backgroundColor: preset.value,
                    border:
                      flowerForm.color === preset.value
                        ? "3px solid #00f0ff"
                        : "1px solid #333",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    color:
                      preset.value === "#ffffff" || preset.value === "#fffdd0"
                        ? "#000"
                        : "#fff",
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                color: "#aaa",
                fontSize: "12px",
                fontWeight: "500",
                textTransform: "uppercase",
              }}
            >
              Quantity: {flowerForm.quantity}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={flowerForm.quantity}
              onChange={(e) =>
                setFlowerForm((prev) => ({
                  ...prev,
                  quantity: parseInt(e.target.value),
                }))
              }
              style={{
                width: "100%",
              }}
            />
          </div>
        </>
      )}

      {/* Chocolate Form */}
      {decorationType === "chocolate" && (
        <>
          {/* Chocolate Style */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                color: "#aaa",
                fontSize: "12px",
                fontWeight: "500",
                textTransform: "uppercase",
              }}
            >
              Style
            </label>
            <Select
              value={chocolateForm.style}
              onValueChange={(v) =>
                setChocolateForm((prev) => ({ ...prev, style: v as any }))
              }
            >
              <SelectTrigger
                style={{
                  backgroundColor: "#222",
                  border: "1px solid #333",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: "4px",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHOCOLATE_STYLES.map((style) => (
                  <SelectItem key={style} value={style}>
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chocolate Color */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                color: "#aaa",
                fontSize: "12px",
                fontWeight: "500",
                textTransform: "uppercase",
              }}
            >
              Color
            </label>
            <Select
              value={chocolateForm.color}
              onValueChange={(v) =>
                setChocolateForm((prev) => ({ ...prev, color: v as any }))
              }
            >
              <SelectTrigger
                style={{
                  backgroundColor: "#222",
                  border: "1px solid #333",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: "4px",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHOCOLATE_COLORS.map((color) => (
                  <SelectItem key={color} value={color}>
                    {color.charAt(0).toUpperCase() + color.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                color: "#aaa",
                fontSize: "12px",
                fontWeight: "500",
                textTransform: "uppercase",
              }}
            >
              Quantity: {chocolateForm.quantity}
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={chocolateForm.quantity}
              onChange={(e) =>
                setChocolateForm((prev) => ({
                  ...prev,
                  quantity: parseInt(e.target.value),
                }))
              }
              style={{
                width: "100%",
              }}
            />
          </div>
        </>
      )}

      {/* Prompt Preview */}
      {preview && (
        <div
          style={{
            backgroundColor: "#222",
            border: "1px solid #333",
            padding: "12px",
            borderRadius: "4px",
            fontSize: "12px",
            color: "#aaa",
            maxHeight: "100px",
            overflowY: "auto",
          }}
        >
          <div
            style={{ color: "#888", marginBottom: "4px", fontWeight: "bold" }}
          >
            Generated Prompt:
          </div>
          {preview}
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        <Button
          onClick={generatePrompt}
          disabled={isGenerating}
          style={{
            backgroundColor: "#333",
            color: "#aaa",
            border: "1px solid #555",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!isGenerating) {
              e.currentTarget.style.backgroundColor = "#444";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#333";
          }}
        >
          <RefreshCw size={14} />
          Preview
        </Button>
        <Button
          onClick={handleGenerateDecoration}
          disabled={isGenerating}
          style={{
            backgroundColor: "#00f0ff",
            color: "#000",
            border: "1px solid #00f0ff",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!isGenerating) {
              e.currentTarget.style.backgroundColor = "#00d4e0";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#00f0ff";
          }}
        >
          <Plus size={14} />
          Generate
        </Button>
      </div>

      {/* Reset Button */}
      <Button
        onClick={handleReset}
        style={{
          backgroundColor: "transparent",
          color: "#888",
          border: "1px solid #333",
          padding: "8px 12px",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "12px",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#aaa";
          e.currentTarget.style.borderColor = "#555";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#888";
          e.currentTarget.style.borderColor = "#333";
        }}
      >
        <RefreshCw size={14} />
        Reset
      </Button>
    </div>
  );
}
