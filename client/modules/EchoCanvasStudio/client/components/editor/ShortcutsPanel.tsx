import React, { useState } from "react";
import { Copy, Download } from "lucide-react";
export interface Shortcut {
  id: string;
  action: string;
  keys: string;
  category: string;
  customizable?: boolean;
}
interface ShortcutsPanelProps {
  shortcuts?: Shortcut[];
  onShortcutChange?: (id: string, newKeys: string) => void;
  onResetShortcuts?: () => void;
}
const DEFAULT_SHORTCUTS: Shortcut[] = [
  // File { id:"new", action:"New", keys:"Ctrl+N", category:"File", customizable: true, }, { id:"open", action:"Open", keys:"Ctrl+O", category:"File", customizable: true, }, { id:"save", action:"Save", keys:"Ctrl+S", category:"File", customizable: true, }, { id:"export", action:"Export", keys:"Ctrl+Shift+E", category:"File", customizable: true, }, // Edit { id:"undo", action:"Undo", keys:"Ctrl+Z", category:"Edit", customizable: true, }, { id:"redo", action:"Redo", keys:"Ctrl+Y", category:"Edit", customizable: true, }, { id:"copy", action:"Copy", keys:"Ctrl+C", category:"Edit", customizable: true, }, { id:"paste", action:"Paste", keys:"Ctrl+V", category:"Edit", customizable: true, }, // View { id:"zoom-in", action:"Zoom In", keys:"Ctrl++", category:"View", customizable: true, }, { id:"zoom-out", action:"Zoom Out", keys:"Ctrl+-", category:"View", customizable: true, }, { id:"fit-screen", action:"Fit to Screen", keys:"Ctrl+0", category:"View", customizable: true, }, { id:"toggle-grid", action:"Toggle Grid", keys:"Ctrl+\u2032", category:"View", customizable: true, }, { id:"toggle-rulers", action:"Toggle Rulers", keys:"Ctrl+R", category:"View", customizable: true, }, // Tools { id:"tool-rect-select", action:"Rect Select", keys:"M", category:"Tools", customizable: true, }, { id:"tool-ellipse-select", action:"Ellipse Select", keys:"E", category:"Tools", customizable: true, }, { id:"tool-lasso", action:"Lasso", keys:"L", category:"Tools", customizable: true, }, { id:"tool-magic-wand", action:"Magic Wand", keys:"W", category:"Tools", customizable: true, }, { id:"tool-brush", action:"Brush", keys:"B", category:"Tools", customizable: true, }, { id:"tool-pencil", action:"Pencil", keys:"P", category:"Tools", customizable: true, }, { id:"tool-eraser", action:"Eraser", keys:"E", category:"Tools", customizable: true, }, { id:"tool-text", action:"Text", keys:"T", category:"Tools", customizable: true, }, { id:"tool-move", action:"Move", keys:"V", category:"Tools", customizable: true, }, { id:"tool-crop", action:"Crop", keys:"C", category:"Tools", customizable: true, }, { id:"tool-color-picker", action:"Color Picker", keys:"I", category:"Tools", customizable: true, }, // Image { id:"invert", action:"Invert Colors", keys:"Ctrl+I", category:"Image", customizable: true, }, { id:"desaturate", action:"Desaturate", keys:"Ctrl+U", category:"Image", customizable: true, }, { id:"levels", action:"Levels", keys:"Ctrl+L", category:"Image", customizable: true, }, { id:"curves", action:"Curves", keys:"Ctrl+M", category:"Image", customizable: true, },
];
export default function ShortcutsPanel({
  shortcuts = DEFAULT_SHORTCUTS,
  onShortcutChange,
  onResetShortcuts,
}: ShortcutsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingKeys, setEditingKeys] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categories = [...new Set(shortcuts.map((s) => s.category))];
  const filteredShortcuts = shortcuts.filter((s) => {
    const matchSearch = s.action
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchCategory = !selectedCategory || s.category === selectedCategory;
    return matchSearch && matchCategory;
  });
  const handleEdit = (shortcut: Shortcut) => {
    if (shortcut.customizable) {
      setEditingId(shortcut.id);
      setEditingKeys(shortcut.keys);
    }
  };
  const handleSaveEdit = () => {
    if (editingId) {
      onShortcutChange?.(editingId, editingKeys);
      setEditingId(null);
    }
  };
  const handleCopyAll = () => {
    const text = shortcuts
      .map((s) => `${s.action.padEnd(30)} ${s.keys}`)
      .join("\n");
    navigator.clipboard.writeText(text);
  };
  const groupedShortcuts = categories.reduce(
    (acc, cat) => {
      acc[cat] = shortcuts.filter((s) => s.category === cat);
      return acc;
    },
    {} as Record<string, Shortcut[]>,
  );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#0a0a0a",
        borderRadius: "8px",
        border: "1px solid #333",
        overflow: "hidden",
      }}
    >
      {" "}
      {/* Header */}{" "}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #333",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {" "}
        <h3
          style={{
            color: "#c8a97e",
            fontSize: "12px",
            fontWeight: "bold",
            margin: 0,
          }}
        >
          {" "}
          Keyboard Shortcuts{" "}
        </h3>{" "}
        <button
          onClick={handleCopyAll}
          title="Copy all shortcuts"
          style={{
            background: "none",
            border: "none",
            color: "#666",
            cursor: "pointer",
            padding: "0",
            fontSize: "12px",
          }}
        >
          {" "}
          <Copy size={14} />{" "}
        </button>{" "}
      </div>{" "}
      {/* Search and Filter */}{" "}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #333",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {" "}
        <input
          type="text"
          placeholder="Search shortcuts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 8px",
            backgroundColor: "#0b0f1a",
            color: "#c8a97e",
            border: "1px solid #333",
            borderRadius: "3px",
            fontSize: "11px",
          }}
        />{" "}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {" "}
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: "4px 8px",
              backgroundColor:
                selectedCategory === null
                  ? "rgba(0, 240, 255, 0.2)"
                  : "#0b0f1a",
              color: selectedCategory === null ? "#c8a97e" : "#666",
              border: `1px solid ${selectedCategory === null ? "#c8a97e" : "#333"}`,
              borderRadius: "2px",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: "bold",
            }}
          >
            {" "}
            All{" "}
          </button>{" "}
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "4px 8px",
                backgroundColor:
                  selectedCategory === cat
                    ? "rgba(0, 240, 255, 0.2)"
                    : "#0b0f1a",
                color: selectedCategory === cat ? "#c8a97e" : "#666",
                border: `1px solid ${selectedCategory === cat ? "#c8a97e" : "#333"}`,
                borderRadius: "2px",
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: "bold",
              }}
            >
              {" "}
              {cat}{" "}
            </button>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      {/* Shortcuts List */}{" "}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {" "}
        {filteredShortcuts.length === 0 ? (
          <div
            style={{
              padding: "24px 12px",
              color: "#666",
              fontSize: "11px",
              textAlign: "center",
            }}
          >
            {" "}
            No shortcuts found{" "}
          </div>
        ) : (
          <div style={{ padding: "4px" }}>
            {" "}
            {filteredShortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #0b0f1a",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {" "}
                <div>
                  {" "}
                  <div
                    style={{
                      color: "#c8a97e",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  >
                    {" "}
                    {shortcut.action}{" "}
                  </div>{" "}
                  <div style={{ color: "#666", fontSize: "9px" }}>
                    {" "}
                    {shortcut.category}{" "}
                  </div>{" "}
                </div>{" "}
                {editingId === shortcut.id ? (
                  <div style={{ display: "flex", gap: "4px" }}>
                    {" "}
                    <input
                      type="text"
                      value={editingKeys}
                      onChange={(e) => setEditingKeys(e.target.value)}
                      style={{
                        padding: "4px 6px",
                        backgroundColor: "#0b0f1a",
                        color: "#c8a97e",
                        border: "1px solid #c8a97e",
                        borderRadius: "2px",
                        fontSize: "10px",
                        width: "100px",
                      }}
                    />{" "}
                    <button
                      onClick={handleSaveEdit}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#c8a97e",
                        color: "#000",
                        border: "none",
                        borderRadius: "2px",
                        cursor: "pointer",
                        fontSize: "10px",
                        fontWeight: "bold",
                      }}
                    >
                      {" "}
                      Save{" "}
                    </button>{" "}
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#0b0f1a",
                        color: "#666",
                        border: "1px solid #333",
                        borderRadius: "2px",
                        cursor: "pointer",
                        fontSize: "10px",
                      }}
                    >
                      {" "}
                      Cancel{" "}
                    </button>{" "}
                  </div>
                ) : (
                  <div
                    onClick={() => handleEdit(shortcut)}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "#0b0f1a",
                      color: "#c8a97e",
                      border: "1px solid #333",
                      borderRadius: "2px",
                      cursor: shortcut.customizable ? "pointer" : "default",
                      fontSize: "10px",
                      fontWeight: "bold",
                      minWidth: "100px",
                      textAlign: "center",
                      opacity: shortcut.customizable ? 1 : 0.6,
                    }}
                  >
                    {" "}
                    {shortcut.keys}{" "}
                  </div>
                )}{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Footer */}{" "}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid #333",
          display: "flex",
          gap: "8px",
        }}
      >
        {" "}
        <button
          onClick={onResetShortcuts}
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
          Reset to Default{" "}
        </button>{" "}
        <button
          onClick={handleCopyAll}
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          {" "}
          <Download size={12} /> Export{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
}
