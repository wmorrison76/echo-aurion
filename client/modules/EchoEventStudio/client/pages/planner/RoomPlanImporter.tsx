import React, { useCallback, useRef, useState } from "react";
type OverlayElement = React.ReactNode;
function parseSvgToReact(svgText: string): OverlayElement[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const root = doc.documentElement;
    const out: OverlayElement[] = [];
    root
      .querySelectorAll("line, rect, path, polyline, polygon, circle, ellipse")
      .forEach((el, i) => {
        const tag = el.tagName.toLowerCase();
        const props: any = {};
        for (const attr of Array.from(el.attributes))
          props[attr.name] = attr.value;
        const common = {
          key: i,
          stroke: props.stroke || "#374151",
          fill: props.fill || "none",
          strokeWidth: props["stroke-width"] || 1,
        };
        switch (tag) {
          case "line":
            out.push(
              React.createElement("line", {
                ...common,
                x1: props.x1,
                y1: props.y1,
                x2: props.x2,
                y2: props.y2,
              }),
            );
            break;
          case "rect":
            out.push(
              React.createElement("rect", {
                ...common,
                x: props.x,
                y: props.y,
                width: props.width,
                height: props.height,
                rx: props.rx,
                ry: props.ry,
              }),
            );
            break;
          case "path":
            out.push(React.createElement("path", { ...common, d: props.d }));
            break;
          case "polyline":
            out.push(
              React.createElement("polyline", {
                ...common,
                points: props.points,
              }),
            );
            break;
          case "polygon":
            out.push(
              React.createElement("polygon", {
                ...common,
                points: props.points,
                fill: props.fill || "rgba(59,130,246,0.08)",
              }),
            );
            break;
          case "circle":
            out.push(
              React.createElement("circle", {
                ...common,
                cx: props.cx,
                cy: props.cy,
                r: props.r,
              }),
            );
            break;
          case "ellipse":
            out.push(
              React.createElement("ellipse", {
                ...common,
                cx: props.cx,
                cy: props.cy,
                rx: props.rx,
                ry: props.ry,
              }),
            );
            break;
        }
      });
    return out;
  } catch {
    return [];
  }
}
interface SimplePlanJSON {
  walls?: { x1: number; y1: number; x2: number; y2: number }[];
  doors?: { x: number; y: number; w: number; h: number }[];
}
function jsonPlanToOverlay(json: SimplePlanJSON): OverlayElement[] {
  const els: OverlayElement[] = [];
  json.walls?.forEach((w, i) =>
    els.push(
      <line
        key={"w" + i}
        x1={w.x1}
        y1={w.y1}
        x2={w.x2}
        y2={w.y2}
        stroke="#111827"
        strokeWidth={2}
      />,
    ),
  );
  json.doors?.forEach((d, i) =>
    els.push(
      <rect
        key={"d" + i}
        x={d.x}
        y={d.y}
        width={d.w}
        height={d.h}
        fill="rgba(16,185,129,0.2)"
        stroke="#10b981"
        strokeWidth={1}
      />,
    ),
  );
  return els;
}
export default function RoomPlanImporter({
  onOverlay,
}: {
  onOverlay: (els: OverlayElement[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const importFile = useCallback(async () => {
    setError(null);
    const input = fileRef.current;
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    const text = await file.text();
    try {
      if (
        file.name.toLowerCase().endsWith(".svg") ||
        text.trim().startsWith("<svg")
      ) {
        const els = parseSvgToReact(text);
        onOverlay(els);
        return;
      }
      const data = JSON.parse(text) as SimplePlanJSON;
      onOverlay(jsonPlanToOverlay(data));
    } catch (e: any) {
      setError(e?.message || "Import failed");
    }
  }, [onOverlay]);
  return (
    <div className="space-y-2">
      {" "}
      <div className="text-xs font-medium">Floor Plan Import</div>{" "}
      <input
        ref={fileRef}
        type="file"
        accept=".svg,application/json"
        className="text-xs"
      />{" "}
      <button
        onClick={importFile}
        className="inline-flex items-center px-3 py-1.5 text-xs rounded-md border"
      >
        {" "}
        Import & Overlay{" "}
      </button>{" "}
      {error ? (
        <div className="text-xs text-destructive">{error}</div>
      ) : null}{" "}
      <div className="text-[10px] text-muted-foreground">
        {" "}
        SVG or simple JSON (walls/doors).{" "}
      </div>{" "}
    </div>
  );
}
