import React, { useState } from "react";
import { Plus, X, Copy, Trash2 } from "lucide-react";

export interface Artboard {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: any[];
  canvasData?: ImageData;
}

interface ArtboardManagerProps {
  artboards: Artboard[];
  activeArtboardId: string;
  onArtboardSelect: (id: string) => void;
  onArtboardAdd: (artboard: Artboard) => void;
  onArtboardDelete: (id: string) => void;
  onArtboardDuplicate: (id: string) => void;
  onArtboardRename: (id: string, name: string) => void;
}

export default function ArtboardManager({
  artboards,
  activeArtboardId,
  onArtboardSelect,
  onArtboardAdd,
  onArtboardDelete,
  onArtboardDuplicate,
  onArtboardRename,
}: ArtboardManagerProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const handleAddArtboard = () => {
    const newArtboard: Artboard = {
      id: `artboard-${Date.now()}`,
      name: `Page ${artboards.length + 1}`,
      width: 1920,
      height: 1080,
      layers: [],
    };
    onArtboardAdd(newArtboard);
  };

  const handleStartRename = (artboard: Artboard) => {
    setRenamingId(artboard.id);
    setNewName(artboard.name);
  };

  const handleConfirmRename = (id: string) => {
    if (newName.trim()) {
      onArtboardRename(id, newName);
    }
    setRenamingId(null);
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
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
          📄 Artboards
        </h4>
        <button
          onClick={handleAddArtboard}
          title="Add new artboard"
          style={{
            background: "none",
            border: "1px solid #444",
            color: "#c8a97e",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
          }}
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Artboards List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          maxHeight: "300px",
          overflowY: "auto",
        }}
      >
        {artboards.length === 0 ? (
          <div
            style={{
              color: "#666",
              fontSize: "11px",
              padding: "8px",
              textAlign: "center",
            }}
          >
            No artboards. Create one to get started.
          </div>
        ) : (
          artboards.map((artboard) => (
            <div
              key={artboard.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px",
                backgroundColor:
                  activeArtboardId === artboard.id ? "#1a3a3a" : "#0b0f1a",
                border: `1px solid ${activeArtboardId === artboard.id ? "#c8a97e" : "#333"}`,
                borderRadius: "4px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onClick={() => onArtboardSelect(artboard.id)}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  backgroundColor: "#333",
                  borderRadius: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  color: "#666",
                  flexShrink: 0,
                }}
              >
                {artboards.indexOf(artboard) + 1}
              </div>

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {renamingId === artboard.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={() => handleConfirmRename(artboard.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleConfirmRename(artboard.id);
                      } else if (e.key === "Escape") {
                        setRenamingId(null);
                      }
                    }}
                    style={{
                      width: "100%",
                      backgroundColor: "#0a0a0a",
                      border: "1px solid #c8a97e",
                      color: "#c8a97e",
                      padding: "2px 4px",
                      borderRadius: "2px",
                      fontSize: "11px",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: "12px",
                      color:
                        activeArtboardId === artboard.id ? "#c8a97e" : "#aaa",
                      fontWeight:
                        activeArtboardId === artboard.id ? "600" : "400",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      cursor: "pointer",
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(artboard);
                    }}
                  >
                    {artboard.name}
                  </div>
                )}
                <div style={{ fontSize: "9px", color: "#666" }}>
                  {artboard.width} × {artboard.height}
                </div>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  opacity: activeArtboardId === artboard.id ? 1 : 0,
                  transition: "opacity 0.2s",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onArtboardDuplicate(artboard.id)}
                  title="Duplicate artboard"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Copy size={12} />
                </button>
                {artboards.length > 1 && (
                  <button
                    onClick={() => onArtboardDelete(artboard.id)}
                    title="Delete artboard"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#666",
                      cursor: "pointer",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div
        style={{
          fontSize: "9px",
          color: "#666",
          padding: "4px",
          borderTop: "1px solid #333",
        }}
      >
        <div>Double-click to rename</div>
        <div>{artboards.length} artboard(s)</div>
      </div>
    </div>
  );
}
