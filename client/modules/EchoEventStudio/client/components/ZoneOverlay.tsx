import React, { useCallback, useMemo, useState } from "react";
import type { Zone } from "@/lib/zones";
interface Props {
  zones: Zone[];
  onChange: (next: Zone[]) => void;
  zoom: number;
}
type DragMode =
  | { kind: "none" }
  | {
      kind: "move";
      id: string;
      start: { mx: number; my: number };
      orig: { x: number; y: number };
    }
  | {
      kind: "resize";
      id: string;
      start: { mx: number; my: number };
      orig: { x: number; y: number; w: number; h: number };
      corner: "nw" | "ne" | "sw" | "se";
    };
const PX_PER_FT = 12;
const ftToPx = (ft: number) => ft * PX_PER_FT;
const pxToFt = (px: number) => px / PX_PER_FT;
export default function ZoneOverlay({ zones, onChange, zoom }: Props) {
  const [drag, setDrag] = useState<DragMode>({ kind: "none" });
  const handleDownMove = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      const z = zones.find((z) => z.id === id);
      if (!z) return;
      setDrag({
        kind: "move",
        id,
        start: { mx: e.clientX, my: e.clientY },
        orig: { x: z.x, y: z.y },
      });
    },
    [zones],
  );
  const handleDownResize = useCallback(
    (e: React.PointerEvent, id: string, corner: "nw" | "ne" | "sw" | "se") => {
      e.stopPropagation();
      const z = zones.find((z) => z.id === id);
      if (!z) return;
      setDrag({
        kind: "resize",
        id,
        corner,
        start: { mx: e.clientX, my: e.clientY },
        orig: { x: z.x, y: z.y, w: z.width, h: z.height },
      });
    },
    [zones],
  );
  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (drag.kind === "none") return;
      const dxFt = pxToFt((e.clientX - drag.start.mx) / zoom);
      const dyFt = pxToFt((e.clientY - drag.start.my) / zoom);
      if (drag.kind === "move") {
        onChange(
          zones.map((z) =>
            z.id === drag.id
              ? { ...z, x: drag.orig.x + dxFt, y: drag.orig.y + dyFt }
              : z,
          ),
        );
        return;
      }
      if (drag.kind === "resize") {
        const { corner, orig } = drag;
        let x = orig.x,
          y = orig.y,
          w = orig.w,
          h = orig.h;
        if (corner === "nw") {
          x = orig.x + dxFt / 2;
          y = orig.y + dyFt / 2;
          w = Math.max(1, orig.w - dxFt);
          h = Math.max(1, orig.h - dyFt);
        }
        if (corner === "ne") {
          x = orig.x + dxFt / 2;
          y = orig.y + dyFt / 2;
          w = Math.max(1, orig.w + dxFt);
          h = Math.max(1, orig.h - dyFt);
        }
        if (corner === "sw") {
          x = orig.x + dxFt / 2;
          y = orig.y + dyFt / 2;
          w = Math.max(1, orig.w - dxFt);
          h = Math.max(1, orig.h + dyFt);
        }
        if (corner === "se") {
          x = orig.x + dxFt / 2;
          y = orig.y + dyFt / 2;
          w = Math.max(1, orig.w + dxFt);
          h = Math.max(1, orig.h + dyFt);
        }
        onChange(
          zones.map((z) =>
            z.id === drag.id ? { ...z, x, y, width: w, height: h } : z,
          ),
        );
      }
    },
    [drag, zones, onChange, zoom],
  );
  const onUp = useCallback(() => setDrag({ kind: "none" }), []);
  const handleSize = Math.max(6, 8 * (1 / zoom));
  return (
    <g onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
      {" "}
      {zones.map((z) => {
        const x = ftToPx(z.x - z.width / 2);
        const y = ftToPx(z.y - z.height / 2);
        const w = ftToPx(z.width);
        const h = ftToPx(z.height);
        const corners = [
          { key: "nw", cx: x, cy: y },
          { key: "ne", cx: x + w, cy: y },
          { key: "sw", cx: x, cy: y + h },
          { key: "se", cx: x + w, cy: y + h },
        ] as const;
        return (
          <g key={z.id}>
            {" "}
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill="transparent"
              stroke="#ef4444"
              strokeDasharray="4 4"
              onPointerDown={(e) => handleDownMove(e, z.id)}
            />{" "}
            {corners.map((c) => (
              <rect
                key={c.key}
                x={c.cx - handleSize / 2}
                y={c.cy - handleSize / 2}
                width={handleSize}
                height={handleSize}
                fill="#ef4444"
                stroke="#991b1b"
                onPointerDown={(e) => handleDownResize(e, z.id, c.key)}
              />
            ))}{" "}
          </g>
        );
      })}{" "}
    </g>
  );
}
