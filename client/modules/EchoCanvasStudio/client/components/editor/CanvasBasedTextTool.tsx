import React, { useRef, useEffect, useState, useCallback } from "react";

export interface TextData {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold" | "italic" | "bold italic";
  color: string;
  alpha: number;
  textAlign: "left" | "center" | "right";
  lineHeight: number;
  maxWidth?: number;
  layer?: string;
}

interface CanvasBasedTextToolProps {
  canvas: HTMLCanvasElement | null;
  isActive: boolean;
  onTextAdd: (textData: TextData) => void;
  onCancel: () => void;
}

export default function CanvasBasedTextTool({
  canvas,
  isActive,
  onTextAdd,
  onCancel,
}: CanvasBasedTextToolProps) {
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontWeight, setFontWeight] = useState<
    "normal" | "bold" | "italic" | "bold italic"
  >("normal");
  const [color, setColor] = useState("#000000");
  const [alpha, setAlpha] = useState(100);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">(
    "left",
  );
  const [lineHeight, setLineHeight] = useState(1.2);
  const [maxWidth, setMaxWidth] = useState(400);
  const [editingPosition, setEditingPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [dragBox, setDragBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentText, setCurrentText] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(canvas);

  useEffect(() => {
    canvasRef.current = canvas;
  }, [canvas]);

  if (!isActive || !canvas) return null;

  const handleCanvasMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setDragStart({ x, y });
      setIsDragging(true);
      setDragBox(null);
    },
    [canvas],
  );

  const handleCanvasMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!canvas) return;

      if (isDragging && dragStart) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const width = Math.abs(x - dragStart.x);
        const height = Math.abs(y - dragStart.y);

        setDragBox({
          x: Math.min(x, dragStart.x),
          y: Math.min(y, dragStart.y),
          width,
          height,
        });

        canvas.style.cursor = "crosshair";
      } else if (!editingPosition) {
        canvas.style.cursor = "crosshair";
      } else {
        canvas.style.cursor = "text";
      }
    },
    [canvas, isDragging, dragStart, editingPosition],
  );

  const handleCanvasMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!canvas) return;

      if (isDragging && dragBox && dragBox.width > 20 && dragBox.height > 20) {
        setEditingPosition({
          x: dragBox.x,
          y: dragBox.y,
        });
        setMaxWidth(dragBox.width);
        setCurrentText("");
        setIsDragging(false);
        setDragBox(null);
      } else if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setEditingPosition({ x, y });
        setCurrentText("");
        setIsDragging(false);
        setDragBox(null);
      }
    },
    [canvas, isDragging, dragBox],
  );

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (currentText.trim() && editingPosition) {
        const textData: TextData = {
          id: `text-${Date.now()}`,
          x: editingPosition.x,
          y: editingPosition.y,
          text: currentText,
          fontSize,
          fontFamily,
          fontWeight,
          color,
          alpha,
          textAlign,
          lineHeight,
          maxWidth,
        };

        onTextAdd(textData);
        setEditingPosition(null);
        setCurrentText("");
      }
    } else if (e.key === "Escape") {
      setEditingPosition(null);
      setCurrentText("");
      onCancel();
    }
  };

  useEffect(() => {
    if (!isActive || !canvas) return;

    const clickHandler = handleCanvasMouseDown;
    const moveHandler = handleCanvasMouseMove;
    const upHandler = handleCanvasMouseUp;

    canvas.addEventListener("mousedown", clickHandler as any);
    canvas.addEventListener("mousemove", moveHandler as any);
    canvas.addEventListener("mouseup", upHandler as any);

    return () => {
      canvas.removeEventListener("mousedown", clickHandler as any);
      canvas.removeEventListener("mousemove", moveHandler as any);
      canvas.removeEventListener("mouseup", upHandler as any);
      canvas.style.cursor = "default";
    };
  }, [
    isActive,
    canvas,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
  ]);

  useEffect(() => {
    if (editingPosition) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [editingPosition]);

  return (
    <>
      {dragBox && (
        <div
          style={{
            position: "absolute",
            left:
              dragBox.x + (canvasRef.current?.parentElement?.offsetLeft || 0),
            top: dragBox.y + (canvasRef.current?.parentElement?.offsetTop || 0),
            width: dragBox.width,
            height: dragBox.height,
            border: "2px dashed #c8a97e",
            backgroundColor: "rgba(0, 240, 255, 0.1)",
            pointerEvents: "none",
            zIndex: 999,
          }}
        />
      )}

      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          border: "1px solid #c8a97e",
          borderRadius: "8px",
          padding: "16px",
          zIndex: 1001,
          maxWidth: "280px",
          color: "#ccc",
        }}
      >
        <h3
          style={{
            margin: "0 0 12px 0",
            color: "#c8a97e",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          Text Tool
        </h3>

        {!editingPosition ? (
          <div style={{ fontSize: "12px", color: "#aaa" }}>
            <div style={{ marginBottom: "8px" }}>
              Click or drag on canvas to place text
            </div>
            <div style={{ fontSize: "10px", opacity: 0.7 }}>
              • Click: Place text at point
              <br />• Drag: Create text box
            </div>
          </div>
        ) : (
          <div>
            <input
              ref={inputRef}
              type="text"
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              onKeyDown={handleInputKeyDown}
              spellCheck="true"
              placeholder="Type text... (Shift+Enter for new line)"
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "#0a0a0a",
                border: "1px solid #444",
                color: "#c8a97e",
                borderRadius: "4px",
                fontSize: "12px",
                marginBottom: "12px",
                boxSizing: "border-box",
              }}
            />

            <div style={{ marginBottom: "8px" }}>
              <label
                style={{
                  color: "#666",
                  fontSize: "10px",
                  display: "block",
                  marginBottom: "2px",
                }}
              >
                Font
              </label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                style={{
                  width: "100%",
                  padding: "4px",
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #444",
                  color: "#c8a97e",
                  borderRadius: "4px",
                  fontSize: "10px",
                }}
              >
                {[
                  "Arial",
                  "Helvetica",
                  "Times New Roman",
                  "Courier New",
                  "Georgia",
                  "Verdana",
                  "Comic Sans MS",
                  "Trebuchet MS",
                ].map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "8px" }}>
              <label
                style={{
                  color: "#666",
                  fontSize: "10px",
                  display: "block",
                  marginBottom: "2px",
                }}
              >
                Weight
              </label>
              <select
                value={fontWeight}
                onChange={(e) =>
                  setFontWeight(
                    e.target.value as
                      | "normal"
                      | "bold"
                      | "italic"
                      | "bold italic",
                  )
                }
                style={{
                  width: "100%",
                  padding: "4px",
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #444",
                  color: "#c8a97e",
                  borderRadius: "4px",
                  fontSize: "10px",
                }}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="italic">Italic</option>
                <option value="bold italic">Bold Italic</option>
              </select>
            </div>

            <div style={{ marginBottom: "8px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "2px",
                }}
              >
                <label style={{ color: "#666", fontSize: "10px" }}>Size</label>
                <span style={{ color: "#c8a97e", fontSize: "10px" }}>
                  {fontSize}px
                </span>
              </div>
              <input
                type="range"
                min="8"
                max="120"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "8px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "2px",
                }}
              >
                <label style={{ color: "#666", fontSize: "10px" }}>
                  Line Height
                </label>
                <span style={{ color: "#c8a97e", fontSize: "10px" }}>
                  {lineHeight.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "8px" }}>
              <label
                style={{
                  color: "#666",
                  fontSize: "10px",
                  display: "block",
                  marginBottom: "2px",
                }}
              >
                Color
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{
                  width: "100%",
                  height: "32px",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              />
            </div>

            <div style={{ marginBottom: "8px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "2px",
                }}
              >
                <label style={{ color: "#666", fontSize: "10px" }}>
                  Opacity
                </label>
                <span style={{ color: "#c8a97e", fontSize: "10px" }}>
                  {alpha}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={alpha}
                onChange={(e) => setAlpha(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "8px" }}>
              <label
                style={{
                  color: "#666",
                  fontSize: "10px",
                  display: "block",
                  marginBottom: "2px",
                }}
              >
                Alignment
              </label>
              <div style={{ display: "flex", gap: "4px" }}>
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => setTextAlign(align)}
                    style={{
                      flex: 1,
                      padding: "4px",
                      backgroundColor:
                        textAlign === align ? "#c8a97e" : "#0a0a0a",
                      border: "1px solid #444",
                      color: textAlign === align ? "#000" : "#c8a97e",
                      borderRadius: "4px",
                      fontSize: "10px",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    {align[0].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: "10px", color: "#666", marginTop: "12px" }}>
              <div>• Press ENTER to apply</div>
              <div>• Press ESC to cancel</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
