import React, { useState } from "react";
import { Upload } from "lucide-react";
interface ColorCorrectionPanelProps {
  onApplyCorrection: (correction: any) => void;
}
const PRESET_LUTS = [
  { id: "cinematic", name: "Cinematic", color: "#8B4513" },
  { id: "vintage", name: "Vintage", color: "#DAA520" },
  { id: "cool", name: "Cool", color: "#4682B4" },
  { id: "warm", name: "Warm", color: "#FF6347" },
  { id: "noir", name: "Noir", color: "#2F2F2F" },
];
export default function ColorCorrectionPanel({
  onApplyCorrection,
}: ColorCorrectionPanelProps) {
  const [activeTab, setActiveTab] = useState<"lut" | "curves" | "color-range">(
    "lut",
  );
  const [selectedLUT, setSelectedLUT] = useState("cinematic");
  const [selectedChannel, setSelectedChannel] = useState<
    "rgb" | "r" | "g" | "b"
  >("rgb");
  const [curvePoints, setCurvePoints] = useState<
    Array<{ x: number; y: number }>
  >([
    { x: 0, y: 0 },
    { x: 127, y: 127 },
    { x: 255, y: 255 },
  ]);
  const [colorRangeHue, setColorRangeHue] = useState(0);
  const [colorRangeRange, setColorRangeRange] = useState(30);
  const [colorRangeSaturation, setColorRangeSaturation] = useState(0);
  const [colorRangeLightness, setColorRangeLightness] = useState(0);
  const handleLUTUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onApplyCorrection({ type: "lut", data: content });
    };
    reader.readAsText(file);
  };
  const handlePresetLUT = (lutId: string) => {
    setSelectedLUT(lutId);
    onApplyCorrection({ type: "lut", preset: lutId });
  };
  const handleApplyCurves = () => {
    onApplyCorrection({
      type: "curves",
      channel: selectedChannel,
      points: curvePoints,
    });
  };
  const handleApplyColorRange = () => {
    onApplyCorrection({
      type: "color-range",
      hue: colorRangeHue,
      range: colorRangeRange,
      saturation: colorRangeSaturation,
      lightness: colorRangeLightness,
    });
  };
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
          Color Correction{" "}
        </h3>{" "}
      </div>{" "}
      {/* Tabs */}{" "}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #333",
          backgroundColor: "#0b0f1a",
        }}
      >
        {" "}
        {[
          { id: "lut", label: "LUT" },
          { id: "curves", label: "Curves" },
          { id: "color-range", label: "Color Range" },
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
              fontSize: "11px",
              fontWeight: "bold",
              borderBottom: activeTab === tab.id ? "2px solid #c8a97e" : "none",
              transition: "all 0.2s",
            }}
          >
            {" "}
            {tab.label}{" "}
          </button>
        ))}{" "}
      </div>{" "}
      {/* Content */}{" "}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {" "}
        {/* LUT Tab */}{" "}
        {activeTab === "lut" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                }}
              >
                {" "}
                Upload 3D LUT File (.cube){" "}
              </label>{" "}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px",
                  backgroundColor: "#0b0f1a",
                  border: "1px dashed #333",
                  borderRadius: "4px",
                  cursor: "pointer",
                  color: "#c8a97e",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}
              >
                {" "}
                <Upload size={12} /> Upload LUT{" "}
                <input
                  type="file"
                  accept=".cube"
                  onChange={handleLUTUpload}
                  style={{ display: "none" }}
                />{" "}
              </label>{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                }}
              >
                {" "}
                Preset LUTs{" "}
              </label>{" "}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px",
                }}
              >
                {" "}
                {PRESET_LUTS.map((lut) => (
                  <button
                    key={lut.id}
                    onClick={() => handlePresetLUT(lut.id)}
                    style={{
                      padding: "12px",
                      backgroundColor:
                        selectedLUT === lut.id
                          ? "rgba(0, 240, 255, 0.2)"
                          : "#0b0f1a",
                      border: `1px solid ${selectedLUT === lut.id ? "#c8a97e" : "#333"}`,
                      borderRadius: "4px",
                      color: "#c8a97e",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "bold",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    <div
                      style={{
                        width: "100%",
                        height: "20px",
                        backgroundColor: lut.color,
                        borderRadius: "2px",
                        marginBottom: "4px",
                      }}
                    />{" "}
                    {lut.name}{" "}
                  </button>
                ))}{" "}
              </div>{" "}
            </div>{" "}
          </div>
        )}{" "}
        {/* Curves Tab */}{" "}
        {activeTab === "curves" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                }}
              >
                {" "}
                Channel{" "}
              </label>{" "}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: "4px",
                }}
              >
                {" "}
                {[
                  { id: "rgb", label: "RGB" },
                  { id: "r", label: "Red" },
                  { id: "g", label: "Green" },
                  { id: "b", label: "Blue" },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch.id as any)}
                    style={{
                      padding: "6px",
                      backgroundColor:
                        selectedChannel === ch.id
                          ? "rgba(0, 240, 255, 0.2)"
                          : "#0b0f1a",
                      border: `1px solid ${selectedChannel === ch.id ? "#c8a97e" : "#333"}`,
                      color: "#c8a97e",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "bold",
                    }}
                  >
                    {" "}
                    {ch.label}{" "}
                  </button>
                ))}{" "}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                }}
              >
                {" "}
                Curve Preview{" "}
              </label>{" "}
              <div
                style={{
                  width: "100%",
                  height: "150px",
                  backgroundColor: "#0b0f1a",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  position: "relative",
                }}
              >
                {" "}
                <svg style={{ width: "100%", height: "100%" }}>
                  {" "}
                  {/* Grid */}{" "}
                  <line
                    x1="0"
                    y1="75"
                    x2="100%"
                    y2="75"
                    stroke="#333"
                    strokeWidth="0.5"
                  />{" "}
                  <line
                    x1="50%"
                    y1="0"
                    y2="100%"
                    stroke="#333"
                    strokeWidth="0.5"
                  />{" "}
                  {/* Curve line */}{" "}
                  <polyline
                    points={curvePoints
                      .map(
                        (p) =>
                          `${(p.x / 255) * 100}%,${((255 - p.y) / 255) * 100}%`,
                      )
                      .join("")}
                    stroke="#c8a97e"
                    strokeWidth="2"
                    fill="none"
                  />{" "}
                  {/* Points */}{" "}
                  {curvePoints.map((p, i) => (
                    <circle
                      key={i}
                      cx={`${(p.x / 255) * 100}%`}
                      cy={`${((255 - p.y) / 255) * 100}%`}
                      r="4"
                      fill="#c8a97e"
                    />
                  ))}{" "}
                </svg>{" "}
              </div>{" "}
            </div>{" "}
            <button
              onClick={handleApplyCurves}
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "#c8a97e",
                color: "#000",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              {" "}
              Apply Curves{" "}
            </button>{" "}
          </div>
        )}{" "}
        {/* Color Range Tab */}{" "}
        {activeTab === "color-range" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Target Hue: {colorRangeHue}°{" "}
              </label>{" "}
              <input
                type="range"
                min="0"
                max="360"
                value={colorRangeHue}
                onChange={(e) => setColorRangeHue(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Range: {colorRangeRange}°{" "}
              </label>{" "}
              <input
                type="range"
                min="0"
                max="180"
                value={colorRangeRange}
                onChange={(e) => setColorRangeRange(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Saturation: {colorRangeSaturation}{" "}
              </label>{" "}
              <input
                type="range"
                min="-100"
                max="100"
                value={colorRangeSaturation}
                onChange={(e) =>
                  setColorRangeSaturation(Number(e.target.value))
                }
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Lightness: {colorRangeLightness}{" "}
              </label>{" "}
              <input
                type="range"
                min="-100"
                max="100"
                value={colorRangeLightness}
                onChange={(e) => setColorRangeLightness(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
            <button
              onClick={handleApplyColorRange}
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "#c8a97e",
                color: "#000",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              {" "}
              Apply to Color Range{" "}
            </button>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
