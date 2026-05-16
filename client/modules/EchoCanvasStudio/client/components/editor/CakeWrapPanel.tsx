import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Eye,
  Settings,
  Download,
  RefreshCw,
  Package,
} from "lucide-react";
import {
  CakeWrapEngine,
  WrapConfig,
  TopperConfig,
  CakeConfig,
  CakeWrapMode,
} from "./CakeWrapEngine";

interface CakeWrapPanelProps {
  engine: CakeWrapEngine;
  onWrapAdded: (wrap: WrapConfig) => void;
  onWrapRemoved: (id: string) => void;
  onWrapUpdated: (id: string, updates: Partial<WrapConfig>) => void;
  onTopperAdded: (topper: TopperConfig) => void;
  onTopperRemoved: (id: string) => void;
  onPreviewUpdate: (previewCanvas: HTMLCanvasElement) => void;
}

export default function CakeWrapPanel({
  engine,
  onWrapAdded,
  onWrapRemoved,
  onWrapUpdated,
  onTopperAdded,
  onTopperRemoved,
  onPreviewUpdate,
}: CakeWrapPanelProps) {
  const [activeTab, setActiveTab] = useState<"wraps" | "toppers" | "settings">("wraps");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cakeConfig, setCakeConfig] = useState<CakeConfig>({
    id: "cake-default",
    diameter: 200,
    height: 150,
    layers: 2,
    shape: "cylinder",
  });

  const wraps = engine.getAllWraps();
  const toppers = engine.getAllToppers();

  const addWrap = async (designUrl: string) => {
    const detectedConfig = await engine.detectCakeDimensions(designUrl);
    const wrap: WrapConfig = {
      id: `wrap-${Date.now()}`,
      mode: "cylindrical-wrap",
      designImageUrl: designUrl,
      cakeConfig: cakeConfig || detectedConfig,
      horizontalScale: 1,
      verticalScale: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      transparencyBlend: 1,
      perspectiveStrength: 0,
    };
    engine.addWrap(wrap);
    onWrapAdded(wrap);
  };

  const addTopper = (designUrl: string) => {
    const topper: TopperConfig = {
      id: `topper-${Date.now()}`,
      designImageUrl: designUrl,
      width: 100,
      height: 100,
      rotation: 0,
      positionX: 0,
      positionY: 0,
      elevation: 20,
      shadowStrength: 0.5,
    };
    engine.addTopper(topper);
    onTopperAdded(topper);
  };

  const generatePreview = () => {
    if (wraps.length > 0) {
      const wrap = wraps[0];
      const wrapImg = new Image();
      wrapImg.onload = () => {
        const wrapCanvas = engine.generateCylindricalWrap(
          imageToCanvas(wrapImg),
          wrap.cakeConfig,
          {
            horizontalScale: wrap.horizontalScale,
            verticalScale: wrap.verticalScale,
            rotation: wrap.rotation,
          },
        );

        let topperCanvas: HTMLCanvasElement | null = null;
        if (toppers.length > 0) {
          const topper = toppers[0];
          const topperImg = new Image();
          topperImg.onload = () => {
            topperCanvas = engine.generateTopperPreview(
              imageToCanvas(topperImg),
              wrap.cakeConfig,
              topper,
            );
            const fullPreview = engine.generateFullCakePreview(
              wrapCanvas,
              topperCanvas,
              wrap.cakeConfig,
            );
            onPreviewUpdate(fullPreview);
          };
          topperImg.src = topper.designImageUrl;
        } else {
          const fullPreview = engine.generateFullCakePreview(
            wrapCanvas,
            null,
            wrap.cakeConfig,
          );
          onPreviewUpdate(fullPreview);
        }
      };
      wrapImg.src = wrap.designImageUrl;
    }
  };

  const imageToCanvas = (img: HTMLImageElement): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0);
    }
    return canvas;
  };

  return (
    <div
      style={{
        backgroundColor: "#0b0f1a",
        borderRadius: "8px",
        border: "1px solid #c8a97e",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#0f0f0f",
          padding: "12px",
          borderBottom: "1px solid #333",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Package size={16} color="#c8a97e" />
        <span
          style={{
            color: "#c8a97e",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          Cake Designer Integration
        </span>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #333",
          backgroundColor: "#0f0f0f",
        }}
      >
        {[
          { id: "wraps", label: "Wraps" },
          { id: "toppers", label: "Toppers" },
          { id: "settings", label: "Cake Config" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: "10px",
              backgroundColor:
                activeTab === tab.id ? "rgba(0, 240, 255, 0.1)" : "transparent",
              color: activeTab === tab.id ? "#c8a97e" : "#666",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              borderBottom: activeTab === tab.id ? "2px solid #c8a97e" : "none",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          maxHeight: "400px",
        }}
      >
        {activeTab === "wraps" && (
          <WrapsPanel
            wraps={wraps}
            expandedId={expandedId}
            onToggleExpand={setExpandedId}
            onRemove={onWrapRemoved}
            onUpdate={onWrapUpdated}
            onAddWrap={addWrap}
          />
        )}

        {activeTab === "toppers" && (
          <ToppersPanel
            toppers={toppers}
            expandedId={expandedId}
            onToggleExpand={setExpandedId}
            onRemove={onTopperRemoved}
            onAddTopper={addTopper}
          />
        )}

        {activeTab === "settings" && (
          <SettingsPanel
            cakeConfig={cakeConfig}
            onConfigChange={setCakeConfig}
          />
        )}
      </div>

      {/* Actions Footer */}
      <div
        style={{
          borderTop: "1px solid #333",
          padding: "12px",
          backgroundColor: "#0f0f0f",
          display: "flex",
          gap: "8px",
        }}
      >
        <button
          onClick={generatePreview}
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor: "#333",
            border: "1px solid #c8a97e",
            color: "#c8a97e",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          <Eye size={12} />
          Preview
        </button>
        <button
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor: "#333",
            border: "1px solid #c8a97e",
            color: "#c8a97e",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          <Download size={12} />
          Export
        </button>
      </div>
    </div>
  );
}

function WrapsPanel({
  wraps,
  expandedId,
  onToggleExpand,
  onRemove,
  onUpdate,
  onAddWrap,
}: {
  wraps: WrapConfig[];
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<WrapConfig>) => void;
  onAddWrap: (url: string) => void;
}) {
  return (
    <div style={{ padding: "12px" }}>
      {wraps.length === 0 ? (
        <div style={{ color: "#666", fontSize: "12px", textAlign: "center", padding: "20px 0" }}>
          No wraps. Import from Editor or Cake Designer.
        </div>
      ) : (
        wraps.map((wrap) => (
          <WrapItem
            key={wrap.id}
            wrap={wrap}
            expanded={expandedId === wrap.id}
            onToggleExpand={() => onToggleExpand(expandedId === wrap.id ? null : wrap.id)}
            onRemove={() => onRemove(wrap.id)}
            onUpdate={(updates) => onUpdate(wrap.id, updates)}
          />
        ))
      )}
    </div>
  );
}

function WrapItem({
  wrap,
  expanded,
  onToggleExpand,
  onRemove,
  onUpdate,
}: {
  wrap: WrapConfig;
  expanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<WrapConfig>) => void;
}) {
  return (
    <div style={{ borderBottom: "1px solid #333", paddingBottom: "8px", marginBottom: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={onToggleExpand}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "#c8a97e",
            cursor: "pointer",
          }}
        >
          ▼
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#c8a97e", fontSize: "12px", fontWeight: "bold" }}>
            {wrap.mode.replace("-", " ")}
          </div>
          <div style={{ color: "#666", fontSize: "11px" }}>
            Scale: {wrap.horizontalScale.toFixed(2)}x
          </div>
        </div>
        <button
          onClick={onRemove}
          style={{ backgroundColor: "transparent", border: "none", color: "#ff4444", cursor: "pointer" }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      {expanded && (
        <div style={{ marginLeft: "24px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <SliderInput
            label="H-Scale"
            min={0.1}
            max={3}
            step={0.1}
            value={wrap.horizontalScale}
            onChange={(v) => onUpdate({ horizontalScale: v })}
          />
          <SliderInput
            label="V-Scale"
            min={0.1}
            max={3}
            step={0.1}
            value={wrap.verticalScale}
            onChange={(v) => onUpdate({ verticalScale: v })}
          />
          <SliderInput
            label="Rotation"
            min={0}
            max={360}
            value={wrap.rotation}
            onChange={(v) => onUpdate({ rotation: v })}
          />
        </div>
      )}
    </div>
  );
}

function ToppersPanel({
  toppers,
  expandedId,
  onToggleExpand,
  onRemove,
  onAddTopper,
}: {
  toppers: TopperConfig[];
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
  onRemove: (id: string) => void;
  onAddTopper: (url: string) => void;
}) {
  return (
    <div style={{ padding: "12px" }}>
      {toppers.length === 0 ? (
        <div style={{ color: "#666", fontSize: "12px", textAlign: "center", padding: "20px 0" }}>
          No toppers added yet.
        </div>
      ) : (
        toppers.map((topper) => (
          <div key={topper.id} style={{ borderBottom: "1px solid #333", paddingBottom: "8px", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ color: "#c8a97e", fontSize: "12px", fontWeight: "bold" }}>
                Topper {toppers.indexOf(topper) + 1}
              </div>
              <button
                onClick={() => onRemove(topper.id)}
                style={{ backgroundColor: "transparent", border: "none", color: "#ff4444", cursor: "pointer" }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SettingsPanel({
  cakeConfig,
  onConfigChange,
}: {
  cakeConfig: CakeConfig;
  onConfigChange: (config: CakeConfig) => void;
}) {
  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <SliderInput
        label="Diameter (mm)"
        min={50}
        max={500}
        value={cakeConfig.diameter}
        onChange={(v) => onConfigChange({ ...cakeConfig, diameter: v })}
      />
      <SliderInput
        label="Height (mm)"
        min={50}
        max={400}
        value={cakeConfig.height}
        onChange={(v) => onConfigChange({ ...cakeConfig, height: v })}
      />
      <SliderInput
        label="Layers"
        min={1}
        max={5}
        step={1}
        value={cakeConfig.layers}
        onChange={(v) => onConfigChange({ ...cakeConfig, layers: v })}
      />
      <div>
        <label style={{ color: "#666", fontSize: "11px", display: "block", marginBottom: "4px" }}>
          Shape
        </label>
        <select
          value={cakeConfig.shape}
          onChange={(e) => onConfigChange({ ...cakeConfig, shape: e.target.value as any })}
          style={{
            width: "100%",
            padding: "6px",
            backgroundColor: "#333",
            color: "#c8a97e",
            border: "1px solid #c8a97e",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          <option value="cylinder">Cylinder</option>
          <option value="rectangular">Rectangular</option>
          <option value="irregular">Irregular</option>
        </select>
      </div>
    </div>
  );
}

function SliderInput({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <label style={{ color: "#666", fontSize: "11px", minWidth: "70px" }}>
        {label}:
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, cursor: "pointer", accentColor: "#c8a97e" }}
      />
      <span style={{ color: "#c8a97e", fontSize: "11px", minWidth: "35px", textAlign: "right" }}>
        {typeof value === "number" ? value.toFixed(1) : value}
      </span>
    </div>
  );
}
