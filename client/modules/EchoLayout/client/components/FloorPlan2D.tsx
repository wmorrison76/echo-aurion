import * as React from "react";
const { useState, useCallback, useMemo, useRef, useEffect } = React;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Circle,
  RectangleHorizontal,
  LayoutGrid,
  Users,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Trash2,
  Copy,
  Move,
  Grid3X3,
  Theater,
  Monitor,
  Music,
  UtensilsCrossed,
  Wine,
  ArrowLeft,
  Save,
  FileDown,
  Undo2,
  Tag,
  FolderOpen,
  FileText,
  UserPlus,
  X,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────
export interface FloorElement {
  id: string;
  type: "round_table" | "rect_table" | "theatre_row" | "stage" | "screen" | "bar" | "buffet" | "dance_floor" | "entrance" | "label";
  x: number; // feet from left
  y: number; // feet from top
  width: number; // feet
  height: number; // feet
  rotation: number; // degrees
  seats: number;
  tableNumber?: number;
  section?: string;
  label?: string;
  guests?: string[];
}

export interface SavedTemplate {
  id: string;
  name: string;
  event_name: string;
  venue_name: string;
  room_width: number;
  room_length: number;
  elements: FloorElement[];
  beo_contact: string;
  beo_date: string;
  beo_setup_style: string;
  beo_guaranteed_count: number;
  total_seats: number;
  table_count: number;
  created_at: string;
  updated_at: string;
}

export interface FloorSection {
  id: string;
  name: string;
  color: string;
  elements: string[];
}

interface FloorPlan2DProps {
  roomWidth?: number;
  roomLength?: number;
  eventName?: string;
  venueName?: string;
  onBack?: () => void;
  initialElements?: FloorElement[];
  templateId?: string;
}

const BACKEND = "";

// ─── Constants ─────────────────────────────────────────────────────
const SECTION_COLORS = [
  { name: "A", color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  { name: "B", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
  { name: "C", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  { name: "D", color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  { name: "E", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  { name: "F", color: "#ec4899", bg: "rgba(236,72,153,0.08)" },
];

const ELEMENT_TEMPLATES: { type: FloorElement["type"]; label: string; icon: React.ReactNode; defaults: Partial<FloorElement> }[] = [
  { type: "round_table", label: "Round 8-Top", icon: <Circle className="h-4 w-4" />, defaults: { width: 5, height: 5, seats: 8 } },
  { type: "round_table", label: "Round 10-Top", icon: <Circle className="h-4 w-4" />, defaults: { width: 6, height: 6, seats: 10 } },
  { type: "rect_table", label: "Rectangle 6", icon: <RectangleHorizontal className="h-4 w-4" />, defaults: { width: 8, height: 3, seats: 6 } },
  { type: "rect_table", label: "Rectangle 8", icon: <RectangleHorizontal className="h-4 w-4" />, defaults: { width: 10, height: 3, seats: 8 } },
  { type: "theatre_row", label: "Theatre Row", icon: <Theater className="h-4 w-4" />, defaults: { width: 20, height: 2, seats: 10 } },
  { type: "stage", label: "Stage", icon: <Music className="h-4 w-4" />, defaults: { width: 16, height: 8, seats: 0 } },
  { type: "screen", label: "Screen", icon: <Monitor className="h-4 w-4" />, defaults: { width: 12, height: 1, seats: 0 } },
  { type: "bar", label: "Bar", icon: <Wine className="h-4 w-4" />, defaults: { width: 10, height: 3, seats: 0 } },
  { type: "buffet", label: "Buffet", icon: <UtensilsCrossed className="h-4 w-4" />, defaults: { width: 12, height: 3, seats: 0 } },
  { type: "dance_floor", label: "Dance Floor", icon: <LayoutGrid className="h-4 w-4" />, defaults: { width: 12, height: 12, seats: 0 } },
  { type: "entrance", label: "Entrance", icon: <ArrowLeft className="h-4 w-4" />, defaults: { width: 4, height: 1, seats: 0 } },
  { type: "label", label: "Text Label", icon: <Tag className="h-4 w-4" />, defaults: { width: 6, height: 2, seats: 0 } },
];

const PRESETS = {
  banquet: { label: "Banquet Rounds", desc: "Classic round tables", generate: genBanquet },
  theatre: { label: "Theatre", desc: "Rows facing stage", generate: genTheatre },
  classroom: { label: "Classroom", desc: "Tables facing front", generate: genClassroom },
  cocktail: { label: "Cocktail", desc: "Mix of highs and lows", generate: genCocktail },
  ushape: { label: "U-Shape", desc: "Conference U layout", generate: genUShape },
};

// ─── Preset generators ─────────────────────────────────────────────
function genBanquet(w: number, h: number): FloorElement[] {
  const els: FloorElement[] = [];
  let id = 0;
  let tbl = 1;
  const padding = 8;
  const spacing = 10;
  const cols = Math.floor((w - padding * 2) / spacing);
  const rows = Math.floor((h - padding * 2 - 12) / spacing);
  // Stage at top
  els.push({ id: `el_${id++}`, type: "stage", x: w / 2 - 8, y: 2, width: 16, height: 6, rotation: 0, seats: 0, label: "STAGE" });
  // Screen
  els.push({ id: `el_${id++}`, type: "screen", x: w / 2 - 6, y: 0.5, width: 12, height: 1, rotation: 0, seats: 0, label: "SCREEN" });
  // Tables
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = padding + c * spacing;
      const y = padding + 8 + r * spacing;
      const section = SECTION_COLORS[Math.floor(c / Math.ceil(cols / Math.min(cols, 4)))];
      els.push({
        id: `el_${id++}`, type: "round_table",
        x, y, width: 5, height: 5, rotation: 0, seats: 8,
        tableNumber: tbl++, section: section?.name || "A",
      });
    }
  }
  // Entrance
  els.push({ id: `el_${id++}`, type: "entrance", x: w / 2 - 2, y: h - 2, width: 4, height: 1, rotation: 0, seats: 0, label: "ENTRANCE" });
  return els;
}

function genTheatre(w: number, h: number): FloorElement[] {
  const els: FloorElement[] = [];
  let id = 0;
  // Stage
  els.push({ id: `el_${id++}`, type: "stage", x: w / 2 - 10, y: 2, width: 20, height: 6, rotation: 0, seats: 0, label: "STAGE" });
  els.push({ id: `el_${id++}`, type: "screen", x: w / 2 - 8, y: 0.5, width: 16, height: 1, rotation: 0, seats: 0, label: "SCREEN" });
  // Theatre rows
  const rowCount = Math.floor((h - 16) / 4);
  const rowWidth = w - 16;
  const seatsPerRow = Math.floor(rowWidth / 2);
  for (let r = 0; r < rowCount; r++) {
    const section = r < rowCount / 2 ? "A" : "B";
    els.push({
      id: `el_${id++}`, type: "theatre_row",
      x: 8, y: 10 + r * 4, width: rowWidth, height: 2,
      rotation: 0, seats: seatsPerRow, section, label: `Row ${String.fromCharCode(65 + r)}`,
    });
  }
  els.push({ id: `el_${id++}`, type: "entrance", x: w / 2 - 2, y: h - 2, width: 4, height: 1, rotation: 0, seats: 0, label: "ENTRANCE" });
  return els;
}

function genClassroom(w: number, h: number): FloorElement[] {
  const els: FloorElement[] = [];
  let id = 0;
  let tbl = 1;
  els.push({ id: `el_${id++}`, type: "stage", x: w / 2 - 6, y: 2, width: 12, height: 4, rotation: 0, seats: 0, label: "PODIUM" });
  els.push({ id: `el_${id++}`, type: "screen", x: w / 2 - 8, y: 0.5, width: 16, height: 1, rotation: 0, seats: 0, label: "SCREEN" });
  const cols = 3;
  const rows = Math.floor((h - 16) / 6);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sec = SECTION_COLORS[c];
      els.push({
        id: `el_${id++}`, type: "rect_table",
        x: 6 + c * ((w - 12) / cols), y: 10 + r * 6,
        width: (w - 16) / cols - 2, height: 2.5,
        rotation: 0, seats: Math.floor(((w - 16) / cols) / 2),
        tableNumber: tbl++, section: sec?.name || "A",
      });
    }
  }
  els.push({ id: `el_${id++}`, type: "entrance", x: w / 2 - 2, y: h - 2, width: 4, height: 1, rotation: 0, seats: 0, label: "ENTRANCE" });
  return els;
}

function genCocktail(w: number, h: number): FloorElement[] {
  const els: FloorElement[] = [];
  let id = 0;
  let tbl = 1;
  els.push({ id: `el_${id++}`, type: "bar", x: 2, y: h / 2 - 5, width: 3, height: 10, rotation: 0, seats: 0, label: "BAR" });
  els.push({ id: `el_${id++}`, type: "dance_floor", x: w / 2 - 5, y: 4, width: 10, height: 10, rotation: 0, seats: 0, label: "DANCE FLOOR" });
  els.push({ id: `el_${id++}`, type: "buffet", x: w - 14, y: 2, width: 12, height: 2, rotation: 0, seats: 0, label: "BUFFET" });
  // Scatter small round tables
  const positions = [
    [w * 0.2, h * 0.5], [w * 0.35, h * 0.6], [w * 0.5, h * 0.55],
    [w * 0.65, h * 0.6], [w * 0.8, h * 0.5], [w * 0.3, h * 0.75],
    [w * 0.5, h * 0.8], [w * 0.7, h * 0.75], [w * 0.2, h * 0.35],
    [w * 0.8, h * 0.35],
  ];
  for (const [px, py] of positions) {
    els.push({
      id: `el_${id++}`, type: "round_table",
      x: px - 2, y: py - 2, width: 4, height: 4,
      rotation: 0, seats: 4, tableNumber: tbl++, section: "A",
    });
  }
  els.push({ id: `el_${id++}`, type: "entrance", x: w / 2 - 2, y: h - 2, width: 4, height: 1, rotation: 0, seats: 0, label: "ENTRANCE" });
  return els;
}

function genUShape(w: number, h: number): FloorElement[] {
  const els: FloorElement[] = [];
  let id = 0;
  let tbl = 1;
  els.push({ id: `el_${id++}`, type: "screen", x: w / 2 - 6, y: 0.5, width: 12, height: 1, rotation: 0, seats: 0, label: "SCREEN" });
  // U-shape: left arm, bottom, right arm
  const armLen = h * 0.5;
  const armW = 3;
  // Left arm
  for (let i = 0; i < Math.floor(armLen / 4); i++) {
    els.push({
      id: `el_${id++}`, type: "rect_table",
      x: 6, y: 6 + i * 4, width: armW, height: 3.5,
      rotation: 0, seats: 3, tableNumber: tbl++, section: "A",
    });
  }
  // Bottom
  const bottomW = w - 20;
  const bottomSegs = Math.floor(bottomW / 6);
  for (let i = 0; i < bottomSegs; i++) {
    els.push({
      id: `el_${id++}`, type: "rect_table",
      x: 10 + i * 6, y: h * 0.55, width: 5.5, height: armW,
      rotation: 0, seats: 3, tableNumber: tbl++, section: "B",
    });
  }
  // Right arm
  for (let i = 0; i < Math.floor(armLen / 4); i++) {
    els.push({
      id: `el_${id++}`, type: "rect_table",
      x: w - 10, y: 6 + i * 4, width: armW, height: 3.5,
      rotation: 0, seats: 3, tableNumber: tbl++, section: "C",
    });
  }
  els.push({ id: `el_${id++}`, type: "entrance", x: w / 2 - 2, y: h - 2, width: 4, height: 1, rotation: 0, seats: 0, label: "ENTRANCE" });
  return els;
}

// ─── SVG Color Helpers (CSS vars don't work in SVG fill attributes) ──────
function useSvgColors() {
  const [colors, setColors] = React.useState({
    bg: "#ffffff",
    fg: "#1d1d1f",
    card: "#f8f8fa",
    border: "#d2d2d7",
    muted: "#e8e8ed",
    mutedFg: "#86868b",
    primary: "#3b82f6",
    destructive: "#ef4444",
    accent: "#f1f1f3",
    accentFg: "#6b7280",
  });
  useEffect(() => {
    const resolveColor = (cssVar: string, fallback: string): string => {
      const el = document.createElement("div");
      el.style.color = `var(${cssVar})`;
      document.body.appendChild(el);
      const resolved = getComputedStyle(el).color;
      document.body.removeChild(el);
      // If resolved is empty or 'inherit', return fallback
      return (resolved && resolved !== "inherit") ? resolved : fallback;
    };
    setColors({
      bg: resolveColor("--background", "#ffffff"),
      fg: resolveColor("--foreground", "#1d1d1f"),
      card: resolveColor("--card", "#f8f8fa"),
      border: resolveColor("--border", "#d2d2d7"),
      muted: resolveColor("--muted", "#e8e8ed"),
      mutedFg: resolveColor("--muted-foreground", "#86868b"),
      primary: resolveColor("--primary", "#3b82f6"),
      destructive: resolveColor("--destructive", "#ef4444"),
      accent: resolveColor("--accent", "#f1f1f3"),
      accentFg: resolveColor("--accent-foreground", "#6b7280"),
    });
  }, []);
  return colors;
}
// ─── SVG Element Renderers ─────────────────────────────────────────
interface SvgColors { bg: string; fg: string; card: string; border: string; muted: string; mutedFg: string; primary: string; destructive: string; accent: string; accentFg: string; }

function renderElement(el: FloorElement, scale: number, selected: boolean, sectionMap: Record<string, string>, c: SvgColors) {
  const sx = el.x * scale;
  const sy = el.y * scale;
  const sw = el.width * scale;
  const sh = el.height * scale;
  const sectionColor = el.section ? sectionMap[el.section] || "#6b7280" : "#6b7280";
  const selStroke = selected ? "#0ea5e9" : "none";
  const selWidth = selected ? 2.5 : 0;

  switch (el.type) {
    case "round_table": {
      const r = sw / 2;
      const cx = sx + r;
      const cy = sy + r;
      const chairs = [];
      for (let i = 0; i < el.seats; i++) {
        const angle = (i / el.seats) * Math.PI * 2 - Math.PI / 2;
        const chairR = r + scale * 0.6;
        const chairX = cx + Math.cos(angle) * chairR;
        const chairY = cy + Math.sin(angle) * chairR;
        chairs.push(
          <circle key={`chair-${i}`} cx={chairX} cy={chairY} r={scale * 0.35}
            fill={c.muted} stroke={c.border} strokeWidth={0.5} />
        );
      }
      return (
        <g key={el.id} data-testid={`floor-el-${el.id}`}>
          {chairs}
          <circle cx={cx} cy={cy} r={r} fill={c.card} stroke={sectionColor} strokeWidth={1.5} />
          {selected && <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke={selStroke} strokeWidth={selWidth} strokeDasharray="4 2" />}
          {el.tableNumber && (
            <text x={cx} y={cy + scale * 0.15} textAnchor="middle" fontSize={scale * 0.9}
              fontWeight="700" fill={c.fg} className="select-none">{el.tableNumber}</text>
          )}
          {el.section && (
            <text x={cx} y={cy - r + scale * 0.4} textAnchor="middle" fontSize={scale * 0.45}
              fill={sectionColor} fontWeight="600" className="select-none">{el.section}</text>
          )}
          {el.guests && el.guests.length > 0 && (
            <>
              <circle cx={cx + r - scale * 0.2} cy={sy + scale * 0.2} r={scale * 0.4} fill="#10b981" />
              <text x={cx + r - scale * 0.2} y={sy + scale * 0.35} textAnchor="middle" fontSize={scale * 0.35}
                fontWeight="700" fill="#ffffff" className="select-none">{el.guests.length}</text>
            </>
          )}
        </g>
      );
    }
    case "rect_table": {
      const cx = sx + sw / 2;
      const cy = sy + sh / 2;
      const chairs = [];
      const seatsPerSide = Math.ceil(el.seats / 2);
      for (let i = 0; i < seatsPerSide; i++) {
        const xOff = ((i + 0.5) / seatsPerSide) * sw;
        chairs.push(
          <circle key={`ct-${i}`} cx={sx + xOff} cy={sy - scale * 0.5} r={scale * 0.35}
            fill={c.muted} stroke={c.border} strokeWidth={0.5} />,
          <circle key={`cb-${i}`} cx={sx + xOff} cy={sy + sh + scale * 0.5} r={scale * 0.35}
            fill={c.muted} stroke={c.border} strokeWidth={0.5} />
        );
      }
      return (
        <g key={el.id} data-testid={`floor-el-${el.id}`}>
          {chairs}
          <rect x={sx} y={sy} width={sw} height={sh} rx={scale * 0.2}
            fill={c.card} stroke={sectionColor} strokeWidth={1.5} />
          {selected && <rect x={sx - 2} y={sy - 2} width={sw + 4} height={sh + 4} rx={scale * 0.3}
            fill="none" stroke={selStroke} strokeWidth={selWidth} strokeDasharray="4 2" />}
          {el.tableNumber && (
            <text x={cx} y={cy + scale * 0.15} textAnchor="middle" fontSize={scale * 0.7}
              fontWeight="700" fill={c.fg} className="select-none">{el.tableNumber}</text>
          )}
          {el.guests && el.guests.length > 0 && (
            <>
              <circle cx={sx + sw - scale * 0.1} cy={sy + scale * 0.1} r={scale * 0.4} fill="#10b981" />
              <text x={sx + sw - scale * 0.1} y={sy + scale * 0.25} textAnchor="middle" fontSize={scale * 0.35}
                fontWeight="700" fill="#ffffff" className="select-none">{el.guests.length}</text>
            </>
          )}
        </g>
      );
    }
    case "theatre_row": {
      const chairs = [];
      const spacing = sw / el.seats;
      for (let i = 0; i < el.seats; i++) {
        chairs.push(
          <rect key={`tc-${i}`} x={sx + i * spacing + spacing * 0.15} y={sy + scale * 0.2}
            width={spacing * 0.7} height={sh - scale * 0.4} rx={scale * 0.15}
            fill={c.muted} stroke={c.border} strokeWidth={0.5} />
        );
      }
      return (
        <g key={el.id} data-testid={`floor-el-${el.id}`}>
          {selected && <rect x={sx - 2} y={sy - 2} width={sw + 4} height={sh + 4}
            fill="none" stroke={selStroke} strokeWidth={selWidth} strokeDasharray="4 2" />}
          {chairs}
          {el.label && (
            <text x={sx - scale * 0.3} y={sy + sh / 2 + scale * 0.2} textAnchor="end"
              fontSize={scale * 0.5} fill={c.mutedFg} fontWeight="500" className="select-none">{el.label}</text>
          )}
        </g>
      );
    }
    case "stage":
      return (
        <g key={el.id} data-testid={`floor-el-${el.id}`}>
          <rect x={sx} y={sy} width={sw} height={sh} rx={scale * 0.3}
            fill={`${c.primary}20`} stroke={c.primary} strokeWidth={1.5} />
          {selected && <rect x={sx - 2} y={sy - 2} width={sw + 4} height={sh + 4} rx={scale * 0.4}
            fill="none" stroke={selStroke} strokeWidth={selWidth} strokeDasharray="4 2" />}
          <text x={sx + sw / 2} y={sy + sh / 2 + scale * 0.2} textAnchor="middle"
            fontSize={scale * 0.7} fontWeight="700" fill={c.primary} className="select-none">{el.label || "STAGE"}</text>
        </g>
      );
    case "screen":
      return (
        <g key={el.id} data-testid={`floor-el-${el.id}`}>
          <rect x={sx} y={sy} width={sw} height={sh} rx={2}
            fill={c.fg} stroke={c.fg} strokeWidth={1} opacity={0.8} />
          {selected && <rect x={sx - 2} y={sy - 2} width={sw + 4} height={sh + 4}
            fill="none" stroke={selStroke} strokeWidth={selWidth} strokeDasharray="4 2" />}
          <text x={sx + sw / 2} y={sy + sh / 2 + scale * 0.15} textAnchor="middle"
            fontSize={scale * 0.4} fontWeight="600" fill={c.bg} className="select-none">{el.label || "SCREEN"}</text>
        </g>
      );
    case "bar":
      return (
        <g key={el.id} data-testid={`floor-el-${el.id}`}>
          <rect x={sx} y={sy} width={sw} height={sh} rx={scale * 0.4}
            fill={`${c.accent}40`} stroke={c.accentFg} strokeWidth={1.5} opacity={0.6} />
          {selected && <rect x={sx - 2} y={sy - 2} width={sw + 4} height={sh + 4}
            fill="none" stroke={selStroke} strokeWidth={selWidth} strokeDasharray="4 2" />}
          <text x={sx + sw / 2} y={sy + sh / 2 + scale * 0.2} textAnchor="middle"
            fontSize={scale * 0.6} fontWeight="700" fill={c.accentFg} className="select-none">{el.label || "BAR"}</text>
        </g>
      );
    case "buffet":
      return (
        <g key={el.id} data-testid={`floor-el-${el.id}`}>
          <rect x={sx} y={sy} width={sw} height={sh} rx={scale * 0.15}
            fill={`${c.muted}90`} stroke={c.border} strokeWidth={1.5} strokeDasharray="6 3" />
          {selected && <rect x={sx - 2} y={sy - 2} width={sw + 4} height={sh + 4}
            fill="none" stroke={selStroke} strokeWidth={selWidth} strokeDasharray="4 2" />}
          <text x={sx + sw / 2} y={sy + sh / 2 + scale * 0.2} textAnchor="middle"
            fontSize={scale * 0.55} fontWeight="600" fill={c.mutedFg} className="select-none">{el.label || "BUFFET"}</text>
        </g>
      );
    case "dance_floor":
      return (
        <g key={el.id} data-testid={`floor-el-${el.id}`}>
          <rect x={sx} y={sy} width={sw} height={sh} rx={scale * 0.2}
            fill={`${c.muted}30`} stroke={c.border} strokeWidth={1} />
          {selected && <rect x={sx - 2} y={sy - 2} width={sw + 4} height={sh + 4}
            fill="none" stroke={selStroke} strokeWidth={selWidth} strokeDasharray="4 2" />}
          <text x={sx + sw / 2} y={sy + sh / 2 + scale * 0.2} textAnchor="middle"
            fontSize={scale * 0.6} fontWeight="600" fill={c.mutedFg} className="select-none">{el.label || "DANCE FLOOR"}</text>
        </g>
      );
    case "entrance":
      return (
        <g key={el.id} data-testid={`floor-el-${el.id}`}>
          <rect x={sx} y={sy} width={sw} height={sh}
            fill={`${c.destructive}25`} stroke={c.destructive} strokeWidth={1.5} />
          {selected && <rect x={sx - 2} y={sy - 2} width={sw + 4} height={sh + 4}
            fill="none" stroke={selStroke} strokeWidth={selWidth} strokeDasharray="4 2" />}
          <text x={sx + sw / 2} y={sy - scale * 0.3} textAnchor="middle"
            fontSize={scale * 0.4} fontWeight="600" fill={c.destructive} className="select-none">{el.label || "ENTRANCE"}</text>
        </g>
      );
    case "label":
      return (
        <g key={el.id} data-testid={`floor-el-${el.id}`}>
          {selected && <rect x={sx - 2} y={sy - 2} width={sw + 4} height={sh + 4}
            fill="none" stroke={selStroke} strokeWidth={selWidth} strokeDasharray="4 2" />}
          <text x={sx + sw / 2} y={sy + sh / 2 + scale * 0.2} textAnchor="middle"
            fontSize={scale * 0.65} fontWeight="700" fill={`${c.fg}b0`} className="select-none">{el.label || "Label"}</text>
        </g>
      );
    default:
      return null;
  }
}

// ─── Main Component ────────────────────────────────────────────────
export default function FloorPlan2D({ roomWidth = 60, roomLength = 80, eventName = "Tavistock Ballroom", venueName = "LUCCCA Hospitality", onBack, initialElements, templateId: initialTemplateId }: FloorPlan2DProps) {
  const [elements, setElements] = useState<FloorElement[]>(initialElements || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sections] = useState<FloorSection[]>(SECTION_COLORS.map((s) => ({ id: s.name, name: `Section ${s.name}`, color: s.color, elements: [] })));
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<"select" | "pan">("select");
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [roomW, setRoomW] = useState(roomWidth);
  const [roomH, setRoomH] = useState(roomLength);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const svgColors = useSvgColors();

  // Guest assignment state
  const [guestInput, setGuestInput] = useState("");

  // Template state
  const [templateId, setTemplateId] = useState<string | null>(initialTemplateId || null);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [saveName, setSaveName] = useState(eventName);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // BEO (Banquet Event Order) fields
  const [beoContact, setBeoContact] = useState("");
  const [beoDate, setBeoDate] = useState("");
  const [beoSetupStyle, setBeoSetupStyle] = useState("Banquet Rounds");
  const [beoGuaranteedCount, setBeoGuaranteedCount] = useState(0);
  const [showBeoExport, setShowBeoExport] = useState(false);
  const [evtName, setEvtName] = useState(eventName);
  const [venName, setVenName] = useState(venueName);

  // Scale: pixels per foot
  const SCALE = 8 * zoom;

  const sectionColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    SECTION_COLORS.forEach((s) => { m[s.name] = s.color; });
    return m;
  }, []);

  // Stats
  const stats = useMemo(() => {
    const totalSeats = elements.reduce((sum, e) => sum + (e.seats || 0), 0);
    const tableCount = elements.filter((e) => e.type.includes("table")).length;
    const theatreSeats = elements.filter((e) => e.type === "theatre_row").reduce((s, e) => s + e.seats, 0);
    const bySection: Record<string, number> = {};
    elements.forEach((e) => {
      if (e.section && e.seats > 0) {
        bySection[e.section] = (bySection[e.section] || 0) + e.seats;
      }
    });
    return { totalSeats, tableCount, theatreSeats, bySection };
  }, [elements]);

  const selectedEl = elements.find((e) => e.id === selectedId);

  // Add element from library
  const addElement = useCallback((template: typeof ELEMENT_TEMPLATES[0]) => {
    const maxNum = elements.reduce((max, e) => Math.max(max, e.tableNumber || 0), 0);
    const newEl: FloorElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: template.type,
      x: roomW / 2 - (template.defaults.width || 5) / 2,
      y: roomH / 2 - (template.defaults.height || 5) / 2,
      width: template.defaults.width || 5,
      height: template.defaults.height || 5,
      rotation: 0,
      seats: template.defaults.seats || 0,
      tableNumber: template.type.includes("table") ? maxNum + 1 : undefined,
      section: template.type.includes("table") ? "A" : undefined,
      label: template.type === "label" ? "Label" : template.defaults.seats === 0 ? template.label.toUpperCase() : undefined,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedId(newEl.id);
  }, [elements, roomW, roomH]);

  // Load preset
  const loadPreset = useCallback((key: string) => {
    const preset = PRESETS[key as keyof typeof PRESETS];
    if (preset) {
      setElements(preset.generate(roomW, roomH));
      setSelectedId(null);
    }
  }, [roomW, roomH]);

  // Delete selected
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setElements((prev) => prev.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  // Duplicate selected
  const duplicateSelected = useCallback(() => {
    if (!selectedEl) return;
    const maxNum = elements.reduce((max, e) => Math.max(max, e.tableNumber || 0), 0);
    const dup: FloorElement = {
      ...selectedEl,
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: selectedEl.x + 2,
      y: selectedEl.y + 2,
      tableNumber: selectedEl.tableNumber ? maxNum + 1 : undefined,
      guests: [],
    };
    setElements((prev) => [...prev, dup]);
    setSelectedId(dup.id);
  }, [selectedEl, elements]);

  // SVG mouse handlers for drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    if (tool === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Check if click is on an element
    const hitX = (svgPt.x - pan.x - 40) / SCALE;
    const hitY = (svgPt.y - pan.y - 40) / SCALE;
    let hit: FloorElement | null = null;
    // Search in reverse order (top-most first)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === "round_table") {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const dist = Math.sqrt((hitX - cx) ** 2 + (hitY - cy) ** 2);
        if (dist <= el.width / 2 + 0.8) { hit = el; break; }
      } else {
        if (hitX >= el.x - 0.5 && hitX <= el.x + el.width + 0.5 &&
          hitY >= el.y - 0.5 && hitY <= el.y + el.height + 0.5) { hit = el; break; }
      }
    }

    if (hit) {
      setSelectedId(hit.id);
      setDragging(hit.id);
      setDragOffset({ x: hitX - hit.x, y: hitY - hit.y });
    } else {
      setSelectedId(null);
    }
  }, [tool, elements, SCALE, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    if (!dragging || !svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const newX = (svgPt.x - pan.x - 40) / SCALE - dragOffset.x;
    const newY = (svgPt.y - pan.y - 40) / SCALE - dragOffset.y;
    setElements((prev) =>
      prev.map((el) => (el.id === dragging ? { ...el, x: Math.max(0, newX), y: Math.max(0, newY) } : el))
    );
  }, [dragging, dragOffset, SCALE, pan, isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setIsPanning(false);
  }, []);

  // Export as PNG
  const exportPNG = useCallback(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, img.width, img.height);
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `FloorPlan_${evtName.replace(/\s/g, "_")}_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [evtName]);

  // ─── PDF Export with BEO Header ─────────────────────────────────
  const exportPDF = useCallback(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      // PDF-like layout: 816x1056 (8.5x11 at 96dpi)
      const pdfW = 1632;
      const pdfH = 2112;
      canvas.width = pdfW;
      canvas.height = pdfH;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pdfW, pdfH);

      // BEO Header
      const headerH = 280;
      ctx.fillStyle = "#0c4a6e";
      ctx.fillRect(0, 0, pdfW, headerH);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px system-ui, sans-serif";
      ctx.fillText("BANQUET EVENT ORDER", 60, 70);

      ctx.font = "bold 36px system-ui, sans-serif";
      ctx.fillText(evtName || "Event", 60, 120);

      ctx.font = "24px system-ui, sans-serif";
      ctx.fillStyle = "#bae6fd";
      ctx.fillText(`Venue: ${venName}  |  Room: ${roomW}' x ${roomH}'`, 60, 160);
      ctx.fillText(`Contact: ${beoContact || "N/A"}  |  Date: ${beoDate || "TBD"}`, 60, 195);
      ctx.fillText(`Setup: ${beoSetupStyle}  |  Guaranteed: ${beoGuaranteedCount || stats.totalSeats} pax`, 60, 230);
      ctx.fillText(`Total Capacity: ${stats.totalSeats} seats  |  Tables: ${stats.tableCount}`, 60, 265);

      // Floor plan
      const planY = headerH + 30;
      const planH = pdfH - headerH - 400;
      const scale = Math.min((pdfW - 120) / img.width, planH / img.height);
      const ox = (pdfW - img.width * scale) / 2;
      ctx.drawImage(img, ox, planY, img.width * scale, img.height * scale);

      // Guest Manifest
      const manifestY = planY + img.height * scale + 30;
      ctx.fillStyle = "#0c4a6e";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.fillText("SEATING MANIFEST", 60, manifestY);

      ctx.font = "20px system-ui, sans-serif";
      ctx.fillStyle = "#1e293b";
      let my = manifestY + 35;
      const tablesWithGuests = elements.filter(el => el.guests && el.guests.length > 0);
      if (tablesWithGuests.length > 0) {
        const cols = 3;
        const colW = (pdfW - 120) / cols;
        let col = 0;
        let baseY = my;
        for (const el of tablesWithGuests) {
          const x = 60 + col * colW;
          ctx.font = "bold 20px system-ui, sans-serif";
          ctx.fillStyle = "#0c4a6e";
          ctx.fillText(`Table ${el.tableNumber || "?"} (${el.section || "-"})`, x, baseY);
          ctx.font = "18px system-ui, sans-serif";
          ctx.fillStyle = "#334155";
          for (let i = 0; i < el.guests!.length; i++) {
            baseY += 24;
            ctx.fillText(`  ${i + 1}. ${el.guests![i]}`, x, baseY);
          }
          baseY += 30;
          if (baseY > pdfH - 60) { col++; baseY = my; }
        }
      } else {
        ctx.fillText("No guest assignments yet.", 60, my);
      }

      // Section summary footer
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(0, pdfH - 60, pdfW, 60);
      ctx.fillStyle = "#64748b";
      ctx.font = "18px system-ui, sans-serif";
      const sectionSummary = Object.entries(stats.bySection).map(([s, c]) => `Section ${s}: ${c}`).join("  |  ");
      ctx.fillText(`Generated: ${new Date().toLocaleString()}  |  ${sectionSummary}`, 60, pdfH - 25);

      const pdfUrl = canvas.toDataURL("image/png", 1.0);
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = `BEO_${evtName.replace(/\s/g, "_")}_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
    setShowBeoExport(false);
  }, [evtName, venName, roomW, roomH, beoContact, beoDate, beoSetupStyle, beoGuaranteedCount, stats, elements]);

  // ─── Template Save/Load ─────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/echolayout/templates`);
      if (res.ok) setSavedTemplates(await res.json());
    } catch { /* ignore */ }
  }, []);

  const saveTemplate = useCallback(async () => {
    setSaving(true);
    try {
      const body = {
        name: saveName || evtName,
        event_name: evtName,
        venue_name: venName,
        room_width: roomW,
        room_length: roomH,
        elements,
        beo_contact: beoContact,
        beo_date: beoDate,
        beo_setup_style: beoSetupStyle,
        beo_guaranteed_count: beoGuaranteedCount,
      };
      const method = templateId ? "PUT" : "POST";
      const url = templateId
        ? `${BACKEND}/api/echolayout/templates/${templateId}`
        : `${BACKEND}/api/echolayout/templates`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setTemplateId(data.id);
        setShowSaveModal(false);
        fetchTemplates();
      }
    } catch { /* ignore */ }
    setSaving(false);
  }, [saveName, evtName, venName, roomW, roomH, elements, beoContact, beoDate, beoSetupStyle, beoGuaranteedCount, templateId, fetchTemplates]);

  const loadTemplate = useCallback((tmpl: SavedTemplate) => {
    setElements(tmpl.elements);
    setRoomW(tmpl.room_width);
    setRoomH(tmpl.room_length);
    setEvtName(tmpl.event_name);
    setVenName(tmpl.venue_name);
    setBeoContact(tmpl.beo_contact || "");
    setBeoDate(tmpl.beo_date || "");
    setBeoSetupStyle(tmpl.beo_setup_style || "Banquet Rounds");
    setBeoGuaranteedCount(tmpl.beo_guaranteed_count || 0);
    setTemplateId(tmpl.id);
    setSaveName(tmpl.name);
    setShowTemplates(false);
    setSelectedId(null);
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await fetch(`${BACKEND}/api/echolayout/templates/${id}`, { method: "DELETE" });
      fetchTemplates();
      if (templateId === id) setTemplateId(null);
    } catch { /* ignore */ }
  }, [templateId, fetchTemplates]);

  // Load templates on mount
  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ─── Guest Assignment Helpers ───────────────────────────────────
  const addGuest = useCallback(() => {
    if (!selectedId || !guestInput.trim()) return;
    setElements(prev => prev.map(el =>
      el.id === selectedId ? { ...el, guests: [...(el.guests || []), guestInput.trim()] } : el
    ));
    setGuestInput("");
  }, [selectedId, guestInput]);

  const removeGuest = useCallback((guestIndex: number) => {
    if (!selectedId) return;
    setElements(prev => prev.map(el =>
      el.id === selectedId ? { ...el, guests: (el.guests || []).filter((_, i) => i !== guestIndex) } : el
    ));
  }, [selectedId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if (e.key === "d" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); duplicateSelected(); }
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, duplicateSelected]);

  const svgWidth = roomW * SCALE + 80;
  const svgHeight = roomH * SCALE + 80;

  return (
    <div className="w-full h-full flex flex-col bg-background" data-testid="floor-plan-2d">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2" data-testid="floor-plan-back">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          <div>
            <h2 className="text-base font-semibold leading-tight">{evtName}</h2>
            <p className="text-xs text-muted-foreground">{venName} &middot; {roomW}' x {roomH}' &middot; {stats.totalSeats} seats</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Section legend */}
          {Object.entries(stats.bySection).map(([sec, count]) => (
            <Badge key={sec} variant="outline" style={{ borderColor: sectionColorMap[sec], color: sectionColorMap[sec] }} className="text-[10px] gap-1">
              {sec}: {count}
            </Badge>
          ))}
          <Badge variant="secondary" className="gap-1" data-testid="total-seats-badge">
            <Users className="h-3 w-3" /> {stats.totalSeats} Total
          </Badge>
          <div className="h-4 w-px bg-border" />
          <Button size="sm" variant="outline" onClick={() => setShowTemplates(true)} data-testid="load-template-btn">
            <FolderOpen className="h-3.5 w-3.5 mr-1" /> Load
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setSaveName(evtName); setShowSaveModal(true); }} data-testid="save-template-btn">
            <Save className="h-3.5 w-3.5 mr-1" /> Save
          </Button>
          <Button size="sm" variant="outline" onClick={exportPNG} data-testid="export-png-btn">
            <FileDown className="h-3.5 w-3.5 mr-1" /> PNG
          </Button>
          <Button size="sm" variant="default" onClick={() => setShowBeoExport(true)} data-testid="export-beo-btn">
            <FileText className="h-3.5 w-3.5 mr-1" /> BEO
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left: Element Library */}
        <div className="w-56 border-r border-border/40 bg-card/30 overflow-y-auto flex-shrink-0">
          {/* Presets */}
          <div className="p-3 border-b border-border/30">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Layout Presets</div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(PRESETS).map(([key, p]) => (
                <button key={key} onClick={() => loadPreset(key)}
                  className="text-left px-2 py-1.5 rounded-md border border-border/40 hover:bg-accent/40 transition-colors text-xs"
                  data-testid={`preset-${key}`}>
                  <div className="font-medium text-foreground/80">{p.label}</div>
                  <div className="text-[9px] text-muted-foreground">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
          {/* Elements */}
          <div className="p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Add Elements</div>
            <div className="space-y-1">
              {ELEMENT_TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => addElement(t)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/30 hover:bg-accent/40 transition-colors text-xs"
                  data-testid={`add-el-${t.type}-${i}`}>
                  {t.icon}
                  <span className="text-foreground/80">{t.label}</span>
                  {t.defaults.seats! > 0 && <Badge variant="secondary" className="ml-auto text-[9px] px-1 py-0">{t.defaults.seats}</Badge>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: SVG Canvas */}
        <div className="flex-1 relative overflow-hidden bg-muted/20">
          {/* Toolbar */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-card/80 backdrop-blur-sm rounded-lg border border-border/40 px-2 py-1.5 shadow-sm">
            <Button size="sm" variant={tool === "select" ? "default" : "ghost"} onClick={() => setTool("select")} className="h-7 px-2">
              <Move className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant={tool === "pan" ? "default" : "ghost"} onClick={() => setTool("pan")} className="h-7 px-2">
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.min(3, z + 0.2))} className="h-7 px-2">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[10px] font-mono text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))} className="h-7 px-2">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            {selectedId && (
              <>
                <Button size="sm" variant="ghost" onClick={duplicateSelected} className="h-7 px-2" title="Duplicate (Ctrl+D)">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={deleteSelected} className="h-7 px-2 text-destructive" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>

          <svg ref={svgRef} width={svgWidth} height={svgHeight}
            className="cursor-crosshair"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Room border */}
            <rect x={40} y={40} width={roomW * SCALE} height={roomH * SCALE}
              fill={svgColors.bg} stroke={svgColors.border} strokeWidth={2} />

            {/* Grid lines */}
            {Array.from({ length: Math.ceil(roomW / 5) + 1 }, (_, i) => (
              <line key={`gv-${i}`} x1={40 + i * 5 * SCALE} y1={40}
                x2={40 + i * 5 * SCALE} y2={40 + roomH * SCALE}
                stroke={`${svgColors.border}50`} strokeWidth={0.5} />
            ))}
            {Array.from({ length: Math.ceil(roomH / 5) + 1 }, (_, i) => (
              <line key={`gh-${i}`} x1={40} y1={40 + i * 5 * SCALE}
                x2={40 + roomW * SCALE} y2={40 + i * 5 * SCALE}
                stroke={`${svgColors.border}50`} strokeWidth={0.5} />
            ))}

            {/* Dimension labels */}
            <text x={40 + roomW * SCALE / 2} y={30} textAnchor="middle"
              fontSize={11} fill={svgColors.mutedFg} fontWeight="500">{roomW}'</text>
            <text x={25} y={40 + roomH * SCALE / 2} textAnchor="middle"
              fontSize={11} fill={svgColors.mutedFg} fontWeight="500"
              transform={`rotate(-90, 25, ${40 + roomH * SCALE / 2})`}>{roomH}'</text>

            {/* Translate elements into SVG space */}
            <g transform={`translate(40, 40)`}>
              {elements.map((el) => renderElement(el, SCALE, el.id === selectedId, sectionColorMap, svgColors))}
            </g>
          </svg>
        </div>

        {/* Right: Properties Panel */}
        <div className="w-52 border-l border-border/40 bg-card/30 overflow-y-auto flex-shrink-0">
          {/* Room settings */}
          <div className="p-3 border-b border-border/30">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Room</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Width (ft)</Label>
                <Input type="number" value={roomW} onChange={(e) => setRoomW(Number(e.target.value) || 60)}
                  className="h-7 text-xs" data-testid="room-width-input" />
              </div>
              <div>
                <Label className="text-[10px]">Length (ft)</Label>
                <Input type="number" value={roomH} onChange={(e) => setRoomH(Number(e.target.value) || 80)}
                  className="h-7 text-xs" data-testid="room-length-input" />
              </div>
            </div>
          </div>

          {/* Selected element properties */}
          {selectedEl ? (
            <div className="p-3 space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Properties</div>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px]">Type</Label>
                  <div className="text-xs font-medium text-foreground/80 capitalize">{selectedEl.type.replace(/_/g, " ")}</div>
                </div>
                {selectedEl.tableNumber !== undefined && (
                  <div>
                    <Label className="text-[10px]">Table #</Label>
                    <Input type="number" value={selectedEl.tableNumber}
                      onChange={(e) => setElements((prev) => prev.map((el) => el.id === selectedId ? { ...el, tableNumber: Number(e.target.value) } : el))}
                      className="h-7 text-xs" data-testid="table-number-input" />
                  </div>
                )}
                {selectedEl.seats > 0 && (
                  <div>
                    <Label className="text-[10px]">Seats</Label>
                    <Input type="number" value={selectedEl.seats}
                      onChange={(e) => setElements((prev) => prev.map((el) => el.id === selectedId ? { ...el, seats: Number(e.target.value) } : el))}
                      className="h-7 text-xs" data-testid="seats-input" />
                  </div>
                )}
                {selectedEl.section !== undefined && (
                  <div>
                    <Label className="text-[10px]">Section</Label>
                    <Select value={selectedEl.section || "A"}
                      onValueChange={(v) => setElements((prev) => prev.map((el) => el.id === selectedId ? { ...el, section: v } : el))}>
                      <SelectTrigger className="h-7 text-xs" data-testid="section-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTION_COLORS.map((s) => (
                          <SelectItem key={s.name} value={s.name}>
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                              Section {s.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(selectedEl.label !== undefined || selectedEl.type === "label") && (
                  <div>
                    <Label className="text-[10px]">Label</Label>
                    <Input value={selectedEl.label || ""}
                      onChange={(e) => setElements((prev) => prev.map((el) => el.id === selectedId ? { ...el, label: e.target.value } : el))}
                      className="h-7 text-xs" data-testid="label-input" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">W (ft)</Label>
                    <Input type="number" value={selectedEl.width} step={0.5}
                      onChange={(e) => setElements((prev) => prev.map((el) => el.id === selectedId ? { ...el, width: Number(e.target.value) } : el))}
                      className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">H (ft)</Label>
                    <Input type="number" value={selectedEl.height} step={0.5}
                      onChange={(e) => setElements((prev) => prev.map((el) => el.id === selectedId ? { ...el, height: Number(e.target.value) } : el))}
                      className="h-7 text-xs" />
                  </div>
                </div>

                {/* Guest Assignment */}
                {(selectedEl.type === "round_table" || selectedEl.type === "rect_table") && (
                  <div className="pt-2 border-t border-border/40">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                      <UserPlus className="h-3 w-3" /> Guests ({(selectedEl.guests || []).length}/{selectedEl.seats})
                    </div>
                    <div className="flex gap-1 mb-1.5">
                      <Input
                        value={guestInput}
                        onChange={(e) => setGuestInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addGuest(); }}
                        placeholder="Guest name..."
                        className="h-6 text-[11px]"
                        data-testid="guest-input"
                      />
                      <Button size="sm" variant="outline" onClick={addGuest} className="h-6 px-2 text-[10px]" data-testid="add-guest-btn">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-0.5">
                      {(selectedEl.guests || []).map((guest, i) => (
                        <div key={i} className="flex items-center justify-between px-1.5 py-0.5 rounded text-[11px] bg-muted/50 group">
                          <span className="truncate">{i + 1}. {guest}</span>
                          <button
                            onClick={() => removeGuest(i)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                            data-testid={`remove-guest-${i}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Summary</div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Tables</span><span className="font-medium text-foreground">{stats.tableCount}</span></div>
                <div className="flex justify-between"><span>Theatre Seats</span><span className="font-medium text-foreground">{stats.theatreSeats}</span></div>
                <div className="flex justify-between"><span>Total Capacity</span><span className="font-medium text-foreground">{stats.totalSeats}</span></div>
                <div className="h-px bg-border/40 my-2" />
                {Object.entries(stats.bySection).map(([sec, count]) => (
                  <div key={sec} className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: sectionColorMap[sec] }} />
                      Section {sec}
                    </span>
                    <span className="font-medium text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="save-modal">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-[420px] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Save Floor Plan Template</h3>
              <button onClick={() => setShowSaveModal(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Template Name</Label>
                <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} className="h-8 text-sm" data-testid="template-name-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Event Name</Label>
                  <Input value={evtName} onChange={(e) => setEvtName(e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Venue</Label>
                  <Input value={venName} onChange={(e) => setVenName(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.tableCount} tables &middot; {stats.totalSeats} seats &middot; {roomW}' x {roomH}'
                {templateId && <span className="ml-2 text-primary">(Updating existing)</span>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSaveModal(false)}>Cancel</Button>
              <Button size="sm" onClick={saveTemplate} disabled={saving || !saveName.trim()} data-testid="confirm-save-btn">
                {saving ? "Saving..." : templateId ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Load Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="load-modal">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-[560px] max-h-[70vh] flex flex-col p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Saved Floor Plans</h3>
              <button onClick={() => setShowTemplates(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {savedTemplates.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No saved templates yet. Design a floor plan and save it.
                </div>
              ) : (
                savedTemplates.map((tmpl) => (
                  <div key={tmpl.id} className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${templateId === tmpl.id ? "border-primary bg-primary/5" : "border-border"}`}
                    data-testid={`template-item-${tmpl.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1" onClick={() => loadTemplate(tmpl)}>
                        <div className="font-medium text-sm">{tmpl.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {tmpl.event_name} &middot; {tmpl.venue_name} &middot; {tmpl.room_width}' x {tmpl.room_length}'
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tmpl.table_count} tables &middot; {tmpl.total_seats} seats &middot; Updated {new Date(tmpl.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => loadTemplate(tmpl)} data-testid={`load-btn-${tmpl.id}`}>
                          Load
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => deleteTemplate(tmpl.id)} data-testid={`delete-btn-${tmpl.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* BEO Export Modal */}
      {showBeoExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="beo-modal">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-[480px] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Export BEO (Banquet Event Order)</h3>
              <button onClick={() => setShowBeoExport(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Event Name</Label>
                  <Input value={evtName} onChange={(e) => setEvtName(e.target.value)} className="h-8 text-sm" data-testid="beo-event-input" />
                </div>
                <div>
                  <Label className="text-xs">Venue</Label>
                  <Input value={venName} onChange={(e) => setVenName(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Contact Person</Label>
                  <Input value={beoContact} onChange={(e) => setBeoContact(e.target.value)} className="h-8 text-sm" placeholder="Event Manager" data-testid="beo-contact-input" />
                </div>
                <div>
                  <Label className="text-xs">Event Date</Label>
                  <Input type="date" value={beoDate} onChange={(e) => setBeoDate(e.target.value)} className="h-8 text-sm" data-testid="beo-date-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Setup Style</Label>
                  <Input value={beoSetupStyle} onChange={(e) => setBeoSetupStyle(e.target.value)} className="h-8 text-sm" data-testid="beo-setup-input" />
                </div>
                <div>
                  <Label className="text-xs">Guaranteed Count</Label>
                  <Input type="number" value={beoGuaranteedCount} onChange={(e) => setBeoGuaranteedCount(Number(e.target.value))} className="h-8 text-sm" data-testid="beo-count-input" />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground space-y-1">
                <div>Floor Plan: {roomW}' x {roomH}' &middot; {stats.tableCount} tables &middot; {stats.totalSeats} seats</div>
                <div>Guests assigned: {elements.reduce((sum, el) => sum + (el.guests?.length || 0), 0)}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowBeoExport(false)}>Cancel</Button>
              <Button size="sm" onClick={exportPDF} data-testid="export-beo-confirm-btn">
                <FileDown className="h-3.5 w-3.5 mr-1" /> Export BEO
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
