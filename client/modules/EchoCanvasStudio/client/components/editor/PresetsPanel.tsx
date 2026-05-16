import React, { useState, useEffect } from "react";
import { Save, Trash2, Download, Upload, Plus } from "lucide-react";
import {
  Preset,
  getAllPresets,
  savePreset,
  deletePreset,
  exportPresets,
  importPresets,
} from "../../lib/preset-storage";
interface PresetsPanelProps {
  onApplyPreset: (preset: Preset) => void;
  currentAdjustments?: Record<string, any>;
}
export default function PresetsPanel({
  onApplyPreset,
  currentAdjustments = {},
}: PresetsPanelProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    Preset["category"] | "all"
  >("all");
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDescription, setNewPresetDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  useEffect(() => {
    loadPresets();
  }, []);
  const loadPresets = () => {
    setPresets(getAllPresets());
  };
  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    try {
      const preset = savePreset({
        name: newPresetName,
        description: newPresetDescription,
        category: "adjustment",
        adjustments: currentAdjustments,
        tags: newPresetName.toLowerCase().split(""),
      });
      setPresets([...presets, preset]);
      setNewPresetName("");
      setNewPresetDescription("");
      setSaveModalOpen(false);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to save preset",
      );
      setTimeout(() => setError(null), 3000);
    }
  };
  const handleDeletePreset = (id: string) => {
    if (deletePreset(id)) {
      setPresets(presets.filter((p) => p.id !== id));
      setSelectedPreset(null);
    }
  };
  const handleExport = () => {
    const json = exportPresets();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "echocanva-presets.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const added = importPresets(json);
        loadPresets();
        setSuccessMessage(`Imported ${added} preset(s)`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to import presets",
        );
        setTimeout(() => setError(null), 3000);
      }
    };
    reader.readAsText(file);
  };
  const filteredPresets = presets.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const categories: Array<Preset["category"] | "all"> = [
    "all",
    "filter",
    "adjustment",
    "color",
    "effect",
  ];
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
      {/* Error/Success Messages */}{" "}
      {error && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "rgba(255, 0, 0, 0.1)",
            borderBottom: "1px solid #ff0000",
            color: "#ff4444",
            fontSize: "11px",
          }}
        >
          {" "}
          {error}{" "}
        </div>
      )}{" "}
      {successMessage && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "rgba(200, 169, 126, 0.1)",
            borderBottom: "1px solid #c8a97e",
            color: "#c8a97e",
            fontSize: "11px",
          }}
        >
          {" "}
          {successMessage}{" "}
        </div>
      )}{" "}
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
          Presets{" "}
        </h3>{" "}
        <div style={{ display: "flex", gap: "4px" }}>
          {" "}
          <button
            onClick={() => setSaveModalOpen(true)}
            title="Save current adjustments as preset"
            style={{
              background: "none",
              border: "none",
              color: "#c8a97e",
              cursor: "pointer",
              padding: "2px",
            }}
          >
            {" "}
            <Plus size={14} />{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Save Modal */}{" "}
      {saveModalOpen && (
        <div
          style={{
            padding: "12px",
            borderBottom: "1px solid #333",
            backgroundColor: "#0b0f1a",
          }}
        >
          {" "}
          <input
            autoFocus
            type="text"
            placeholder="Preset name..."
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              backgroundColor: "#0a0a0a",
              color: "#c8a97e",
              border: "1px solid #333",
              borderRadius: "3px",
              marginBottom: "8px",
              fontSize: "11px",
            }}
          />{" "}
          <textarea
            placeholder="Description (optional)..."
            value={newPresetDescription}
            onChange={(e) => setNewPresetDescription(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              backgroundColor: "#0a0a0a",
              color: "#c8a97e",
              border: "1px solid #333",
              borderRadius: "3px",
              marginBottom: "8px",
              fontSize: "10px",
              minHeight: "40px",
            }}
          />{" "}
          <div style={{ display: "flex", gap: "4px" }}>
            {" "}
            <button
              onClick={handleSavePreset}
              style={{
                flex: 1,
                padding: "6px",
                backgroundColor: "#c8a97e",
                color: "#000",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: "bold",
              }}
            >
              {" "}
              Save{" "}
            </button>{" "}
            <button
              onClick={() => {
                setSaveModalOpen(false);
                setNewPresetName("");
                setNewPresetDescription("");
              }}
              style={{
                flex: 1,
                padding: "6px",
                backgroundColor: "#0b0f1a",
                color: "#666",
                border: "1px solid #333",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "10px",
              }}
            >
              {" "}
              Cancel{" "}
            </button>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Search */}{" "}
      <div style={{ padding: "12px", borderBottom: "1px solid #333" }}>
        {" "}
        <input
          type="text"
          placeholder="Search presets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 8px",
            backgroundColor: "#0b0f1a",
            color: "#c8a97e",
            border: "1px solid #333",
            borderRadius: "3px",
            fontSize: "10px",
            marginBottom: "8px",
          }}
        />{" "}
        {/* Category Filter */}{" "}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {" "}
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
                fontSize: "9px",
                fontWeight: "bold",
                transition: "all 0.2s",
              }}
            >
              {" "}
              {cat}{" "}
            </button>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      {/* Presets List */}{" "}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {" "}
        {filteredPresets.length === 0 ? (
          <div
            style={{
              padding: "24px 12px",
              color: "#666",
              fontSize: "11px",
              textAlign: "center",
            }}
          >
            {" "}
            No presets found{" "}
          </div>
        ) : (
          <div>
            {" "}
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                style={{
                  padding: "12px",
                  borderBottom: "1px solid #222",
                  cursor: "pointer",
                  backgroundColor:
                    selectedPreset === preset.id
                      ? "rgba(0, 240, 255, 0.1)"
                      : "transparent",
                  transition: "all 0.2s",
                }}
                onClick={() => setSelectedPreset(preset.id)}
              >
                {" "}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "4px",
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
                      {preset.name}{" "}
                    </div>{" "}
                    <div
                      style={{
                        color: "#666",
                        fontSize: "9px",
                        marginTop: "2px",
                      }}
                    >
                      {" "}
                      {preset.description}{" "}
                    </div>{" "}
                  </div>{" "}
                  <span
                    style={{
                      fontSize: "8px",
                      color: "#444",
                      backgroundColor: "#222",
                      padding: "2px 4px",
                      borderRadius: "2px",
                    }}
                  >
                    {" "}
                    {preset.category}{" "}
                  </span>{" "}
                </div>{" "}
                {/* Actions */}{" "}
                {selectedPreset === preset.id && (
                  <div
                    style={{ display: "flex", gap: "4px", marginTop: "8px" }}
                  >
                    {" "}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplyPreset(preset);
                      }}
                      style={{
                        flex: 1,
                        padding: "6px",
                        backgroundColor: "#c8a97e",
                        color: "#000",
                        border: "none",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontSize: "10px",
                        fontWeight: "bold",
                      }}
                    >
                      {" "}
                      Apply{" "}
                    </button>{" "}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePreset(preset.id);
                      }}
                      style={{
                        padding: "6px 8px",
                        backgroundColor: "#0b0f1a",
                        color: "#ff6666",
                        border: "1px solid #333",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontSize: "10px",
                      }}
                    >
                      {" "}
                      <Trash2 size={10} />{" "}
                    </button>{" "}
                  </div>
                )}{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Footer Buttons */}{" "}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid #333",
          display: "flex",
          gap: "4px",
        }}
      >
        {" "}
        <button
          onClick={handleExport}
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor: "#0b0f1a",
            color: "#c8a97e",
            border: "1px solid #333",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "10px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          {" "}
          <Download size={10} /> Export{" "}
        </button>{" "}
        <label
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor: "#0b0f1a",
            color: "#c8a97e",
            border: "1px solid #333",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "10px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          {" "}
          <Upload size={10} /> Import{" "}
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: "none" }}
          />{" "}
        </label>{" "}
      </div>{" "}
    </div>
  );
}
