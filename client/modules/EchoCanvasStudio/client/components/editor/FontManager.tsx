import React, { useState } from "react";
import { googleFontsManager, GoogleFont } from "../../lib/google-fonts-manager";

interface FontManagerProps {
  selectedFont: string;
  selectedSize: number;
  selectedWeight: string;
  onFontChange: (font: string, size: number, weight: string) => void;
}

export default function FontManager({
  selectedFont,
  selectedSize,
  selectedWeight,
  onFontChange,
}: FontManagerProps) {
  const [fonts] = useState<GoogleFont[]>(googleFontsManager.getPopularFonts());
  const [isOpen, setIsOpen] = useState(false);

  const handleFontSelect = (font: string) => {
    googleFontsManager.loadFont(font).catch(() => {
      // Font loading failed - continue with default
    });
    onFontChange(font, selectedSize, selectedWeight);
    setIsOpen(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "12px",
        backgroundColor: "#0a0a0a",
        borderRadius: "8px",
        border: "1px solid #333",
      }}
    >
      <h4
        style={{
          color: "#c8a97e",
          fontSize: "12px",
          fontWeight: "bold",
          margin: 0,
        }}
      >
        🔤 Font Settings
      </h4>

      {/* Font Family */}
      <div>
        <label
          style={{
            color: "#666",
            fontSize: "11px",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Font Family
        </label>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#0b0f1a",
              border: "1px solid #444",
              borderRadius: "4px",
              color: "#aaa",
              cursor: "pointer",
              textAlign: "left",
              fontSize: "12px",
              fontFamily: selectedFont,
            }}
          >
            {selectedFont}
          </button>

          {isOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: "#0b0f1a",
                border: "1px solid #444",
                borderRadius: "4px",
                maxHeight: "200px",
                overflowY: "auto",
                zIndex: 1000,
                marginTop: "4px",
              }}
            >
              {fonts.map((font) => (
                <button
                  key={font.family}
                  onClick={() => handleFontSelect(font.family)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor:
                      selectedFont === font.family ? "#2a2a2a" : "transparent",
                    border: "none",
                    borderBottom: "1px solid #333",
                    color: selectedFont === font.family ? "#c8a97e" : "#aaa",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "12px",
                    fontFamily: font.family,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.backgroundColor = "#2a2a2a";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#c8a97e";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFont !== font.family) {
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.backgroundColor = "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#aaa";
                    }
                  }}
                >
                  {font.family}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label
          style={{
            color: "#666",
            fontSize: "11px",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Size: {selectedSize}px
        </label>
        <input
          type="range"
          min="8"
          max="120"
          value={selectedSize}
          onChange={(e) =>
            onFontChange(selectedFont, Number(e.target.value), selectedWeight)
          }
          style={{ width: "100%" }}
        />
      </div>

      {/* Font Weight */}
      <div>
        <label
          style={{
            color: "#666",
            fontSize: "11px",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Weight
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "4px",
          }}
        >
          {["400", "600", "700"].map((weight) => (
            <button
              key={weight}
              onClick={() => onFontChange(selectedFont, selectedSize, weight)}
              style={{
                padding: "6px",
                backgroundColor:
                  selectedWeight === weight ? "rgba(0, 240, 255, 0.2)" : "#333",
                border: `1px solid ${selectedWeight === weight ? "#c8a97e" : "#444"}`,
                color: selectedWeight === weight ? "#c8a97e" : "#aaa",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: weight as any,
              }}
            >
              {weight === "400"
                ? "Regular"
                : weight === "600"
                  ? "Semi"
                  : "Bold"}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div
        style={{
          padding: "8px",
          backgroundColor: "#0b0f1a",
          borderRadius: "4px",
          border: "1px solid #333",
          color: "#aaa",
          fontSize: selectedSize,
          fontFamily: selectedFont,
          fontWeight: selectedWeight as any,
          textAlign: "center",
          minHeight: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Preview
      </div>
    </div>
  );
}
