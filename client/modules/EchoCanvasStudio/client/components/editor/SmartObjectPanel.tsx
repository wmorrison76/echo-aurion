import { Trash2, Copy, Lock, LockOpen } from "lucide-react";
import type { SmartObjectData } from "./SmartObjectEngine";
interface SmartObjectPanelProps {
  smartObjects: SmartObjectData[];
  selectedSmartObject: string | null;
  onSmartObjectSelect: (id: string) => void;
  onSmartObjectDelete: (id: string) => void;
  onSmartObjectDuplicate: (id: string) => void;
  onSmartObjectScale: (id: string, scaleX: number, scaleY: number) => void;
  onSmartObjectRotate: (id: string, rotation: number) => void;
  onSmartObjectMove: (id: string, x: number, y: number) => void;
  onSmartObjectOpacity: (id: string, opacity: number) => void;
}
export default function SmartObjectPanel({
  smartObjects,
  selectedSmartObject,
  onSmartObjectSelect,
  onSmartObjectDelete,
  onSmartObjectDuplicate,
  onSmartObjectScale,
  onSmartObjectRotate,
  onSmartObjectMove,
  onSmartObjectOpacity,
}: SmartObjectPanelProps) {
  const selected = smartObjects.find((obj) => obj.id === selectedSmartObject);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#0a0a0a",
        borderRight: "1px solid #333",
        overflow: "hidden",
      }}
    >
      {" "}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #333",
          color: "#c8a97e",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        {" "}
        Smart Objects{" "}
      </div>{" "}
      {/* Objects List */}{" "}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {" "}
        {smartObjects.length === 0 ? (
          <div
            style={{
              padding: "12px",
              color: "#666",
              fontSize: "11px",
              textAlign: "center",
            }}
          >
            {" "}
            No smart objects{" "}
          </div>
        ) : (
          smartObjects.map((obj) => (
            <div
              key={obj.id}
              onClick={() => onSmartObjectSelect(obj.id)}
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #222",
                backgroundColor:
                  selectedSmartObject === obj.id
                    ? "rgba(0, 240, 255, 0.1)"
                    : "transparent",
                borderLeft:
                  selectedSmartObject === obj.id
                    ? "2px solid #c8a97e"
                    : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {" "}
              <div
                style={{
                  color: "#c8a97e",
                  fontSize: "11px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                {obj.name}{" "}
              </div>{" "}
              <div
                style={{
                  color: "#666",
                  fontSize: "9px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {" "}
                <span>
                  {" "}
                  {obj.width.toFixed(0)}×{obj.height.toFixed(0)} • {obj.opacity}
                  %{" "}
                </span>{" "}
              </div>{" "}
              {selectedSmartObject === obj.id && (
                <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                  {" "}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSmartObjectDuplicate(obj.id);
                    }}
                    style={{
                      flex: 1,
                      padding: "4px",
                      backgroundColor: "#222",
                      color: "#666",
                      border: "1px solid #333",
                      borderRadius: "2px",
                      cursor: "pointer",
                      fontSize: "9px",
                    }}
                  >
                    {" "}
                    <Copy size={10} />{" "}
                  </button>{" "}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSmartObjectDelete(obj.id);
                    }}
                    style={{
                      flex: 1,
                      padding: "4px",
                      backgroundColor: "#222",
                      color: "#666",
                      border: "1px solid #333",
                      borderRadius: "2px",
                      cursor: "pointer",
                      fontSize: "9px",
                    }}
                  >
                    {" "}
                    <Trash2 size={10} />{" "}
                  </button>{" "}
                </div>
              )}{" "}
            </div>
          ))
        )}{" "}
      </div>{" "}
      {/* Properties Panel */}{" "}
      {selected && (
        <div
          style={{
            borderTop: "1px solid #333",
            padding: "12px",
            fontSize: "11px",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {" "}
          <div style={{ marginBottom: "12px" }}>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "10px",
                marginBottom: "4px",
              }}
            >
              {" "}
              Scale X: {selected.scaleX.toFixed(2)}{" "}
            </label>{" "}
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={selected.scaleX}
              onChange={(e) =>
                onSmartObjectScale(
                  selected.id,
                  Number(e.target.value),
                  selected.scaleY,
                )
              }
              style={{ width: "100%", accentColor: "#c8a97e" }}
            />{" "}
          </div>{" "}
          <div style={{ marginBottom: "12px" }}>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "10px",
                marginBottom: "4px",
              }}
            >
              {" "}
              Scale Y: {selected.scaleY.toFixed(2)}{" "}
            </label>{" "}
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={selected.scaleY}
              onChange={(e) =>
                onSmartObjectScale(
                  selected.id,
                  selected.scaleX,
                  Number(e.target.value),
                )
              }
              style={{ width: "100%", accentColor: "#c8a97e" }}
            />{" "}
          </div>{" "}
          <div style={{ marginBottom: "12px" }}>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "10px",
                marginBottom: "4px",
              }}
            >
              {" "}
              Rotation: {selected.rotation.toFixed(0)}°{" "}
            </label>{" "}
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={selected.rotation}
              onChange={(e) =>
                onSmartObjectRotate(selected.id, Number(e.target.value))
              }
              style={{ width: "100%", accentColor: "#c8a97e" }}
            />{" "}
          </div>{" "}
          <div style={{ marginBottom: "12px" }}>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "10px",
                marginBottom: "4px",
              }}
            >
              {" "}
              Opacity: {selected.opacity}%{" "}
            </label>{" "}
            <input
              type="range"
              min="0"
              max="100"
              value={selected.opacity}
              onChange={(e) =>
                onSmartObjectOpacity(selected.id, Number(e.target.value))
              }
              style={{ width: "100%", accentColor: "#c8a97e" }}
            />{" "}
          </div>{" "}
          <div style={{ marginBottom: "12px" }}>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "10px",
                marginBottom: "4px",
              }}
            >
              {" "}
              X: {selected.x.toFixed(0)}{" "}
            </label>{" "}
            <input
              type="number"
              value={selected.x.toFixed(0)}
              onChange={(e) =>
                onSmartObjectMove(
                  selected.id,
                  Number(e.target.value),
                  selected.y,
                )
              }
              style={{
                width: "100%",
                padding: "4px",
                backgroundColor: "#0b0f1a",
                color: "#c8a97e",
                border: "1px solid #333",
                borderRadius: "2px",
              }}
            />{" "}
          </div>{" "}
          <div style={{ marginBottom: "12px" }}>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "10px",
                marginBottom: "4px",
              }}
            >
              {" "}
              Y: {selected.y.toFixed(0)}{" "}
            </label>{" "}
            <input
              type="number"
              value={selected.y.toFixed(0)}
              onChange={(e) =>
                onSmartObjectMove(
                  selected.id,
                  selected.x,
                  Number(e.target.value),
                )
              }
              style={{
                width: "100%",
                padding: "4px",
                backgroundColor: "#0b0f1a",
                color: "#c8a97e",
                border: "1px solid #333",
                borderRadius: "2px",
              }}
            />{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
