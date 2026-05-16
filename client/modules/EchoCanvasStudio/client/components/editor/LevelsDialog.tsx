import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
interface LevelsDialogProps {
  canvas: HTMLCanvasElement | null;
  onApply: (
    inputMin: number,
    inputMax: number,
    gamma: number,
    outputMin: number,
    outputMax: number,
  ) => void;
  onCancel: () => void;
}
export default function LevelsDialog({
  canvas,
  onApply,
  onCancel,
}: LevelsDialogProps) {
  const [inputMin, setInputMin] = useState(0);
  const [inputMax, setInputMax] = useState(255);
  const [gamma, setGamma] = useState(1.0);
  const [outputMin, setOutputMin] = useState(0);
  const [outputMax, setOutputMax] = useState(255);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas || !previewCanvasRef.current) return;
    const ctx = previewCanvasRef.current.getContext("2d");
    if (!ctx) return;
    previewCanvasRef.current.width = canvas.width;
    previewCanvasRef.current.height = canvas.height;
    const imageData = canvas
      .getContext("2d")
      ?.getImageData(0, 0, canvas.width, canvas.height);
    if (!imageData) return;
    const data = imageData.data.slice();
    for (let i = 0; i < data.length; i += 4) {
      const r = applyLevelsCurve(
        data[i],
        inputMin,
        inputMax,
        gamma,
        outputMin,
        outputMax,
      );
      const g = applyLevelsCurve(
        data[i + 1],
        inputMin,
        inputMax,
        gamma,
        outputMin,
        outputMax,
      );
      const b = applyLevelsCurve(
        data[i + 2],
        inputMin,
        inputMax,
        gamma,
        outputMin,
        outputMax,
      );
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
    const previewImageData = new ImageData(data, canvas.width, canvas.height);
    ctx.putImageData(previewImageData, 0, 0);
  }, [canvas, inputMin, inputMax, gamma, outputMin, outputMax]);
  const applyLevelsCurve = (
    value: number,
    inputMin: number,
    inputMax: number,
    gamma: number,
    outputMin: number,
    outputMax: number,
  ): number => {
    if (inputMax === inputMin) return outputMin;
    const normalized = (value - inputMin) / (inputMax - inputMin);
    const clipped = Math.max(0, Math.min(1, normalized));
    const gammaAdjusted = Math.pow(clipped, 1 / gamma);
    const output = outputMin + gammaAdjusted * (outputMax - outputMin);
    return output;
  };
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={onCancel}
    >
      {" "}
      <div
        style={{
          backgroundColor: "#0b0f1a",
          border: "1px solid #444",
          borderRadius: "8px",
          boxShadow: "0 12px 48px rgba(0, 0, 0, 0.8)",
          padding: "24px",
          maxWidth: "500px",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {" "}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          {" "}
          <h2
            style={{
              margin: 0,
              color: "#c8a97e",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            Levels
          </h2>{" "}
          <button
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              color: "#ccc",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {" "}
            <X size={20} />{" "}
          </button>{" "}
        </div>{" "}
        <div style={{ marginBottom: "20px" }}>
          {" "}
          <h3
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "600",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {" "}
            Preview{" "}
          </h3>{" "}
          <canvas
            ref={previewCanvasRef}
            style={{
              width: "100%",
              maxHeight: "200px",
              border: "1px solid #444",
              borderRadius: "4px",
              backgroundColor: "#0a0a0a",
            }}
          />{" "}
        </div>{" "}
        <div style={{ marginBottom: "24px" }}>
          {" "}
          <h3
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "600",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {" "}
            Input Levels{" "}
          </h3>{" "}
          <div style={{ marginBottom: "12px" }}>
            {" "}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              {" "}
              <label style={{ color: "#aaa", fontSize: "11px" }}>
                Black Point
              </label>{" "}
              <input
                type="number"
                min="0"
                max={inputMax - 1}
                value={inputMin}
                onChange={(e) =>
                  setInputMin(Math.min(Number(e.target.value), inputMax - 1))
                }
                style={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #444",
                  color: "#c8a97e",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  width: "60px",
                  fontSize: "11px",
                }}
              />{" "}
            </div>{" "}
            <input
              type="range"
              min="0"
              max={inputMax - 1}
              value={inputMin}
              onChange={(e) =>
                setInputMin(Math.min(Number(e.target.value), inputMax - 1))
              }
              style={{ width: "100%" }}
            />{" "}
          </div>{" "}
          <div style={{ marginBottom: "12px" }}>
            {" "}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              {" "}
              <label style={{ color: "#aaa", fontSize: "11px" }}>
                Gamma (Midtones)
              </label>{" "}
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={gamma.toFixed(1)}
                onChange={(e) => setGamma(parseFloat(e.target.value))}
                style={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #444",
                  color: "#c8a97e",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  width: "60px",
                  fontSize: "11px",
                }}
              />{" "}
            </div>{" "}
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={gamma}
              onChange={(e) => setGamma(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />{" "}
          </div>{" "}
          <div style={{ marginBottom: "12px" }}>
            {" "}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              {" "}
              <label style={{ color: "#aaa", fontSize: "11px" }}>
                White Point
              </label>{" "}
              <input
                type="number"
                min={inputMin + 1}
                max="255"
                value={inputMax}
                onChange={(e) =>
                  setInputMax(Math.max(Number(e.target.value), inputMin + 1))
                }
                style={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #444",
                  color: "#c8a97e",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  width: "60px",
                  fontSize: "11px",
                }}
              />{" "}
            </div>{" "}
            <input
              type="range"
              min={inputMin + 1}
              max="255"
              value={inputMax}
              onChange={(e) =>
                setInputMax(Math.max(Number(e.target.value), inputMin + 1))
              }
              style={{ width: "100%" }}
            />{" "}
          </div>{" "}
        </div>{" "}
        <div style={{ marginBottom: "24px" }}>
          {" "}
          <h3
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "600",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {" "}
            Output Levels{" "}
          </h3>{" "}
          <div style={{ marginBottom: "12px" }}>
            {" "}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              {" "}
              <label style={{ color: "#aaa", fontSize: "11px" }}>
                Black
              </label>{" "}
              <input
                type="number"
                min="0"
                max={outputMax - 1}
                value={outputMin}
                onChange={(e) =>
                  setOutputMin(Math.min(Number(e.target.value), outputMax - 1))
                }
                style={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #444",
                  color: "#c8a97e",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  width: "60px",
                  fontSize: "11px",
                }}
              />{" "}
            </div>{" "}
            <input
              type="range"
              min="0"
              max={outputMax - 1}
              value={outputMin}
              onChange={(e) =>
                setOutputMin(Math.min(Number(e.target.value), outputMax - 1))
              }
              style={{ width: "100%" }}
            />{" "}
          </div>{" "}
          <div style={{ marginBottom: "12px" }}>
            {" "}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              {" "}
              <label style={{ color: "#aaa", fontSize: "11px" }}>
                White
              </label>{" "}
              <input
                type="number"
                min={outputMin + 1}
                max="255"
                value={outputMax}
                onChange={(e) =>
                  setOutputMax(Math.max(Number(e.target.value), outputMin + 1))
                }
                style={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #444",
                  color: "#c8a97e",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  width: "60px",
                  fontSize: "11px",
                }}
              />{" "}
            </div>{" "}
            <input
              type="range"
              min={outputMin + 1}
              max="255"
              value={outputMax}
              onChange={(e) =>
                setOutputMax(Math.max(Number(e.target.value), outputMin + 1))
              }
              style={{ width: "100%" }}
            />{" "}
          </div>{" "}
        </div>{" "}
        <div
          style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
        >
          {" "}
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              backgroundColor: "transparent",
              border: "1px solid #444",
              color: "#ccc",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "#c8a97e";
              (e.currentTarget as HTMLButtonElement).style.color = "#c8a97e";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#444";
              (e.currentTarget as HTMLButtonElement).style.color = "#ccc";
            }}
          >
            {" "}
            Cancel{" "}
          </button>{" "}
          <button
            onClick={() =>
              onApply(inputMin, inputMax, gamma, outputMin, outputMax)
            }
            style={{
              padding: "8px 16px",
              backgroundColor: "rgba(200, 169, 126, 0.1)",
              border: "1px solid #c8a97e",
              color: "#c8a97e",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(200, 169, 126, 0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(200, 169, 126, 0.1)";
            }}
          >
            {" "}
            Apply{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
