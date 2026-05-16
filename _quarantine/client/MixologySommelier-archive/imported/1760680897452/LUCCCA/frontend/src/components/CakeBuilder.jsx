// src/components/CakeBuilder.jsx
import React, { useState } from "react";
import CakeHero3D from "@/components/CakeHero3D.jsx";

/** Lightweight Button to avoid external UI deps */
function Button({ children, onClick, variant = "default", style }) {
  const base = {
    padding: "8px 12px",
    borderRadius: 10,
    fontSize: 14,
    cursor: "pointer",
    border: "1px solid #374151",
    background: variant === "ghost" ? "transparent" : "#111827",
    color: "#e5e7eb",
  };
  return (
    <button onClick={onClick} style={{ ...base, ...style }}>
      {children}
    </button>
  );
}

/** Simple tab header */
function Tabs({ tabs, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #374151", marginBottom: 12 }}>
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: "8px 12px",
            border: "1px solid #374151",
            borderBottom: value === t ? "2px solid #60a5fa" : "1px solid #374151",
            borderRadius: "10px 10px 0 0",
            background: value === t ? "#1f2937" : "transparent",
            color: "#e5e7eb",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/** Panel wrapper */
function Panel({ title, children }) {
  return (
    <div
      style={{
        padding: 14,
        border: "1px solid #374151",
        background: "#0b1220",
        borderRadius: 12,
      }}
    >
      {title && <div style={{ color: "#d1d5db", fontWeight: 600, marginBottom: 10 }}>{title}</div>}
      {children}
    </div>
  );
}

export default function CakeBuilder() {
  const [layers, setLayers] = useState([
    { id: 1, type: "cake", flavor: "vanilla", icing: "Buttercream", color: "#F2D7E2" },
    { id: 2, type: "filling", flavor: "strawberry", color: "#b33a3a" },
    { id: 3, type: "cake", flavor: "vanilla", icing: "Buttercream", color: "#F2D7E2" },
  ]);
  const [activeTab, setActiveTab] = useState("Preview");

  const add = (type) => {
    const id = Date.now();
    if (type === "cake") {
      setLayers((prev) => [
        ...prev,
        { id, type: "cake", flavor: "vanilla", icing: "Buttercream", color: "#F2D7E2" },
      ]);
    } else if (type === "filling") {
      setLayers((prev) => [...prev, { id, type: "filling", flavor: "buttercream", color: "#F1C9A8" }]);
    } else {
      setLayers((prev) => [...prev, { id, type: "support", notes: "dowels" }]);
    }
  };

  const remove = (id) => setLayers((prev) => prev.filter((l) => l.id !== id));

  const update = (id, patch) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const demo = () =>
    setLayers([
      { id: 1, type: "cake", flavor: "vanilla", icing: "Buttercream", color: "#F2D7E2" },
      { id: 2, type: "filling", flavor: "raspberry", color: "#b33a3a" },
      { id: 3, type: "cake", flavor: "red velvet", icing: "Buttercream", color: "#f0c2b5" },
      { id: 4, type: "filling", flavor: "lemon curd", color: "#f7d25a" },
      { id: 5, type: "cake", flavor: "chocolate", icing: "Buttercream", color: "#d8b78a" },
      { id: 6, type: "support", notes: "3 dowels" },
    ]);

  return (
    <div style={{ padding: 16, display: "grid", gap: 16, gridTemplateColumns: "minmax(380px, 560px) 1fr" }}>
      {/* Left: Layer editor */}
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <Button onClick={() => add("cake")}>+ Cake Layer</Button>
          <Button onClick={() => add("filling")}>+ Filling</Button>
          <Button onClick={() => add("support")}>+ Support</Button>
          <Button onClick={demo} style={{ marginLeft: "auto" }}>
            Demo cake
          </Button>
        </div>

        <Panel title="Layers">
          {layers.map((l) => (
            <div
              key={l.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto",
                gap: 8,
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <select
                value={l.type}
                onChange={(e) => update(l.id, { type: e.target.value })}
                style={{
                  padding: 8,
                  borderRadius: 10,
                  background: "#111827",
                  color: "#e5e7eb",
                  border: "1px solid #374151",
                }}
              >
                <option value="cake">Cake</option>
                <option value="filling">Filling</option>
                <option value="support">Support</option>
              </select>

              <input
                placeholder={l.type === "support" ? "notes (e.g. 3 dowels)" : "flavor / icing / notes"}
                defaultValue={l.flavor}
                onChange={(e) => update(l.id, { flavor: e.target.value })}
                style={{
                  padding: 8,
                  borderRadius: 10,
                  background: "#111827",
                  color: "#e5e7eb",
                  border: "1px solid #374151",
                }}
              />

              <Button variant="ghost" onClick={() => remove(l.id)} style={{ borderColor: "#ef4444", color: "#ef4444" }}>
                ✕
              </Button>

              {/* Color picker for cake/filling layers */}
              {l.type !== "support" && (
                <input
                  type="color"
                  value={l.color || "#F2D7E2"}
                  onChange={(e) => update(l.id, { color: e.target.value })}
                  style={{ gridColumn: "1 / span 3", width: 120, height: 28, background: "transparent", border: "none" }}
                />
              )}
            </div>
          ))}
        </Panel>
      </div>

      {/* Right: Preview + tabs */}
      <div>
        <Panel>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ color: "#d1d5db", fontWeight: 600 }}>Preview</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={() => alert("Slice coming soon 🍰")}>Take a Slice</Button>
            </div>
          </div>

          <div style={{ height: 420 }}>
            <CakeHero3D layers={layers} />
          </div>

          <Tabs tabs={["Preview", "Layers", "Summary"]} value={activeTab} onChange={setActiveTab} />

          {activeTab === "Preview" && (
            <div style={{ color: "#94a3b8" }}>Use the buttons to add layers; the preview updates instantly.</div>
          )}

          {activeTab === "Layers" && (
            <div style={{ color: "#94a3b8" }}>
              Each <b>cake</b> layer appears as a tier. A <b>filling</b> after a cake shows as a band between tiers.
            </div>
          )}

          {activeTab === "Summary" && (
            <div style={{ padding: 12, border: "1px solid #374151", borderRadius: 10, color: "#e5e7eb" }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Build Summary</div>
              {layers.map((l, i) => (
                <div key={l.id} style={{ opacity: 0.9, borderBottom: "1px dashed #374151", padding: "4px 0" }}>
                  Layer {i + 1}: {l.type.toUpperCase()} {l.flavor ? `— ${l.flavor}` : ""}{" "}
                  {l.icing ? `(${l.icing})` : ""}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
