import React from "react";
import { Link } from "react-router-dom";

import Layout from "@/components/Layout";
import WhatIfPanel from "@/components/WhatIfPanel";
import ZoneEditor from "@/components/ZoneEditor";
import ZoneOverlay from "@/components/ZoneOverlay";
import ZoneJsonDrawer from "@/components/ZoneJsonDrawer";
import LegendCounts from "@/components/LegendCounts";
import TemplateManager from "@/components/TemplateManager";
import TemplatePicker from "@/components/TemplatePicker";
import HeatmapOverlay from "@/components/HeatmapOverlay";
import PanelWindow from "@/components/studio/PanelWindow";
import DoorArcForm from "@/components/DoorArcForm";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  CloudUpload,
  Copy,
  Crosshair,
  Download,
  Flame,
  FolderOpen,
  Grid as GridIcon,
  Image as ImageIcon,
  MousePointer,
  Printer,
  RotateCw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import PanoramaStitcher from "./planner/PanoramaStitcher";
import RoomPlanImporter from "./planner/RoomPlanImporter";
import {
  buildPayload,
  computeMetrics,
  syncEchoStratus,
} from "./planner/echoStratusBridge";

import { TEMPLATES } from "@/lib/templates";
import {
  Zone,
  deserializeZones,
  serializeZones,
  checkZones,
} from "@/lib/zones";
import {
  generateChairsBanquet,
  generateChairsClassroom,
} from "@/lib/seating_rect";
import {
  createCabaret54,
  createCabaret60,
  createCabaret66,
  createCabaret72,
} from "@/lib/cabaret_presets";
import { generateSerpentine } from "@/lib/serpentine";
import {
  generateRoundChairsCrescent,
  generateRoundChairsFull,
  generateUShape,
} from "@/lib/seating";
import {
  requiredWidthInches,
  type DoorArc,
  type Occupancy,
  checkDoorSwings,
} from "@/lib/egress_rules";
import { checkClearances } from "@/lib/egress";

import { exportLayoutPDF } from "@/utils/pdfExport";

/* Display scale: 1 foot = PX_PER_FT pixels */
const PX_PER_FT = 12;
const GRID_FT = 1;

export type ItemType =
  | "round60"
  | "round72"
  | "rect8x30"
  | "rect6x30"
  | "cocktail30"
  | "serpentine"
  | "chair"
  | "stage"
  | "riser"
  | "dancefloor"
  | "buffet"
  | "pipedrape"
  | "banquet"
  | "booth"
  | "bar"
  | "barstool"
  | "twotop"
  | "fourtop"
  | "sixtop";

export interface Item {
  id: string;
  type: ItemType;
  x: number; /* feet (center) */
  y: number; /* feet (center) */
  width: number; /* feet */
  height: number; /* feet */
  rotation: number; /* degrees */
  label?: string;
  seats?: number; /* for tables */
  color?: string; /* fill */
}

type Mode =
  | { kind: "none" }
  | {
      kind: "drag";
      start: { mx: number; my: number };
      initial: Record<string, { x: number; y: number }>;
    }
  | { kind: "rotate"; id: string; center: { x: number; y: number } }
  | {
      kind: "pan";
      start: { mx: number; my: number };
      initial: { x: number; y: number };
    }
  | {
      kind: "marquee";
      start: { x: number; y: number };
      current: { x: number; y: number };
      append: boolean;
    };

interface PlannerState {
  sceneId: string;
  items: Item[];
  selected: Set<string>;
  pan: { x: number; y: number }; /* pixels */
  zoom: number;
  snap: boolean;
  background: string | null; /* data URL */
  zones: Zone[];
  doorArcs: DoorArc[];
  occupancy: Occupancy;
  mode: Mode;
  heatmap: boolean;
  crescentMode: boolean;
  lassoActive: boolean;
}

const DEFAULT_COLOR = "#8b5cf6"; /* violet-500 */

const PRESETS: Record<ItemType, Partial<Item>> = {
  round60: { width: 5, height: 5, seats: 8, label: 'Round 60"' },
  round72: { width: 6, height: 6, seats: 10, label: 'Round 72"' },
  rect8x30: { width: 8, height: 2.5, seats: 8, label: "8×30" },
  rect6x30: { width: 6, height: 2.5, seats: 6, label: "6×30" },
  cocktail30: { width: 2.5, height: 2.5, seats: 4, label: 'Cocktail 30"' },
  serpentine: { width: 6, height: 3, seats: 6, label: "Serpentine" },
  chair: { width: 1.5, height: 1.5, seats: 1, label: "Chair" },
  stage: { width: 8, height: 8, seats: 0, label: "Stage" },
  riser: { width: 4, height: 8, seats: 0, label: "Riser" },
  dancefloor: { width: 16, height: 16, seats: 0, label: "Dance Floor" },
  buffet: { width: 8, height: 2.5, seats: 0, label: "Buffet" },
  pipedrape: { width: 10, height: 1, seats: 0, label: "Pipe & Drape" },
  banquet: { width: 5, height: 3.5, seats: 6, label: "Banquet 5×3.5" },
  booth: { width: 4, height: 4, seats: 4, label: "Booth" },
  bar: { width: 10, height: 2, seats: 0, label: "Bar" },
  barstool: { width: 1, height: 1, seats: 1, label: "Bar Stool" },
  twotop: { width: 2.5, height: 2.5, seats: 2, label: "2-Top" },
  fourtop: { width: 3, height: 3, seats: 4, label: "4-Top" },
  sixtop: { width: 4, height: 3.5, seats: 6, label: "6-Top" },
};

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function ftToPx(ft: number): number {
  return ft * PX_PER_FT;
}

function pxToFt(px: number): number {
  return px / PX_PER_FT;
}

function snapFt(valFt: number, enabled: boolean): number {
  if (!enabled) return valFt;
  return Math.round(valFt / GRID_FT) * GRID_FT;
}

function useKey(key: string, handler: (e: KeyboardEvent) => void): void {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === key.toLowerCase()) handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, handler]);
}

function serialize(state: PlannerState): string {
  return JSON.stringify({
    v: 4,
    sceneId: state.sceneId,
    items: state.items,
    pan: state.pan,
    zoom: state.zoom,
    snap: state.snap,
    bg: state.background,
    zones: serializeZones(state.zones),
    doorArcs: state.doorArcs,
    occupancy: state.occupancy,
    heatmap: state.heatmap,
  });
}

function deserialize(str: string): PlannerState | null {
  try {
    const raw = JSON.parse(str);
    if (!raw || typeof raw !== "object") return null;
    return {
      sceneId:
        typeof raw.sceneId === "string" && raw.sceneId
          ? raw.sceneId
          : `SCN-${Date.now().toString(36)}`,
      items: Array.isArray(raw.items) ? raw.items : [],
      selected: new Set<string>(),
      pan: raw.pan ?? { x: 0, y: 0 },
      zoom: raw.zoom ?? 1,
      snap: raw.snap ?? true,
      background: raw.bg ?? null,
      zones: deserializeZones(raw.zones ?? []),
      doorArcs: Array.isArray(raw.doorArcs)
        ? raw.doorArcs.map((a: any) => ({
            id: String(a.id || makeId()),
            cx: Number(a.cx) || 0,
            cy: Number(a.cy) || 0,
            radius: Number(a.radius) || 3,
            startDeg: Number(a.startDeg) || 0,
            endDeg: Number(a.endDeg) || 90,
            label: a.label ? String(a.label) : undefined,
          }))
        : [],
      occupancy:
        raw.occupancy === "banquet" ||
        raw.occupancy === "classroom" ||
        raw.occupancy === "theater" ||
        raw.occupancy === "assembly"
          ? raw.occupancy
          : "banquet",
      mode: { kind: "none" },
      heatmap: !!raw.heatmap,
      crescentMode: false,
      lassoActive: false,
    };
  } catch {
    return null;
  }
}

function getCenterPx(item: Item): { x: number; y: number } {
  return { x: ftToPx(item.x), y: ftToPx(item.y) };
}

function aabbOfItemFt(it: Item): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const cx = it.x;
  const cy = it.y;
  const hw = it.width / 2;
  const hh = it.height / 2;
  const rad = (it.rotation * Math.PI) / 180;
  const cs = Math.cos(rad);
  const sn = Math.sin(rad);
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ].map((p) => ({ x: cx + p.x * cs - p.y * sn, y: cy + p.x * sn + p.y * cs }));
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function SeatsRing({ item, zoom }: { item: Item; zoom: number }) {
  const seats = Math.max(0, item.seats ?? 0);
  if (!seats || !item.type.startsWith("round")) return null;
  const rPx = (ftToPx(item.width) / 2) * 1.1;
  const nodes: JSX.Element[] = [];
  for (let i = 0; i < seats; i++) {
    const angle = (i / seats) * Math.PI * 2;
    const cx = Math.cos(angle) * rPx;
    const cy = Math.sin(angle) * rPx;
    nodes.push(
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={Math.max(2, 3 * zoom)}
        fill="#111827"
        stroke="#ffffff"
        strokeWidth={1}
      />,
    );
  }
  return <g className="pointer-events-none">{nodes}</g>;
}

function ItemShape({
  item,
  selected,
  onPointerDown,
  onRotateDown,
  zoom,
}: {
  item: Item;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onRotateDown: (e: React.PointerEvent, id: string) => void;
  zoom: number;
}) {
  const centerPx = getCenterPx(item);
  const wpx = ftToPx(item.width);
  const hpx = ftToPx(item.height);

  const handleOffset = Math.max(18, 20 * zoom);
  const stroke = selected ? "#10b981" : "#374151";
  const strokeWidth = selected
    ? Math.max(1.5, 1.25 * zoom)
    : Math.max(1, 0.75 * zoom);

  return (
    <g
      transform={`translate(${centerPx.x},${centerPx.y}) rotate(${item.rotation})`}
    >
      {item.type.startsWith("round") || item.type === "cocktail30" ? (
        <circle
          cx={0}
          cy={0}
          r={wpx / 2}
          fill={item.color || DEFAULT_COLOR}
          fillOpacity={0.25}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onPointerDown={(e) => onPointerDown(e, item.id)}
        />
      ) : (
        <rect
          x={-wpx / 2}
          y={-hpx / 2}
          width={wpx}
          height={hpx}
          rx={Math.min(8, 4 * zoom)}
          ry={Math.min(8, 4 * zoom)}
          fill={item.color || DEFAULT_COLOR}
          fillOpacity={0.2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onPointerDown={(e) => onPointerDown(e, item.id)}
        />
      )}

      <SeatsRing item={item} zoom={zoom} />

      {item.label ? (
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={Math.max(10, 10 * zoom)}
          fill="#111827"
          style={{ userSelect: "none" }}
        >
          {item.label}
        </text>
      ) : null}

      <g transform={`translate(0,${-hpx / 2 - handleOffset})`}>
        <circle
          r={Math.max(8, 8 * zoom)}
          fill="#f59e0b"
          stroke="#92400e"
          strokeWidth={1}
          onPointerDown={(e) => onRotateDown(e, item.id)}
        />
        <RotateCw
          size={Math.max(12, 12 * zoom)}
          color="#111827"
          style={{ transform: "translate(-6px, -6px)" }}
        />
      </g>

      {selected ? (
        <rect
          x={-wpx / 2}
          y={-hpx / 2}
          width={wpx}
          height={hpx}
          fill="none"
          stroke="#10b981"
          strokeDasharray="4 4"
          strokeWidth={Math.max(1, 1 * zoom)}
        />
      ) : null}
    </g>
  );
}

export default function Planner() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const lastWorldRef = React.useRef<{ x: number; y: number } | null>(null);

  const [state, setState] = React.useState<PlannerState>(() => {
    const saved = localStorage.getItem("planner-lite-state");
    if (saved) {
      const d = deserialize(saved);
      if (d) return d;
    }
    return {
      sceneId: `SCN-${Date.now().toString(36)}`,
      items: [],
      selected: new Set(),
      pan: { x: 0, y: 0 },
      zoom: 1,
      snap: true,
      background: null,
      zones: [],
      doorArcs: [],
      occupancy: "banquet",
      mode: { kind: "none" },
      heatmap: false,
      crescentMode: false,
      lassoActive: false,
    };
  });

  const [overlayEls, setOverlayEls] = React.useState<React.ReactNode[] | null>(
    null,
  );
  const [showZones, setShowZones] = React.useState(true);
  const [doorDraft, setDoorDraft] = React.useState<DoorArc>({
    id: "draft",
    cx: 0,
    cy: 0,
    radius: 3,
    startDeg: 0,
    endDeg: 90,
    label: "Door",
  });
  const [pickingDoorCenter, setPickingDoorCenter] = React.useState(false);

  const [panels, setPanels] = React.useState<Record<string, boolean>>({
    palette: true,
  });

  /* If MobileCapture pushed a background image, load it on mount */
  React.useEffect(() => {
    const url = localStorage.getItem("planner.background");
    if (url) {
      setState((s) => ({ ...s, background: url }));
      localStorage.removeItem("planner.background");
    }
  }, []);

  /* autosave */
  React.useEffect(() => {
    localStorage.setItem("planner-lite-state", serialize(state));
  }, [state]);

  const worldToLocal = React.useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      const x = (clientX - (rect?.left ?? 0) - state.pan.x) / state.zoom;
      const y = (clientY - (rect?.top ?? 0) - state.pan.y) / state.zoom;
      return { x, y };
    },
    [state.pan, state.zoom],
  );

  const selectedItem = React.useMemo(
    () => state.items.find((it) => state.selected.has(it.id)) ?? null,
    [state.items, state.selected],
  );

  const counts = React.useMemo(() => {
    const byType = new Map<ItemType, number>();
    let chairTotal = 0;
    for (const it of state.items) {
      byType.set(it.type, (byType.get(it.type) ?? 0) + 1);
      if (
        it.seats &&
        (it.type.startsWith("round") || it.type.startsWith("rect"))
      )
        chairTotal += it.seats;
      if (it.type === "chair") chairTotal += 1;
    }
    return { byType, chairTotal };
  }, [state.items]);

  const saveLocal = React.useCallback(() => {
    const data = serialize(state);
    localStorage.setItem(`layout-${state.sceneId}`, data);
    localStorage.setItem("latestLayoutId", state.sceneId);
    toast({ title: "Layout saved", description: state.sceneId });
  }, [state]);

  const loadLatest = React.useCallback(() => {
    const id = localStorage.getItem("latestLayoutId");
    if (!id) {
      toast({ title: "No saved layout" });
      return;
    }
    const raw = localStorage.getItem(`layout-${id}`);
    if (!raw) {
      toast({
        title: "Nothing stored for latest layout",
        variant: "destructive",
      });
      return;
    }
    const d = deserialize(raw);
    if (d) setState(d);
  }, []);

  const addItem = React.useCallback((type: ItemType) => {
    setState((s) => {
      const preset = PRESETS[type];
      const center = {
        x: pxToFt((s.pan.x + 420) / s.zoom),
        y: pxToFt((s.pan.y + 260) / s.zoom),
      };
      const item: Item = {
        id: makeId(),
        type,
        x: snapFt(center.x, s.snap),
        y: snapFt(center.y, s.snap),
        width: preset.width ?? 4,
        height: preset.height ?? 4,
        rotation: 0,
        label: preset.label ?? type,
        seats: preset.seats ?? 0,
        color: DEFAULT_COLOR,
      };
      return { ...s, items: [...s.items, item], selected: new Set([item.id]) };
    });
  }, []);

  const onBackgroundFile = React.useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () =>
      setState((s) => ({ ...s, background: String(reader.result) }));
    reader.readAsDataURL(file);
  }, []);

  const onPointerDownItem = React.useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      setState((s) => {
        if (s.lassoActive) return s;
        if (s.crescentMode) {
          const it = s.items.find((x) => x.id === id);
          if (it && it.type.startsWith("round")) {
            const chairs = generateRoundChairsCrescent(it);
            return { ...s, items: [...s.items, ...chairs] };
          }
          return s;
        }

        const isShift = (e as any).shiftKey;
        const selected = new Set(s.selected);
        if (isShift) {
          if (selected.has(id)) selected.delete(id);
          else selected.add(id);
        } else {
          if (!selected.has(id) || selected.size > 1) {
            selected.clear();
            selected.add(id);
          }
        }

        const start = { mx: (e as any).clientX, my: (e as any).clientY };
        const initial: Record<string, { x: number; y: number }> = {};
        for (const it of s.items) {
          if (selected.has(it.id)) initial[it.id] = { x: it.x, y: it.y };
        }
        return { ...s, selected, mode: { kind: "drag", start, initial } };
      });
    },
    [],
  );

  const onPointerDownRotate = React.useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      const svgRect = svgRef.current?.getBoundingClientRect();
      const item = state.items.find((it) => it.id === id);
      if (!item || !svgRect) return;
      const center = {
        x: state.pan.x + state.zoom * ftToPx(item.x),
        y: state.pan.y + state.zoom * ftToPx(item.y),
      };
      setState((s) => ({
        ...s,
        selected: new Set([id]),
        mode: { kind: "rotate", id, center },
      }));
    },
    [state.items, state.pan, state.zoom],
  );

  const onPointerDownBackground = React.useCallback(
    (e: React.PointerEvent) => {
      const isSpace =
        (e as any).nativeEvent instanceof MouseEvent &&
        (e as any).nativeEvent.buttons === 1 &&
        (e as any).nativeEvent.getModifierState &&
        (e as any).nativeEvent.getModifierState("Space");

      if (isSpace) {
        setState((s) => ({
          ...s,
          mode: {
            kind: "pan",
            start: { mx: e.clientX, my: e.clientY },
            initial: { ...s.pan },
          },
        }));
        return;
      }

      if (pickingDoorCenter) {
        const wl = worldToLocal(e.clientX, e.clientY);
        setDoorDraft((d) => ({ ...d, cx: pxToFt(wl.x), cy: pxToFt(wl.y) }));
        setPickingDoorCenter(false);
        return;
      }

      const wl = worldToLocal(e.clientX, e.clientY);
      setState((s) => {
        if (s.lassoActive) {
          return {
            ...s,
            mode: {
              kind: "marquee",
              start: { x: wl.x, y: wl.y },
              current: { x: wl.x, y: wl.y },
              append: (e as any).shiftKey,
            },
          };
        }
        return { ...s, selected: new Set(), mode: { kind: "none" } };
      });
    },
    [pickingDoorCenter, worldToLocal],
  );

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      const wl = worldToLocal(e.clientX, e.clientY);
      lastWorldRef.current = wl;

      setState((s) => {
        if (s.mode.kind === "drag") {
          const dx = (e.clientX - s.mode.start.mx) / s.zoom;
          const dy = (e.clientY - s.mode.start.my) / s.zoom;
          const next = s.items.map((it) => {
            if (!s.selected.has(it.id)) return it;
            const start = s.mode.initial[it.id] ?? { x: it.x, y: it.y };
            const nx = snapFt(start.x + pxToFt(dx), s.snap);
            const ny = snapFt(start.y + pxToFt(dy), s.snap);
            return { ...it, x: nx, y: ny };
          });
          return { ...s, items: next };
        }

        if (s.mode.kind === "pan") {
          const dx = e.clientX - s.mode.start.mx;
          const dy = e.clientY - s.mode.start.my;
          return {
            ...s,
            pan: { x: s.mode.initial.x + dx, y: s.mode.initial.y + dy },
          };
        }

        if (s.mode.kind === "rotate") {
          const { center } = s.mode;
          const angle = Math.atan2(e.clientY - center.y, e.clientX - center.x);
          const deg = (angle * 180) / Math.PI + 90;
          return {
            ...s,
            items: s.items.map((it) =>
              it.id === s.mode.id ? { ...it, rotation: Math.round(deg) } : it,
            ),
          };
        }

        if (s.mode.kind === "marquee") {
          return { ...s, mode: { ...s.mode, current: { x: wl.x, y: wl.y } } };
        }

        return s;
      });
    },
    [worldToLocal],
  );

  const onPointerUp = React.useCallback(() => {
    setState((s) => {
      if (s.mode.kind !== "marquee") return { ...s, mode: { kind: "none" } };
      const { start, current, append } = s.mode;
      const minPx = Math.min(start.x, current.x);
      const maxPx = Math.max(start.x, current.x);
      const minPy = Math.min(start.y, current.y);
      const maxPy = Math.max(start.y, current.y);
      const minFt = { x: pxToFt(minPx), y: pxToFt(minPy) };
      const maxFt = { x: pxToFt(maxPx), y: pxToFt(maxPy) };

      const ids = s.items
        .filter((it) => {
          const b = aabbOfItemFt(it);
          return !(
            b.maxX < minFt.x ||
            b.minX > maxFt.x ||
            b.maxY < minFt.y ||
            b.minY > maxFt.y
          );
        })
        .map((it) => it.id);

      const selected = new Set<string>(
        append ? [...Array.from(s.selected), ...ids] : ids,
      );
      return { ...s, selected, mode: { kind: "none" } };
    });
  }, []);

  const onWheel = React.useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const { x, y } = worldToLocal(e.clientX, e.clientY);
      const before = { x, y };
      setState((s) => {
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const zoom = Math.min(5, Math.max(0.2, s.zoom * factor));
        const nx = before.x * zoom - x * s.zoom;
        const ny = before.y * zoom - y * s.zoom;
        return { ...s, zoom, pan: { x: s.pan.x - nx, y: s.pan.y - ny } };
      });
    },
    [worldToLocal],
  );

  /* keyboard: delete */
  useKey("Delete", () => {
    setState((s) => ({
      ...s,
      items: s.items.filter((it) => !s.selected.has(it.id)),
      selected: new Set(),
      mode: { kind: "none" },
    }));
  });
  useKey("Backspace", (e) => {
    e.preventDefault();
    setState((s) => ({
      ...s,
      items: s.items.filter((it) => !s.selected.has(it.id)),
      selected: new Set(),
      mode: { kind: "none" },
    }));
  });
  /* duplicate */
  useKey("d", (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    setState((s) => {
      if (s.selected.size === 0) return s;
      const dup = s.items
        .filter((it) => s.selected.has(it.id))
        .map((it) => ({ ...it, id: makeId(), x: it.x + 1, y: it.y + 1 }));
      return {
        ...s,
        items: [...s.items, ...dup],
        selected: new Set(dup.map((d) => d.id)),
        mode: { kind: "none" },
      };
    });
  });

  const exportJSON = React.useCallback(() => {
    const data = serialize(state);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "planner-layout.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const importJSON = React.useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const d = deserialize(String(reader.result));
      if (d) {
        setState({ ...d, selected: new Set(), mode: { kind: "none" } });
        toast({ title: "Layout imported" });
      } else {
        toast({ title: "Invalid JSON", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  }, []);

  const exportPNG = React.useCallback(async () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current.cloneNode(true) as SVGSVGElement;
    const toRemove = svgEl.querySelectorAll(
      "g > g > circle, g > g > svg, rect[stroke-dasharray]",
    );
    toRemove.forEach((n) => n.parentElement?.remove());

    const serializer = new XMLSerializer();
    const str = serializer.serializeToString(svgEl);
    const svgUrl = URL.createObjectURL(
      new Blob([str], { type: "image/svg+xml" }),
    );

    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    const bbox = svgRef.current.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(bbox.width));
    canvas.height = Math.max(1, Math.floor(bbox.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(svgUrl);

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "planner-layout.png";
    a.click();
  }, []);

  const shareWalkthrough = React.useCallback(async () => {
    try {
      const camera = { position: [6, 6, 6], target: [0, 0, 0], fov: 50 };
      const meta = { eventName: "Untitled Event", ts: Date.now() };
      const res = await fetch("/api/scenes/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: state.sceneId,
          items: state.items,
          camera,
          meta,
        }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      const url = String(json.url || "");
      navigator.clipboard?.writeText(url).catch(() => {});
      toast({ title: "Walkthrough link copied", description: url });
      window.open(url, "_blank");
    } catch (err: any) {
      toast({
        title: err?.message || "Failed to create link",
        variant: "destructive",
      });
    }
  }, [state.items, state.sceneId]);

  const loadTemplate = React.useCallback(
    (tpl: { name: string; items: Item[] }) => {
      setState((s) => ({
        ...s,
        items: tpl.items.map((it) => ({ ...it, id: makeId() })),
        selected: new Set(),
        mode: { kind: "none" },
      }));
    },
    [],
  );

  return (
    <Layout>
      {/* Top title bar */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-40 w-[min(1200px,calc(100%-2rem))]">
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-apple flex items-center justify-between px-3 h-12">
          <div className="text-sm font-semibold tracking-tight">
            EchoAi³ Planner
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanels((s) => ({ ...s, palette: true }))}
            >
              Palette
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanels((s) => ({ ...s, background: true }))}
            >
              Background
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanels((s) => ({ ...s, inspector: true }))}
            >
              Inspector
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanels((s) => ({ ...s, zones: true }))}
            >
              Zones
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanels((s) => ({ ...s, templates: true }))}
            >
              Templates
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanels((s) => ({ ...s, whatif: true }))}
            >
              What‑If
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanels((s) => ({ ...s, counts: true }))}
            >
              Counts
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={saveLocal}>
                  <Save className="h-4 w-4 mr-2" /> Save Local
                </DropdownMenuItem>
                <DropdownMenuItem onClick={loadLatest}>
                  <FolderOpen className="h-4 w-4 mr-2" /> Load Latest
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportJSON}>
                  <Download className="h-4 w-4 mr-2" /> Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportPNG}>
                  <Download className="h-4 w-4 mr-2" /> Export PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareWalkthrough}>
                  <CloudUpload className="h-4 w-4 mr-2" /> Share Walkthrough
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/studio">
              <Button size="sm" className="ml-1">
                Open Studio
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-3rem)] pt-12">
        {/* Floating Panels */}
        {panels.palette && (
          <PanelWindow
            id="pl-palette"
            title="Palette"
            initial={{ x: 240, y: 160, w: 320 }}
            onClose={() => setPanels((s) => ({ ...s, palette: false }))}
          >
            <ScrollArea className="h-96 pr-4">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { t: "round60", n: 'Round 60"' },
                    { t: "round72", n: 'Round 72"' },
                    { t: "rect8x30", n: "8×30" },
                    { t: "rect6x30", n: "6×30" },
                    { t: "cocktail30", n: "Cocktail" },
                    { t: "serpentine", n: "Serpentine" },
                    { t: "chair", n: "Chair" },
                    { t: "stage", n: "Stage" },
                    { t: "riser", n: "Riser" },
                    { t: "dancefloor", n: "Dance" },
                    { t: "buffet", n: "Buffet" },
                    { t: "pipedrape", n: "Pipe&Drape" },
                    { t: "banquet", n: "Banquet" },
                    { t: "booth", n: "Booth" },
                    { t: "bar", n: "Bar" },
                    { t: "barstool", n: "Bar Stool" },
                    { t: "twotop", n: "2-Top" },
                    { t: "fourtop", n: "4-Top" },
                    { t: "sixtop", n: "6-Top" },
                  ] as { t: ItemType; n: string }[]
                ).map((p) => (
                  <Button
                    key={p.t}
                    variant="secondary"
                    size="sm"
                    className="justify-center"
                    onClick={() => addItem(p.t)}
                  >
                    {p.n}
                  </Button>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={state.crescentMode ? "default" : "secondary"}
                  onClick={() =>
                    setState((s) => ({ ...s, crescentMode: !s.crescentMode }))
                  }
                >
                  Crescents
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setState((s) => ({ ...s, lassoActive: !s.lassoActive }))
                  }
                >
                  Lasso
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const sel = state.items.find((it) =>
                      state.selected.has(it.id),
                    );
                    if (!sel || !sel.type.startsWith("round")) {
                      toast({
                        title: "Select a round table",
                        variant: "destructive",
                      });
                      return;
                    }
                    const chairs = generateRoundChairsFull(sel);
                    setState((s) => ({ ...s, items: [...s.items, ...chairs] }));
                  }}
                >
                  Round Full
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const sel = state.items.find((it) =>
                      state.selected.has(it.id),
                    );
                    if (!sel || !sel.type.startsWith("rect")) {
                      toast({
                        title: "Select a rectangular table",
                        variant: "destructive",
                      });
                      return;
                    }
                    const add = generateChairsClassroom(sel);
                    setState((s) => ({ ...s, items: [...s.items, ...add] }));
                  }}
                >
                  Rect Classroom
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const sel = state.items.find((it) =>
                      state.selected.has(it.id),
                    );
                    if (!sel || !sel.type.startsWith("rect")) {
                      toast({
                        title: "Select a rectangular table",
                        variant: "destructive",
                      });
                      return;
                    }
                    const add = generateChairsBanquet(sel);
                    setState((s) => ({ ...s, items: [...s.items, ...add] }));
                  }}
                >
                  Rect Banquet
                </Button>
                <Button
                  size="sm"
                  className="col-span-2"
                  variant="secondary"
                  onClick={() => {
                    const add = generateSerpentine({ x: 8, y: 14 }, 8);
                    setState((s) => ({ ...s, items: [...s.items, ...add] }));
                  }}
                >
                  Serpentine Preset
                </Button>
                <Button
                  size="sm"
                  className="col-span-2"
                  variant="secondary"
                  onClick={() => {
                    const center = { x: 10, y: 10 };
                    const add = generateUShape(center, {
                      topCount: 5,
                      sideCount: 3,
                      spacingFt: 1,
                    });
                    setState((s) => ({ ...s, items: [...s.items, ...add] }));
                  }}
                >
                  Generate U‑Shape
                </Button>
                <Button
                  size="sm"
                  className="col-span-2"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      items: [...s.items, ...createCabaret54({ x: 6, y: 8 })],
                    }))
                  }
                >
                  Cabaret 54"
                </Button>
                <Button
                  size="sm"
                  className="col-span-2"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      items: [...s.items, ...createCabaret60({ x: 12, y: 8 })],
                    }))
                  }
                >
                  Cabaret 60"
                </Button>
                <Button
                  size="sm"
                  className="col-span-2"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      items: [...s.items, ...createCabaret66({ x: 18, y: 8 })],
                    }))
                  }
                >
                  Cabaret 66"
                </Button>
                <Button
                  size="sm"
                  className="col-span-2"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      items: [...s.items, ...createCabaret72({ x: 24, y: 8 })],
                    }))
                  }
                >
                  Cabaret 72"
                </Button>
              </div>
            </ScrollArea>
          </PanelWindow>
        )}

        {panels.background && (
          <PanelWindow
            id="pl-bg"
            title="Background"
            initial={{ x: 580, y: 160, w: 360 }}
            onClose={() => setPanels((s) => ({ ...s, background: false }))}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    e.target.files && onBackgroundFile(e.target.files[0])
                  }
                  className="text-xs"
                />
              </div>
              <PanoramaStitcher
                onStitched={(data) =>
                  setState((s) => ({ ...s, background: data }))
                }
              />
              <RoomPlanImporter onOverlay={(els) => setOverlayEls(els)} />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setState((s) => ({ ...s, background: null }))}
              >
                Clear Background
              </Button>
            </div>
          </PanelWindow>
        )}

        {panels.zones && (
          <PanelWindow
            id="pl-zones"
            title="Zones"
            initial={{ x: 240, y: 520, w: 360 }}
            onClose={() => setPanels((s) => ({ ...s, zones: false }))}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-[10px]">
                  Zones: {state.zones.length}
                </Badge>
                <Button
                  size="sm"
                  variant={showZones ? "default" : "secondary"}
                  onClick={() => setShowZones((v) => !v)}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  {showZones ? "Visible" : "Hidden"}
                </Button>
              </div>
              <ZoneEditor
                zones={state.zones}
                onChange={(next) => setState((s) => ({ ...s, zones: next }))}
              />
            </div>
          </PanelWindow>
        )}

        {panels.templates && (
          <PanelWindow
            id="pl-templates"
            title="Templates"
            initial={{ x: 960, y: 160, w: 360 }}
            onClose={() => setPanels((s) => ({ ...s, templates: false }))}
          >
            <div className="space-y-3">
              <Select
                onValueChange={(v) => {
                  const tpl = TEMPLATES.find((t) => t.name === v);
                  if (tpl) loadTemplate(tpl);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Load template" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TemplatePicker
                onPick={(name) => {
                  const tpl = TEMPLATES.find((t) => t.name === name);
                  if (tpl) loadTemplate(tpl);
                }}
              />
              <TemplateManager
                items={state.items}
                onLoad={(next) =>
                  setState((s) => ({
                    ...s,
                    items: next,
                    selected: new Set(),
                    mode: { kind: "none" },
                  }))
                }
              />
            </div>
          </PanelWindow>
        )}

        {panels.whatif && (
          <PanelWindow
            id="pl-whatif"
            title="What‑If"
            initial={{ x: 960, y: 520, w: 380 }}
            onClose={() => setPanels((s) => ({ ...s, whatif: false }))}
          >
            <WhatIfPanel
              items={state.items}
              onApply={(delta) => {
                if (!delta) return;
                setState((s) => {
                  if (delta > 0) {
                    const add = Array.from({ length: delta }).map((_, i) => ({
                      id: makeId(),
                      type: "cocktail30" as const,
                      x: 6 + i * 3,
                      y: 6 + i * 2,
                      width: 2.5,
                      height: 2.5,
                      rotation: 0,
                      label: "Cocktail",
                      seats: 4,
                      color: "#f59e0b",
                    }));
                    return { ...s, items: [...s.items, ...add] };
                  }
                  let toRemove = -delta;
                  const next = [...s.items];
                  for (let i = next.length - 1; i >= 0 && toRemove > 0; i--) {
                    if (next[i].type === "cocktail30") {
                      next.splice(i, 1);
                      toRemove--;
                    }
                  }
                  return {
                    ...s,
                    items: next,
                    selected: new Set(),
                    mode: { kind: "none" },
                  };
                });
              }}
            />
          </PanelWindow>
        )}

        {panels.counts && (
          <PanelWindow
            id="pl-counts"
            title="Legend & Counts"
            initial={{ x: 1360, y: 160, w: 300 }}
            onClose={() => setPanels((s) => ({ ...s, counts: false }))}
          >
            <div className="space-y-2">
              <div className="text-[10px] text-muted-foreground">
                Seats: {computeMetrics(state.items).seatsTotal} • Density:{" "}
                {computeMetrics(state.items).densitySeatsPer1000SqFt.toFixed(1)}{" "}
                /1000 sqft
              </div>
              <LegendCounts items={state.items} />
              <Separator />
              <div className="space-y-1 text-sm">
                {[...counts.byType.entries()].map(([t, n]) => (
                  <div key={t} className="flex justify-between">
                    <span className="text-muted-foreground">{t}</span>
                    <span className="font-medium">{n}</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span>Total Chairs</span>
                  <span className="font-semibold">{counts.chairTotal}</span>
                </div>
              </div>
            </div>
          </PanelWindow>
        )}

        {panels.inspector && (
          <PanelWindow
            id="pl-inspector"
            title="Inspector"
            initial={{ x: 1360, y: 520, w: 420 }}
            onClose={() => setPanels((s) => ({ ...s, inspector: false }))}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" onClick={saveLocal}>
                  <Save className="h-4 w-4 mr-2" /> Save Local
                </Button>
                <Button variant="secondary" size="sm" onClick={loadLatest}>
                  <FolderOpen className="h-4 w-4 mr-2" /> Load Latest
                </Button>
                <Button variant="secondary" size="sm" onClick={exportJSON}>
                  <Download className="h-4 w-4 mr-2" /> Export JSON
                </Button>
                <label className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm cursor-pointer">
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files && importJSON(e.target.files[0])
                    }
                  />
                  <Upload className="h-4 w-4 mr-2" /> Import JSON
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={state.snap ? "default" : "secondary"}
                  onClick={() => setState((s) => ({ ...s, snap: !s.snap }))}
                >
                  <GridIcon className="h-4 w-4 mr-2" /> Snap{" "}
                  {state.snap ? "On" : "Off"}
                </Button>
                <Button
                  size="sm"
                  variant={state.heatmap ? "default" : "secondary"}
                  onClick={() =>
                    setState((s) => ({ ...s, heatmap: !s.heatmap }))
                  }
                >
                  <Flame className="h-4 w-4 mr-2" /> Heatmap
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Selected</div>
                  <Badge variant="secondary" className="text-[10px]">
                    {state.selected.size} item(s)
                  </Badge>
                </div>

                {selectedItem ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Label
                      </label>
                      <Input
                        className="h-9"
                        value={selectedItem.label ?? ""}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            items: s.items.map((it) =>
                              it.id === selectedItem.id
                                ? { ...it, label: e.target.value }
                                : it,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">
                          X (ft)
                        </label>
                        <Input
                          className="h-9"
                          type="number"
                          step="0.5"
                          value={selectedItem.x}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              items: s.items.map((it) =>
                                it.id === selectedItem.id
                                  ? {
                                      ...it,
                                      x: snapFt(Number(e.target.value), s.snap),
                                    }
                                  : it,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Y (ft)
                        </label>
                        <Input
                          className="h-9"
                          type="number"
                          step="0.5"
                          value={selectedItem.y}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              items: s.items.map((it) =>
                                it.id === selectedItem.id
                                  ? {
                                      ...it,
                                      y: snapFt(Number(e.target.value), s.snap),
                                    }
                                  : it,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Width (ft)
                        </label>
                        <Input
                          className="h-9"
                          type="number"
                          step="0.5"
                          value={selectedItem.width}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              items: s.items.map((it) =>
                                it.id === selectedItem.id
                                  ? {
                                      ...it,
                                      width: Math.max(
                                        0.5,
                                        Number(e.target.value),
                                      ),
                                    }
                                  : it,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Height (ft)
                        </label>
                        <Input
                          className="h-9"
                          type="number"
                          step="0.5"
                          value={selectedItem.height}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              items: s.items.map((it) =>
                                it.id === selectedItem.id
                                  ? {
                                      ...it,
                                      height: Math.max(
                                        0.5,
                                        Number(e.target.value),
                                      ),
                                    }
                                  : it,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Rotation (°)
                        </label>
                        <Input
                          className="h-9"
                          type="number"
                          step="1"
                          value={selectedItem.rotation}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              items: s.items.map((it) =>
                                it.id === selectedItem.id
                                  ? { ...it, rotation: Number(e.target.value) }
                                  : it,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Seats
                        </label>
                        <Input
                          className="h-9"
                          type="number"
                          step="1"
                          value={selectedItem.seats ?? 0}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              items: s.items.map((it) =>
                                it.id === selectedItem.id
                                  ? {
                                      ...it,
                                      seats: Math.max(
                                        0,
                                        Number(e.target.value),
                                      ),
                                    }
                                  : it,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Select an item to edit properties.
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-semibold">Egress & Occupancy</div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={state.occupancy}
                    onValueChange={(v) =>
                      setState((s) => ({ ...s, occupancy: v as Occupancy }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Occupancy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banquet">Banquet (36")</SelectItem>
                      <SelectItem value="classroom">Classroom (36")</SelectItem>
                      <SelectItem value="theater">Theater (44")</SelectItem>
                      <SelectItem value="assembly">Assembly (44")</SelectItem>
                    </SelectContent>
                  </Select>
                  <ZoneJsonDrawer
                    zones={state.zones}
                    onChange={(next) =>
                      setState((s) => ({ ...s, zones: next }))
                    }
                  />
                </div>

                <div className="grid grid-cols-5 gap-2 items-end">
                  <div>
                    <label className="text-[10px] text-muted-foreground">
                      Door cx
                    </label>
                    <Input
                      className="h-8"
                      type="number"
                      step="0.5"
                      value={doorDraft.cx}
                      onChange={(e) =>
                        setDoorDraft((d) => ({
                          ...d,
                          cx: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">
                      cy
                    </label>
                    <Input
                      className="h-8"
                      type="number"
                      step="0.5"
                      value={doorDraft.cy}
                      onChange={(e) =>
                        setDoorDraft((d) => ({
                          ...d,
                          cy: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">
                      r(ft)
                    </label>
                    <Input
                      className="h-8"
                      type="number"
                      step="0.5"
                      value={doorDraft.radius}
                      onChange={(e) =>
                        setDoorDraft((d) => ({
                          ...d,
                          radius: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">
                      start°
                    </label>
                    <Input
                      className="h-8"
                      type="number"
                      step="1"
                      value={doorDraft.startDeg}
                      onChange={(e) =>
                        setDoorDraft((d) => ({
                          ...d,
                          startDeg: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">
                      end°
                    </label>
                    <Input
                      className="h-8"
                      type="number"
                      step="1"
                      value={doorDraft.endDeg}
                      onChange={(e) =>
                        setDoorDraft((d) => ({
                          ...d,
                          endDeg: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-5 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDoorDraft((d) => ({ ...d, radius: 3 }))}
                    >
                      36"
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setDoorDraft((d) => ({ ...d, radius: 3.5 }))
                      }
                    >
                      42"
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDoorDraft((d) => ({ ...d, radius: 4 }))}
                    >
                      48"
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const lw = lastWorldRef.current;
                        if (!lw) return;
                        setDoorDraft((d) => ({
                          ...d,
                          cx: pxToFt(lw.x),
                          cy: pxToFt(lw.y),
                        }));
                      }}
                    >
                      <Crosshair className="h-3 w-3 mr-1" /> Use Cursor
                    </Button>
                    <Button
                      size="sm"
                      variant={pickingDoorCenter ? "default" : "secondary"}
                      onClick={() => setPickingDoorCenter((v) => !v)}
                    >
                      <MousePointer className="h-3 w-3 mr-1" /> Pick on Canvas
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          doorArcs: [
                            ...s.doorArcs,
                            { id: makeId(), ...doorDraft },
                          ],
                        }))
                      }
                    >
                      Add Door Arc
                    </Button>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const min = requiredWidthInches(state.occupancy);
                    const clearance = checkClearances(state.items, min);
                    const zoneHits = checkZones(state.items, state.zones);
                    const swingHits = checkDoorSwings(
                      state.items,
                      state.doorArcs,
                    );
                    if (
                      clearance.length === 0 &&
                      zoneHits.length === 0 &&
                      swingHits.length === 0
                    ) {
                      toast({
                        title: `All clear (${min}"+, no zone/swing overlaps)`,
                      });
                      return;
                    }
                    const desc = [
                      clearance.length
                        ? `${clearance.length} sub-${min}" gaps`
                        : null,
                      zoneHits.length
                        ? `${zoneHits.length} zone overlaps`
                        : null,
                      swingHits.length
                        ? `${swingHits.length} door swings`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" • ");
                    toast({ title: "Egress warnings", description: desc });
                  }}
                >
                  Run Egress Check
                </Button>

                <DoorArcForm
                  doorArcs={state.doorArcs}
                  setDoorArcs={(arcs) =>
                    setState((s) => ({ ...s, doorArcs: arcs }))
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-semibold">Exports</div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const nodes = state.items.map((i) => ({
                      id: i.id,
                      type: i.type,
                      x: i.x,
                      y: i.y,
                      w: i.width,
                      h: i.height,
                      rot: i.rotation,
                      seats: i.seats,
                      label: i.label,
                    }));
                    const metrics = {
                      seatsTotal: computeMetrics(state.items).seatsTotal,
                      seatsPerThousandSqFt: computeMetrics(state.items)
                        .densitySeatsPer1000SqFt,
                      projectedGross: 0,
                      laborCost: 0,
                      revenuePerSeat: 0,
                      densityRating: "Average" as const,
                      updatedAt: new Date().toISOString(),
                    };
                    const min = requiredWidthInches(state.occupancy);
                    const clearance = checkClearances(state.items, min);
                    const zoneHits = checkZones(state.items, state.zones);
                    const swingHits = checkDoorSwings(
                      state.items,
                      state.doorArcs,
                    );
                    const warnings: string[] = [];
                    if (clearance.length)
                      warnings.push(`${clearance.length} sub-${min}" gaps`);
                    if (zoneHits.length)
                      warnings.push(`${zoneHits.length} zone overlaps`);
                    if (swingHits.length)
                      warnings.push(
                        `${swingHits.length} door swing intrusions`,
                      );
                    exportLayoutPDF(nodes as any, metrics as any, warnings);
                  }}
                >
                  Generate BEO PDF
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-semibold">EchoStratus</div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    const api = (import.meta as any).env
                      ?.VITE_ECHOSTRATUS_URL as string | undefined;
                    if (!api) {
                      toast({
                        title:
                          "Set VITE_ECHOSTRATUS_URL to enable EchoStratus sync",
                        variant: "destructive",
                      });
                      return;
                    }
                    try {
                      const payload = buildPayload(
                        "OUTLET-001",
                        state.sceneId,
                        state.items,
                      );
                      await syncEchoStratus(api, payload);
                      toast({ title: "Synced to EchoStratus" });
                    } catch (e: any) {
                      toast({
                        title: e?.message || "Sync failed",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <CloudUpload className="h-4 w-4 mr-2" />
                  Sync to EchoStratus
                </Button>
              </div>
            </div>
          </PanelWindow>
        )}

        {/* Canvas */}
        <div
          ref={containerRef}
          id="planner-canvas"
          className="flex-1 relative bg-[radial-gradient(circle_at_center,theme(colors.accent.DEFAULT)/10_0%,transparent_60%)]"
        >
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full touch-none"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerDown={onPointerDownBackground}
            onWheel={onWheel}
          >
            <defs>
              <pattern
                id="grid"
                width={ftToPx(GRID_FT)}
                height={ftToPx(GRID_FT)}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${ftToPx(GRID_FT)} 0 L 0 0 0 ${ftToPx(GRID_FT)}`}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>

            <g
              transform={`translate(${state.pan.x},${state.pan.y}) scale(${state.zoom})`}
            >
              <rect
                x={0}
                y={0}
                width="20000"
                height="20000"
                fill="url(#grid)"
              />

              {state.background ? (
                <image
                  href={state.background}
                  x={0}
                  y={0}
                  width="20000"
                  height="20000"
                  preserveAspectRatio="xMidYMid meet"
                  opacity={0.8}
                />
              ) : null}

              {state.heatmap ? (
                <HeatmapOverlay
                  items={state.items as any}
                  pxPerFt={PX_PER_FT}
                  intensity={0.05}
                />
              ) : null}
              {overlayEls ? <g opacity={0.9}>{overlayEls}</g> : null}

              {state.mode.kind === "marquee"
                ? (() => {
                    const a = state.mode.start;
                    const b = state.mode.current;
                    const x = Math.min(a.x, b.x);
                    const y = Math.min(a.y, b.y);
                    const w = Math.abs(a.x - b.x);
                    const h = Math.abs(a.y - b.y);
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        fill="#3b82f610"
                        stroke="#3b82f6"
                        strokeDasharray="4 4"
                      />
                    );
                  })()
                : null}

              {showZones
                ? state.zones.map((z) => (
                    <g key={z.id}>
                      <rect
                        x={ftToPx(z.x - z.width / 2)}
                        y={ftToPx(z.y - z.height / 2)}
                        width={ftToPx(z.width)}
                        height={ftToPx(z.height)}
                        fill="#ef44441a"
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                      />
                      {z.label ? (
                        <text
                          x={ftToPx(z.x)}
                          y={ftToPx(z.y - z.height / 2) - 6}
                          textAnchor="middle"
                          className="fill-red-600"
                          fontSize={10}
                        >
                          {z.label}
                        </text>
                      ) : null}
                    </g>
                  ))
                : null}

              {/* Door arcs */}
              {state.doorArcs.map((a) => {
                const r = ftToPx(a.radius);
                const sa = (a.startDeg - 90) * (Math.PI / 180);
                const ea = (a.endDeg - 90) * (Math.PI / 180);
                const large = Math.abs(a.endDeg - a.startDeg) > 180 ? 1 : 0;
                const x0 = ftToPx(a.cx) + r * Math.cos(sa);
                const y0 = ftToPx(a.cy) + r * Math.sin(sa);
                const x1 = ftToPx(a.cx) + r * Math.cos(ea);
                const y1 = ftToPx(a.cy) + r * Math.sin(ea);
                const d = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
                const color =
                  a.radius <= 3
                    ? "#10b981"
                    : a.radius <= 3.5
                      ? "#f59e0b"
                      : "#ef4444";
                return (
                  <path
                    key={a.id}
                    d={d}
                    stroke={color}
                    strokeWidth={2}
                    fill="none"
                  />
                );
              })}

              {showZones ? (
                <ZoneOverlay
                  zones={state.zones}
                  onChange={(next) => setState((s) => ({ ...s, zones: next }))}
                  zoom={state.zoom}
                />
              ) : null}

              {state.items.map((it) => (
                <ItemShape
                  key={it.id}
                  item={it}
                  selected={state.selected.has(it.id)}
                  onPointerDown={onPointerDownItem}
                  onRotateDown={onPointerDownRotate}
                  zoom={1 / state.zoom}
                />
              ))}
            </g>
          </svg>

          {/* Toolbar */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur border rounded-lg shadow-apple px-2 py-1 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setState((s) => ({ ...s, zoom: Math.max(0.2, s.zoom * 0.9) }))
              }
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="text-xs px-2">{Math.round(state.zoom * 100)}%</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setState((s) => ({ ...s, zoom: Math.min(5, s.zoom * 1.1) }))
              }
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setState((s) => ({ ...s, pan: { x: 0, y: 0 }, zoom: 1 }))
              }
            >
              Reset
            </Button>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button
              variant={showZones ? "default" : "secondary"}
              size="sm"
              onClick={() => setShowZones((v) => !v)}
            >
              <ShieldCheck className="h-4 w-4 mr-1" /> Zones
            </Button>
            <Button
              variant={state.heatmap ? "default" : "secondary"}
              size="sm"
              onClick={() => setState((s) => ({ ...s, heatmap: !s.heatmap }))}
            >
              <Flame className="h-4 w-4 mr-1" /> Heatmap
            </Button>
            <Button
              variant={state.lassoActive ? "default" : "secondary"}
              size="sm"
              onClick={() =>
                setState((s) => ({ ...s, lassoActive: !s.lassoActive }))
              }
            >
              <MousePointer className="h-4 w-4 mr-1" /> Lasso
            </Button>
            <Button
              variant={state.snap ? "default" : "secondary"}
              size="sm"
              onClick={() => setState((s) => ({ ...s, snap: !s.snap }))}
            >
              <GridIcon className="h-4 w-4 mr-1" /> Snap
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>

          {/* Bottom-right actions */}
          <div className="absolute bottom-2 right-2 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (state.selected.size === 0) return;
                setState((s) => {
                  const dup = s.items
                    .filter((i) => s.selected.has(i.id))
                    .map((it) => ({
                      ...it,
                      id: makeId(),
                      x: it.x + 1,
                      y: it.y + 1,
                    }));
                  return {
                    ...s,
                    items: [...s.items, ...dup],
                    selected: new Set(dup.map((d) => d.id)),
                    mode: { kind: "none" },
                  };
                });
              }}
            >
              <Copy className="h-4 w-4 mr-1" /> Duplicate
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                setState((s) => ({
                  ...s,
                  items: s.items.filter((it) => !s.selected.has(it.id)),
                  selected: new Set(),
                  mode: { kind: "none" },
                }))
              }
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>

          {/* Background quick upload */}
          <div className="absolute bottom-2 left-2">
            <label className="inline-flex items-center gap-2 rounded-md border bg-background/80 backdrop-blur px-3 py-2 text-sm cursor-pointer">
              <ImageIcon className="h-4 w-4" />
              <span>Background</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files && onBackgroundFile(e.target.files[0])
                }
              />
            </label>
          </div>
        </div>
      </div>
    </Layout>
  );
}
