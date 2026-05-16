import React, { useState } from "react";
import { Trash2, Plus, Copy } from "lucide-react";
export interface GradientStop {
  position: number; // 0-100 color: string;
}
export interface Gradient {
  id: string;
  name: string;
  stops: GradientStop[];
  angle: number; // 0-360 for linear gradients type:"linear" |"radial";
}
interface GradientEditorProps {
  gradients?: Gradient[];
  onGradientSelect?: (gradient: Gradient) => void;
  onGradientCreate?: (gradient: Gradient) => void;
  onGradientDelete?: (id: string) => void;
  onApplyGradient?: (gradient: Gradient) => void;
} // Preset gradients
const PRESET_GRADIENTS: Gradient[] = [
  {
    id: "sunset",
    name: "Sunset",
    type: "linear",
    angle: 45,
    stops: [
      { position: 0, color: "#FF6B6B" },
      { position: 50, color: "#FFA500" },
      { position: 100, color: "#FFD700" },
    ],
  },
  {
    id: "ocean",
    name: "Ocean",
    type: "linear",
    angle: 90,
    stops: [
      { position: 0, color: "#0066CC" },
      { position: 50, color: "#00CCFF" },
      { position: 100, color: "#FFFFFF" },
    ],
  },
  {
    id: "forest",
    name: "Forest",
    type: "linear",
    angle: 135,
    stops: [
      { position: 0, color: "#1B4D2B" },
      { position: 50, color: "#2D5A3D" },
      { position: 100, color: "#4A7C4E" },
    ],
  },
  {
    id: "fire",
    name: "Fire",
    type: "linear",
    angle: 90,
    stops: [
      { position: 0, color: "#000000" },
      { position: 33, color: "#FF0000" },
      { position: 66, color: "#FFAA00" },
      { position: 100, color: "#FFFF00" },
    ],
  },
  {
    id: "purple-pink",
    name: "Purple Pink",
    type: "linear",
    angle: 45,
    stops: [
      { position: 0, color: "#9D4EDD" },
      { position: 50, color: "#E0AAFF" },
      { position: 100, color: "#FF006E" },
    ],
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    type: "linear",
    angle: 90,
    stops: [
      { position: 0, color: "#00F0FF" },
      { position: 50, color: "#FF00FF" },
      { position: 100, color: "#00FF00" },
    ],
  },
];
export default function GradientEditor({
  gradients = PRESET_GRADIENTS,
  onGradientSelect,
  onGradientCreate,
  onGradientDelete,
  onApplyGradient,
}: GradientEditorProps) {
  const [selectedGradientId, setSelectedGradientId] = useState(
    PRESET_GRADIENTS[0].id,
  );
  const [editMode, setEditMode] = useState(false);
  const [editingGradient, setEditingGradient] = useState<Gradient | null>(null);
  const [newStopPosition, setNewStopPosition] = useState(50);
  const [newStopColor, setNewStopColor] = useState("#FF0000");
  const selectedGradient = [...gradients, ...PRESET_GRADIENTS].find(
    (g) => g.id === selectedGradientId,
  );
  const generateGradientCSS = (gradient: Gradient) => {
    const stopString = gradient.stops
      .sort((a, b) => a.position - b.position)
      .map((stop) => `${stop.color} ${stop.position}%`)
      .join(",");
    if (gradient.type === "radial") {
      return `radial-gradient(circle, ${stopString})`;
    }
    return `linear-gradient(${gradient.angle}deg, ${stopString})`;
  };
  const handleAddStop = () => {
    if (editingGradient) {
      const newStops = [
        ...editingGradient.stops,
        { position: newStopPosition, color: newStopColor },
      ];
      newStops.sort((a, b) => a.position - b.position);
      const updated = { ...editingGradient, stops: newStops };
      setEditingGradient(updated);
      setNewStopPosition(50);
      setNewStopColor("#FF0000");
    }
  };
  const handleRemoveStop = (position: number) => {
    if (editingGradient && editingGradient.stops.length > 2) {
      const updated = {
        ...editingGradient,
        stops: editingGradient.stops.filter((s) => s.position !== position),
      };
      setEditingGradient(updated);
    }
  };
  const handleSaveGradient = () => {
    if (editingGradient) {
      onGradientCreate?.(editingGradient);
      setEditMode(false);
      setEditingGradient(null);
    }
  };
  const handleStartEdit = (gradient: Gradient) => {
    setEditingGradient({ ...gradient, id: `custom-${Date.now()}` });
    setEditMode(true);
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "16px",
        backgroundColor: "#0a0a0a",
        borderRadius: "8px",
        border: "1px solid #333",
      }}
    >
      {" "}
      {!editMode ? (
        <>
          {" "}
          {/* Preview of selected gradient */}{" "}
          <div>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "11px",
                marginBottom: "8px",
                fontWeight: "bold",
              }}
            >
              {" "}
              Selected Gradient{" "}
            </label>{" "}
            <div
              style={{
                width: "100%",
                height: "60px",
                borderRadius: "4px",
                border: "1px solid #333",
                background: selectedGradient
                  ? generateGradientCSS(selectedGradient)
                  : "#222",
              }}
            />{" "}
            {selectedGradient && (
              <div
                style={{ color: "#666", fontSize: "10px", marginTop: "4px" }}
              >
                {" "}
                {selectedGradient.name} ({selectedGradient.stops.length}{" "}
                stops){" "}
              </div>
            )}{" "}
          </div>{" "}
          {/* Gradient List */}{" "}
          <div>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "11px",
                marginBottom: "8px",
                fontWeight: "bold",
              }}
            >
              {" "}
              Preset Gradients{" "}
            </label>{" "}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              {" "}
              {PRESET_GRADIENTS.map((gradient) => (
                <div
                  key={gradient.id}
                  style={{ display: "flex", gap: "4px", alignItems: "stretch" }}
                >
                  {" "}
                  <button
                    onClick={() => {
                      setSelectedGradientId(gradient.id);
                      onGradientSelect?.(gradient);
                    }}
                    style={{
                      flex: 1,
                      height: "40px",
                      borderRadius: "3px",
                      border:
                        selectedGradientId === gradient.id
                          ? "2px solid #c8a97e"
                          : "1px solid #333",
                      background: generateGradientCSS(gradient),
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    title={gradient.name}
                  />{" "}
                  <button
                    onClick={() => handleStartEdit(gradient)}
                    style={{
                      width: "32px",
                      padding: "4px",
                      backgroundColor: "#0b0f1a",
                      border: "1px solid #333",
                      borderRadius: "3px",
                      color: "#c8a97e",
                      cursor: "pointer",
                      fontSize: "10px",
                      fontWeight: "bold",
                    }}
                    title="Edit"
                  >
                    {" "}
                    ✎{" "}
                  </button>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {/* Apply Button */}{" "}
          {selectedGradient && (
            <button
              onClick={() => onApplyGradient?.(selectedGradient)}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "#c8a97e",
                color: "#000",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
                transition: "all 0.2s",
              }}
            >
              {" "}
              Apply Gradient{" "}
            </button>
          )}{" "}
        </>
      ) : editingGradient ? (
        <>
          {" "}
          {/* Edit Mode */}{" "}
          <div>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "11px",
                marginBottom: "8px",
                fontWeight: "bold",
              }}
            >
              {" "}
              Edit Gradient{" "}
            </label>{" "}
            <input
              type="text"
              value={editingGradient.name}
              onChange={(e) =>
                setEditingGradient({ ...editingGradient, name: e.target.value })
              }
              style={{
                width: "100%",
                padding: "6px",
                backgroundColor: "#0b0f1a",
                color: "#c8a97e",
                border: "1px solid #333",
                borderRadius: "3px",
                marginBottom: "12px",
                fontSize: "11px",
              }}
              placeholder="Gradient name"
            />{" "}
          </div>{" "}
          {/* Gradient Type */}{" "}
          <div>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "11px",
                marginBottom: "8px",
                fontWeight: "bold",
              }}
            >
              {" "}
              Type{" "}
            </label>{" "}
            <div style={{ display: "flex", gap: "8px" }}>
              {" "}
              {(["linear", "radial"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    setEditingGradient({ ...editingGradient, type })
                  }
                  style={{
                    flex: 1,
                    padding: "6px",
                    backgroundColor:
                      editingGradient.type === type
                        ? "rgba(0, 240, 255, 0.2)"
                        : "#0b0f1a",
                    color: editingGradient.type === type ? "#c8a97e" : "#666",
                    border: `1px solid ${editingGradient.type === type ? "#c8a97e" : "#333"}`,
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                >
                  {" "}
                  {type === "linear" ? "Linear" : "Radial"}{" "}
                </button>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {/* Angle (for linear gradients) */}{" "}
          {editingGradient.type === "linear" && (
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "11px",
                  marginBottom: "8px",
                  fontWeight: "bold",
                }}
              >
                {" "}
                Angle: {editingGradient.angle}°{" "}
              </label>{" "}
              <input
                type="range"
                min="0"
                max="360"
                value={editingGradient.angle}
                onChange={(e) =>
                  setEditingGradient({
                    ...editingGradient,
                    angle: Number(e.target.value),
                  })
                }
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>
          )}{" "}
          {/* Preview */}{" "}
          <div
            style={{
              width: "100%",
              height: "50px",
              borderRadius: "4px",
              border: "1px solid #333",
              background: generateGradientCSS(editingGradient),
            }}
          />{" "}
          {/* Color Stops */}{" "}
          <div>
            {" "}
            <label
              style={{
                display: "block",
                color: "#c8a97e",
                fontSize: "11px",
                marginBottom: "8px",
                fontWeight: "bold",
              }}
            >
              {" "}
              Color Stops ({editingGradient.stops.length}){" "}
            </label>{" "}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                maxHeight: "150px",
                overflowY: "auto",
              }}
            >
              {" "}
              {editingGradient.stops.map((stop, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    gap: "4px",
                    alignItems: "center",
                    padding: "4px",
                    backgroundColor: "#0b0f1a",
                    borderRadius: "3px",
                  }}
                >
                  {" "}
                  <input
                    type="color"
                    value={stop.color}
                    onChange={(e) => {
                      const updated = [...editingGradient.stops];
                      updated[index].color = e.target.value;
                      setEditingGradient({
                        ...editingGradient,
                        stops: updated,
                      });
                    }}
                    style={{
                      width: "30px",
                      height: "30px",
                      border: "1px solid #333",
                    }}
                  />{" "}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={stop.position}
                    onChange={(e) => {
                      const updated = [...editingGradient.stops];
                      updated[index].position = Number(e.target.value);
                      setEditingGradient({
                        ...editingGradient,
                        stops: updated,
                      });
                    }}
                    style={{
                      width: "50px",
                      padding: "4px",
                      backgroundColor: "#0a0a0a",
                      color: "#c8a97e",
                      border: "1px solid #333",
                      borderRadius: "2px",
                      fontSize: "10px",
                    }}
                  />{" "}
                  <span style={{ color: "#666", fontSize: "10px" }}>%</span>{" "}
                  {editingGradient.stops.length > 2 && (
                    <button
                      onClick={() => handleRemoveStop(stop.position)}
                      style={{
                        padding: "2px 4px",
                        backgroundColor: "#400",
                        border: "1px solid #666",
                        color: "#f66",
                        borderRadius: "2px",
                        cursor: "pointer",
                        fontSize: "10px",
                      }}
                    >
                      {" "}
                      <Trash2 size={10} />{" "}
                    </button>
                  )}{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {/* Add new stop */}{" "}
          <div style={{ display: "flex", gap: "4px" }}>
            {" "}
            <input
              type="color"
              value={newStopColor}
              onChange={(e) => setNewStopColor(e.target.value)}
              style={{ width: "40px", height: "32px" }}
            />{" "}
            <input
              type="number"
              min="0"
              max="100"
              value={newStopPosition}
              onChange={(e) => setNewStopPosition(Number(e.target.value))}
              style={{
                flex: 1,
                padding: "6px",
                backgroundColor: "#0b0f1a",
                color: "#c8a97e",
                border: "1px solid #333",
                borderRadius: "3px",
                fontSize: "11px",
              }}
              placeholder="Position (0-100)"
            />{" "}
            <button
              onClick={handleAddStop}
              style={{
                padding: "6px 12px",
                backgroundColor: "#c8a97e",
                color: "#000",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {" "}
              <Plus size={14} />{" "}
            </button>{" "}
          </div>{" "}
          {/* Save/Cancel */}{" "}
          <div style={{ display: "flex", gap: "8px" }}>
            {" "}
            <button
              onClick={handleSaveGradient}
              style={{
                flex: 1,
                padding: "8px",
                backgroundColor: "#c8a97e",
                color: "#000",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              {" "}
              Save Gradient{" "}
            </button>{" "}
            <button
              onClick={() => setEditMode(false)}
              style={{
                flex: 1,
                padding: "8px",
                backgroundColor: "#0b0f1a",
                color: "#c8a97e",
                border: "1px solid #333",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              {" "}
              Cancel{" "}
            </button>{" "}
          </div>{" "}
        </>
      ) : null}{" "}
    </div>
  );
}
