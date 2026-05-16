/**
 * Text Piping Generator
 * UI component for generating and configuring text piping decorations
 */

import React, { useState } from "react";
import { Plus, Trash2, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generateTextPipingPrompt,
  type TextPipingOptions,
} from "@/lib/decoration-prompt-generator";
import {
  createTextPipingDecoration,
  type TextPipingDecoration,
} from "@/lib/decoration-types";

interface TextPipingGeneratorProps {
  onDecorationCreate?: (decoration: TextPipingDecoration) => void;
  onPromptGenerate?: (prompt: string) => void;
  isGenerating?: boolean;
}

interface PipingFormState {
  text: string;
  style: TextPipingOptions["style"];
  color: string;
  backgroundColor?: string;
  fontSize: TextPipingOptions["fontSize"];
}

const PIPING_STYLES = [
  "script",
  "bold",
  "elegant",
  "playful",
  "modern",
  "calligraphy",
];
const FONT_SIZES = ["small", "medium", "large"];
const COLOR_PRESETS = [
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#000000" },
  { label: "Gold", value: "#ffd700" },
  { label: "Pink", value: "#ff69b4" },
  { label: "Red", value: "#ff0000" },
  { label: "Purple", value: "#9370db" },
  { label: "Green", value: "#008000" },
  { label: "Blue", value: "#0000ff" },
];

export default function TextPipingGenerator({
  onDecorationCreate,
  onPromptGenerate,
  isGenerating = false,
}: TextPipingGeneratorProps) {
  const [formState, setFormState] = useState<PipingFormState>({
    text: "Happy Birthday",
    style: "elegant",
    color: "#ffffff",
    fontSize: "medium",
  });

  const [preview, setPreview] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleInputChange = (field: keyof PipingFormState, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError("");
  };

  const generatePrompt = () => {
    if (!formState.text.trim()) {
      setError("Please enter text for piping");
      return;
    }

    const prompt = generateTextPipingPrompt({
      text: formState.text,
      style: formState.style,
      color: formState.color,
      backgroundColor: formState.backgroundColor,
      fontSize: formState.fontSize,
    });

    setPreview(prompt);
    onPromptGenerate?.(prompt);
  };

  const handleGenerateDecoration = async () => {
    if (!formState.text.trim()) {
      setError("Please enter text for piping");
      return;
    }

    const prompt = generateTextPipingPrompt({
      text: formState.text,
      style: formState.style,
      color: formState.color,
      backgroundColor: formState.backgroundColor,
      fontSize: formState.fontSize,
    });

    const decoration = createTextPipingDecoration(
      formState.text,
      formState.style,
      formState.color,
      { x: 0, y: 0 },
    );

    decoration.prompt = prompt;
    decoration.generationStatus = "pending";

    onDecorationCreate?.(decoration);
  };

  const handleReset = () => {
    setFormState({
      text: "Happy Birthday",
      style: "elegant",
      color: "#ffffff",
      fontSize: "medium",
    });
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
          ✍️ Text Piping
        </h3>
      </div>

      {/* Text Input */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label
          style={{
            color: "#aaa",
            fontSize: "12px",
            fontWeight: "500",
            textTransform: "uppercase",
          }}
        >
          Text
        </label>
        <Input
          value={formState.text}
          onChange={(e) => handleInputChange("text", e.target.value)}
          placeholder="Enter piping text"
          style={{
            backgroundColor: "#222",
            border: "1px solid #333",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
      </div>

      {/* Piping Style */}
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
          value={formState.style}
          onValueChange={(v) => handleInputChange("style", v)}
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
            {PIPING_STYLES.map((style) => (
              <SelectItem key={style} value={style}>
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label
          style={{
            color: "#aaa",
            fontSize: "12px",
            fontWeight: "500",
            textTransform: "uppercase",
          }}
        >
          Font Size
        </label>
        <Select
          value={formState.fontSize}
          onValueChange={(v) => handleInputChange("fontSize", v)}
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
            {FONT_SIZES.map((size) => (
              <SelectItem key={size} value={size}>
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Color Selection */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label
          style={{
            color: "#aaa",
            fontSize: "12px",
            fontWeight: "500",
            textTransform: "uppercase",
          }}
        >
          Piping Color
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "8px",
          }}
        >
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleInputChange("color", preset.value)}
              style={{
                width: "100%",
                height: "40px",
                backgroundColor: preset.value,
                border:
                  formState.color === preset.value
                    ? "3px solid #00f0ff"
                    : "1px solid #333",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              title={preset.label}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: "8px",
          }}
        >
          <Input
            type="color"
            value={formState.color}
            onChange={(e) => handleInputChange("color", e.target.value)}
            style={{
              width: "60px",
              height: "40px",
              cursor: "pointer",
              border: "1px solid #333",
              borderRadius: "4px",
            }}
          />
          <Input
            value={formState.color}
            onChange={(e) => handleInputChange("color", e.target.value)}
            placeholder="#ffffff"
            style={{
              flex: 1,
              backgroundColor: "#222",
              border: "1px solid #333",
              color: "#fff",
              padding: "8px 12px",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          />
        </div>
      </div>

      {/* Background Color (Optional) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label
          style={{
            color: "#aaa",
            fontSize: "12px",
            fontWeight: "500",
            textTransform: "uppercase",
          }}
        >
          Background (Optional)
        </label>
        <div
          style={{
            display: "flex",
            gap: "8px",
          }}
        >
          <Input
            type="color"
            value={formState.backgroundColor || "#ffffff"}
            onChange={(e) =>
              handleInputChange("backgroundColor", e.target.value)
            }
            style={{
              width: "60px",
              height: "40px",
              cursor: "pointer",
              border: "1px solid #333",
              borderRadius: "4px",
            }}
          />
          <Input
            value={formState.backgroundColor || ""}
            onChange={(e) =>
              handleInputChange("backgroundColor", e.target.value || undefined)
            }
            placeholder="Leave empty for transparent"
            style={{
              flex: 1,
              backgroundColor: "#222",
              border: "1px solid #333",
              color: "#fff",
              padding: "8px 12px",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            backgroundColor: "#300",
            border: "1px solid #900",
            color: "#f99",
            padding: "8px 12px",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
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
          disabled={isGenerating || !formState.text.trim()}
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
            if (!isGenerating && formState.text.trim()) {
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
          disabled={isGenerating || !formState.text.trim()}
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
            if (!isGenerating && formState.text.trim()) {
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
