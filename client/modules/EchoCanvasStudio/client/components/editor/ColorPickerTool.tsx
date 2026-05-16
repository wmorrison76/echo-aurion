import React, { useState, useEffect } from "react";

interface ColorPickerToolProps {
  canvas: HTMLCanvasElement | null;
  onColorPicked: (color: string) => void;
}

export default function ColorPickerTool({ canvas, onColorPicked }: ColorPickerToolProps) {
  const [isActive, setIsActive] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [color, setColor] = useState("#000000");

  useEffect(() => {
    if (!canvas || !isActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setPosition({ x, y });

      // Pick pixel color from canvas
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.getImageData(x, y, 1, 1);
      const data = imageData.data;
      const hexColor = `#${(
        (1 << 24) +
        (data[0] << 16) +
        (data[1] << 8) +
        data[2]
      )
        .toString(16)
        .slice(1)
        .toUpperCase()}`;
      setColor(hexColor);
    };

    const handleClick = () => {
      onColorPicked(color);
      setIsActive(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsActive(false);
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [canvas, isActive, color, onColorPicked]);

  if (!isActive) return null;

  return (
    <>
      {/* Crosshair cursor */}
      <div
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: "20px",
          height: "20px",
          border: "2px solid #fff",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 9999,
          transform: "translate(-10px, -10px)",
          boxShadow: "0 0 10px rgba(200, 169, 126, 0.8)",
        }}
      />
      {/* Color preview swatch */}
      <div
        style={{
          position: "fixed",
          left: `${position.x + 30}px`,
          top: `${position.y + 30}px`,
          backgroundColor: color,
          width: "50px",
          height: "50px",
          border: "2px solid #fff",
          borderRadius: "4px",
          pointerEvents: "none",
          zIndex: 9999,
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
        }}
      />
      {/* Hex code label */}
      <div
        style={{
          position: "fixed",
          left: `${position.x + 30}px`,
          top: `${position.y + 90}px`,
          backgroundColor: "#000",
          color: "#c8a97e",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: "bold",
          pointerEvents: "none",
          zIndex: 9999,
          border: "1px solid #c8a97e",
        }}
      >
        {color}
      </div>
      {/* Help bar */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          color: "#c8a97e",
          padding: "12px 16px",
          borderRadius: "4px",
          fontSize: "12px",
          border: "1px solid #c8a97e",
          zIndex: 9999,
        }}
      >
        Click on image to pick color · Press ESC to cancel
      </div>
    </>
  );
}
